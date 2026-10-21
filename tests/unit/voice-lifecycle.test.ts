import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { getEventListeners } from "node:events";
import { setImmediate } from "node:timers/promises";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import ts from "typescript";
import { VoiceLifecycle, type VoiceConnection, type VoiceMedia } from "../../src/shared/voice-lifecycle.ts";
import type { PrimingInput } from "../../src/shared/priming-admission.ts";
import { createModelBudgetPreparation } from "../../src/server/context/model-measurement.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { start, flush } from "../priming/harness.ts";
import { voiceHarness, deferred, resources } from "../priming/voice-harness.ts";

const traces: unknown[] = [];
let providerCalls = 0;
const originalFetch = globalThis.fetch;
before(() => { globalThis.fetch = async () => { providerCalls++; throw new Error("External requests forbidden"); }; });
after(async () => {
  globalThis.fetch = originalFetch;
  assert.equal(providerCalls, 0);
  await mkdir("artifacts/local/08a", { recursive: true });
  await writeFile("artifacts/local/08a/lifecycle-matrix.json", JSON.stringify({ environment: "local; deterministic scripted transport/media/clock; no browser or device media",
    providerCalls, traces }, null, 2));
});

test("actual 07B configuration/item/final barriers; one explicit acquisition, independent playback and mute", async () => {
  const h = await voiceHarness(); await h.begin(); const r = h.all[0];
  assert.equal(h.controller.start(h.a.row.id), false);
  assert.equal(h.calls.connect, 1); assert.equal(h.calls.media, 0); assert.equal(h.controller.canSendQuestions, false);
  h.controller.mute(); await h.config(); await h.items(true);
  assert.equal(h.calls.media, 0); assert.equal(h.controller.canSendQuestions, false);
  const input = h.inputs.get("voice_1")!;
  r.transport.emit(r.transport.item(input.manifest.items[0])); await flush();
  assert.equal(h.calls.media, 0); assert.equal(h.controller.canSendQuestions, false);
  await h.final(); assert.equal(h.calls.media, 1); assert.equal(h.controller.snapshot.protocolReady, true);
  assert.equal(h.controller.snapshot.microphone, "available"); assert.equal(h.controller.snapshot.productionReady, false);
  assert.equal(h.controller.snapshot.basis, "synthetic-test-only"); assert.ok(r.tracks.every(t => !t.enabled));
  h.controller.unmute(); assert.ok(r.tracks.every(t => t.enabled)); assert.equal(h.controller.canSendQuestions, true);
  await h.controller.playAudio(); assert.equal(h.controller.snapshot.playback, "available");
  h.controller.mute(); assert.equal(h.controller.snapshot.playback, "available"); assert.ok(r.tracks.every(t => !t.enabled));
  h.controller.unmute(); h.controller.stop(); h.controller.stop(); h.controller.unmute();
  assert.ok(r.tracks.every(t => !t.enabled && t.stops === 1)); h.clean();
  traces.push(h.trace("Start-Mute-Unmute-Stop"));
});

for (const barrier of ["configuration", "item", "final"] as const) test(`withheld ${barrier} ACK times out: zero media or question sends`, async () => {
  const h = await voiceHarness(); await h.begin();
  if (barrier !== "configuration") await h.config();
  if (barrier === "item") await h.items(true);
  if (barrier === "final") await h.items();
  h.clock.tick(1000); await flush();
  assert.equal(h.controller.snapshot.failure, "priming"); assert.equal(h.calls.media, 0); assert.equal(h.controller.canSendQuestions, false);
  assert.equal(h.controller.snapshot.diagnostics!.at(-1)!.stage,
    barrier === "configuration" ? "initial_settings_ack" : barrier === "item" ? "source_items_ack" : "final_settings_ack");
  assert.equal(h.controller.snapshot.diagnostics!.at(-1)!.outcome, "timeout");
  h.clean(); traces.push(h.trace(`withheld-${barrier}`));
});

test("actual 07C unavailable preparation acquires nothing and clears terminal identity", async () => {
  const h = await voiceHarness(true);
  const visitor = createVisitor({ origin: "https://synthetic.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
  const row = { ...h.a.row, ownerSessionHash: visitor.owner, activeSourceOwner: visitor.owner };
  h.adapters.prepare = async (identity, signal) => {
    const result = await createModelBudgetPreparation({ repository: { get: async () => row }, now: () => start })({
      visitor, sourceId: row.id, signal, model: "gpt-realtime", runId: identity.runId });
    assert.equal(result.status, "budget_unavailable"); return { status: "budget_unavailable" };
  };
  await h.begin();
  for (let i = 0; i < 12 && h.controller.snapshot.phase === "connecting"; i++) await setImmediate();
  assert.equal(h.controller.snapshot.failure, "budget_unavailable"); assert.equal(h.calls.connect, 0); assert.equal(h.calls.media, 0);
  assert.equal(h.controller.snapshot.identity, undefined); h.clean(); traces.push(h.trace("default-07C-unavailable"));
});

for (const kind of ["synthetic", "estimated", "unverified"] as const) test(`production admission rejects ${kind} input before acquiring any resource`, async () => {
  const h = await voiceHarness(true);
  h.adapters.prepare = async identity => {
    const input = structuredClone(h.makeInput(identity));
    if (kind === "estimated") input.preparedBudget = { status: "budget_unavailable", reason: "missing_or_unverified_policy" };
    if (kind === "unverified") {
      input.wireBudget.status = "measured_fit";
      if (input.preparedBudget.status !== "budget_unavailable") {
        input.preparedBudget = { ...input.preparedBudget, status: "measured_fit", accounting: {
          ...input.preparedBudget.accounting, binding: { ...input.preparedBudget.accounting.binding, verification: "unverified" } } };
      }
    }
    return input;
  };
  await h.begin(); assert.equal(h.controller.snapshot.failure, "budget_unavailable");
  assert.equal(h.calls.connect, 0); assert.equal(h.calls.media, 0); h.clean(); traces.push(h.trace(`default-${kind}`));
});

for (const phase of ["preparation", "connection", "priming", "media", "ready"] as const) {
  for (const late of ["resolve", "reject"] as const) {
    test(`Stop/source A→B during ${phase}, late ${late}: no inherited context, readiness or resources`, async () => {
      const h = await voiceHarness(), pendingInput = deferred<PrimingInput>(), pendingConnection = deferred<VoiceConnection>(), pendingMedia = deferred<VoiceMedia>();
      const old = resources();
      const prepare = h.adapters.prepare, connect = h.adapters.connect, acquire = h.adapters.acquireMedia;
      let identity = { sourceId: h.a.row.id, runId: "voice_1", connectionId: "connection_1" };
      if (phase === "preparation") h.adapters.prepare = id => { identity = id; return pendingInput.promise; };
      if (phase === "connection") h.adapters.connect = async () => pendingConnection.promise;
      if (phase === "media") h.adapters.acquireMedia = async () => pendingMedia.promise;
      await h.begin();
      if (phase === "media" || phase === "ready") await h.ready();
      const previous = h.all[0], previousSends = previous?.transport.outbound.length;
      const stale = previous?.transport.stale, staleClose = previous?.transport.closed;
      h.controller.mute(); h.controller.stop(); h.controller.stop();
      assert.equal(h.clock.timers.size, 0);
      for (const s of h.signals) assert.equal(getEventListeners(s, "abort").length, 0);
      h.adapters.prepare = prepare; h.adapters.connect = connect; h.adapters.acquireMedia = acquire;
      h.selectB(); await h.begin(); assert.equal(h.controller.snapshot.phase, "priming");
      if (late === "reject") {
        if (phase === "preparation") pendingInput.reject(new Error("SECRET"));
        if (phase === "connection") pendingConnection.reject(new Error("SECRET"));
        if (phase === "media") pendingMedia.reject(new Error("SECRET"));
      } else {
        if (phase === "preparation") pendingInput.resolve(h.makeInput(identity));
        if (phase === "connection") pendingConnection.resolve(old.connection);
        if (phase === "media") pendingMedia.resolve(old.media);
      }
      stale?.({ type: "error" }); staleClose?.(); previous?.tracks[0].stale?.(); await flush();
      assert.equal(h.controller.snapshot.phase, "priming"); assert.equal(h.controller.snapshot.identity?.sourceId, h.b.row.id);
      assert.equal(h.controller.snapshot.muted, false); assert.equal(h.controller.canSendQuestions, false);
      if (previous) assert.equal(previous.transport.outbound.length, previousSends);
      await h.config();
      const b = h.all.at(-1)!;
      assert.ok(b.transport.outbound.filter(e => e.type === "conversation.item.create").every(e => JSON.parse(e.item.content[0].text).source.id === h.b.row.id));
      // Old source ACKs cannot advance the replacement, even when routed to its listener.
      if (previous) for (const e of h.inputs.get("voice_1")!.manifest.items) b.transport.emit(previous.transport.item(e));
      await flush(); assert.equal(h.controller.canSendQuestions, false);
      await h.items(); await h.final(); assert.equal(h.controller.canSendQuestions, true);
      if (late === "resolve" && phase === "connection") { assert.equal(old.counts.closes, 1); assert.equal(old.counts.playbackReleases, 1); }
      if (late === "resolve" && phase === "media") { assert.ok(old.tracks.every(t => t.stops === 1 && !t.enabled)); assert.equal(old.counts.mediaReleases, 1); }
      if (phase === "ready") assert.ok(previous.tracks.every(t => t.stops === 1 && !t.enabled));
      h.clean(); traces.push({ ...h.trace(`replace-${phase}-${late}`), lateResourceCounts: old.counts, lateTrackStops: old.tracks.map(t => t.stops) });
    });
  }
}

for (const phase of ["preparation", "connection", "media"] as const) for (const late of ["resolve", "reject"] as const) {
  test(`${phase} fixed wait timeout; late ${late} is disposed without retry`, async () => {
    const h = await voiceHarness(), p = deferred<PrimingInput>(), c = deferred<VoiceConnection>(), m = deferred<VoiceMedia>(), old = resources();
    const id = { sourceId: h.a.row.id, runId: "voice_1", connectionId: "connection_1" };
    if (phase === "preparation") h.adapters.prepare = async () => p.promise;
    if (phase === "connection") h.adapters.connect = async () => c.promise;
    if (phase === "media") h.adapters.acquireMedia = async () => m.promise;
    await h.begin(); if (phase === "media") await h.ready();
    h.clock.tick(phase === "preparation" ? 100 : phase === "connection" ? 200 : 300); await flush();
    assert.equal(h.controller.snapshot.failure, phase === "media" ? "microphone" : phase);
    if (late === "reject") {
      if (phase === "preparation") p.reject(new Error("SECRET"));
      if (phase === "connection") c.reject(new Error("SECRET"));
      if (phase === "media") m.reject(new Error("SECRET"));
    } else {
      if (phase === "preparation") p.resolve(h.makeInput(id));
      if (phase === "connection") c.resolve(old.connection);
      if (phase === "media") m.resolve(old.media);
    }
    await flush(); assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.controller.start("invalid source"), false);
    if (late === "resolve" && phase === "connection") assert.equal(old.counts.closes, 1);
    if (late === "resolve" && phase === "media") assert.ok(old.tracks.every(t => t.stops === 1));
    h.clean(); traces.push(h.trace(`timeout-${phase}-${late}`));
  });
}

test("delayed media is protocol-ready but cannot send; mute persists, playback is independent", async () => {
  const h = await voiceHarness(), m = deferred<VoiceMedia>(); h.adapters.acquireMedia = async () => m.promise;
  await h.begin(); await h.ready(); const r = h.all[0];
  assert.equal(h.controller.snapshot.phase, "ready"); assert.equal(h.controller.snapshot.microphone, "pending");
  assert.equal(h.controller.snapshot.protocolReady, true); assert.equal(h.controller.canSendQuestions, false);
  h.controller.mute(); await h.controller.playAudio(); assert.equal(h.controller.snapshot.playback, "available");
  m.resolve(r.media); await flush(); assert.ok(r.tracks.every(t => !t.enabled));
  h.controller.unmute(); assert.ok(r.tracks.every(t => t.enabled)); h.clean();
  assert.ok(r.tracks.every(t => t.stops === 1)); traces.push(h.trace("delayed-media-muted"));
});

for (const failure of ["denial", "empty", "ended", "attach", "subscribe", "partial"] as const) test(`microphone ${failure}: safe actionable terminal state, all transferred resources released`, async () => {
  const h = await voiceHarness(); await h.begin(); const r = h.all[0];
  if (failure === "denial") h.adapters.acquireMedia = async () => { throw Object.assign(new Error("SECRET"), { name: "NotAllowedError" }); };
  if (failure === "empty") r.media.tracks = [];
  if (failure === "ended") r.tracks[0].readyState = "ended";
  if (failure === "attach") r.media.attach = () => { throw new Error("SECRET"); };
  if (failure === "subscribe") r.tracks[1].subscribeEnded = () => { throw new Error("SECRET"); };
  const partial = resources();
  if (failure === "partial") h.adapters.acquireMedia = async () => {
    try { throw new Error("partial acquisition"); } finally { partial.tracks.forEach(t => t.stop()); partial.media.release(); }
  };
  await h.ready(); assert.equal(h.controller.snapshot.failure, "microphone"); assert.match(h.controller.snapshot.message, /text fallback when available/);
  assert.ok(!JSON.stringify(h.controller.snapshot).includes("SECRET")); h.clean();
  if (["ended", "attach", "subscribe"].includes(failure)) assert.ok(r.tracks.every(t => t.stops === 1));
  if (failure === "partial") { assert.ok(partial.tracks.every(t => t.stops === 1)); assert.equal(partial.counts.mediaReleases, 1); }
  traces.push(h.trace(`microphone-${failure}`));
});

for (const phase of ["priming", "media", "ready"] as const) test(`transport close during ${phase} releases once and never reconnects`, async () => {
  const h = await voiceHarness(), pending = deferred<VoiceMedia>();
  if (phase === "media") h.adapters.acquireMedia = async () => pending.promise;
  await h.begin(); const r = h.all[0]; if (phase !== "priming") await h.ready();
  r.transport.closed?.(); await flush(); assert.equal(h.controller.snapshot.failure, "connection");
  if (phase === "media") { pending.resolve(r.media); await flush(); }
  assert.equal(h.calls.connect, 1); h.clean(); traces.push(h.trace(`transport-close-${phase}`));
});

test("ended live track fails; unmute and stale callback cannot restart it", async () => {
  const h = await voiceHarness(); await h.begin(); await h.ready(); const r = h.all[0];
  r.tracks[0].end(); h.controller.unmute(); r.tracks[0].stale?.();
  assert.equal(h.controller.snapshot.failure, "track_ended"); assert.ok(r.tracks.every(t => !t.enabled && t.stops === 1)); h.clean();
});

test("throwing cleanup continues across listeners, tracks, playback and connection", async () => {
  const h = await voiceHarness(), connect = h.adapters.connect;
  h.adapters.connect = async (id, signal) => {
    const connection = await connect(id, signal), transport = connection.transport;
    const subscribe = transport.subscribe.bind(transport);
    // Throw AFTER removing the adapter-owned listener. close remains independently owned.
    transport.subscribe = (receive, closed) => { const remove = subscribe(receive, closed); return () => { remove(); throw new Error("SECRET"); }; };
    return connection;
  };
  await h.begin(); await h.ready(); const r = h.all[0]; r.throwing();
  h.controller.stop(); h.clean(); assert.ok(r.tracks.every(t => t.stops === 1 && t.removals === 1));
  assert.equal(r.counts.mediaReleases, 1); traces.push(h.trace("throwing-cleanup"));
});

for (const failure of ["prepare-reject", "connect-reject", "connect-partial", "closed-return", "subscribe-throw", "send-throw"] as const) {
  test(`${failure}: adapter ownership and setup failure never acquire microphone`, async () => {
    const h = await voiceHarness(), partial = resources();
    if (failure === "prepare-reject") h.adapters.prepare = async () => { throw new Error("SECRET"); };
    if (failure === "connect-reject") h.adapters.connect = async () => { throw new Error("SECRET"); };
    if (failure === "connect-partial") h.adapters.connect = async () => {
      try { throw new Error("SECRET"); }
      finally { partial.connection.playback.release(); partial.connection.close(); }
    };
    if (["closed-return", "subscribe-throw", "send-throw"].includes(failure)) h.adapters.connect = async () => {
      h.all.push(partial);
      if (failure === "closed-return") partial.transport.open = false;
      if (failure === "subscribe-throw") partial.transport.subscribe = () => { throw new Error("SECRET"); };
      if (failure === "send-throw") partial.transport.sendAction = () => { throw new Error("SECRET"); };
      return partial.connection;
    };
    await h.begin(); await flush();
    assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(h.calls.media, 0); assert.equal(h.clock.timers.size, 0);
    assert.ok(!JSON.stringify(h.controller.snapshot).includes("SECRET"));
    for (const signal of h.signals) assert.equal(getEventListeners(signal, "abort").length, 0);
    if (failure !== "prepare-reject" && failure !== "connect-reject") {
      assert.equal(partial.counts.closes, 1); assert.equal(partial.counts.playbackReleases, 1);
      assert.equal(partial.transport.receive, undefined);
    }
    traces.push(h.trace(failure));
  });
}

for (const point of ["connecting", "priming", "microphone-pending", "microphone-available"] as const) {
  test(`observer Stop during ${point}: no await or callback attaches released resources`, async () => {
    const h = await voiceHarness();
    // Harness observer stores snapshots; append a controlled synchronous observer stop.
    const push = h.states.push.bind(h.states);
    h.states.push = (...states) => {
      const result = push(...states), s = states.at(-1)!;
      if (s.phase === point || point === "microphone-pending" && s.microphone === "pending"
        || point === "microphone-available" && s.microphone === "available") h.controller.stop();
      return result;
    };
    await h.begin();
    if (h.controller.snapshot.phase === "priming") await h.ready();
    assert.equal(h.controller.snapshot.phase, "ended");
    assert.equal(h.controller.canSendQuestions, false); h.clean();
    for (const r of h.all) assert.ok(r.tracks.every(t => !t.enabled));
  });
}

test("Stop with a never-resolving adapter removes abort listener immediately; dispose cannot start again", async () => {
  const h = await voiceHarness();
  h.adapters.prepare = () => new Promise(() => {});
  await h.begin(); assert.equal(getEventListeners(h.signals[0], "abort").length, 1);
  h.controller.dispose(); assert.equal(getEventListeners(h.signals[0], "abort").length, 0);
  assert.equal(h.clock.timers.size, 0); assert.equal(h.controller.start(h.b.row.id), false);
});

test("cleanup callback cannot start a replacement while old resources are being released", async () => {
  const h = await voiceHarness(); await h.begin(); await h.ready(); const r = h.all[0];
  const release = r.media.release;
  r.media.release = () => { assert.equal(h.controller.start(h.b.row.id), false); release(); };
  h.controller.stop(); h.clean(); await h.begin(); await h.ready(); h.clean();
});

for (const stage of ["configuration", "item", "final"] as const) for (const outcome of ["resolve", "reject"] as const) {
  test(`pending ${stage} write, late ${outcome}: composed 07B cannot acquire stale media or revive A`, async () => {
    const h = await voiceHarness(), pending = deferred<void>(), connect = h.adapters.connect;
    h.adapters.connect = async (id, signal) => {
      const connection = await connect(id, signal), r = h.all.at(-1)!;
      r.transport.sendAction = e => {
        if (stage === "configuration" && e.event_id.endsWith("_config")
          || stage === "item" && e.event_id.endsWith("_create_0")
          || stage === "final" && e.event_id.endsWith("_final")) return pending.promise;
      };
      return connection;
    };
    await h.begin(); const old = h.all[0];
    if (stage !== "configuration") await h.config();
    if (stage === "final") { await h.items(); await h.final(); }
    assert.equal(h.calls.media, 0); const before = old.transport.outbound.length;
    h.controller.stop(); h.adapters.connect = connect; h.selectB(); await h.begin();
    if (outcome === "resolve") pending.resolve(); else pending.reject(new Error("SECRET"));
    await flush(); assert.equal(old.transport.outbound.length, before); assert.equal(h.calls.media, 0);
    assert.equal(h.controller.snapshot.identity?.sourceId, h.b.row.id);
    await h.ready(); assert.equal(h.calls.media, 1); h.clean(); traces.push(h.trace(`pending-${stage}-${outcome}`));
  });
}

for (const phase of ["connection", "media", "ready"] as const) test(`navigation dispose during ${phase}: late resources cannot attach or enable`, async () => {
  const h = await voiceHarness(), c = deferred<VoiceConnection>(), m = deferred<VoiceMedia>(), late = resources();
  if (phase === "connection") h.adapters.connect = async () => c.promise;
  if (phase === "media") h.adapters.acquireMedia = async () => m.promise;
  await h.begin(); if (phase !== "connection") await h.ready();
  h.controller.dispose(); c.resolve(late.connection); m.resolve(late.media); await flush();
  assert.equal(h.controller.start(h.b.row.id), false); assert.equal(h.controller.snapshot.phase, "ended");
  if (phase === "connection") { assert.equal(late.counts.closes, 1); assert.equal(late.counts.playbackReleases, 1); }
  if (phase === "media") assert.ok(late.tracks.every(t => t.stops === 1 && !t.enabled));
  if (phase === "ready") assert.ok(h.all[0].tracks.every(t => t.stops === 1 && !t.enabled));
  h.clean(); traces.push(h.trace(`dispose-${phase}`));
});

test("playback rejection/timeout and late success after Stop never imply generation or revival", async () => {
  const h = await voiceHarness(); await h.begin(); await h.ready(); const r = h.all[0];
  r.connection.playback.play = async () => { throw new Error("SECRET"); };
  await h.controller.playAudio(); assert.equal(h.controller.snapshot.playback, "blocked"); assert.equal(h.controller.snapshot.phase, "ready");
  const p = deferred<void>(); r.connection.playback.play = () => p.promise;
  const play = h.controller.playAudio(); await h.controller.playAudio(); h.clock.tick(300); await play;
  assert.equal(h.controller.snapshot.playback, "blocked");
  const late = deferred<void>(); r.connection.playback.play = () => late.promise;
  const last = h.controller.playAudio(); h.controller.stop(); await last; late.resolve(); await flush();
  assert.equal(h.controller.snapshot.phase, "ended"); assert.equal(h.controller.snapshot.playback, "none"); h.clean();
});

test("repeated Start→Stop→Start resets mute and identity; dispose prevents observer resurrection", async () => {
  const h = await voiceHarness();
  for (let i = 0; i < 4; i++) {
    await h.begin(); assert.equal(h.controller.snapshot.identity?.runId, `voice_${i + 1}`);
    assert.equal(h.controller.snapshot.muted, false); await h.ready(); h.controller.mute(); h.controller.stop();
  }
  h.clean(); h.controller.dispose(); assert.equal(h.controller.start(h.a.row.id), false);
  const other = new VoiceLifecycle(h.clock, h.adapters, s => { if (s.phase === "ended") other.start(h.a.row.id); });
  other.start(h.a.row.id); other.dispose(); await flush(); assert.equal(other.snapshot.phase, "ended"); assert.equal(h.clock.timers.size, 0);
});

for (const mismatch of ["source", "run", "mode"] as const) test(`${mismatch} identity mismatch rejected before connection`, async () => {
  const h = await voiceHarness();
  h.adapters.prepare = async id => {
    const input = h.makeInput({ ...id, ...(mismatch === "source" ? { sourceId: h.b.row.id } : mismatch === "run" ? { runId: "old" } : {}) });
    if (mismatch === "mode") return { ...input, manifest: { ...input.manifest, mode: "text" } };
    return input;
  };
  await h.begin(); assert.equal(h.controller.snapshot.failure, "preparation"); assert.equal(h.calls.connect, 0); h.clean();
});

test("new browser-safe runtime has no provider, server, environment, persistence or synthetic implementation", async () => {
  const source = await readFile("src/shared/voice-lifecycle.ts", "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  assert.doesNotMatch(output, /from ["'][^"']*(?:server|tests)\//);
  assert.doesNotMatch(output, /fetch\(|WebSocket|RTCPeerConnection|getUserMedia|process\.env|localStorage|sessionStorage|synthetic-test-only/);
  assert.throws(() => new VoiceLifecycle({ now: () => 0, setTimeout: () => 1, clearTimeout: () => {} }, {} as never, () => {}, { mediaMs: Infinity }));
});
