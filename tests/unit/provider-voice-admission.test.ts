import assert from "node:assert/strict";
import { after, test } from "node:test";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getEventListeners } from "node:events";
import { createProviderTextPreparation, createProviderVoicePreparation, matchesProviderPreparation } from "../../src/server/context/model-measurement.ts";
import { resolveProviderTextPolicy, resolveProviderVoicePolicy } from "../../src/server/context/model-policy.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, uploadedRecord } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { ENGLISH_RESPONSE_INSTRUCTIONS, PROVIDER_TEXT_POLICY, PROVIDER_VOICE_POLICY as policy } from "../../src/shared/priming-provider-policy.ts";
import { validateAdmission, validateProviderAdmission, type ProviderPrimingInput } from "../../src/shared/priming-admission.ts";
import { PrimingController } from "../../src/shared/priming-controller.ts";
import { VoiceLifecycle, type VoiceStatus, type VoiceMedia } from "../../src/shared/voice-lifecycle.ts";
import { TextLifecycle } from "../../src/shared/text-lifecycle.ts";
import { encodeManifest, sourceItemId, MAX_ITEMS, type SessionEvent } from "../../src/shared/priming-manifest.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { FakeClock, ScriptedTransport, flush, start, validateOutbound } from "../priming/harness.ts";
import { resources, deferred } from "../priming/voice-harness.ts";
import { initialVoiceSession } from "../../src/server/voice/provider.ts";
import { decodeCaptions } from "../priming/caption-decoder.ts";

const evidence: unknown[] = [];

for (const stage of ["initial", "final"]) for (const kind of ["PDF", "YOUTUBE"] as const)
  test(`13E ${kind} voice ${stage} missing English ACK fails before microphone`, async () => {
    const h = await lifecycle(kind); await h.begin();
    if (stage === "final") { await h.initial(); await h.items(); }
    const ack = h.transport.config();
    ack.session.instructions = ack.session.instructions.replace(ENGLISH_RESPONSE_INSTRUCTIONS, "");
    h.transport.emit(ack); await flush();
    assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0); h.clean();
  });

for (const kind of ["PDF", "YOUTUBE"] as const) {
  test(`08P ${kind} larger voice identity stays fixed across two provider turns`, async () => {
    const h = await lifecycle(kind); await h.begin();
    const projection = h.projection();
    assert.equal(projection.policy.model, "gpt-realtime-2.1");
    assert.equal(projection.policy.policyVersion, "provider-voice-full-source-default-2026-10-23-v9");
    assert.ok(Object.isFrozen(projection.policy));
    await h.initial(); await h.items(); await h.final();
    const before = JSON.stringify(h.transport.outbound);
    for (const id of ["summary08p", "followup08p"]) {
      h.transport.emit({ type: "response.created", event_id: `created_${id}`, response: { id, status: "in_progress" } });
      h.transport.emit({ type: "response.done", event_id: `done_${id}`, response: { id, status: "completed", output: [] } });
      await flush();
      assert.equal(h.controller.canSendQuestions, true);
      assert.equal(h.controller.snapshot.response.generation.responseId, id);
      assert.equal(h.projection().policy, projection.policy);
    }
    assert.equal(JSON.stringify(h.transport.outbound), before);
    assert.equal(h.mediaCalls(), 1); h.clean(); h.trace(`08P-${kind}-two-turns`);
  });
}
for (const stage of ["initial", "final"]) test(`08P old Mini ${stage} ACK cannot enable microphone`, async () => {
  const h = await lifecycle(); await h.begin();
  if (stage === "final") { await h.initial(); await h.items(); }
  const ack = h.transport.config(); ack.session.model = "gpt-realtime-2.1-mini";
  h.transport.emit(ack); await flush();
  assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0);
  h.transport.emit(h.transport.config()); await flush(); assert.equal(h.mediaCalls(), 0); h.clean();
});
for (const patch of [
  { model: "gpt-realtime-2.1-mini" },
  { policyVersion: "provider-voice-full-source-2026-10-21-v6" },
  { model: "gpt-realtime-2.1-mini", policyVersion: "provider-voice-full-source-2026-10-21-v6" },
  { mode: "text" }, { policyVersion: PROVIDER_TEXT_POLICY.policyVersion },
]) test(`08P stale/cross-mode policy ${JSON.stringify(patch)} rejected at browser admission`, async () => {
  const p = structuredClone((await input()).projection);
  Object.assign(p.policy, patch); assert.equal(validateProviderAdmission(p), false);
  const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
});

test("08O voice-only Stop/Continue candidate is bound to final ACK and rejects stale policy", async () => {
  assert.equal(policy.policyVersion, "provider-voice-full-source-default-2026-10-23-v9");
  assert.match(policy.answerInstructions, /When the user asks you to stop/);
  assert.match(policy.answerInstructions, /Never restart or resume/);
  assert.match(policy.answerInstructions, /remaining point rather than restarting/);
  const s = await source();
  assert.equal((await s.prepare({ ...s.args, policyVersion: "provider-voice-full-source-2026-10-21-v5" })).status, "unavailable");
  assert.equal(s.db.reads, 0);
  const h = await lifecycle(); await h.begin(); await h.initial(); await h.items();
  const final = h.transport.config();
  final.session.instructions = final.session.instructions.replace(policy.answerInstructions, "Old concise-only instruction.");
  h.transport.emit(final); await flush();
  assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0);
  h.transport.emit(h.transport.config()); await flush(); assert.equal(h.mediaCalls(), 0); h.clean();
  const p = await input();
  const text = encodeManifest(p.projection.variant, "text08O", "text", 16384, true);
  assert.doesNotMatch(text.finalize.session.instructions, /When the user asks you to stop/);
});

test("08K finite voice output headroom agrees across issuance and both priming stages", async () => {
  assert.equal(policy.maxOutputTokens, 2048);
  assert.equal(policy.policyVersion, "provider-voice-full-source-default-2026-10-23-v9");
  assert.equal(initialVoiceSession.max_output_tokens, 2048);
  const h = await input();
  for (const event of [h.projection.manifest.configure, h.projection.manifest.finalize]) {
    assert.equal(event.session.max_output_tokens, 2048);
    assert.match(event.session.instructions, /two to four short sentences/);
  }
  assert.equal(PROVIDER_TEXT_POLICY.maxOutputTokens, 2048);
  assert.equal(PROVIDER_TEXT_POLICY.policyVersion, "provider-text-full-source-default-2026-10-22-v4");
});

test("08M candidate keeps credential/initial VAD disabled and enables exact final threshold only after full ACKs", async () => {
  assert.equal(policy.activationThreshold, 0.65);
  assert.deepEqual(initialVoiceSession.audio.input, { turn_detection: null, transcription: null });
  const h = await lifecycle(); await h.begin();
  const m = h.projection().manifest;
  assert.deepEqual(m.configure.session.audio.input, { turn_detection: null, transcription: null });
  assert.deepEqual(m.finalize.session.audio.input.turn_detection, { type: "server_vad", create_response: true,
    interrupt_response: true, idle_timeout_ms: null, silence_duration_ms: 600, threshold: policy.activationThreshold });
  assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
  await h.initial(); assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
  await h.items(); assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
  await h.final(); assert.equal(h.mediaCalls(), 1); assert.equal(h.controller.canSendQuestions, true);
  assert.equal(h.transport.outbound.some(e => /response.create|input_audio/.test(e.type)), false);
  h.clean(); h.trace("08M exact threshold and ACK barriers");
});

for (const value of [undefined, null, 0.5, 0.61, "0.6", -1, 2]) {
  test(`08M final effective threshold ${JSON.stringify(value)} fails closed without microphone`, async () => {
    const h = await lifecycle(); await h.begin(); await h.initial(); await h.items();
    const e = h.transport.config(); Object.assign(e.session.audio.input.turn_detection!, { threshold: value });
    h.transport.emit(e); await flush();
    assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.controller.snapshot.failure, "priming");
    assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
    h.transport.stale?.(h.transport.config(h.projection().manifest.finalize)); await flush();
    assert.equal(h.mediaCalls(), 0); h.clean(); h.trace(`08M threshold ${JSON.stringify(value)}`);
  });
}

for (const stage of ["initial", "items", "final"] as const) {
  test(`08M enabled VAD in stale initial ACK at ${stage} rejects even with candidate threshold`, async () => {
    const h = await lifecycle(); await h.begin(); const m = h.projection().manifest;
    const e = h.transport.config(m.configure);
    if (stage !== "initial") await h.initial();
    if (stage === "final") await h.items();
    Object.assign(e.session.audio.input, { turn_detection: structuredClone(m.finalize.session.audio.input.turn_detection) });
    h.transport.emit(e); await flush();
    assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0); h.clean();
  });
}

for (const value of [undefined, 0.5, 0.7]) {
  test(`08M missing/wrong policy or manifest threshold ${value} rejects before transport`, async () => {
    const s = await input();
    for (const target of ["policy", "manifest"] as const) {
      const p = structuredClone(s.projection);
      if (target === "policy") Object.assign(p.policy, { activationThreshold: value });
      else Object.assign(p.manifest.finalize.session.audio.input.turn_detection!, { threshold: value });
      assert.equal(validateProviderAdmission(p), false);
      const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
    }
  });
}

test("08M stale v4 preparation and projection reject before source read/connection", async () => {
  const s = await source();
  assert.equal((await s.prepare({ ...s.args, policyVersion: "provider-voice-full-source-2026-10-21-v4" })).status, "unavailable");
  assert.equal(s.db.reads, 0);
  const p = structuredClone((await input()).projection);
  Object.assign(p.policy, { policyVersion: "provider-voice-full-source-2026-10-21-v4" });
  assert.equal(validateProviderAdmission(p), false);
  const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
});

test("08K stale v3 preparation rejects before source access; altered concise instruction fails admission", async () => {
  const s = await source();
  assert.equal((await s.prepare({ ...s.args, policyVersion: "provider-voice-full-source-2026-10-21-v3" })).status, "unavailable");
  assert.equal(s.db.reads, 0);
  const p = structuredClone((await input()).projection);
  p.manifest.finalize.session.instructions = p.manifest.finalize.session.instructions.replace(policy.answerInstructions, "");
  assert.equal(validateProviderAdmission(p), false);
});

for (const stage of ["initial", "final"] as const) for (const cap of [512, 2047, 2049, "inf"] as const) {
  test(`08K ${stage} effective output cap ${cap} rejects before microphone`, async () => {
    const h = await lifecycle(); await h.begin();
    if (stage === "final") { await h.initial(); await h.items(); }
    const ack = h.transport.config(); Object.assign(ack.session, { max_output_tokens: cap });
    h.transport.emit(ack); await flush();
    assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0); h.clean();
  });
}
after(async () => {
  if (process.env.PROVIDER_VOICE_EVIDENCE_PATH) await writeFile(process.env.PROVIDER_VOICE_EVIDENCE_PATH,
    JSON.stringify({ environment: "07G local synthetic storage, scripted provider, fake media; no live WebRTC", evidence }, null, 2));
});
async function source(kind: "PDF" | "YOUTUBE" = "PDF") {
  const db = new SyntheticSourceDatabase(), visitor = createVisitor({ origin: "https://07g.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
  const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
  row.expiresAt = new Date(start + 60_000);
  const repository = createSourceRepository(() => db.asClient()); await repository.replace(row, () => {});
  const abort = new AbortController(); let at = start;
  const args = { visitor, sourceId: row.id, signal: abort.signal, model: policy.model, mode: "voice" as const,
    policyVersion: policy.policyVersion, variant: "B" as "A" | "B", runId: "voice07g", maxEventBytes: 4096 };
  const prepare = createProviderVoicePreparation({ repository, now: () => at });
  return { db, visitor, row, repository, abort, args, prepare, time: (n: number) => { at = n; } };
}
async function input(kind: "PDF" | "YOUTUBE" = "PDF", variant: "A" | "B" = "B") {
  const s = await source(kind), result = await s.prepare({ ...s.args, variant });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") throw new Error("Preparation failed");
  return { ...s, projection: result.input, result };
}
class VoiceTransport extends ScriptedTransport {
  override send(raw: string) {
    assert.ok(this.open); const e: (typeof this.outbound)[number] = JSON.parse(raw);
    if (e.type === "session.update") {
      assert.equal(e.session.max_output_tokens, 2048); assert.equal(e.session.tool_choice, "none");
      assert.equal(e.session.truncation, "disabled"); assert.deepEqual(e.session.tools, []);
      assert.deepEqual(e.session.audio.input.transcription, e.event_id.endsWith("_final") ? policy.transcription : null); assert.deepEqual(e.session.audio.output, { voice: "marin" });
      assert.equal("reasoning" in e.session, false);
    } else validateOutbound(e);
    this.outbound.push(e); return this.sendAction?.(e);
  }
  override config(e?: SessionEvent) { const ack = super.config(e); ack.session.model = policy.model; return ack; }
}
function prime(projection: ProviderPrimingInput) {
  const clock = new FakeClock(), transport = new VoiceTransport(); let ready = 0;
  const controller = new PrimingController(clock, () => {}, () => { ready++; }, 1000);
  const begin = () => controller.start({ runId: projection.manifest.runId, connectionId: "connection07g" }, projection, transport);
  const initial = async () => { transport.emit(transport.config()); await flush(); };
  const items = async () => { for (const e of projection.manifest.items) transport.emit(transport.item(e)); await flush(); };
  const final = initial;
  return { clock, transport, controller, begin, initial, items, final, ready: () => ready };
}

for (const kind of ["PDF", "YOUTUBE"] as const) for (const variant of ["A", "B"] as const) {
  test(`08E correction ${kind}/${variant} UUID source item IDs fit conservative32 envelope with full ACK fidelity`, async () => {
    const s = await source(kind), runId = "ffffffff-ffff-4fff-bfff-ffffffffffff";
    const result = await s.prepare({ ...s.args, runId, variant });
    assert.equal(result.status, "prepared"); if (result.status !== "prepared") throw new Error("Preparation failed");
    const { manifest } = result.input;
    assert.ok(manifest.items.every(e => /^[A-Za-z0-9_-]{1,32}$/.test(e.item.id)), "UUID source IDs must fit the application's conservative32-character envelope");
    assert.equal(new Set(manifest.items.map(e => e.item.id)).size, manifest.items.length);
    assert.equal(manifest.runId, runId);
    for (const [i, e] of manifest.items.entries()) assert.equal(e.previous_item_id, i ? manifest.items[i - 1].item.id : undefined);
    const p = prime(result.input); assert.equal(p.begin(), true); await p.initial();
    assert.equal(p.ready(), 0); await p.items(); assert.equal(p.ready(), 0); await p.final();
    assert.equal(p.ready(), 1); assert.equal(p.controller.canSendQuestions, true); p.controller.stop();
    assert.equal(p.clock.timers.size, 0);
  });
}

test("08E correction compact UUID namespace preserves low run bits and all4096 ordinals", () => {
  const ids = new Set<string>();
  for (const run of ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "ffffffff-ffff-4fff-bfff-ffffffffffff"]) {
    for (let i = 0; i < MAX_ITEMS; i++) {
      const id = sourceItemId(run, i); assert.match(id, /^[A-Za-z0-9_-]{1,32}$/);
      assert.equal(ids.has(id), false); ids.add(id);
    }
  }
  assert.equal(ids.size, 3 * MAX_ITEMS);
  assert.equal(sourceItemId("text_1", 12), "text_1_source_12");
  for (const i of [-1, .5, MAX_ITEMS, Infinity]) assert.throws(() => sourceItemId("00000000-0000-4000-8000-000000000001", i));
});

test("08E correction compact IDs still ignore another UUID run's ACK and reject altered manifest IDs", async () => {
  const s = await source(), prepare = async (runId: string) => {
    const result = await s.prepare({ ...s.args, runId });
    assert.equal(result.status, "prepared"); if (result.status !== "prepared") throw new Error("Preparation failed"); return result.input;
  };
  const a = await prepare("00000000-0000-4000-8000-000000000001"), b = await prepare("00000000-0000-4000-8000-000000000002");
  const p = prime(a); assert.equal(p.begin(), true); await p.initial();
  p.transport.emit(p.transport.item(b.manifest.items[0])); await flush();
  assert.equal(p.controller.snapshot.acknowledged, 0); assert.equal(p.controller.canSendQuestions, false);
  await p.items(); assert.equal(p.ready(), 0); await p.final(); assert.equal(p.ready(), 1); p.controller.stop();
  const altered: ProviderPrimingInput = { ...a, manifest: { ...a.manifest,
    items: a.manifest.items.map((e, i) => i ? e : { ...e, item: { ...e.item, id: b.manifest.items[0].item.id } }) } };
  assert.equal(validateProviderAdmission(altered), false);
  const denied = prime(altered); assert.equal(denied.begin(), false); assert.equal(denied.transport.outbound.length, 0);
});
async function lifecycle(kind: "PDF" | "YOUTUBE" = "PDF", variant: "A" | "B" = "B") {
  const s = await source(kind), clock = new FakeClock(), r = resources(), transport = new VoiceTransport(), states: VoiceStatus[] = [];
  r.connection.transport = transport;
  r.connection.close = () => { r.counts.closes++; transport.close(); };
  let projection!: ProviderPrimingInput, mediaCalls = 0, connections = 0;
  const signals: AbortSignal[] = [], mediaGate = deferred<VoiceMedia>(); let holdMedia = false;
  const controller = new VoiceLifecycle(clock, {
    prepare: async (identity, signal) => {
      signals.push(signal);
      const result = await s.prepare({ ...s.args, signal, runId: identity.runId, variant });
      if (result.status !== "prepared") throw new Error("Unavailable"); projection = result.input; return projection;
    },
    connect: async () => { connections++; return r.connection; },
    acquireMedia: async () => { mediaCalls++; return holdMedia ? mediaGate.promise : r.media; },
  }, state => states.push(state), { preparationMs: 100, connectionMs: 200, primingMs: 1000, mediaMs: 300 });
  const begin = async () => {
    assert.equal(controller.start(s.row.id), true);
    for (let n = 0; n < 12 && !connections; n++) await new Promise<void>(resolve => setImmediate(resolve));
    await flush(); assert.equal(connections, 1);
  };
  const initial = async () => { transport.emit(transport.config()); await flush(); };
  const items = async () => { for (const item of projection.manifest.items) transport.emit(transport.item(item)); await flush(); };
  const final = initial;
  const clean = () => {
    controller.stop(); assert.equal(clock.timers.size, 0); assert.equal(r.counts.closes, 1);
    assert.equal(transport.closes, 1); assert.equal(transport.unsubscribes, 1); assert.equal(transport.receive, undefined);
    assert.equal(r.counts.playbackReleases, 1); assert.ok(r.tracks.every(t => !t.enabled && !t.listeners.size));
    for (const signal of signals) assert.equal(getEventListeners(signal, "abort").length, 0);
  };
  const trace = (scenario: string) => evidence.push({ scenario, states: states.map(s => ({ phase: s.phase, protocolReady: s.protocolReady,
    basis: s.basis, failure: s.failure, microphone: s.microphone })), mediaCalls, connections, closes: r.counts.closes,
    trackStops: r.tracks.map(t => t.stops), timers: clock.timers.size });
  return { ...s, r, transport, controller, clock, states, begin, initial, items, final, clean, trace,
    projection: () => projection, mediaCalls: () => mediaCalls, hold: () => { holdMedia = true; }, mediaGate };
}

for (const kind of ["PDF", "YOUTUBE"] as const) for (const variant of ["A", "B"] as const) {
  test(`07G ${kind}/${variant} complete source, locators, exact policy and default voice ACK/media barrier`, async () => {
    const h = await lifecycle(kind, variant); await h.begin(); const p = h.projection(), m = p.manifest;
    assert.equal(validateProviderAdmission(p), true); assert.equal(validateAdmission(p), false);
    assert.equal(matchesProviderPreparation(p, { ...h.args, runId: m.runId }, start), true);
    assert.equal(matchesProviderPreparation(structuredClone(p), { ...h.args, runId: m.runId }, start), false);
    // Cached server provenance is safe only while every nested projection remains immutable.
    const frozenTree = (value: unknown): void => {
      if (value && typeof value === "object") { assert.equal(Object.isFrozen(value), true); Object.values(value).forEach(frozenTree); }
    };
    frozenTree(p);
    assert.throws(() => { (p.manifest.items[0].item.content[0] as { text: string }).text = "altered"; }, TypeError);
    const forged = structuredClone(p); (forged.manifest.items[0].item.content[0] as { text: string }).text = "altered";
    Object.freeze(forged);
    assert.equal(matchesProviderPreparation(forged, { ...h.args, runId: m.runId }, start), false);
    for (const patch of [{ model: "gpt-realtime-2.1-mini" }, { mode: "text" as const }, { runId: "old" }, { sourceId: "old" }, { policyVersion: PROVIDER_TEXT_POLICY.policyVersion }])
      assert.equal(matchesProviderPreparation(p, { ...h.args, runId: m.runId, ...patch }, start), false);
    assert.equal(matchesProviderPreparation(p, { ...h.args, runId: m.runId }, h.row.expiresAt.getTime()), false);
    const fragments = m.items.map(i => JSON.parse(i.item.content[0].text));
    const packed = kind === "YOUTUBE" && variant === "B" ? decodeCaptions(m) : undefined;
    const sections = packed ? packed.map(s => s.text) : Array.from({ length: fragments[0].sectionCount }, (_, n) => fragments.filter(f => f.sectionIndex === n).map(f => f.text).join(""));
    assert.equal(sections.join(p.variant.source.separator), h.row.fullText);
    if (variant === "B") assert.deepEqual(packed ?? fragments.map(f => ({ ...f.locator, text: f.text })), p.variant.source.sections);
    assert.equal(h.db.reads, 3); assert.equal(h.db.creates, 1); assert.equal(h.db.deletes, 1);
    assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
    assert.equal(m.configure.session.audio.input.turn_detection, null);
    assert.deepEqual(m.configure.session.output_modalities, ["text"]);
    await h.initial(); assert.equal(h.mediaCalls(), 0); assert.equal(h.transport.outbound.some(e => e.event_id.endsWith("_final")), false);
    await h.items(); assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false);
    await h.final(); assert.equal(h.mediaCalls(), 1); assert.equal(h.controller.canSendQuestions, true);
    assert.equal(h.controller.snapshot.basis, "provider_enforced"); assert.equal(h.controller.snapshot.productionReady, false);
    assert.ok(h.r.tracks.every(t => t.enabled));
    assert.equal(h.transport.outbound.some(e => /response.create|input_audio/.test(e.type)), false);
    h.controller.mute(); assert.ok(h.r.tracks.every(t => !t.enabled)); h.controller.unmute();
    assert.ok(h.r.tracks.every(t => t.enabled)); h.clean(); h.clean();
    assert.ok(h.r.tracks.every(t => t.stops === 1)); assert.equal(h.r.counts.mediaReleases, 1);
    h.trace(`${kind}/${variant}`);
    evidence.push({ kind, variant, items: m.items.length, wireBytes: m.bytes, sourceCodeUnits: h.row.fullText.length,
      fullSourceSha256Utf16: createHash("sha256").update(h.row.fullText, "utf16le").digest("hex"), completeSource: true });
  });
}
for (const patch of [{ policyVersion: "provider-voice-full-source-2026-10-20-v1" }, { model: "gpt-realtime-2.1-mini" }, { model: "gpt-realtime-2.1-mini-latest" }, { mode: "text" as const },
  { policyVersion: "future" }, { policyVersion: PROVIDER_TEXT_POLICY.policyVersion }]) test(`07G unsupported ${JSON.stringify(patch)}`, async () => {
  const s = await source(), result = await s.prepare({ ...s.args, ...patch });
  assert.equal(result.status, "unavailable"); assert.equal(s.db.reads, 0);
});
test("07G server text/voice resolvers and preparations cannot cross-authorize", async () => {
  assert.equal(resolveProviderVoicePolicy(policy.model, "text", policy.policyVersion), undefined);
  assert.equal(resolveProviderTextPolicy(policy.model, "voice", policy.policyVersion), undefined);
  const s = await source(), text = createProviderTextPreparation({ repository: s.repository, now: () => start });
  assert.equal((await text(s.args)).status, "unavailable");
  const result = await s.prepare({ ...s.args, model: PROVIDER_TEXT_POLICY.model, mode: "text", policyVersion: PROVIDER_TEXT_POLICY.policyVersion });
  assert.equal(result.status, "unavailable"); assert.equal(s.db.reads, 0);
});
for (const problem of ["foreign", "expired", "removed", "replaced", "cancelled", "expiry-final", "replacement-final", "visitor-expiry-final", "cancel-final"])
  test(`07G server authorization ${problem} never prepares usable input`, async () => {
    const s = await source();
    if (problem === "foreign") s.args.visitor = createVisitor({ origin: "https://07g.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
    if (problem === "expired") s.time(s.row.expiresAt.getTime());
    if (problem === "removed") s.db.rows.clear();
    if (problem === "replaced") s.db.rows.get(s.row.id)!.id = "070e0000-0000-4000-8000-000000000001";
    if (problem === "cancelled") s.abort.abort();
    let reads = 0, at = start;
    const prepare = createProviderVoicePreparation({ now: () => at, repository: { get: async (...args) => {
      const row = await s.repository.get(...args);
      if (++reads === 3 && row) {
        if (problem === "expiry-final") row.expiresAt = new Date(start);
        if (problem === "replacement-final") row.fullText += "changed";
        if (problem === "visitor-expiry-final") at = s.visitor.expiresAt * 1000;
        if (problem === "cancel-final") s.abort.abort();
      } return row;
    } } });
    const result = problem.endsWith("final") ? await prepare(s.args) : await s.prepare(s.args);
    assert.equal(result.status, "unavailable"); assert.equal("input" in result, false);
  });
for (const read of [1, 2, 3]) test(`07G cancel noncooperating source read ${read}`, async () => {
  const s = await source(), gate = deferred<typeof s.row>(); let reads = 0;
  const prepare = createProviderVoicePreparation({ now: () => start, repository: { get: async (...args) => ++reads === read ? gate.promise : s.repository.get(...args) } });
  const pending = prepare(s.args);
  for (let n = 0; n < 12 && reads < read; n++) await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(reads, read); s.abort.abort(); const result = await pending;
  assert.equal(result.status, "unavailable"); assert.equal(result.code, "cancelled");
  gate.resolve(s.row); await flush(); assert.equal("input" in result, false);
});
for (const mutate of ["model", "revision", "text-policy", "mode", "item", "variant", "instructions", "output", "truncation", "synthetic", "representation", "voice", "reasoning", "vad", "transcription", "tools"])
  test(`07G altered ${mutate} denied before connection/media`, async () => {
    const s = await input(), p = structuredClone(s.projection);
    if (mutate === "model") Object.assign(p.policy, { model: "offline-fixture-only" });
    if (mutate === "revision") Object.assign(p.policy, { policyVersion: "future" });
    if (mutate === "text-policy") Object.assign(p, { policy: PROVIDER_TEXT_POLICY });
    if (mutate === "mode") Object.assign(p.manifest, { mode: "text" });
    if (mutate === "item") Object.assign(p.manifest.items[0].item.content[0], { text: "partial" });
    if (mutate === "variant") Object.assign(p.variant.source, { separator: "changed" });
    if (mutate === "instructions") Object.assign(p.variant, { instructions: ["changed"] });
    if (mutate === "output") Object.assign(p.manifest.configure.session, { max_output_tokens: 513 });
    if (mutate === "truncation") Object.assign(p.manifest.finalize.session, { truncation: "auto" });
    if (mutate === "synthetic") Object.assign(p, { wireBudget: { status: "measured_fit" } });
    if (mutate === "representation") Object.assign(p.manifest, { representation: "changed" });
    if (mutate === "voice") Object.assign(p.manifest.finalize.session.audio.output!, { voice: "cedar" });
    if (mutate === "reasoning") Object.assign(p.manifest.configure.session, { reasoning: { effort: "minimal" } });
    if (mutate === "vad") Object.assign(p.manifest.configure.session.audio.input, { turn_detection: { type: "server_vad" } });
    if (mutate === "transcription") Object.assign(p.manifest.configure.session.audio.input, { transcription: { model: "unexpected" } });
    if (mutate === "tools") Object.assign(p.manifest.finalize.session, { tools: [{}] });
    assert.equal(validateProviderAdmission(p), false); assert.equal(validateAdmission(p), false);
    const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
    let acquisitions = 0;
    Object.assign(p.manifest, { runId: "voice_1" });
    const voice = new VoiceLifecycle(new FakeClock(), { prepare: async () => p,
      connect: async () => { acquisitions++; throw new Error("Forbidden"); }, acquireMedia: async () => { acquisitions++; throw new Error("Forbidden"); } }, () => {});
    voice.start(s.row.id); await flush(); assert.equal(voice.snapshot.phase, "failed"); assert.equal(acquisitions, 0);
  });
test("07G voice provider input cannot start default text lifecycle", async () => {
  const s = await input(); let acquisitions = 0;
  const text = new TextLifecycle(new FakeClock(), { prepare: async () => s.projection,
    connect: async () => { acquisitions++; throw new Error("Forbidden"); } }, () => {});
  text.start(s.row.id); await flush(); assert.equal(text.snapshot.phase, "failed"); assert.equal(acquisitions, 0);
});

for (const stage of ["initial", "final"] as const) for (const field of ["voice", "audio-output-missing", "max_output_tokens", "tool_choice", "transcription", "turn_detection", "automatic-response", "interrupt", "idle-timeout", "output_modalities", "tools", "truncation", "model", "session-id"])
  test(`07G effective audio/settings ACK ${stage}/${field} fails closed`, async () => {
    const h = await lifecycle(); await h.begin();
    if (stage === "final") { await h.initial(); await h.items(); }
    const e = h.transport.config();
    if (field === "voice") Object.assign(e.session.audio.output!, { voice: "cedar" });
    else if (field === "audio-output-missing") Object.assign(e.session.audio, { output: undefined });
    else if (field === "transcription") Object.assign(e.session.audio.input, { transcription: { model: "unexpected" } });
    else if (field === "turn_detection") Object.assign(e.session.audio.input, { turn_detection: stage === "final" ? null : { type: "server_vad", create_response: true } });
    else if (["automatic-response", "interrupt", "idle-timeout"].includes(field)) {
      Object.assign(e.session.audio.input, { turn_detection: { type: "server_vad", create_response: field !== "automatic-response",
        interrupt_response: field !== "interrupt", idle_timeout_ms: field === "idle-timeout" ? 5000 : null } });
    } else if (field === "session-id" && stage === "initial") Object.assign(e.session, { id: "invalid!" });
    else Object.assign(e.session, { [field === "session-id" ? "id" : field]: { max_output_tokens: 513, tool_choice: "auto", output_modalities: ["text", "audio"], tools: [{}], truncation: "auto", model: "other", "session-id": "other_session" }[field] });
    h.transport.emit(e); await flush(); assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.mediaCalls(), 0);
    assert.equal(h.controller.canSendQuestions, false); h.clean(); h.trace(`${stage}/${field}`);
  });
for (const transcription of [undefined, null, {}, { model: "whisper-1" }, { model: policy.transcription.model, language: "en" },
  { model: policy.transcription.model, prompt: "Invent words" }, { model: policy.transcription.model, delay: "low" }]) {
  test(`09C final transcription ${JSON.stringify(transcription)} cannot acquire media`, async () => {
    const h = await lifecycle(); await h.begin(); await h.initial(); await h.items();
    const e = h.transport.config(); Object.assign(e.session.audio.input, { transcription });
    h.transport.emit(e); await flush(); assert.equal(h.controller.snapshot.phase, "failed");
    assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false); h.clean();
  });
}
test("09C provider empty transcription defaults preserve the exact model barrier", async () => {
  const h = await lifecycle(); await h.begin();
  assert.equal(h.projection().manifest.configure.session.audio.input.transcription, null);
  assert.deepEqual(h.projection().manifest.finalize.session.audio.input.transcription, policy.transcription);
  await h.initial(); await h.items(); assert.equal(h.mediaCalls(), 0);
  const e = h.transport.config(); Object.assign(e.session.audio.input, { transcription: { ...policy.transcription, language: null, prompt: "" } });
  h.transport.emit(e); await flush(); assert.equal(h.mediaCalls(), 1); h.clean();
});

test("08F explicit 600ms final voice pause policy preserves the initial media barrier", async () => {
  const h = await lifecycle(); await h.begin();
  assert.equal(policy.policyVersion, "provider-voice-full-source-default-2026-10-23-v9");
  assert.equal(h.projection().manifest.configure.session.audio.input.turn_detection, null);
  assert.deepEqual(h.projection().manifest.finalize.session.audio.input.turn_detection,
    { type: "server_vad", create_response: true, interrupt_response: true, idle_timeout_ms: null, silence_duration_ms: 600, threshold: policy.activationThreshold });
  await h.initial(); await h.items(); assert.equal(h.mediaCalls(), 0);
  await h.final(); assert.equal(h.mediaCalls(), 1); h.clean();
});
for (const value of [undefined, null, 200, 599, 601, "600"]) {
  test(`08F wrong or absent effective silence ${JSON.stringify(value)} denies microphone`, async () => {
    const h = await lifecycle(); await h.begin(); await h.initial(); await h.items();
    const e = h.transport.config(); Object.assign(e.session.audio.input.turn_detection!, { silence_duration_ms: value });
    h.transport.emit(e); await flush(); assert.equal(h.controller.snapshot.phase, "failed");
    assert.equal(h.mediaCalls(), 0); assert.equal(h.controller.canSendQuestions, false); h.clean();
  });
}
test("08F stale v2 policy and altered final pause manifest cannot acquire resources", async () => {
  const s = await source();
  assert.equal((await s.prepare({ ...s.args, policyVersion: "provider-voice-full-source-2026-10-21-v2" })).status, "unavailable");
  assert.equal(s.db.reads, 0);
  const p = structuredClone((await input()).projection);
  Object.assign(p.manifest.finalize.session.audio.input.turn_detection!, { silence_duration_ms: 200 });
  const representation = [p.manifest.configure, ...p.manifest.items, p.manifest.finalize].map(e => JSON.stringify(e)).join("\n");
  Object.assign(p.manifest, { representation, bytes: new TextEncoder().encode(representation).length });
  assert.equal(validateProviderAdmission(p), false);
  const h = prime(p); assert.equal(h.begin(), false); assert.equal(h.transport.outbound.length, 0);
});

test("08F provider text policy keeps VAD and transcription off at both stages", async () => {
  const s = await source(), prepare = createProviderTextPreparation({ repository: s.repository, now: () => start });
  const result = await prepare({ ...s.args, model: PROVIDER_TEXT_POLICY.model, mode: "text", policyVersion: PROVIDER_TEXT_POLICY.policyVersion });
  assert.equal(result.status, "prepared"); if (result.status !== "prepared") throw new Error("Preparation failed");
  assert.equal(result.input.policy.policyVersion, "provider-text-full-source-default-2026-10-22-v4");
  for (const event of [result.input.manifest.configure, result.input.manifest.finalize]) {
    assert.deepEqual(event.session.audio.input, { turn_detection: null, transcription: null });
    assert.deepEqual(event.session.output_modalities, ["text"]);
  }
});
for (const scenario of ["missing-initial", "missing-item", "added-only", "mismatched-item", "early-final", "missing-final", "unsettled-final", "unexpected-response"])
  test(`07G ${scenario} never acquires microphone or sends audio; late ACK cannot revive`, async () => {
    const h = await lifecycle(); await h.begin();
    if (scenario !== "missing-initial") await h.initial();
    const m = h.projection().manifest;
    if (scenario === "missing-item") for (const e of m.items.slice(1)) h.transport.emit(h.transport.item(e));
    if (scenario === "added-only") for (const e of m.items) h.transport.emit(h.transport.item(e, "conversation.item.added"));
    if (scenario === "mismatched-item") { const ack = h.transport.item(m.items[0]); Object.assign(ack.item.content[0], { text: "wrong" }); h.transport.emit(ack); }
    if (scenario === "early-final") h.transport.emit(h.transport.config(m.finalize));
    if (scenario === "unsettled-final") h.transport.sendAction = e => e.event_id.endsWith("_final") ? new Promise(() => {}) : undefined;
    if (["missing-final", "unsettled-final"].includes(scenario)) { await h.items(); if (scenario === "unsettled-final") await h.final(); }
    if (scenario === "unexpected-response") h.transport.emit({ type: "response.created", event_id: "unexpected" });
    assert.equal(h.controller.canSendQuestions, false); assert.equal(h.mediaCalls(), 0);
    const stale = h.transport.stale; h.clock.tick(1000); await flush();
    stale?.(h.transport.config(m.finalize)); await flush(); assert.equal(h.mediaCalls(), 0);
    assert.equal(h.controller.snapshot.phase, "failed"); h.clean(); h.trace(scenario);
  });
for (const stage of ["initial", "items", "final", "media", "ready"] as const) test(`07G Stop during ${stage} disposes once, late completions stay stopped`, async () => {
  const h = await lifecycle(); h.hold(); await h.begin();
  if (stage !== "initial") await h.initial();
  if (["final", "media", "ready"].includes(stage)) await h.items();
  if (["media", "ready"].includes(stage)) await h.final();
  if (stage === "ready") { h.mediaGate.resolve(h.r.media); await flush(); assert.equal(h.controller.canSendQuestions, true); }
  const stale = h.transport.stale; h.controller.stop(); h.mediaGate.resolve(h.r.media); await flush();
  stale?.(h.transport.config(h.projection().manifest.finalize)); await flush();
  assert.equal(h.controller.snapshot.phase, "ended"); assert.equal(h.controller.canSendQuestions, false); h.clean(); h.trace(`Stop/${stage}`);
});
for (const stage of ["initial", "items", "final", "media", "ready"] as const) for (const code of ["context_length_exceeded", "provider_failure"])
  test(`07G ${code} at ${stage} terminates and disposes, no retry`, async () => {
    const h = await lifecycle(); if (stage === "media") h.hold(); await h.begin();
    if (stage !== "initial") await h.initial();
    if (["final", "media", "ready"].includes(stage)) await h.items();
    if (["media", "ready"].includes(stage)) await h.final();
    h.transport.emit({ type: "error", event_id: "provider_error", error: { code, message: "PRIVATE07G_ERROR" } }); await flush();
    assert.equal(h.controller.snapshot.failure, code === "context_length_exceeded" ? "context_limit" : "provider");
    assert.equal(h.controller.snapshot.basis, undefined); assert.equal(h.controller.canSendQuestions, false);
    assert.equal(JSON.stringify(h.controller.snapshot).includes("PRIVATE07G_ERROR"), false);
    h.mediaGate.resolve(h.r.media); await flush(); h.clock.tick(120_000); h.clean(); h.trace(`${stage}/${code}`);
  });
for (const code of ["context_length_exceeded", "provider_failure"]) test(`07G generation failed response ${code} after full ACK is terminal`, async () => {
  const h = await lifecycle(); await h.begin(); await h.initial(); await h.items(); await h.final();
  assert.equal(h.controller.canSendQuestions, true);
  h.transport.emit({ type: "response.created", event_id: "created", response: { id: "response07g", status: "in_progress" } });
  h.transport.emit({ type: "response.done", event_id: "done", response: { id: "response07g", status: "failed",
    status_details: { error: { code, message: "PRIVATE07G_ERROR" } } } }); await flush();
  assert.equal(h.controller.snapshot.failure, code === "context_length_exceeded" ? "context_limit" : "provider");
  assert.equal(h.controller.canSendQuestions, false); h.clean(); h.trace(`generation/${code}`);
});
test("07G source ACKs in reverse, duplicate initial ACK, and server default reasoning are safe", async () => {
  const s = await input(), h = prime(s.projection); assert.equal(h.begin(), true);
  const initial = h.transport.config(); Object.assign(initial.session, { reasoning: { effort: "server-default" } });
  h.transport.emit(initial); await flush();
  for (const item of [...s.projection.manifest.items].reverse()) h.transport.emit(h.transport.item(item));
  await flush(); h.transport.emit(initial); assert.equal(h.ready(), 0); await h.final();
  assert.equal(h.ready(), 1); h.controller.stop(); assert.equal(h.transport.closes, 1);
});
test("07G large Unicode projection is lossless; resource bounds reject instead of shortening", async () => {
  const s = await input("PDF", "A"), text = " <source>🌱e\u0301雪\n".repeat(1500), v = structuredClone(s.projection.variant);
  Object.assign(v.source, { fullText: text }); const m = encodeManifest(v, "large07g", "voice", 4096, "voice");
  assert.ok(m.items.length > 1); assert.equal(m.items.map(i => JSON.parse(i.item.content[0].text).text).join(""), text);
  assert.throws(() => encodeManifest(v, "bound", "voice", 2047, "voice"));
  Object.assign(v.source, { fullText: "x".repeat(8_000_001) });
  assert.throws(() => encodeManifest(v, "bound", "voice", 2048, "voice"), /bounds/);
  assert.throws(() => encodeManifest(v, "bound", "text", 2048, "voice"), /voice mode/);
});
