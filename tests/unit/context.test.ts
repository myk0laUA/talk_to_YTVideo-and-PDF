import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getEventListeners } from "node:events";
import { setImmediate } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createContextService } from "../../src/server/context/service.ts";
import { sourceContext, contextVariants, serializeData, BEHAVIOR } from "../../src/server/context/document.ts";
import { measureBudget, type BudgetPolicy, type BudgetResult, type ContextMeasurement } from "../../src/server/context/budget.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { uploadedRecord, captionRecord, sourceDto, type UploadedSource } from "../../src/server/sources/service.ts";
import { createVisitor, readVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { pdfFixture, captionFixture, pdfQuestions, captionQuestions, FIXTURE_VERSION } from "../context/fixtures.ts";

const start = Date.UTC(2030, 0, 1);
const config = { origin: "https://context.invalid", cookieSecret: "07".repeat(32), secure: true };
const signedVisitor = () => {
  const created = createVisitor(config, start);
  const parsed = readVisitor(visitorCookie(created, config, start).split(";", 1)[0], config, start);
  assert.ok(parsed); return parsed;
};
const signal = () => new AbortController().signal;
const policy: BudgetPolicy = { version: "synthetic-budget-v1", binding: { model: "offline-fixture-only",
  tokenizer: "utf8-bytes-test-only", verification: "synthetic", unit: "synthetic-units" },
  capacity: 100_000, historyAllowance: 100, outputReserve: 200, framingAllowance: 50 };
const measurement: ContextMeasurement = { binding: policy.binding, measure: async text => Buffer.byteLength(text, "utf8") };
const budget = (variant = contextVariants(sourceContext(uploadedRecord(pdfFixture, signedVisitor()))).B,
  p: BudgetPolicy | undefined = policy, m: ContextMeasurement | undefined = measurement) => measureBudget(variant, p, m, signal(), () => {});
async function setup(kind: "PDF" | "YOUTUBE" = "PDF") {
  const db = new SyntheticSourceDatabase(), visitor = signedVisitor(), other = signedVisitor();
  const repository = createSourceRepository(() => db.asClient());
  const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
  row.expiresAt = new Date(start + 60_000);
  await repository.replace(row, () => {});
  let clock = start;
  const prepare = createContextService({ repository, now: () => clock });
  const input = { visitor, sourceId: row.id, signal: signal(), policy, measurement };
  return { db, visitor, other, repository, row, input, prepare, setTime: (at: number) => { clock = at; } };
}

for (const kind of ["PDF", "YOUTUBE"] as const) {
  test(`${kind}: owned signed visitor, complete deterministic variants, immutable copies, preview untouched, no writes`, async () => {
    const s = await setup(kind);
    const before = structuredClone(s.db.rows), counts = [s.db.creates, s.db.deletes, s.db.cacheReads, s.db.cacheWrites];
    const first = await s.prepare(s.input), second = await s.prepare(s.input);
    assert.equal(first.status, "prepared"); if (first.status !== "prepared") return;
    assert.deepEqual(first, second);
    assert.equal(first.conversationReady, false); assert.equal(first.providerConfirmed, false);
    assert.equal(first.issuanceRequiresRevalidation, true);
    assert.equal(first.budgets.A.status, "offline_fit"); assert.equal(first.budgets.B.status, "offline_fit");
    assert.equal(first.context.sections.map(s => s.text).join(first.context.separator), s.row.fullText);
    assert.equal(JSON.parse(first.variants.A.serialized).source.fullText, s.row.fullText);
    const parsed = JSON.parse(first.variants.B.serialized);
    assert.equal(parsed.source.sections.map((s: { text: string }) => s.text).join(parsed.source.separator), s.row.fullText);
    assert.deepEqual(parsed.instructions, BEHAVIOR); assert.deepEqual(first.variants.A.instructions, first.variants.B.instructions);
    assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(first.budgets));
    for (const object of [first.context, first.context.source, first.context.sections, ...first.context.sections,
      first.variants, first.variants.A, first.variants.B, first.variants.B.source, first.variants.A.instructions]) assert.ok(Object.isFrozen(object));
    assert.throws(() => { (first.context.sections[0] as { text: string }).text = "changed"; }, TypeError);
    assert.throws(() => { (first.context.source as { id: string }).id = randomUUID(); }, TypeError);
    assert.deepEqual(s.db.rows, before);
    assert.deepEqual([s.db.creates, s.db.deletes, s.db.cacheReads, s.db.cacheWrites], counts);
    const preview = sourceDto((await s.repository.get(s.row.id, s.visitor.owner, new Date(start)))!, true);
    assert.ok("fullText" in preview); assert.equal(preview.fullText, s.row.fullText);
    assert.doesNotMatch(JSON.stringify(first), /ownerSessionHash|activeSourceOwner|cookie|extractionStatus|"provider":|canonicalOrigin/);
    s.row.fullText = "caller mutation";
    assert.notEqual(first.context.fullText, s.row.fullText);
  });
  test(`${kind}: both visitors denied each other's source`, async () => {
    const s = await setup(kind);
    const b = kind === "PDF" ? uploadedRecord(pdfFixture, s.other) : captionRecord(captionFixture, s.other);
    await s.repository.replace(b, () => {});
    for (const input of [{ ...s.input, visitor: s.other }, { ...s.input, visitor: s.visitor, sourceId: b.id }]) {
      assert.deepEqual(await s.prepare(input), { status: "unavailable", code: "unavailable", message: "Source unavailable.",
        conversationReady: false, providerConfirmed: false, issuanceRequiresRevalidation: true });
    }
  });
}

test("PDF preserves empty pages/whitespace/Unicode/hostile delimiters; captions preserve nonmonotonic fractional timing/order", async () => {
  const pdf = await setup(), cap = await setup("YOUTUBE");
  const a = sourceContext(pdf.row), b = sourceContext(cap.row);
  assert.equal(a.sections[2].text, ""); assert.equal(a.sections.length, 8);
  assert.deepEqual(a.sections.map(s => s.id), Array.from({ length: 8 }, (_, i) => `page-${i + 1}`));
  assert.ok(a.fullText.startsWith("  ")); assert.ok(a.fullText.endsWith("✓  "));
  assert.ok(a.fullText.includes("e\u0301")); assert.ok(a.fullText.includes("\r\n"));
  assert.deepEqual(b.sections, cap.row.sections && !Array.isArray(cap.row.sections) ? cap.row.sections.segments : []);
  assert.ok("startSeconds" in b.sections[0]); assert.equal(b.sections[0].startSeconds, 1.2505);
  assert.ok("startSeconds" in b.sections[1]); assert.equal(b.sections[1].startSeconds, 0);
  for (const context of [a, b]) {
    for (const variant of Object.values(contextVariants(context))) {
      assert.doesNotMatch(variant.serialized, /<|>|&|\u2028|\u2029/u);
      assert.ok(variant.serialized.includes("\\u003c"));
      assert.ok(variant.serialized.includes("BANANA"));
      assert.equal(JSON.parse(variant.serialized).instructions.length, BEHAVIOR.length);
    }
  }
});

for (const problem of ["missing", "foreign", "expired", "proof", "removed", "replaced", "not_ready", "invalid_id", "visitor_expired"] as const) {
  test(`uniform unavailable: ${problem}`, async () => {
    const s = await setup(); let input = s.input;
    if (problem === "missing") input = { ...input, sourceId: randomUUID() };
    if (problem === "foreign") input = { ...input, visitor: s.other };
    if (problem === "expired") s.db.rows.get(s.row.id)!.expiresAt = new Date(start);
    if (problem === "proof") Object.assign(s.db.rows.get(s.row.id)!, { activeSourceOwner: null, provider: "synthetic-proof" });
    if (problem === "not_ready") s.db.rows.get(s.row.id)!.extractionStatus = "PENDING";
    if (problem === "removed") await s.repository.remove(s.row.id, s.visitor.owner, new Date(start), () => {});
    if (problem === "replaced") await s.repository.replace(uploadedRecord(pdfFixture, s.visitor), () => {});
    if (problem === "invalid_id") input = { ...input, sourceId: "proof-source" };
    if (problem === "visitor_expired") s.setTime(s.visitor.expiresAt * 1000);
    assert.deepEqual(await s.prepare(input), { status: "unavailable", code: "unavailable", message: "Source unavailable.",
      conversationReady: false, providerConfirmed: false, issuanceRequiresRevalidation: true });
  });
}

for (const stage of ["read", "measurement", "final_read"] as const) {
  for (const event of ["cancel", "source_expiry", "visitor_expiry"] as const) {
    test(`${event} during ${stage} await returns no prepared content`, async () => {
      const s = await setup(); const controller = new AbortController(); let reads = 0;
      const trigger = () => {
        if (event === "cancel") controller.abort();
        else s.setTime(event === "source_expiry" ? start + 60_000 : s.visitor.expiresAt * 1000);
      };
      const prepare = createContextService({ now: () => clock, repository: { get: async (...args) => {
        const row = await s.repository.get(...args); reads++;
        if (stage === "read" && reads === 1 || stage === "final_read" && reads === 2) trigger(); return row;
      } } });
      let clock = start;
      // Use the same controlled clock for both wrappers.
      s.setTime = at => { clock = at; };
      const result = await prepare({ ...s.input, signal: controller.signal,
        measurement: { binding: measurement.binding, measure: async text => { if (stage === "measurement") trigger(); return text.length; } } });
      assert.equal(result.status, "unavailable");
      if (result.status === "unavailable") assert.equal(result.code, event === "cancel" ? "cancelled" : "unavailable");
      assert.ok(!("context" in result));
    });
  }
}

for (const mutation of ["removed", "replaced"] as const) test(`${mutation} during measurement is revalidated before return`, async () => {
  const s = await setup(); let once = false;
  const result = await s.prepare({ ...s.input, measurement: { binding: measurement.binding, measure: async text => {
    if (!once) { once = true;
      if (mutation === "removed") await s.repository.remove(s.row.id, s.visitor.owner, new Date(start), () => {});
      else await s.repository.replace(captionRecord(captionFixture, s.visitor), () => {});
    } return text.length;
  } } });
  assert.equal(result.status, "unavailable"); if (result.status === "unavailable") assert.equal(result.code, "unavailable");
});

for (const [label, corrupt] of [
  ["PDF separator mismatch", (r: UploadedSource) => { r.fullText += "lost"; r.characterCount = r.fullText.length; }],
  ["PDF page ID", (r: UploadedSource) => { if (Array.isArray(r.sections)) r.sections[0].id = "page-99"; }],
  ["PDF missing empty page", (r: UploadedSource) => { if (Array.isArray(r.sections)) r.sections.splice(2, 1); }],
  ["invalid expiry", (r: UploadedSource) => { r.expiresAt = new Date(NaN); }],
  ["expiry exceeds visitor", (r: UploadedSource) => { r.expiresAt = new Date(start + 10_000_000); }],
] as const) test(`stored validation rejects ${label}`, async () => {
  const s = await setup(); corrupt(s.db.rows.get(s.row.id)!);
  const result = await s.prepare(s.input); assert.equal(result.status, "unavailable");
  assert.ok(!("context" in result));
});
test("malformed stored captions fail actual repository validation", async () => {
  for (const field of ["id", "text", "startSeconds", "durationSeconds", "videoId"] as const) {
    const s = await setup("YOUTUBE"), stored = s.db.rows.get(s.row.id)!;
    assert.ok(!Array.isArray(stored.sections));
    if (field === "videoId") stored.sections.videoId = "invalid";
    else Object.assign(stored.sections.segments[0], { [field]: field === "text" ? "" : field === "id" ? "segment-99" : NaN });
    const result = await s.prepare(s.input); assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.code, "storage_unavailable");
  }
});
test("wrong repository ID and forged ownership/identity are rejected by service defense", async () => {
  const s = await setup();
  for (const patch of [{ id: randomUUID() }, { ownerSessionHash: s.other.owner }, { activeSourceOwner: null },
    { provider: "synthetic-proof" }, { extractionStatus: "FAILED" }, { expiresAt: new Date(NaN) }]) {
    const prepare = createContextService({ now: () => start, repository: { get: async () => ({ ...s.row, ...patch }) } });
    const result = await prepare(s.input); assert.equal(result.status, "unavailable"); assert.ok(!("context" in result));
  }
});
test("no cross-source contamination and no mutable input references after awaiting", async () => {
  const s = await setup(); const first = await s.prepare(s.input);
  const other = captionRecord(captionFixture, s.visitor); await s.repository.replace(other, () => {});
  const second = await s.prepare({ ...s.input, sourceId: other.id });
  assert.equal(first.status, "prepared"); assert.equal(second.status, "prepared");
  if (first.status === "prepared" && second.status === "prepared") {
    assert.doesNotMatch(second.variants.B.serialized, /END-OF-PDF/);
    assert.doesNotMatch(first.variants.B.serialized, /END-OF-CAPTIONS/);
    assert.equal(first.context.fullText, pdfFixture.fullText);
  }
});

test("complete serialization is measured separately from instructions/source; reserves counted exactly once", async () => {
  const s = await setup(); const calls: { text: string; component: string }[] = [];
  const result = await s.prepare({ ...s.input, measurement: { binding: measurement.binding,
    measure: async (text, component) => { calls.push({ text, component }); return Buffer.byteLength(text); } } });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") return;
  assert.equal(calls.length, 6);
  for (const [index, variant] of Object.values(result.variants).entries()) {
    assert.deepEqual(calls[index * 3 + 2], { text: variant.serialized, component: "complete_variant" });
    const b: BudgetResult = result.budgets[variant.id]; assert.equal(b.status, "offline_fit");
    if (!("accounting" in b)) continue;
    assert.equal(b.accounting.completeVariant, Buffer.byteLength(variant.serialized));
    assert.equal(b.accounting.total, b.accounting.completeVariant + 100 + 200 + 50);
    assert.equal(b.accounting.instructions + b.accounting.serializedSource + b.accounting.serializationAdjustment, b.accounting.completeVariant);
    assert.ok(b.accounting.serializedSource > Buffer.byteLength(s.row.fullText));
    assert.ok(Object.isFrozen(b)); assert.ok(Object.isFrozen(b.accounting)); assert.ok(Object.isFrozen(b.accounting.binding));
  }
});
for (const id of ["A", "B"] as const) test(`${id}: exact boundary fits; one-over fails without truncation or Source/preview change`, async () => {
  const s = await setup(), variants = contextVariants(sourceContext(s.row)), variant = variants[id];
  const total = Buffer.byteLength(variant.serialized) + 350;
  assert.equal((await budget(variant, { ...policy, capacity: total })).status, "offline_fit");
  const before = structuredClone(s.db.rows);
  const result = await s.prepare({ ...s.input, policy: { ...policy, capacity: total - 1 } });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") return;
  assert.equal(result.budgets[id].status, "context_too_large");
  const b = result.budgets[id]; if ("accounting" in b) assert.equal(b.accounting.remaining, -1);
  assert.equal(result.context.fullText, s.row.fullText); assert.deepEqual(result.variants, variants);
  assert.deepEqual(s.db.rows, before); assert.equal(result.conversationReady, false);
  const preview = sourceDto((await s.repository.get(s.row.id, s.visitor.owner, new Date(start)))!, true);
  assert.ok("fullText" in preview); assert.equal(preview.fullText, s.row.fullText);
});
for (const field of ["capacity", "historyAllowance", "outputReserve", "framingAllowance"] as const) {
  for (const value of [-1, NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    test(`invalid budget ${field}=${value}`, async () => {
      const result = await budget(undefined, { ...policy, [field]: value });
      assert.deepEqual(result, { status: "budget_unavailable", reason: "invalid_policy" });
    });
  }
}
test("zero capacity/reserve overflow/missing/unverified/mismatched policy cannot imply readiness", async () => {
  for (const p of [{ ...policy, capacity: 0 }, { ...policy, version: "" },
    { ...policy, historyAllowance: Number.MAX_SAFE_INTEGER, outputReserve: 1 },
    { ...policy, binding: { ...policy.binding, model: "different" } },
    { ...policy, binding: { ...policy.binding, verification: "verified" as const } }]) {
    assert.equal((await budget(undefined, p)).status, "budget_unavailable");
  }
  const s = await setup();
  for (const patch of [{ policy: undefined }, { measurement: undefined },
    { policy: { ...policy, binding: { ...policy.binding, verification: "unverified" as const } } }]) {
    const result = await s.prepare({ ...s.input, ...patch });
    assert.equal(result.status, "prepared"); if (result.status !== "prepared") continue;
    assert.equal(result.budgets.A.status, "budget_unavailable"); assert.equal(result.budgets.B.status, "budget_unavailable");
    assert.equal(result.conversationReady, false); assert.equal(result.providerConfirmed, false);
  }
});
for (const value of [0, -1, NaN, Infinity, 0.1, Number.MAX_SAFE_INTEGER + 1]) test(`invalid measurement ${value}`, async () => {
  const result = await budget(undefined, policy, { ...measurement, measure: async () => value });
  assert.deepEqual(result, { status: "budget_unavailable", reason: "measurement_failed" });
});
test("measurement exceptions/overflow are safe; nonadditive complete measurement is authoritative", async () => {
  assert.deepEqual(await budget(undefined, policy, { ...measurement, measure: async () => { throw new Error("PRIVATE source content"); } }),
    { status: "budget_unavailable", reason: "measurement_failed" });
  assert.equal((await budget(undefined, policy, { ...measurement, measure: async () => Number.MAX_SAFE_INTEGER })).status, "budget_unavailable");
  const result = await budget(undefined, policy, { ...measurement, measure: async (_, c) => c === "complete_variant" ? 7 : 10 });
  assert.equal(result.status, "offline_fit"); if ("accounting" in result) {
    assert.equal(result.accounting.total, 357); assert.equal(result.accounting.serializationAdjustment, -13);
  }
});
test("even an injected verified binding never confirms provider acceptance or authorizes issuance", async () => {
  const s = await setup();
  const binding = { ...policy.binding, model: "test-only-verified-contract", verification: "verified", unit: "tokens" } as const;
  const result = await s.prepare({ ...s.input, policy: { ...policy, binding }, measurement: { ...measurement, binding } });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") return;
  assert.equal(result.budgets.A.status, "measured_fit"); assert.equal(result.providerConfirmed, false);
  assert.equal(result.conversationReady, false); assert.equal(result.issuanceRequiresRevalidation, true);
});
test("pre-aborted request does not read; storage/measurement failures do not leak exceptions", async () => {
  const s = await setup(); const controller = new AbortController(); controller.abort(); const reads = s.db.reads;
  const result = await s.prepare({ ...s.input, signal: controller.signal });
  assert.equal(result.status, "unavailable"); assert.equal(s.db.reads, reads);
  const failed = await createContextService({ repository: { get: async () => { throw new Error("PRIVATE SQL"); } }, now: () => start })(s.input);
  assert.doesNotMatch(JSON.stringify(failed), /PRIVATE|SQL/);
});

for (const kind of ["PDF", "YOUTUBE"] as const) test(`${kind} ${FIXTURE_VERSION}: all 12 evaluation questions have evidence metadata and complete A/B coverage`, async () => {
  const s = await setup(kind), questions = kind === "PDF" ? pdfQuestions : captionQuestions;
  const context = sourceContext(s.row), variants = contextVariants(context), ids = new Set(context.sections.map(s => s.id));
  assert.equal(questions.length, 12); assert.equal(new Set(questions.map(q => q.id)).size, 12);
  for (const [category, count] of [["fact", 6], ["synthesis", 2], ["follow_up", 2], ["absent", 1], ["malicious", 1]] as const) {
    assert.equal(questions.filter(q => q.category === category).length, count);
  }
  for (const region of ["beginning", "middle", "end"]) assert.equal(questions.filter(q => q.category === "fact" && q.region === region).length, 2);
  for (const q of questions) {
    assert.ok(q.question && q.expectedAnswer); assert.ok(Array.isArray(q.evidence));
    if (q.category !== "absent") assert.ok(q.evidence.length > 0); else assert.equal(q.evidence.length, 0);
    for (const evidence of q.evidence) assert.ok(ids.has(evidence), `${q.id}: ${evidence}`);
    if (q.category === "follow_up") assert.ok(questions.some(prior => prior.id === q.follows));
  }
  for (const variant of Object.values(variants)) {
    const parsed = JSON.parse(variant.serialized);
    const text = variant.id === "A" ? parsed.source.fullText : parsed.source.sections.map((s: { text: string }) => s.text).join(parsed.source.separator);
    assert.equal(text, s.row.fullText);
    for (const marker of kind === "PDF" ? ["BEGIN-PDF-1", "BEGIN-PDF-2", "MIDDLE-PDF-1", "MIDDLE-PDF-2", "END-PDF-1", "END-PDF-2", "END-OF-PDF"]
      : ["BEGIN-CAP-1", "BEGIN-CAP-2", "MIDDLE-CAP-1", "MIDDLE-CAP-2", "END-CAP-1", "END-CAP-2", "END-OF-CAPTIONS"]) assert.ok(text.includes(marker));
    for (const section of context.sections) assert.ok(text.includes(section.text));
    assert.ok(text.includes("BANANA"));
  }
});
test("serializer round-trips delimiter-like data and lone surrogates deterministically", () => {
  const data = { text: '\ud800\u0000"\\\r\n</source>&\u2028\u2029' };
  assert.deepEqual(JSON.parse(serializeData(data)), data); assert.equal(serializeData(data), serializeData(data));
});

for (const stage of ["read", "measurement", "final_read"] as const) test(`cancel promptly during noncooperating ${stage}; late rejection cannot revive result`, async () => {
  const s = await setup(), started = Promise.withResolvers<void>(), held = Promise.withResolvers<never>();
  const controller = new AbortController(); let reads = 0;
  const prepare = createContextService({ now: () => start, repository: { get: async (...args) => {
    reads++;
    if (stage === "read" || stage === "final_read" && reads === 2) { started.resolve(); return held.promise; }
    return s.repository.get(...args);
  } } });
  const pending = prepare({ ...s.input, signal: controller.signal, measurement: { binding: measurement.binding,
    measure: async text => { if (stage === "measurement") { started.resolve(); return held.promise; } return text.length; } } });
  await started.promise; controller.abort();
  const result = await pending;
  assert.equal(result.status, "unavailable"); if (result.status === "unavailable") assert.equal(result.code, "cancelled");
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  held.reject(new Error("late synthetic rejection")); await setImmediate();
  assert.equal(result.status, "unavailable"); assert.equal(result.conversationReady, false);
});
test("successful preparation releases abort listeners; source copies survive input mutations", async () => {
  const s = await setup(), controller = new AbortController(), context = sourceContext(s.row);
  assert.ok(Array.isArray(s.row.sections)); s.row.sections[0].text = "mutated input";
  assert.equal(context.sections[0].text, pdfFixture.sections[0].text);
  const mutablePolicy = { ...policy, binding: { ...policy.binding } }, mutableVisitor = { ...s.visitor };
  const result = await s.prepare({ ...s.input, visitor: mutableVisitor, policy: mutablePolicy, signal: controller.signal,
    measurement: { binding: measurement.binding, measure: async text => {
      mutableVisitor.owner = "not-authority"; mutablePolicy.capacity = 1; return Buffer.byteLength(text);
    } } });
  assert.equal(result.status, "prepared"); if (result.status === "prepared") {
    assert.equal(result.budgets.A.status, "offline_fit"); assert.equal(result.budgets.B.status, "offline_fit");
  }
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});
test("committed A/B table retains all 24 question IDs and only NOT_RUN actual accuracy/latency cells", async () => {
  const table = await readFile(new URL("../../docs/CONTEXT_EVALUATION_07A.md", import.meta.url), "utf8");
  for (const q of [...pdfQuestions, ...captionQuestions]) {
    const row = table.split("\n").find(line => line.startsWith(`| ${q.id} |`));
    assert.ok(row, q.id); assert.equal(row.match(/NOT_RUN/g)?.length, 4);
  }
});
test("preparation makes no provider fetch and all context modules enforce server-only", async t => {
  let fetches = 0;
  t.mock.method(globalThis, "fetch", async () => { fetches++; throw new Error("forbidden external fetch"); });
  for (const kind of ["PDF", "YOUTUBE"] as const) {
    const s = await setup(kind); assert.equal((await s.prepare(s.input)).status, "prepared");
  }
  assert.equal(fetches, 0);
  for (const file of ["await", "budget", "document", "service"]) {
    const code = await readFile(new URL(`../../src/server/context/${file}.ts`, import.meta.url), "utf8");
    assert.ok(code.startsWith('import "server-only";'));
  }
});
