import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import ts from "typescript";
import { voiceHarness, deferred } from "../priming/voice-harness.ts";
import { flush } from "../priming/harness.ts";
import type { InterruptEvent } from "../../src/shared/voice-response.ts";
import type { VoiceMedia } from "../../src/shared/voice-lifecycle.ts";

let providerCalls = 0, eventSequence = 0;
const originalFetch = globalThis.fetch, traces: unknown[] = [];
before(() => { globalThis.fetch = async () => { providerCalls++; throw new Error("External requests forbidden"); }; });
after(async () => {
  globalThis.fetch = originalFetch; assert.equal(providerCalls, 0);
  await mkdir("artifacts/local/08b", { recursive: true });
  await writeFile("artifacts/local/08b/interruption-matrix.json", JSON.stringify({
    environment: "local; actual composed lifecycle/07B with scripted schema projections, fake clock/media; no physical audio", providerCalls, traces,
  }, null, 2));
});
const event = (type: string, fields: object = {}) => ({ type, event_id: `server_${++eventSequence}`, ...fields });
const created = (id = "resp_A") => event("response.created", { response: { object: "realtime.response", id, status: "in_progress", output: [], conversation_id: "conv_fixture" } });
const done = (id = "resp_A", status = "completed") => event("response.done", { response: { object: "realtime.response", id, status, output: [] } });
const buffer = (kind: string, id = "resp_A") => event(`output_audio_buffer.${kind}`, { response_id: id });
const speech = (kind: string, item = "item_A", at = 100) => event(`input_audio_buffer.speech_${kind}`, {
  item_id: item, [kind === "started" ? "audio_start_ms" : "audio_end_ms"]: at,
});
const error = (clientId?: string) => event("error", { error: { type: "invalid_request_error", message: "SECRET", ...(clientId ? { event_id: clientId } : {}) } });
async function ready() {
  const h = await voiceHarness(); await h.begin(); await h.ready();
  const r = h.all[0], initial = r.transport.outbound.length;
  const emit = (...events: unknown[]) => events.forEach(e => r.transport.emit(e));
  const commands = () => r.transport.outbound.slice(initial) as InterruptEvent[];
  const state = () => h.controller.snapshot.response;
  const clean = (scenario: string) => {
    assert.equal(r.transport.outbound.filter(e => e.type === "conversation.item.create").length,
      h.inputs.get("voice_1")!.manifest.items.length);
    assert.ok(commands().every(e => ["response.cancel", "output_audio_buffer.clear"].includes(e.type)));
    assert.doesNotMatch(JSON.stringify(h.states), /SECRET|input_text|clientSecret|audio_end_ms|source-priming-v1/);
    h.clean(); traces.push({ ...h.trace(scenario), commands: commands() });
  };
  return { ...h, r, emit, commands, state, clean };
}

test("Start→primed→generated→buffer playing→manual interrupt→next response→Stop", async () => {
  const h = await ready(); h.emit(created(), buffer("started"), done());
  assert.equal(h.state().generation.state, "completed"); assert.equal(h.state().output.state, "streaming");
  await h.controller.playAudio(); assert.equal(h.controller.snapshot.playback, "available");
  assert.equal(h.controller.interruptCurrentResponse(), true); assert.equal(h.controller.interruptCurrentResponse(), false);
  assert.deepEqual(h.commands(), [{ type: "output_audio_buffer.clear", event_id: "voice_1_interrupt_1_clear" }]);
  assert.equal(h.state().output.state, "streaming"); assert.equal(h.state().interruption.state, "pending");
  h.emit(buffer("cleared")); await flush(); assert.equal(h.state().interruption.state, "confirmed");
  h.emit(created("resp_B"), buffer("started", "resp_B"), done("resp_B"), buffer("stopped", "resp_B"));
  assert.equal(h.state().generation.responseId, "resp_B"); assert.equal(h.state().output.state, "stopped");
  assert.equal(h.r.counts.closes, 0); assert.equal(h.controller.canSendQuestions, true); h.clean("scripted-worker-journey");
});

test("manual during generation targets response, cancel then clear exactly once; ACKs in either order", async () => {
  for (const reversed of [false, true]) {
    const h = await ready(); h.emit(created(), buffer("started"));
    assert.equal(h.controller.interruptCurrentResponse(), true); assert.equal(h.controller.interruptCurrentResponse(), false);
    assert.deepEqual(h.commands(), [{ type: "response.cancel", event_id: "voice_1_interrupt_1_cancel", response_id: "resp_A" }]);
    await flush();
    assert.deepEqual(h.commands(), [
      { type: "response.cancel", event_id: "voice_1_interrupt_1_cancel", response_id: "resp_A" },
      { type: "output_audio_buffer.clear", event_id: "voice_1_interrupt_2_clear" },
    ]);
    h.emit(...(reversed ? [buffer("cleared"), done("resp_A", "cancelled")] : [done("resp_A", "cancelled"), buffer("cleared")]));
    assert.equal(h.state().interruption.state, "confirmed"); assert.equal(h.clock.timers.size, 0);
    h.emit(done("resp_A", "cancelled"), buffer("cleared"), buffer("started"), created());
    assert.equal(h.state().output.state, "cleared"); assert.equal(h.state().generation.state, "cancelled");
    assert.equal(h.controller.interruptCurrentResponse(), false); assert.equal(h.r.counts.closes, 0); h.clean(`manual-generation-ack-${reversed}`);
  }
});

for (const order of ["speech-first", "clear-first", "cancel-first"] as const) test(`automatic VAD ${order}: observe cancellation/buffer ACK, zero client commands`, async () => {
  const h = await ready(); h.emit(created(), buffer("started"));
  if (order === "clear-first") h.emit(buffer("cleared"));
  if (order === "cancel-first") h.emit(done("resp_A", "cancelled"));
  h.emit(speech("started"));
  assert.equal(h.state().input.state, "speaking"); assert.equal(h.commands().length, 0);
  h.emit(done("resp_A", "cancelled"), buffer("cleared"), speech("stopped", "item_A", 200)); await flush();
  assert.equal(h.state().interruption.state, "confirmed"); assert.equal(h.state().input.state, "stopped");
  assert.equal(h.controller.interruptCurrentResponse(), false); assert.equal(h.clock.timers.size, 0); h.clean(`vad-${order}`);
});

test("08F captured clear→late started→cancelled→stopped cannot revive cancelled output", async () => {
  const h = await ready(); h.emit(created(), buffer("started"));
  assert.equal(h.controller.interruptCurrentResponse(), true); await flush();
  h.emit(buffer("cleared"), buffer("started"));
  assert.equal(h.state().output.state, "cleared"); assert.equal(h.state().interruption.state, "pending");
  h.emit(done("resp_A", "cancelled"), buffer("stopped")); await flush();
  assert.equal(h.state().generation.state, "cancelled"); assert.equal(h.state().output.state, "stopped");
  assert.equal(h.state().interruption.state, "confirmed"); assert.equal(h.commands().length, 2);
  h.controller.mute(); assert.ok(h.r.tracks.every(t => !t.enabled)); h.controller.unmute();
  h.emit(created("resp_B"), buffer("started", "resp_B"), buffer("started"));
  assert.equal(h.state().generation.responseId, "resp_B"); assert.equal(h.state().output.responseId, "resp_B");
  assert.equal(h.state().output.state, "streaming"); assert.equal(h.commands().length, 2); h.clean("08f-captured-late-start");
});

test("mute changes only local input; interruption neither toggles mute nor releases session/playback", async () => {
  const h = await ready(); h.emit(created(), buffer("started")); await h.controller.playAudio();
  h.controller.mute(); assert.ok(h.r.tracks.every(t => !t.enabled)); assert.equal(h.commands().length, 0);
  assert.equal(h.state().generation.state, "generating"); assert.equal(h.controller.snapshot.playback, "available");
  assert.equal(h.controller.interruptCurrentResponse(), true); await flush();
  assert.equal(h.controller.snapshot.muted, true); assert.equal(h.r.counts.playbackReleases, 0); assert.equal(h.r.counts.closes, 0);
  h.emit(done("resp_A", "cancelled"), buffer("cleared")); h.controller.unmute();
  assert.ok(h.r.tracks.every(t => t.enabled)); h.clean("mute-independent");
});

test("new response before old clear ACK: old completion/clear/stopped cannot change new audio", async () => {
  const h = await ready(); h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); await flush();
  h.emit(created("resp_B"), buffer("started", "resp_B"));
  assert.equal(h.controller.interruptCurrentResponse(), false); // One bounded pending interruption.
  h.emit(done("resp_A", "cancelled"), buffer("cleared"), buffer("stopped"), buffer("started"), created());
  assert.equal(h.state().interruption.state, "confirmed"); assert.equal(h.state().generation.responseId, "resp_B");
  assert.deepEqual(h.state().output, { state: "streaming", responseId: "resp_B" });
  assert.equal(h.controller.interruptCurrentResponse(), true); await flush();
  assert.equal(h.commands()[2].type, "response.cancel"); assert.equal((h.commands()[2] as { response_id: string }).response_id, "resp_B");
  assert.equal(h.commands().length, 4); h.clean("late-old-after-new");
});

for (const result of ["resolve", "reject"] as const) test(`new response while cancel send pending; late ${result} cannot clear new audio`, async () => {
  const h = await ready(), p = deferred<void>(); h.r.transport.sendAction = () => p.promise;
  h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse();
  h.emit(created("resp_B"), buffer("started", "resp_B"));
  if (result === "resolve") p.resolve(); else p.reject(new Error("SECRET")); await flush();
  if (result === "resolve") {
    assert.equal(h.state().interruption.failure, "superseded"); assert.equal(h.state().output.responseId, "resp_B");
    assert.equal(h.r.counts.closes, 0);
  } else assert.equal(h.controller.snapshot.failure, "connection");
  assert.equal(h.commands().length, 1); h.clean(`new-during-pending-cancel-${result}`);
});

for (const stage of ["cancel-write", "clear-write", "ack", "vad"] as const) {
  for (const result of ["resolve", "reject"] as const) test(`Stop/replacement at ${stage}; late ${result} and events cannot revive`, async () => {
    const h = await ready(), p = deferred<void>(); h.emit(created(), buffer("started"));
    if (stage === "cancel-write") h.r.transport.sendAction = () => p.promise;
    if (stage === "clear-write") h.r.transport.sendAction = e => e.type === "output_audio_buffer.clear" ? p.promise : undefined;
    if (stage === "vad") h.emit(speech("started")); else { h.controller.interruptCurrentResponse(); await flush(); }
    const before = h.commands().length, stale = h.r.transport.stale!;
    h.controller.stop(); assert.equal(h.clock.timers.size, 0); h.selectB(); await h.begin(); await h.ready();
    const current = h.controller.snapshot;
    if (result === "resolve") p.resolve(); else p.reject(new Error("SECRET"));
    // Only promises actually returned by send are rejected.
    if (stage === "ack" || stage === "vad") void p.promise.catch(() => {});
    stale(done("resp_A", "cancelled")); stale(buffer("cleared")); stale(error()); await flush(); h.clock.tick(5000);
    assert.equal(h.controller.snapshot, current); assert.equal(h.commands().length, before);
    assert.equal(h.controller.snapshot.identity?.sourceId, h.b.row.id); h.clean(`replace-${stage}-${result}`);
  });
}

for (const origin of ["manual", "vad"] as const) test(`${origin} missing confirmation: fixed timeout, unknown output, no retry/close`, async () => {
  const h = await ready(); h.emit(created(), buffer("started"));
  if (origin === "manual") h.controller.interruptCurrentResponse(); else h.emit(speech("started")); await flush();
  h.emit(done("resp_A", "cancelled")); h.clock.tick(4999); assert.equal(h.state().interruption.state, "pending");
  for (let i = 0; i < 8; i++) h.emit(buffer("started"), speech("started"));
  h.clock.tick(1); assert.equal(h.state().interruption.failure, "timeout"); assert.equal(h.state().output.state, "unknown");
  assert.equal(h.clock.timers.size, 0); assert.equal(h.r.counts.closes, 0); assert.equal(h.controller.interruptCurrentResponse(), false);
  const count = h.commands().length; h.clock.tick(999999); assert.equal(h.commands().length, count);
  h.emit(created("resp_B"), buffer("started", "resp_B"), buffer("cleared"));
  assert.equal(h.state().output.responseId, "resp_B"); h.clean(`missing-${origin}-ack-timeout`);
});

test("generation completion races interrupt send: terminal generation plus independent buffer ACK is sufficient", async () => {
  const h = await ready(), p = deferred<void>(); h.r.transport.sendAction = e => e.type === "response.cancel" ? p.promise : undefined;
  h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); h.emit(done());
  h.emit(error("voice_1_interrupt_1_cancel")); p.resolve(); await flush();
  assert.equal(h.commands().length, 2); assert.equal(h.state().interruption.state, "pending");
  h.emit(buffer("cleared")); assert.equal(h.state().interruption.state, "confirmed");
  assert.equal(h.state().generation.state, "completed"); h.clean("completion-races-cancel");
});

for (const kind of ["throw", "reject", "closed"] as const) {
  for (const command of ["response.cancel", "output_audio_buffer.clear"] as const) test(`${command} ${kind}: transport failure and once-only cleanup`, async () => {
    const h = await ready(); h.emit(created(), buffer("started"));
    if (command === "output_audio_buffer.clear") h.emit(done());
    if (kind === "closed") h.r.transport.open = false;
    else h.r.transport.sendAction = () => { if (kind === "throw") throw new Error("SECRET"); return Promise.reject(new Error("SECRET")); };
    h.controller.interruptCurrentResponse(); await flush();
    assert.equal(h.controller.snapshot.failure, "connection"); assert.equal(h.controller.snapshot.phase, "failed");
    assert.equal(h.controller.snapshot.response.interruption.state, "idle"); h.clean(`send-${command}-${kind}`);
  });
}

for (const status of ["failed", "incomplete", "cancelled"] as const) test(`response ${status} preserves transport and subsequent independent response`, async () => {
  const h = await ready(); h.emit(created(), done("resp_A", status));
  assert.equal(h.state().generation.state, status); assert.equal(h.controller.snapshot.phase, "ready");
  assert.equal(h.r.counts.closes, 0); h.emit(created("resp_B"), buffer("started", "resp_B"));
  assert.equal(h.state().issue, undefined); assert.equal(h.state().generation.responseId, "resp_B"); h.clean(`response-${status}`);
});

test("provider command error fails interruption, unrelated/stale errors are ignored, no raw message escapes", async () => {
  const h = await ready(); h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); await flush();
  h.emit(error("unrelated")); assert.equal(h.state().interruption.state, "pending");
  h.emit(error("voice_1_interrupt_2_clear")); assert.equal(h.state().interruption.failure, "provider");
  assert.equal(h.state().output.state, "unknown"); assert.equal(h.r.counts.closes, 0);
  h.emit(created("resp_B"), buffer("started", "resp_B"), error("voice_1_interrupt_2_clear"));
  assert.equal(h.state().issue, undefined); assert.equal(h.state().output.responseId, "resp_B");
  h.emit(error()); assert.equal(h.state().issue, "provider"); h.clean("sanitized-provider-errors");
});

test("reversed/unknown/duplicate buffer events cannot reopen drained output or create a response", async () => {
  const h = await ready(); h.emit(done(), buffer("started"), buffer("cleared"));
  assert.equal(h.state().generation.state, "idle"); assert.equal(h.state().output.state, "idle");
  h.emit(created(), buffer("stopped"), buffer("started"), created(), done(), done("resp_A", "failed"));
  assert.equal(h.state().output.state, "stopped"); assert.equal(h.state().generation.state, "completed");
  assert.equal(h.state().issue, undefined); assert.equal(h.commands().length, 0); h.clean("reversed-events");
});

test("speech item IDs and monotonic input timestamps reject stale/mismatched/reversed edges", async () => {
  const h = await ready(); h.emit(speech("stopped"), speech("started"), speech("stopped", "item_other", 200));
  assert.equal(h.state().input.state, "speaking"); h.emit(speech("stopped", "item_A", 50));
  assert.equal(h.state().input.state, "speaking"); h.emit(speech("stopped", "item_A", 200));
  h.emit(speech("started", "item_A", 300), speech("started", "item_old", 150));
  assert.equal(h.state().input.state, "stopped"); h.emit(speech("started", "item_B", 300));
  h.emit(speech("stopped", "item_A", 400)); assert.equal(h.state().input.itemId, "item_B");
  assert.equal(h.state().input.state, "speaking"); h.clean("input-correlation");
});

test("ambiguous old playback plus new generation refuses untargeted manual clear and VAD attribution", async () => {
  const h = await ready(); h.emit(created(), buffer("started"), done(), created("resp_B"));
  assert.equal(h.controller.interruptCurrentResponse(), false); h.emit(speech("started"));
  assert.equal(h.state().interruption.state, "idle"); assert.equal(h.commands().length, 0);
  h.emit(buffer("stopped"), buffer("started", "resp_B"));
  assert.equal(h.controller.interruptCurrentResponse(), true); await flush(); assert.equal(h.commands().length, 2); h.clean("ambiguous-output");
});

for (const kind of ["responses", "speech"] as const) test(`${kind} bounded IDs: cap cannot evict tombstones and revive old work`, async () => {
  const h = await ready();
  for (let i = 0; i < 150; i++) {
    if (kind === "responses") h.emit(created(`resp_${i}`));
    else h.emit(speech("started", `item_${i}`, i * 2), speech("stopped", `item_${i}`, i * 2 + 1));
  }
  assert.equal(h.state().issue, "capacity"); assert.equal(h.controller.canSendQuestions, false);
  assert.ok(h.r.tracks.every(t => !t.enabled)); assert.equal(h.controller.interruptCurrentResponse(), false);
  assert.equal(h.clock.timers.size, 0); h.clean(`bounded-${kind}`);
});

for (const e of [null, [], {}, { type: "response.created" }, created("bad id"), done("resp_A", "unknown"),
  { ...buffer("cleared"), response_id: undefined }, { ...buffer("started"), event_id: "bad id" },
  { ...speech("started"), audio_start_ms: -1 }, { ...speech("stopped"), audio_end_ms: NaN },
  { ...created("resp_other"), response: { id: "resp_other", status: "in_progress", conversation_id: null } },
  event("response.output_audio.delta", { delta: "SECRET", response_id: "resp_A" })]) {
  test(`malformed/unhandled projection ${++eventSequence} leaves current response intact`, async () => {
    const h = await ready(); h.emit(created(), buffer("started")); const before = h.state();
    h.emit(e); assert.equal(h.state(), before); assert.equal(h.commands().length, 0); h.clean("malformed-ignored");
  });
}

test("pre-ready response events/actions cannot pass partial priming or pending media", async () => {
  for (const stage of ["configuration", "items", "final", "media"] as const) {
    const h = await voiceHarness(), media = deferred<VoiceMedia>();
    // Deferred media holds the full acknowledged barrier independently of response events.
    if (stage === "media") h.adapters.acquireMedia = () => media.promise;
    await h.begin(); if (stage !== "configuration") await h.config();
    if (stage === "final" || stage === "media") await h.items(); if (stage === "media") await h.final();
    assert.equal(h.controller.interruptCurrentResponse(), false);
    h.all[0].transport.emit(buffer("started")); h.all[0].transport.emit(speech("started"));
    if (stage === "media") h.all[0].transport.emit(created());
    assert.equal(h.controller.snapshot.response.generation.state, "idle"); assert.equal(h.controller.canSendQuestions, false);
    h.clean(); media.resolve(h.all[0].media); await flush();
  }
});

test("unchanged production admission denies scripted response state, zero connections/media", async () => {
  const h = await voiceHarness(true); await h.begin();
  assert.equal(h.controller.snapshot.failure, "budget_unavailable"); assert.equal(h.controller.interruptCurrentResponse(), false);
  assert.equal(h.calls.connect, 0); assert.equal(h.calls.media, 0); h.clean(); traces.push(h.trace("default-denied-admission"));
});

test("runtime contains no real provider/media/environment/text/source retention or runtime test bypass", async () => {
  for (const path of ["src/shared/voice-response.ts", "src/shared/voice-lifecycle.ts"]) {
    const source = await readFile(path, "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    assert.doesNotMatch(output, /from ["'][^"']*(?:server|tests)\//);
    assert.doesNotMatch(output, /fetch\(|WebSocket\(|RTCPeerConnection|getUserMedia|process\.env|localStorage|sessionStorage|synthetic-test-only|audio_end_ms:/);
  }
});

for (const missing of ["generation", "buffer", "both"] as const) test(`manual missing ${missing} ACK cannot imply silence or extend deadline`, async () => {
  const h = await ready(); h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); await flush();
  if (missing === "generation") h.emit(buffer("cleared"));
  if (missing === "buffer") h.emit(done("resp_A", "cancelled"));
  h.clock.tick(5000); assert.equal(h.state().interruption.failure, "timeout");
  assert.equal(h.state().output.state, missing === "generation" ? "cleared" : "unknown");
  assert.equal(h.state().generation.state, missing === "buffer" ? "cancelled" : "generating");
  assert.equal(h.r.counts.closes, 0); assert.equal(h.clock.timers.size, 0); h.clean(`missing-${missing}`);
});

test("automatic VAD without observed output start still requires buffer confirmation", async () => {
  const h = await ready(); h.emit(created(), speech("started"), done("resp_A", "cancelled"));
  assert.equal(h.state().interruption.state, "pending"); h.clock.tick(5000);
  assert.equal(h.state().interruption.failure, "timeout");
  assert.equal(h.commands().length, 0); h.clean("vad-missing-start-and-clear");
});

test("old timeout while newer buffer plays preserves the newer generation and output", async () => {
  const h = await ready(); h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); await flush();
  h.emit(created("resp_B"), buffer("started", "resp_B")); h.clock.tick(5000);
  assert.equal(h.state().interruption.failure, "timeout");
  assert.deepEqual(h.state().output, { state: "streaming", responseId: "resp_B" });
  assert.equal(h.state().generation.responseId, "resp_B"); h.clean("old-timeout-new-output");
});

test("server clears during pending cancel write: no redundant untargeted clear", async () => {
  const h = await ready(), p = deferred<void>(); h.emit(created(), buffer("started"));
  h.r.transport.sendAction = () => p.promise; h.controller.interruptCurrentResponse();
  h.emit(done("resp_A", "cancelled"), buffer("cleared")); assert.equal(h.state().interruption.state, "pending");
  p.resolve(); await flush(); assert.equal(h.state().interruption.state, "confirmed");
  assert.equal(h.commands().length, 1); h.clean("server-clear-before-write-settlement");
});

for (const waiting of ["generation", "buffer", "clear-write"] as const) test(`dispose while waiting ${waiting}: late ACK/write/failure ignored`, async () => {
  const h = await ready(), p = deferred<void>(); h.emit(created(), buffer("started"));
  if (waiting === "clear-write") h.r.transport.sendAction = e => e.type === "output_audio_buffer.clear" ? p.promise : undefined;
  h.controller.interruptCurrentResponse(); await flush();
  if (waiting === "generation") h.emit(buffer("cleared"));
  if (waiting === "buffer") h.emit(done("resp_A", "cancelled"));
  const stale = h.r.transport.stale!, count = h.commands().length;
  h.controller.dispose(); const before = h.controller.snapshot;
  stale(done("resp_A", "cancelled")); stale(buffer("cleared")); stale(error()); p.resolve(); await flush(); h.clock.tick(5000);
  assert.equal(h.controller.snapshot, before); assert.equal(h.controller.start(h.a.row.id), false);
  assert.equal(h.commands().length, count); h.clean(`dispose-pending-${waiting}`);
});

test("reentrant Stop from interruption observer prevents every pending command", async () => {
  const h = await ready(); h.emit(created(), buffer("started"));
  // The public notify boundary can synchronously call Stop. Instrument the existing observer array.
  const push = h.states.push.bind(h.states);
  h.states.push = (...states) => {
    const result = push(...states);
    if (states.some(s => s.response.interruption.state === "pending")) h.controller.stop();
    return result;
  };
  h.controller.interruptCurrentResponse(); await flush();
  assert.equal(h.commands().length, 0); assert.equal(h.controller.snapshot.phase, "ended"); h.clean("reentrant-interrupt-stop");
});

test("full source fixture and ordered priming payloads remain unchanged across interruptions", async () => {
  const h = await ready(), source = structuredClone(h.a.row);
  const originalItems = structuredClone(h.r.transport.outbound.filter(e => e.type === "conversation.item.create"));
  h.emit(created(), buffer("started")); h.controller.interruptCurrentResponse(); await flush();
  h.emit(done("resp_A", "cancelled"), buffer("cleared"), created("resp_B"), buffer("started", "resp_B"));
  assert.deepEqual(h.a.row, source);
  assert.deepEqual(h.r.transport.outbound.filter(e => e.type === "conversation.item.create"), originalItems);
  h.clean("source-preserved-no-retransmission");
});

test("supplied foreign/invalid conversation IDs cannot replace or finish current generation", async () => {
  const h = await ready(); h.emit(created(), buffer("started")); const current = h.state();
  h.emit(event("response.created", { response: { id: "resp_foreign", status: "in_progress", conversation_id: "conv_other" } }),
    event("response.done", { response: { id: "resp_A", status: "completed", conversation_id: "conv_other" } }),
    event("response.created", { response: { id: "resp_bad", status: "in_progress", conversation_id: 42 } }));
  assert.equal(h.state(), current); h.emit(done()); assert.equal(h.state().generation.state, "completed");
  h.clean("conversation-correlation");
});
