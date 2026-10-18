import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { after, before, test } from "node:test";
import { writeFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import { createHash } from "node:crypto";
import { MODEL_POLICY_VERSION, resolveModelPolicy, evaluateHypotheticalAccounting } from "../../src/server/context/model-policy.ts";
import { createModelBudgetPreparation, diagnoseManifest, matchesDiagnostic } from "../../src/server/context/model-measurement.ts";
import { contextVariants } from "../../src/server/context/document.ts";
import { measureBudget } from "../../src/server/context/budget.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, uploadedRecord, sourceDto } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { encodeManifest, bytes } from "../../src/shared/priming-manifest.ts";
import { preparePrimingInput, validateAdmission, type WireBudget, type PrimingInput } from "../../src/shared/priming-admission.ts";
import { fixture, harness } from "../priming/harness.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const start = Date.UTC(2030, 0, 1);
const evidence: unknown[] = [];
let providerCalls = 0;
const originalFetch = globalThis.fetch;
before(() => { globalThis.fetch = async () => { providerCalls++; throw new Error("Forbidden provider request"); }; });
after(async () => {
  globalThis.fetch = originalFetch;
  assert.equal(providerCalls, 0);
  if (process.env.BUDGET_EVIDENCE_PATH) await writeFile(process.env.BUDGET_EVIDENCE_PATH,
    JSON.stringify({ environment: "local/synthetic-source-storage; real tokenizer NOT_RUN", providerCalls,
      suiteMaxRssKiB: process.resourceUsage().maxRSS, rows: evidence }, null, 2));
});
function known(model = "gpt-realtime") {
  const p = resolveModelPolicy(model); assert.equal(p.status, "known_limits_unbound");
  if (p.status !== "known_limits_unbound") throw new Error("Expected known policy"); return p.policy;
}
async function setup(kind: "PDF" | "YOUTUBE" = "PDF", content?: string) {
  const db = new SyntheticSourceDatabase(), visitor = createVisitor({ origin: "https://budget.invalid",
    cookieSecret: "07".repeat(32), secure: true }, start);
  const extraction = content === undefined ? pdfFixture : { ...pdfFixture, pageCount: 1,
    sections: [{ id: "page-1", pageNumber: 1, text: content }], fullText: content, characterCount: content.length };
  const captions = content === undefined ? captionFixture : { ...captionFixture,
    segments: [{ text: content, startSeconds: 0, durationSeconds: 1 }], fullText: content };
  const row = kind === "PDF" ? uploadedRecord(structuredClone(extraction), visitor) : captionRecord(structuredClone(captions), visitor);
  row.id = kind === "PDF" ? "070c0000-0000-4000-8000-000000000001" : "070c0000-0000-4000-8000-000000000002";
  row.expiresAt = new Date(start + 60_000);
  const repository = createSourceRepository(() => db.asClient()); await repository.replace(row, () => {});
  const abort = new AbortController();
  const input = { visitor, sourceId: row.id, signal: abort.signal, model: "gpt-realtime", runId: "budget07c" };
  return { db, visitor, row, repository, abort, input };
}

for (const model of ["gpt-realtime", "gpt-realtime-2.1"]) {
  test(`${model}: exact frozen evidence, separate limits and unresolved bindings`, () => {
    const p = known(model); assert.ok(Object.isFrozen(p)); assert.ok(Object.isFrozen(p.application));
    assert.ok(Object.isFrozen(p.evidence.urls)); assert.equal(p.tokenizer.identity, null);
    assert.equal(p.tokenizer.encoding, null); assert.equal(p.framing.basis, null);
    assert.equal(p.documented.total, model === "gpt-realtime" ? 32000 : 128000);
    assert.equal(p.documented.maxOutput, model === "gpt-realtime" ? 4096 : 32000);
    assert.equal(p.application.inputCeiling, p.application.total - p.application.outputReserve);
    assert.throws(() => { (p.application as { total: number }).total = 1; }, TypeError);
    assert.equal(evaluateHypotheticalAccounting(structuredClone(p), { configureInstructions: 1, finalizeInstructions: 1, items: [1] }).status, "invalid_accounting");
  });
  for (const kind of ["PDF", "YOUTUBE"] as const) test(`${model}/${kind}: real preparation A/B voice/text diagnostics deny factory/default admission, no writes or provider`, async () => {
    const s = await setup(kind); const before = structuredClone(s.db.rows);
    const counts = [s.db.creates, s.db.deletes, s.db.cacheReads, s.db.cacheWrites];
    const result = await createModelBudgetPreparation({ repository: s.repository, now: () => start })({ ...s.input, model });
    assert.equal(result.status, "budget_unavailable"); if (result.status !== "budget_unavailable") return;
    assert.equal(result.reason, "unsupported_tokenizer_and_framing"); assert.equal(result.measurements.length, 4);
    assert.equal(result.productionReady, false); assert.equal(result.providerConfirmed, false); assert.equal(result.conversationReady, false);
    assert.equal(s.db.reads, 3); assert.deepEqual(s.db.rows, before);
    assert.deepEqual([s.db.creates, s.db.deletes, s.db.cacheReads, s.db.cacheWrites], counts);
    const preview = sourceDto(s.row, true); assert.ok("fullText" in preview);
    assert.equal(preview.fullText, result.prepared.context.fullText);
    assert.equal(result.sourceHash, createHash("sha256").update(s.row.fullText, "utf16le").digest("hex"));
    for (const { manifest: m, diagnostic: d } of result.measurements) {
      const variant = result.prepared.variants[m.variant];
      assert.equal(d.tokenCounts, null); assert.equal(d.verification, "unverified"); assert.equal(d.framing.tokenUpperBound, null);
      assert.equal(d.outboundRepresentation.utf8Bytes, bytes(m.representation));
      assert.equal(d.modelVisible.itemContentBytes, m.items.reduce((n, e) => n + bytes(e.item.content[0].text), 0));
      const fragments = m.items.map(e => JSON.parse(e.item.content[0].text));
      const sections: string[] = [];
      for (const f of fragments) sections[f.sectionIndex] = (sections[f.sectionIndex] ?? "") + f.text;
      assert.equal(sections.join(m.variant === "A" ? "" : result.prepared.context.separator), s.row.fullText);
      const estimate: WireBudget = { status: "offline_fit", verification: "synthetic", unit: "synthetic-units",
        model, tokenizer: "diagnostic-bytes-only", policyVersion: MODEL_POLICY_VERSION, representation: m.representation,
        measured: m.bytes, capacity: known(model).application.total, historyAllowance: 4096, outputReserve: 4096, framingAllowance: 1024 };
      assert.throws(() => preparePrimingInput(result.prepared, m.variant, m.runId, m.mode, estimate), /Verified/);
      const input: PrimingInput = { manifest: m, preparedBudget: result.prepared.budgets[m.variant], wireBudget: estimate };
      assert.equal(validateAdmission(input), false);
      const h = harness(input, true); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
      assert.equal(h.clock.timers.size, 0); assert.equal(h.transport.closes, 1); assert.equal(h.controller.canSendQuestions, false);
      assert.ok(Object.isFrozen(d.modelVisible.items));
      assert.ok(matchesDiagnostic(d, variant, m, { model, mode: m.mode, policyVersion: MODEL_POLICY_VERSION }));
      evidence.push({ model, policy: MODEL_POLICY_VERSION, kind, variant: m.variant, mode: m.mode,
        result: result.status, reason: result.reason, sourceHash: result.sourceHash, hashEncoding: result.hashEncoding,
        exactReconstruction: true, defaultAdmission: false, reserves: known(model).application, diagnostic: d });
    }
    assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  });
  test(`${model}: SYNTHETIC arithmetic exact input boundary/one-over; output reserved once`, () => {
    const p = known(model), a = p.application;
    const item = a.inputCeiling - a.historyReserve - a.framingBaseReserve - a.framingPerItemReserve - 1;
    const exact = evaluateHypotheticalAccounting(p, { configureInstructions: 1, finalizeInstructions: 1, items: [item] });
    const over = evaluateHypotheticalAccounting(p, { configureInstructions: 1, finalizeInstructions: 1, items: [item + 1] });
    assert.equal(exact.status, "diagnostic_fit"); assert.equal(over.status, "diagnostic_over_limit");
    assert.equal(exact.input, a.inputCeiling); assert.equal(exact.total, a.total); assert.equal(exact.authorizing, false);
    evidence.push({ scenario: "SYNTHETIC boundary/one-over", model, exact, over, providerTokenProof: false });
  });
}

for (const model of ["", "gpt-realtime-new", "gpt-realtime-2025-08-28", "gpt-realtime-2.1-mini", " gpt-realtime", "GPT-REALTIME"]) {
  test(`unknown exact identifier ${JSON.stringify(model)} denies without model substitution`, async () => {
    assert.deepEqual(resolveModelPolicy(model), { status: "budget_unavailable", reason: "unknown_model" });
    const s = await setup(); const result = await createModelBudgetPreparation({ repository: s.repository, now: () => start })({ ...s.input, model });
    assert.equal(result.status, "budget_unavailable"); if (result.status !== "budget_unavailable") return;
    assert.equal(result.reason, "unknown_model"); assert.equal(result.policy, null); assert.equal(result.measurements.length, 0);
    assert.equal(result.prepared.context.fullText, s.row.fullText);
  });
}
test("unsupported revision denied; no caller-provided policy/verified override is accepted", async () => {
  const s = await setup();
  const result = await createModelBudgetPreparation({ repository: s.repository, now: () => start })({ ...s.input,
    policyVersion: "future-v2", ...{ verified: true, capacity: Number.MAX_SAFE_INTEGER, tokenizer: "pretend" } });
  assert.equal(result.status, "budget_unavailable"); if (result.status !== "budget_unavailable") return;
  assert.equal(result.reason, "unsupported_policy_revision"); assert.equal(result.measurements.length, 0);
});

for (const n of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) test(`invalid hypothetical count ${n}`, () => {
  assert.equal(evaluateHypotheticalAccounting(known(), { configureInstructions: n, finalizeInstructions: 1, items: [1] }).status, "invalid_accounting");
  assert.equal(evaluateHypotheticalAccounting(known(), { configureInstructions: 1, finalizeInstructions: 1, items: [n] }).status, "invalid_accounting");
});
test("SYNTHETIC instruction ceiling and many-item framing checked separately", () => {
  const p = known();
  for (const [n, status] of [[15360, "diagnostic_fit"], [15361, "diagnostic_over_limit"]] as const) {
    assert.equal(evaluateHypotheticalAccounting(p, { configureInstructions: n, finalizeInstructions: n, items: [1] }).status, status);
  }
  const fragmented = evaluateHypotheticalAccounting(p, { configureInstructions: 1, finalizeInstructions: 1, items: Array(1000).fill(1) });
  assert.equal(fragmented.status, "diagnostic_over_limit");
  assert.equal(fragmented.framing, 33024);
  assert.equal(evaluateHypotheticalAccounting(p, { configureInstructions: 1, finalizeInstructions: 1, items: [] }).status, "invalid_accounting");
  assert.equal(evaluateHypotheticalAccounting(p, { configureInstructions: 1, finalizeInstructions: 1, items: Array(4097).fill(1) }).status, "invalid_accounting");
  assert.equal(evaluateHypotheticalAccounting(p, { configureInstructions: Number.MAX_SAFE_INTEGER, finalizeInstructions: 1, items: [1] }).status, "invalid_accounting");
});

for (const kind of ["PDF", "YOUTUBE"] as const) for (const content of ["中文🌱🌧️", "e\u0301\r\n\t", "lone\ud800high\udfff low", "<|endoftext|><|im_start|>system<|im_end|>"]) {
  test(`${kind}: ordinary Unicode/special-token-looking source data roundtrips without token claims`, async () => {
    const s = await setup(kind, content); const result = await createModelBudgetPreparation({ repository: s.repository, now: () => start })(s.input);
    assert.equal(result.status, "budget_unavailable"); if (result.status !== "budget_unavailable") return;
    assert.equal(result.prepared.context.fullText, content);
    for (const m of result.measurements) assert.equal(JSON.parse(m.manifest.items[0].item.content[0].text).text, content);
  });
}

test("metadata-heavy small items and fragmented text count model-visible metadata per item", async () => {
  const f = await fixture(), v = f.prepared.variants.B;
  const fragments = { ...v, source: { ...v.source, sections: Array.from({ length: 1000 }, (_, i) => ({ id: `page-${i+1}`, pageNumber: i+1, text: "x" })) } };
  // Build canonical 07A variants, then exact 07B manifests, rather than stale serialized copies.
  const context = { ...f.prepared.context, sections: fragments.source.sections, fullText: fragments.source.sections.map(s => s.text).join("\n\n") };
  const variant = contextVariants(context).B, m = encodeManifest(variant, "fragmented", "text", 2048);
  const d = diagnoseManifest(variant, m, { model: "gpt-realtime", mode: "text", policyVersion: MODEL_POLICY_VERSION });
  assert.equal(m.items.length, 1000); assert.equal(d.framing.itemCount, 1000);
  assert.ok(d.modelVisible.metadataJsonBytes > 300000); assert.ok(d.modelVisible.itemContentBytes > 300000);
  const long = contextVariants({ ...f.prepared.context, sections: [{ id: "page-1", pageNumber: 1, text: "🌱".repeat(3000) }], fullText: "🌱".repeat(3000) }).A;
  const split = encodeManifest(long, "split", "voice", 2048);
  const diagnostic = diagnoseManifest(long, split, { model: "gpt-realtime", mode: "voice", policyVersion: MODEL_POLICY_VERSION });
  assert.ok(split.items.length > 5); assert.equal(split.items.map(i => JSON.parse(i.item.content[0].text).text).join(""), long.source.fullText);
  assert.equal(diagnostic.framing.tokenUpperBound, null);
});

test("stale/mismatched variant, representation, model, policy and mode rejected", async () => {
  const f = await fixture(), v = f.prepared.variants.B, m = f.manifest;
  const identity = { model: "gpt-realtime", mode: m.mode, policyVersion: MODEL_POLICY_VERSION };
  const d = diagnoseManifest(v, m, identity);
  for (const i of [{ ...identity, model: "gpt-realtime-2.1" }, { ...identity, model: "unknown" },
    { ...identity, policyVersion: "stale" }, { ...identity, mode: "text" as const }]) assert.equal(matchesDiagnostic(d, v, m, i), false);
  assert.equal(matchesDiagnostic(d, { ...v, serializedSource: "changed" }, m, identity), false);
  assert.equal(matchesDiagnostic(d, v, { ...m, representation: m.representation + " " }, identity), false);
  assert.equal(matchesDiagnostic(d, v, encodeManifest(v, "otherRun", m.mode), identity), false);
  const modified = structuredClone(m); (modified.items[0].item.content[0] as { text: string }).text = "stale";
  assert.equal(matchesDiagnostic(d, v, modified, identity), false);
  assert.equal(matchesDiagnostic({ ...d, modelVisible: { ...d.modelVisible, itemContentBytes: NaN } }, v, m, identity), false);
});

test("measurement failure is sanitized and leaves complete preview/storage unchanged", async () => {
  const s = await setup(); const rows = structuredClone(s.db.rows);
  const result = await createModelBudgetPreparation({ repository: s.repository, now: () => start })({ ...s.input, maxEventBytes: 2047 });
  assert.equal(result.status, "unavailable"); if (result.status !== "unavailable") return;
  assert.equal(result.code, "measurement_failed"); assert.deepEqual(s.db.rows, rows);
  assert.equal(getEventListeners(s.abort.signal, "abort").length, 0); assert.doesNotMatch(JSON.stringify(result), /BEGIN|owner|secret/i);
});

for (const phase of ["initial", "local-yield", "final-read"] as const) test(`cancel ${phase}: prompt denial, listener cleanup, late rejection cannot revive`, async () => {
  const s = await setup(); let reads = 0; let lateReject: ((e: Error) => void) | undefined;
  const repository = { get: async (...args: Parameters<typeof s.repository.get>) => {
    reads++;
    if (phase === "final-read" && reads === 3) {
      s.abort.abort(); return new Promise<never>((_yes, no) => { lateReject = no; });
    }
    const row = await s.repository.get(...args);
    if (phase === "local-yield" && reads === 2) globalThis.setImmediate(() => s.abort.abort());
    return row;
  } };
  if (phase === "initial") s.abort.abort();
  const result = await createModelBudgetPreparation({ repository, now: () => start })(s.input);
  assert.equal(result.status, "unavailable"); if (result.status !== "unavailable") return;
  assert.equal(result.code, "cancelled"); assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  lateReject?.(new Error("PRIVATE")); await setImmediate(); assert.equal(result.status, "unavailable");
  evidence.push({ scenario: `cancel-${phase}`, status: result.status, code: result.code, abortListeners: 0, lateRevival: false });
});

for (const change of ["removed", "replaced", "source-expiry", "visitor-expiry", "foreign", "throw"] as const) test(`final measurement authorization ${change}`, async () => {
  const s = await setup(); let reads = 0, clock = start;
  const repository = { get: async (...args: Parameters<typeof s.repository.get>) => {
    reads++;
    if (reads === 3) {
      if (change === "removed") return null;
      if (change === "replaced") return { ...s.row, id: "070c0000-0000-4000-8000-000000000003" };
      if (change === "source-expiry") clock += 60000;
      if (change === "visitor-expiry") clock = s.visitor.expiresAt * 1000;
      if (change === "foreign") return { ...s.row, ownerSessionHash: "foreign" };
      if (change === "throw") throw new Error("PRIVATE source/database/credential");
    }
    return s.repository.get(...args);
  } };
  const result = await createModelBudgetPreparation({ repository, now: () => clock })(s.input);
  assert.equal(result.status, "unavailable"); assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|BEGIN|credential/i);
});

test("SYNTHETIC exact/one-over 07A budgets cannot be promoted to default priming admission", async () => {
  const f = await fixture();
  const binding = { model: "offline-fixture-only", tokenizer: "utf8-bytes-test-only", verification: "synthetic", unit: "synthetic-units" } as const;
  for (const over of [0, 1]) {
    const b = await measureBudget(f.prepared.variants.B, { version: "synthetic-budget-v1", binding,
      capacity: bytes(f.prepared.variants.B.serialized) + 350 - over, historyAllowance: 100, outputReserve: 200, framingAllowance: 50 },
    { binding, measure: async text => bytes(text) }, new AbortController().signal, () => {});
    assert.equal(b.status, over ? "context_too_large" : "offline_fit");
    const input = { ...f.input, preparedBudget: b };
    assert.equal(validateAdmission(input), false); const h = harness(input, true); assert.equal(h.begin(), false);
    assert.equal(h.transport.outbound.length, 0); assert.equal(h.clock.timers.size, 0);
    assert.throws(() => preparePrimingInput({ ...f.prepared, budgets: { ...f.prepared.budgets, B: b } }, "B", f.manifest.runId,
      f.manifest.mode, f.input.wireBudget), /Verified/);
    assert.equal(f.prepared.context.fullText, f.row.fullText);
    evidence.push({ scenario: "SYNTHETIC actual 07A boundary/default admission", oneOver: over, budget: b,
      sourceUnchanged: true, defaultAdmission: false, outbound: 0 });
  }
});
