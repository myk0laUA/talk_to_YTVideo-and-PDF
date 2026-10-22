import { decodeCaptions } from "../priming/caption-decoder.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createProviderTextPreparation, matchesProviderPreparation } from "../../src/server/context/model-measurement.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, uploadedRecord } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { PROVIDER_TEXT_POLICY as policy } from "../../src/shared/priming-provider-policy.ts";
import { validateAdmission, validateProviderAdmission, type ProviderPrimingInput } from "../../src/shared/priming-admission.ts";
import { PrimingController, type PrimingStatus } from "../../src/shared/priming-controller.ts";
import { TextLifecycle } from "../../src/shared/text-lifecycle.ts";
import { VoiceLifecycle } from "../../src/shared/voice-lifecycle.ts";
import { encodeManifest, type SessionEvent } from "../../src/shared/priming-manifest.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { FakeClock, flush, start } from "../priming/harness.ts";
import { TextTransport } from "../priming/text-harness.ts";

const evidence: unknown[] = [];
const originalFetch = globalThis.fetch;
let externalAttempts = 0;
globalThis.fetch = async () => { externalAttempts++; throw new Error("07E external request forbidden"); };
after(async () => {
  globalThis.fetch = originalFetch; assert.equal(externalAttempts, 0);
  if (process.env.PROVIDER_ADMISSION_EVIDENCE_PATH) await writeFile(process.env.PROVIDER_ADMISSION_EVIDENCE_PATH,
    JSON.stringify({ environment: "local; synthetic storage; ALL provider replies simulated", externalAttempts, evidence }, null, 2));
});
async function source(kind: "PDF" | "YOUTUBE" = "PDF") {
  const db = new SyntheticSourceDatabase(), visitor = createVisitor({ origin: "https://07e.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
  const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
  row.expiresAt = new Date(start + 60_000);
  const repository = createSourceRepository(() => db.asClient()); await repository.replace(row, () => {});
  const abort = new AbortController(); let at = start;
  const args = { visitor, sourceId: row.id, signal: abort.signal, model: policy.model, mode: "text" as const,
    policyVersion: policy.policyVersion, variant: "B" as "A" | "B", runId: "provider07e", maxEventBytes: 2048 };
  const prepare = createProviderTextPreparation({ repository, now: () => at });
  return { db, visitor, row, repository, abort, args, prepare, time: (n: number) => { at = n; } };
}
async function input(kind: "PDF" | "YOUTUBE" = "PDF", variant: "A" | "B" = "B") {
  const s = await source(kind), result = await s.prepare({ ...s.args, variant });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") throw new Error("Preparation failed");
  return { ...s, projection: result.input, result };
}
function config(t: TextTransport, desired?: SessionEvent) {
  const e = desired ?? t.commands.filter(c => c.session).at(-1)!;
  return { type: "session.updated", session: { ...structuredClone(e.session), id: "session_text", object: "realtime.session", model: policy.model } };
}
function prime(projection: ProviderPrimingInput) {
  const clock = new FakeClock(), transport = new TextTransport(), states: PrimingStatus[] = []; let ready = 0;
  const controller = new PrimingController(clock, s => states.push(s), () => { ready++; }, 1000);
  const begin = () => controller.start({ runId: projection.manifest.runId, connectionId: "connection07e" }, projection, transport);
  const initial = async () => { transport.emit(config(transport)); await flush(); };
  const items = async () => { for (const e of projection.manifest.items) transport.ack(e); await flush(); };
  const final = async () => { transport.emit(config(transport)); await flush(); };
  return { clock, transport, controller, states, begin, initial, items, final, ready: () => ready };
}

for (const kind of ["PDF", "YOUTUBE"] as const) for (const variant of ["A", "B"] as const) {
  test(`07E ${kind}/${variant}: full reconstruction, server provenance, default protocol priming without fit claim`, async () => {
    const s = await input(kind, variant), p = s.projection, m = p.manifest;
    const fragments = m.items.map(i => JSON.parse(i.item.content[0].text)).flatMap(data => data.fragments ?? [data]);
    const sections = kind === "YOUTUBE" && variant === "B" ? decodeCaptions(m).map(s => s.text) : Array.from({ length: fragments[0].sectionCount }, (_, n) => fragments.filter(f => f.sectionIndex === n).map(f => f.text).join(""));
    assert.equal(sections.join(p.variant.source.separator), s.row.fullText);
    assert.equal(s.db.reads, 3); assert.equal(s.db.creates, 1); assert.equal(s.db.deletes, 1); // Initial replace transaction only.
    assert.equal(validateProviderAdmission(p), true); assert.equal(validateAdmission(p), false);
    const expected = { ...s.args, variant };
    assert.equal(matchesProviderPreparation(p, expected, start), true);
    assert.equal(matchesProviderPreparation(structuredClone(p), expected, start), false);
    for (const patch of [{ runId: "stale" }, { sourceId: "foreign" }, { model: "gpt-realtime" }, { mode: "voice" as const }, { policyVersion: "unknown" }])
      assert.equal(matchesProviderPreparation(p, { ...expected, ...patch }, start), false);
    assert.equal(matchesProviderPreparation(p, expected, s.row.expiresAt.getTime()), false);
    assert.equal(s.result.productionReady, false); assert.equal(s.result.providerConfirmed, false);
    const h = prime(p); assert.equal(h.begin(), true); assert.equal(h.controller.canSendQuestions, false);
    await h.initial(); assert.equal(h.controller.canSendQuestions, false); await h.items(); assert.equal(h.controller.canSendQuestions, false);
    await h.final(); assert.equal(h.controller.canSendQuestions, true); assert.equal(h.ready(), 1);
    assert.equal(h.controller.snapshot.basis, "provider_enforced"); assert.equal(h.controller.snapshot.productionReady, false);
    h.controller.stop(); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
    evidence.push({ kind, variant, exactReconstruction: true, utf16CodeUnits: s.row.fullText.length,
      sourceSha256Utf16: createHash("sha256").update(s.row.fullText, "utf16le").digest("hex"), items: m.items.length,
      wireBytes: m.bytes, reads: s.db.reads, states: h.states, simulatedProvider: true });
  });
}

for (const patch of [{ model: "gpt-realtime-2.1" }, { model: "gpt-realtime-2.1-mini-latest" }, { mode: "voice" as const }, { policyVersion: "future" }])
  test(`07E unsupported policy ${JSON.stringify(patch)} fails closed`, async () => {
    const s = await source(); const r = await s.prepare({ ...s.args, ...patch });
    assert.equal(r.status, "unavailable"); assert.equal(s.db.reads, 0);
  });

for (const kind of ["PDF", "YOUTUBE"] as const) for (const problem of ["foreign", "expired", "removed", "replaced", "cancelled", "expiry-final", "replacement-final", "visitor-expiry-final", "cancel-final"] as const)
  test(`07E ${kind} server authorization ${problem}`, async () => {
    const s = await source(kind);
    if (problem === "foreign") s.args.visitor = createVisitor({ origin: "https://07e.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
    if (problem === "expired") s.time(s.row.expiresAt.getTime());
    if (problem === "removed") s.db.rows.clear();
    if (problem === "replaced") s.db.rows.get(s.row.id)!.id = "070e0000-0000-4000-8000-000000000001";
    if (problem === "cancelled") s.abort.abort();
    let reads = 0, at = start;
    const prepare = createProviderTextPreparation({ now: () => at, repository: { get: async (...args) => {
      const row = await s.repository.get(...args);
      if (++reads === 3 && row) {
        if (problem === "expiry-final") row.expiresAt = new Date(start);
        if (problem === "replacement-final") row.fullText += "changed";
        if (problem === "visitor-expiry-final") at = s.visitor.expiresAt * 1000;
        if (problem === "cancel-final") s.abort.abort();
      }
      return row;
    } } });
    const result = problem.endsWith("final") ? await prepare(s.args) : await s.prepare(s.args);
    assert.equal(result.status, "unavailable");
  });

for (const mutate of ["model", "revision", "voice", "item", "variant", "instructions", "output", "truncation", "synthetic", "representation"])
  test(`07E altered ${mutate} cannot start`, async () => {
    const s = await input(), p = structuredClone(s.projection);
    const raw = p as unknown as { policy: Record<string, unknown>; manifest: typeof p.manifest; variant: typeof p.variant; preparedBudget?: unknown };
    if (mutate === "model") raw.policy.model = "offline-fixture-only";
    if (mutate === "revision") raw.policy.policyVersion = "future";
    if (mutate === "voice") Object.assign(raw.manifest, { mode: "voice" });
    if (mutate === "item") Object.assign(raw.manifest.items[0].item.content[0], { text: "partial" });
    if (mutate === "variant") Object.assign(raw.variant.source, { separator: "changed" });
    if (mutate === "instructions") Object.assign(raw.variant, { instructions: ["changed"] });
    if (mutate === "output") Object.assign(raw.manifest.configure.session, { max_output_tokens: 4096 });
    if (mutate === "truncation") Object.assign(raw.manifest.finalize.session, { truncation: "auto" });
    if (mutate === "synthetic") raw.preparedBudget = { status: "measured_fit" };
    if (mutate === "representation") Object.assign(raw.manifest, { representation: "changed" });
    assert.equal(validateProviderAdmission(p), false); assert.equal(validateAdmission(p), false);
    const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.commands.length, 0); assert.equal(h.ready(), 0);
  });

for (const stage of ["initial", "final"] as const) for (const field of ["max_output_tokens", "truncation", "transcription", "reasoning", "tools", "model", "turn_detection"])
  test(`07E effective ${stage}/${field} mismatch`, async () => {
    const s = await input(), h = prime(s.projection); h.begin();
    if (stage === "final") { await h.initial(); await h.items(); }
    const e = config(h.transport);
    if (field === "transcription") Object.assign(e.session.audio!.input, { transcription: { model: "unexpected" } });
    else if (field === "turn_detection") Object.assign(e.session.audio!.input, { turn_detection: { type: "server_vad" } });
    else Object.assign(e.session, { [field]: { max_output_tokens: 513, truncation: "auto", reasoning: { effort: "high" }, tools: [{}], model: "other" }[field] });
    h.transport.emit(e); await flush(); assert.equal(h.controller.snapshot.failure, "configuration");
    assert.equal(h.ready(), 0); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
  });

for (const kind of ["PDF", "YOUTUBE"] as const) for (const scenario of ["missing", "partial", "early-final", "added-only", "timeout", "cancel", "unsettled-final"])
  test(`07E ${kind} ACK barrier ${scenario} and late callback`, async () => {
    const s = await input(kind), h = prime(s.projection); h.begin(); await h.initial();
    if (scenario === "early-final") h.transport.emit(config(h.transport, s.projection.manifest.finalize));
    else if (scenario === "added-only") for (const e of s.projection.manifest.items) h.transport.ack(e, { type: "conversation.item.added" });
    else if (scenario === "partial") h.transport.ack(s.projection.manifest.items[0]);
    else if (scenario === "unsettled-final") {
      h.transport.sendAction = e => e.event_id.endsWith("_final") ? new Promise(() => {}) : undefined;
      await h.items(); await h.final();
    }
    assert.equal(h.controller.canSendQuestions, false); assert.equal(h.ready(), 0);
    const stale = h.transport.stale;
    if (scenario === "cancel") h.controller.stop(); else h.clock.tick(1000);
    stale?.({ event_id: "late_config", ...config(h.transport, s.projection.manifest.finalize) }); await flush();
    assert.equal(h.controller.canSendQuestions, false); assert.equal(h.ready(), 0); assert.equal(h.transport.closes, 1);
    assert.equal(h.clock.timers.size, 0);
    evidence.push({ scenario, simulatedProvider: true, ready: h.ready(), closed: h.transport.closes });
  });

async function lifecycle() {
  const s = await source(), clock = new FakeClock(), transports: TextTransport[] = [];
  const controller = new TextLifecycle(clock, {
    prepare: async (identity, signal) => {
      const r = await s.prepare({ ...s.args, runId: identity.runId, signal });
      if (r.status !== "prepared") throw new Error("Unavailable"); return r.input;
    },
    connect: async () => { const transport = new TextTransport(); transports.push(transport); return { transport, close: () => transport.close() }; },
  }, () => {});
  assert.equal(controller.start(s.row.id), true);
  // Server preparation deliberately yields via setImmediate.
  for (let n = 0; n < 8 && !transports.length; n++) await new Promise<void>(resolve => setImmediate(resolve));
  const t = transports[0]; assert.ok(t);
  t.emit(config(t)); await flush(); for (const c of t.commands.filter(c => c.item)) t.ack(c); await flush();
  t.emit(config(t)); await flush(); assert.equal(controller.canSubmit, true);
  const question = async () => { assert.equal(controller.submit("Question about the full source?"), true); await flush(); t.ack(t.questions.at(-1)!); await flush(); };
  const created = () => {
    const id = `response_${t.responses.length}`;
    t.emit({ type: "response.created", response: { id, conversation_id: "conversation_text", status: "in_progress", output_modalities: ["text"], metadata: t.responses.at(-1)!.response!.metadata } });
    return id;
  };
  return { ...s, clock, controller, t, question, created, transports };
}
for (const turn of ["first", "later"] as const) for (const shape of ["standalone", "failed-response"] as const)
  test(`07E ${turn} ${shape} overflow preserves preview/history and never retries`, async () => {
    const h = await lifecycle(), preview = h.row.fullText;
    if (turn === "later") {
      await h.question(); const id = h.created();
      h.t.emit({ type: "response.output_item.added", response_id: id, output_index: 0,
        item: { id: "first_answer", type: "message", role: "assistant", content: [] } });
      h.t.emit({ type: "conversation.item.added", previous_item_id: h.t.questions.at(-1)!.item!.id,
        item: { id: "first_answer", type: "message", role: "assistant", content: [] } });
      h.t.emit({ type: "response.done", response: { id, conversation_id: "conversation_text", status: "completed",
        output: [{ id: "first_answer", type: "message", role: "assistant", content: [{ type: "output_text", text: "Simulated answer." }] }] } });
      await flush(); assert.equal(h.controller.canSubmit, true);
    }
    const earlier = structuredClone(h.controller.transcript.turns);
    await h.question(); const responses = h.t.responses.length;
    assert.equal(h.t.responses.at(-1)!.response!.max_output_tokens, 512);
    if (shape === "standalone") h.t.emit({ type: "error", error: { code: "context_length_exceeded", event_id: h.t.responses.at(-1)!.event_id, message: "PRIVATE_PROVIDER_DETAIL" } });
    else {
      const id = h.created(); h.t.emit({ type: "response.done", response: { id, conversation_id: "conversation_text", status: "failed", output: [],
        status_details: { type: "failed", error: { code: "context_length_exceeded", message: "PRIVATE_PROVIDER_DETAIL" } } } });
    }
    await flush(); assert.equal(h.controller.snapshot.failure, "context_limit"); assert.equal(h.controller.canSubmit, false);
    assert.equal(h.controller.snapshot.basis, undefined); assert.equal(h.row.fullText, preview);
    assert.deepEqual(h.controller.transcript.turns.slice(0, earlier.length), earlier);
    assert.equal(h.controller.submit("retry"), false); h.clock.tick(120_000); await flush();
    assert.equal(h.t.responses.length, responses); assert.equal(h.transports.length, 1); assert.equal(h.t.closes, 1);
    assert.equal(h.clock.timers.size, 0); assert.equal(h.t.unsubscribes, 1);
    assert.ok(!JSON.stringify(h.controller.snapshot).includes("PRIVATE_PROVIDER_DETAIL"));
    evidence.push({ turn, shape, simulatedProvider: true, priorTurns: earlier.length, retainedTurns: h.controller.transcript.turns.length,
      responses, automaticRetries: 0, previewUnchanged: true, closes: h.t.closes });
    // Recovery is an explicit fresh start, never an implicit retry on this connection.
    assert.equal(h.controller.start(h.row.id), true); h.controller.stop();
  });

test("07E voice refuses provider basis before connection or microphone, including altered voice projection", async () => {
  const s = await input(); let acquisitions = 0;
  for (const forgedVoice of [false, true]) {
    const p = structuredClone(s.projection);
    if (forgedVoice) Object.assign(p.manifest, { mode: "voice" });
    const controller = new VoiceLifecycle(new FakeClock(), { prepare: async () => p,
      connect: async () => { acquisitions++; throw new Error("Forbidden connection"); },
      acquireMedia: async () => { acquisitions++; throw new Error("Forbidden microphone"); } }, () => {});
    controller.start(s.row.id); await flush();
    assert.equal(controller.snapshot.failure, "budget_unavailable"); assert.equal(acquisitions, 0);
  }
});

for (const read of [1, 2, 3]) test(`07E noncooperating read ${read} cancellation settles and late resolution cannot prepare`, async () => {
  const s = await source(); let resolve!: (r: typeof s.row) => void, reads = 0;
  const gate = new Promise<typeof s.row>(yes => { resolve = yes; });
  const prepare = createProviderTextPreparation({ now: () => start, repository: { get: async (...args) => ++reads === read ? gate : s.repository.get(...args) } });
  const pending = prepare(s.args);
  for (let n = 0; n < 8 && reads < read; n++) await new Promise<void>(yes => setImmediate(yes));
  assert.equal(reads, read); s.abort.abort(); const result = await pending;
  assert.equal(result.status, "unavailable"); assert.equal(result.code, "cancelled");
  resolve(s.row); await flush(); assert.equal(result.status, "unavailable");
});

test("07E caller mutation during asynchronous preparation cannot change bound identity/policy", async () => {
  const s = await source(); const pending = s.prepare(s.args);
  Object.assign(s.args, { model: "other", variant: "A", runId: "changed", mode: "voice" });
  s.visitor.owner = "changed";
  const r = await pending; assert.equal(r.status, "prepared"); if (r.status !== "prepared") return;
  assert.equal(r.input.policy.model, policy.model); assert.equal(r.input.manifest.runId, "provider07e");
  assert.equal(r.input.manifest.variant, "B"); assert.equal(r.input.manifest.mode, "text");
});

test("07E split large Unicode text is complete; byte/item bounds never shorten source", async () => {
  const s = await input("PDF", "A");
  const text = " <role>🌱e\u0301雪\n".repeat(1500), variant = structuredClone(s.projection.variant);
  Object.assign(variant.source, { fullText: text });
  const m = encodeManifest(variant, "split07e", "text", 2048, true);
  assert.ok(m.items.length > 1);
  assert.equal(m.items.map(e => JSON.parse(e.item.content[0].text).text).join(""), text);
  assert.throws(() => encodeManifest(variant, "bounds", "text", 2047, true));
  Object.assign(variant.source, { fullText: "x".repeat(8_000_001) });
  assert.throws(() => encodeManifest(variant, "bounds", "text", 2048, true), /bounds/);
});

test("07E final ACK cannot overtake items; reverse complete item ACKs still require final barrier", async () => {
  const s = await input(), h = prime(s.projection); h.begin(); await h.initial();
  for (const e of [...s.projection.manifest.items].reverse()) { h.transport.ack(e); assert.equal(h.controller.canSendQuestions, false); }
  await flush(); assert.equal(h.controller.canSendQuestions, false); await h.final();
  assert.equal(h.ready(), 1); h.controller.stop();
});

test("07E documented failed response may omit output and still reports recoverable context rejection", async () => {
  const h = await lifecycle(); await h.question(); const id = h.created();
  h.t.emit({ type: "response.done", response: { id, conversation_id: "conversation_text", status: "failed",
    status_details: { type: "failed", error: { code: "context_length_exceeded" } } } });
  await flush(); assert.equal(h.controller.snapshot.failure, "context_limit"); assert.equal(h.t.responses.length, 1);
  assert.equal(h.controller.transcript.turns[0].role, "user"); assert.equal(h.controller.canSubmit, false);
});
