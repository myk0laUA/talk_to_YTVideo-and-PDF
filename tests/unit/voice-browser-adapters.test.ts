import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { randomUUID } from "node:crypto";
import { getEventListeners } from "node:events";
import { browserVoiceAdapters, BrowserVoiceTransport, type BrowserVoiceDependencies } from "../../src/app/voice-browser-adapters.ts";
import { VoiceLifecycle } from "../../src/shared/voice-lifecycle.ts";
import type { VoiceSetupReporter } from "../../src/shared/voice-diagnostics.ts";
import { VoiceRegistry } from "../../src/server/voice/registry.ts";
import { createVoiceHandlers } from "../../src/server/voice/handlers.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { uploadedRecord, captionRecord } from "../../src/server/sources/service.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { fakeBrowserVoice } from "../voice-adapter/fakes.mjs";
import { VoiceResponseController } from "../../src/shared/voice-response.ts";
import { VoiceEventDiagnostics } from "../../src/shared/voice-event-diagnostics.ts";
import { captionBoundary, oversizedCaptions } from "../context/caption-boundaries.ts";

const config = { origin: "https://08d.invalid", cookieSecret: "08".repeat(32), secure: true, apiKey: "sk-synthetic08d-never-live" };
const cleanups: (() => void)[] = [];
afterEach(() => { for (const clean of cleanups.splice(0)) clean(); });
const until = async (fn: () => boolean) => { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 1)); } assert.fail("condition deadline"); };
const tick = () => new Promise(r => setImmediate(r));

test("13E 4097 captions cross actual voice HTTP/adapter/ACK barrier with one credential and one microphone", async () => {
  // Use the unchanged production priming deadline for this larger source; most
  // small fault fixtures intentionally use a shortened two-second test deadline.
  const f = fixture("YOUTUBE", "", "", 2000, 25_000);
  Object.assign(f.row, captionRecord(captionBoundary(), { owner: f.row.ownerSessionHash, expiresAt: Math.floor(f.row.expiresAt.getTime() / 1000), token: "" }), { id: f.row.id });
  f.start(); await until(() => f.controller.snapshot.microphone === "available" || f.controller.snapshot.phase === "failed");
  assert.equal(f.controller.snapshot.microphone, "available", JSON.stringify({ status: f.controller.snapshot, counts: f.native.counts }));
  assert.equal(f.calls(), 1); assert.equal(f.native.counts.media, 1); assert.ok(f.native.counts.items < 100);
  assert.equal(f.native.counts.violations, 0); await f.stopped();
});

test("13E actual size rejection reaches voice adapter without mint, peer, microphone, retry or retained ticket", async () => {
  const f = fixture("YOUTUBE");
  Object.assign(f.row, captionRecord(oversizedCaptions(), { owner: f.row.ownerSessionHash, expiresAt: Math.floor(f.row.expiresAt.getTime() / 1000), token: "" }), { id: f.row.id });
  f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.controller.snapshot.failure, "source_too_large");
  assert.equal(f.calls(), 0); assert.equal(f.native.counts.peers + f.native.counts.media, 0);
  assert.equal(f.registry.resources.entries, 0); await f.stopped(); assert.equal(f.cancel(), 0);
});

for (const phase of ["preparation", "credential"] as const) for (const reason of ["window", "busy", "capacity"] as const)
  test(`12D ${phase} ${reason}: safe reason reaches lifecycle, no media or extra preparation cancellation`, async () => {
    const f = fixture(), base = f.deps.fetch;
    f.deps.fetch = async (url, init) => {
      if (url === (phase === "preparation" ? "/api/voice-preparations" : "/api/voice-preparations/credential"))
        return Response.json({code:"session_admission",reason}, {status:429,headers:{"Retry-After":"15"}});
      return base(url, init);
    };
    f.start();await until(()=>f.controller.snapshot.phase==="failed");
    assert.equal(f.controller.snapshot.failure,"admission");
    assert.deepEqual(f.controller.snapshot.admission, reason==="window"?{reason,retryAfterSeconds:15}:{reason});
    assert.equal(f.native.counts.media+f.native.counts.peers,0);assert.equal(f.calls(),0);
    await f.stopped();assert.equal(f.cancel(),phase==="preparation"?0:1);
  });

test("08N only the acquired mic reaches sender; duplicate remote delivery never rebinds or replays", async () => {
  const f = fixture(); f.start(); await until(() => f.controller.snapshot.microphone === "available");
  const mic = f.native.tracks.find(t => !t.remote)!, remote = f.native.tracks.find(t => t.remote)!;
  const sender = f.native.senders[0], speaker = f.native.speakers[0];
  assert.equal(sender.track, mic); assert.notEqual(sender.track, remote);
  assert.deepEqual(speaker.srcObject.getTracks(), [remote]); assert.equal(speaker.assignments, 1);
  await until(() => f.controller.snapshot.playback === "available"); const plays = f.native.counts.plays;
  const e = new Event("track"); Object.assign(e, { track: remote, streams: [speaker.srcObject] });
  f.native.peers[0].dispatchEvent(e); f.native.peers[0].dispatchEvent(e);
  assert.deepEqual(speaker.srcObject.getTracks(), [remote]); assert.equal(speaker.assignments, 1);
  assert.equal(f.native.counts.plays, plays); assert.equal(sender.track, mic);
  assert.equal(f.native.counts.peers, 1); assert.equal(f.native.counts.channels, 1); assert.equal(f.native.counts.media, 1);
  await f.stopped();
});

test("08N queued old manual clear must not clear newer output after backpressure drains", async () => {
  const f = fakeBrowserVoice(), pc = f.deps.peer(), dc = pc.createDataChannel("oai-events", { ordered: true });
  pc.connectionState = "connected"; dc.readyState = "open";
  const sent: string[] = []; dc.send = raw => { sent.push(JSON.parse(raw).type); };
  const trace = new VoiceEventDiagnostics(() => performance.now());
  const t = new BrowserVoiceTransport(pc as unknown as RTCPeerConnection, dc as unknown as RTCDataChannel, () => t.close(), trace);
  const clock = { now: Date.now, setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms), clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>) };
  const response = new VoiceResponseController(clock, t, "run08n", () => {}, () => t.close(), 5000);
  const receive = (type: string, fields: object) => response.receive({ type, event_id: "evt08n", ...fields });
  try {
    receive("response.created", { response: { id: "old08n", status: "in_progress" } });
    receive("output_audio_buffer.started", { response_id: "old08n" });
    assert.equal(response.interrupt(), true); // cancel is sent immediately
    f.control.buffered = 100_000; await tick(); // clear is now queued, after cancel settles
    assert.deepEqual(sent, ["response.cancel"]);
    assert.equal(trace.snapshot.counts.enqueue, 2); assert.equal(trace.snapshot.counts.send, 1);
    receive("response.created", { response: { id: "new08n", status: "in_progress" } });
    receive("output_audio_buffer.started", { response_id: "new08n" });
    f.control.buffered = 0; dc.dispatchEvent(new Event("bufferedamountlow")); await tick();
    assert.deepEqual(sent, ["response.cancel"]);
    assert.equal(trace.snapshot.counts.drop, 1); assert.equal(trace.snapshot.counts.send, 1);
    assert.equal(response.snapshot.interruption.failure, "superseded");
    assert.deepEqual(trace.snapshot.rows.filter(r => r.event === "output_audio_buffer.clear").map(r => [r.direction, r.command]), [["enqueue", 2], ["drop", 2]]);
  } finally { response.stop(); t.close(); }
});

test("08N queued guards preserve FIFO/completion, dropped command counts and failure cleanup", async () => {
  const f = fakeBrowserVoice(), pc = f.deps.peer(), dc = pc.createDataChannel("oai-events", { ordered: true });
  pc.connectionState = "connected"; dc.readyState = "open"; f.control.buffered = 100_000;
  const sent: string[] = []; dc.send = raw => sent.push(raw);
  const t = new BrowserVoiceTransport(pc as unknown as RTCPeerConnection, dc as unknown as RTCDataChannel, () => t.close());
  try {
    let valid = true;
    const a = t.send("first"), b = t.send("stale", () => valid), c = t.send("third"); valid = false;
    f.control.buffered = 0; dc.dispatchEvent(new Event("bufferedamountlow")); await Promise.all([a, b, c]);
    assert.deepEqual(sent, ["first", "third"]);
    f.control.buffered = 100_000; const stopped = assert.rejects(t.send("stopped", () => true)); t.close(); await stopped;
    assert.equal(f.counts.listeners, 0);
  } finally { t.close(); }
});

for (const mode of ["absent", "throws"] as const) test(`08N optional capture settings ${mode} remain unknown without permission retry`, async () => {
  const f = fixture(), media = f.deps.media;
  f.deps.supportedCapture = () => { throw new Error("PRIVATE08N"); };
  f.deps.media = async () => { const stream = await media();
    if (mode === "throws") stream.getTracks()[0].getSettings = () => { throw new Error("PRIVATE08N"); };
    return stream;
  };
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  const capture = f.controller.eventDiagnostics!.capture!;
  assert.deepEqual(capture.supported, { echoCancellation: "unknown", noiseSuppression: "unknown", autoGainControl: "unknown" });
  assert.deepEqual(capture.effective, capture.supported); assert.equal(f.native.counts.media, 1);
  await f.stopped();
});

test("08N native chronology distinguishes automatic generation, optional effective capture and explicit restart", async () => {
  const f = fixture();
  f.deps.supportedCapture = () => ({ echoCancellation: true, noiseSuppression: true });
  const media = f.deps.media;
  f.deps.media = async () => { const stream = await media(); stream.getTracks()[0].getSettings = () =>
    ({ echoCancellation: false, noiseSuppression: true, deviceId: "PRIVATE08N", groupId: "PRIVATE08N" }); return stream; };
  f.start(); await until(() => f.controller.snapshot.microphone === "available"); await until(() => f.controller.snapshot.playback === "available");
  const emit = (type: string, fields: object = {}) => f.native.emit({ type, ...fields });
  emit("response.created", { response: { id: "resp08n_A", status: "in_progress", conversation_id: "conv08n" } });
  emit("output_audio_buffer.started", { response_id: "resp08n_A" });
  emit("input_audio_buffer.speech_started", { item_id: "input08n_A", audio_start_ms: 100 });
  emit("response.done", { response: { id: "resp08n_A", status: "cancelled", status_details: { reason: "turn_detected" } } });
  emit("output_audio_buffer.cleared", { response_id: "resp08n_A" });
  emit("input_audio_buffer.speech_stopped", { item_id: "input08n_A", audio_end_ms: 500 });
  emit("input_audio_buffer.committed", { item_id: "input08n_A" });
  emit("response.created", { response: { id: "resp08n_B", status: "in_progress", conversation_id: "conv08n" } });
  emit("output_audio_buffer.started", { response_id: "resp08n_B" });
  emit("conversation.item.input_audio_transcription.completed", { item_id: "input08n_A", content_index: 0, transcript: "PRIVATE08N" });
  f.controller.mute(); f.controller.unmute();
  const s = f.controller.eventDiagnostics!;
  assert.equal(s.counts.session_start, 1); assert.equal(s.counts.priming_start, 1);
  assert.deepEqual([s.counts.peer_created, s.counts.channel_created, s.counts.media_acquired, s.counts.play_requested, s.counts.playback_bound], [1, 1, 1, 1, 1]);
  assert.deepEqual(s.rows.filter(r => r.event === "response.created").map(r => r.response), [1, 2]);
  assert.equal(s.rows.some(r => r.event === "response.create" || r.event === "response.cancel" || r.event === "output_audio_buffer.clear"), false);
  assert.equal(s.rows.find(r => r.event === "response.done")?.reason, "turn_detected");
  assert.equal(s.capture?.effective.echoCancellation, false); assert.equal(s.capture?.effective.autoGainControl, "unknown");
  assert.doesNotMatch(JSON.stringify(s), /PRIVATE08N|input08n|resp08n|conv08n|deviceId|groupId/);
  const sends = f.native.counts.sends; await f.stopped();
  const ended = f.controller.eventDiagnostics;
  emit("response.created", { response: { id: "late08n", status: "in_progress" } });
  assert.deepEqual(f.controller.eventDiagnostics, ended); assert.equal(f.native.counts.sends, sends);
  f.controller.reset(); assert.equal((() => f.controller.eventDiagnostics)(), undefined);
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  assert.equal(f.controller.eventDiagnostics?.counts.session_start, 1);
  assert.equal(f.controller.eventDiagnostics?.responseOrdinals, 0); await f.stopped();
});
function fixture(kind = "PDF", fault = "", hold = "", mediaMs = 2000, primingMs = 2000) {
  const visitor = createVisitor(config, Date.now()), row = kind === "PDF" ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
  let calls = 0, cancel = 0, preparation: Record<string, unknown> | undefined, httpHold = "";
  let releaseHttp: (() => void) | undefined;
  const registry = new VoiceRegistry({ repository: { get: async (id, owner) => id === row.id && owner === visitor.owner ? row : null },
    mint: async () => { calls++; return { clientSecret: "ek_synthetic08d", expiresAt: Math.floor(Date.now() / 1000) + 60 }; } });
  const handlers = createVoiceHandlers({ config: () => config, registry });
  const cookie = visitorCookie(visitor, config, Date.now()).split(";", 1)[0];
  const native = fakeBrowserVoice(); native.control.fault = fault; native.control.hold = hold;
  const signals: AbortSignal[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const suffix = String(url).replace("/api/voice-preparations", "");
    let response: Response;
    if (String(url).startsWith("https://api.openai.com")) {
      signals.push(init!.signal!);
      assert.equal(url, "https://api.openai.com/v1/realtime/calls"); assert.equal(init!.redirect, "error"); assert.equal(init!.credentials, "omit");
      response = fault === "sdp-mime" ? Response.json({}) : new Response(fault === "sdp-body" ? "bad" : "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n", { headers: { "content-type": "application/sdp" } });
    } else {
      const request = new Request(config.origin + String(url), { ...init, signal: undefined, headers: { ...init!.headers, origin: config.origin, cookie } });
      Object.defineProperty(request, "signal", { value: init!.signal }); // Avoid Request's own forwarding listener in ownership counts.
      signals.push(request.signal);
      if (suffix === "/cancel") { cancel++; return handlers.cancel(request); }
      response = await (suffix === "/credential" ? handlers.credential(request) : handlers.prepare(request));
      if (response.ok) {
        const data = await response.json();
        if (!suffix) {
          preparation = structuredClone(data);
          if (fault === "expired") data.expiresAt = Date.now() - 1;
          if (fault === "correlation") data.requestId = randomUUID();
          if (fault === "source") data.input.variant.source.id = randomUUID();
          if (fault === "policy") data.input.policy.model = "wrong";
          if (fault === "mode") data.input.manifest.mode = "text";
          if (fault === "manifest") data.input.manifest.items[0].item.content[0].text += "changed";
        } else {
          if (fault === "credential") data.clientSecret = "sk-permanent-not-allowed";
          if (fault === "credential-expiry") data.expiresAt = Math.floor(Date.now() / 1000) - 1;
          if (fault === "credential-correlation") data.preparationId = "wrong";
        }
        response = Response.json(data);
      }
    }
    const phase = String(url).startsWith("https:") ? "sdp" : suffix === "/credential" ? "credential" : "prepare";
    if (httpHold === phase) await new Promise<void>(resolve => { releaseHttp = resolve; });
    return response;
  };
  const deps = { ...native.deps, fetch: fetcher } as unknown as BrowserVoiceDependencies;
  const adapters = browserVoiceAdapters(deps);
  const clock = { now: Date.now, setTimeout: (f: () => void, ms: number) => setTimeout(f, ms), clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>) };
  const controller = new VoiceLifecycle(clock, adapters, () => {}, { primingMs, mediaMs });
  cleanups.push(() => { controller.dispose(); registry.dispose(); });
  const start = () => controller.start(row.id);
  const stopped = async () => { controller.stop(); native.release(); releaseHttp?.(); await tick(); await tick();
    assert.equal(native.counts.listeners, 0); assert.equal(native.counts.peerCloses, native.counts.peers);
    assert.equal(native.counts.channelCloses, native.counts.channels); assert.equal(native.counts.releases, native.counts.audio);
    assert.equal(native.snapshot().liveTracks, 0); assert.equal(native.counts.trackStops, native.counts.media - (native.control.denied ? 1 : 0));
    for (const signal of signals) assert.equal(getEventListeners(signal, "abort").length, 0);
    assert.equal(registry.resources.entries, 0); assert.equal(registry.resources.pendingMints, 0);
  };
  return { native, row, registry, controller, deps, adapters, start, stopped, signals, calls: () => calls, cancel: () => cancel,
    preparation: () => preparation, hold: (s: string) => { httpHold = s; }, release: () => releaseHttp?.() };
}

for (const [name, mutate] of [
  ["legacy", (d: Record<string, unknown>) => { delete d.issuedAt; delete d.timingVersion; }],
  ["version", (d: Record<string, unknown>) => { d.timingVersion = "wrong"; }],
  ...[null, "1000", -1, 1.5, Infinity].map(v => [String(v), (d: Record<string, unknown>) => { d.issuedAt = v; }] as const),
] as const) {
  test(`08J invalid preparation timing ${name} acquires no credentials/media`, async () => {
    const f = fixture(), base = f.deps.fetch;
    f.deps.fetch = async (url, init) => {
      const response = await base(url, init);
      if (url !== "/api/voice-preparations") return response;
      const data = await response.json(); mutate(data); return Response.json(data);
    };
    f.start(); await until(() => f.controller.snapshot.phase === "failed");
    assert.equal(f.calls(), 0); assert.equal(f.native.counts.peers + f.native.counts.media, 0); await f.stopped();
  });
}

for (const phase of ["prepare-body", "before-credential", "credential-body", "sdp", "source-sdp", "source-before-media", "source-media"]) {
  test(`08J monotonic elapsed time expires ${phase} and releases resources`, async () => {
    const f = fixture("PDF", "", phase === "source-media" ? "media" : phase === "source-before-media" ? "final" : ""), base = f.deps.fetch;
    let mono = 100;
    f.deps.now = () => mono;
    if (phase.startsWith("source-")) f.row.expiresAt = new Date(Date.now() + 2000);
    f.deps.fetch = async (url, init) => {
      const response = await base(url, init);
      if (url === "/api/voice-preparations" && phase === "prepare-body") {
        const text = await response.text();
        return new Response(new ReadableStream({ start(c) { mono += 30_001; c.enqueue(new TextEncoder().encode(text)); c.close(); } }),
          { headers: { "content-type": "application/json" } });
      }
      if (url === "/api/voice-preparations/credential" && phase === "credential-body") {
        const data = await response.json(); data.expiresAt = Math.floor(data.issuedAt / 1000) + 1;
        mono += 1500; return Response.json(data);
      }
      if (String(url).startsWith("https://api.openai.com")) {
        if (phase === "sdp") mono += 65_001;
        if (phase === "source-sdp") mono += 2001;
      }
      return response;
    };
    if (phase === "before-credential") {
      const abort = new AbortController(), identity = { sourceId: f.row.id, connectionId: "08j", runId: "pending" };
      const p = await f.adapters.prepare(identity, abort.signal);
      assert.ok("serverRunId" in p);
      mono += 30_001;
      await assert.rejects(f.adapters.connect({ ...identity, runId: p.serverRunId! }, abort.signal));
      assert.equal(f.calls(), 0); abort.abort();
    } else {
      f.start();
      if (phase === "source-before-media") {
        await until(() => f.native.snapshot().pending > 0); mono += 2001; f.native.release("final");
      }
      if (phase === "source-media") {
        await until(() => f.native.counts.media === 1); mono += 2001; f.native.release("media");
      }
      await until(() => f.controller.snapshot.phase === "failed");
      if (phase === "prepare-body") assert.equal(f.calls(), 0);
      if (phase !== "source-media") assert.equal(f.native.counts.media, 0);
    }
    await f.stopped();
  });
}

for (const mutation of ["legacy", "version", "issued", "milliseconds", "too-long", "expired"]) {
  test(`08J malformed credential timing ${mutation} never constructs a peer`, async () => {
    const f = fixture(), base = f.deps.fetch;
    f.deps.fetch = async (url, init) => {
      const r = await base(url, init); if (url !== "/api/voice-preparations/credential") return r;
      const d = await r.json();
      if (mutation === "legacy") { delete d.issuedAt; delete d.timingVersion; }
      if (mutation === "version") d.timingVersion = "wrong";
      if (mutation === "issued") d.issuedAt = "bad";
      if (mutation === "milliseconds") d.expiresAt *= 1000;
      if (mutation === "too-long") d.expiresAt += 60;
      if (mutation === "expired") d.expiresAt = Math.floor(d.issuedAt / 1000);
      return Response.json(d);
    };
    f.start(); await until(() => f.controller.snapshot.phase === "failed");
    assert.equal(f.native.counts.peers + f.native.counts.media, 0); await f.stopped();
  });
}

for (const [fault, reason] of [["expired", "ticket_expired"], ["correlation", "request_identity"], ["policy", "policy"],
  ["source", "source_serialization"], ["mode", "admission_shape"], ["manifest", "manifest_fidelity"]]) {
  test(`08I lifecycle preserves first rejection category ${fault} without credentials/media`, async () => {
    const f = fixture("PDF", fault); f.start(); await until(() => f.controller.snapshot.phase === "failed");
    assert.equal(f.controller.snapshot.diagnostics!.at(-1)!.reason, reason);
    assert.equal(f.calls(), 0); assert.equal(f.native.counts.peers + f.native.counts.media, 0);
    await f.stopped();
  });
}

for (const [fault, reason] of [["no-body", "response_body"], ["broken-body", "response_body"], ["redirected", "response_envelope"],
  ["length", "response_size"], ["incomplete-utf8", "response_utf8"]]) {
  test(`08I bounded reader ${fault} reports only closed reason`, async () => {
    const f = fixture(), base = f.deps.fetch;
    f.deps.fetch = async (url, init) => {
      if (url !== "/api/voice-preparations") return base(url, init);
      if (fault === "no-body") return new Response(null, { headers: { "content-type": "application/json" } });
      if (fault === "broken-body") return new Response(new ReadableStream({ start(c) { c.error(new Error("PRIVATE_SENTINEL")); } }), { headers: { "content-type": "application/json" } });
      if (fault === "incomplete-utf8") return new Response(new Uint8Array([0xc3]), { headers: { "content-type": "application/json" } });
      const r = new Response("{}", { headers: { "content-type": "application/json", ...(fault === "length" ? { "content-length": "24500001" } : {}) } });
      if (fault === "redirected") Object.defineProperty(r, "redirected", { value: true });
      return r;
    };
    f.start(); await until(() => f.controller.snapshot.phase === "failed");
    assert.equal(f.controller.snapshot.diagnostics!.at(-1)!.reason, reason);
    assert.doesNotMatch(JSON.stringify(f.controller.snapshot.diagnostics), /PRIVATE_SENTINEL/);
    assert.equal(f.calls(), 0); assert.equal(f.native.counts.peers + f.native.counts.media, 0); await f.stopped();
  });
}

for (const kind of ["PDF", "YOUTUBE"]) test(`08D ${kind} actual boundary → native adapter → full ACK → disabled track attach`, async () => {
  const f = fixture(kind); f.start();
  await until(() => f.controller.snapshot.microphone === "available");
  assert.equal(f.calls(), 1); assert.equal(f.native.counts.violations, 0); assert.equal(f.native.counts.media, 1);
  assert.equal(f.native.counts.attached, 1); assert.equal(f.native.snapshot().enabledTracks, 1);
  const input = f.preparation()!.input as { manifest: { runId: string; items: unknown[] } };
  assert.equal(f.controller.snapshot.identity!.runId, input.manifest.runId); assert.equal(f.native.counts.items, input.manifest.items.length);
  f.controller.mute(); assert.equal(f.native.snapshot().enabledTracks, 0); f.controller.unmute(); assert.equal(f.native.snapshot().enabledTracks, 1);
  await until(() => f.controller.snapshot.playback === "available"); f.native.control.blockedPlayback = true; await f.controller.playAudio(); assert.equal(f.controller.snapshot.playback, "blocked");
  f.native.control.blockedPlayback = false; await f.controller.playAudio(); assert.equal(f.controller.snapshot.playback, "available");
  await f.stopped();
  f.start(); await until(() => f.controller.snapshot.microphone === "available"); assert.equal(f.calls(), 2); await f.stopped();
});

test("08F speaker stream is first bound after its remote track exists", async () => {
  const f = fixture(), originalAudio = f.deps.audio; let binds = 0;
  f.deps.audio = () => {
    const audio = originalAudio(); let current: MediaProvider | null = null;
    Object.defineProperty(audio, "srcObject", { get: () => current, set: (value: MediaStream | null) => {
      if (value) { assert.ok(value.getTracks().length > 0, "Binding an empty stream leaves native playback pending"); binds++; }
      current = value;
    } });
    return audio;
  };
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  assert.equal(binds, 1); assert.equal(f.native.counts.plays, 1);
  await until(() => f.controller.snapshot.playback === "available"); assert.equal(f.controller.snapshot.playback, "available");
  await f.stopped(); assert.equal(f.native.counts.plays, 1);
});

test("08G complete setup trace confirms source/settings before microphone with data-free rows", async () => {
  const f = fixture(); f.start(); await until(() => f.controller.snapshot.microphone === "available");
  const rows = f.controller.snapshot.diagnostics!;
  assert.deepEqual(rows.map(r => r.stage), ["preparation_http", "preparation_validation", "credential_http", "credential_validation",
    "peer_creation", "local_description", "sdp_http", "sdp_validation", "remote_description", "peer_channel_ready",
    "initial_settings_ack", "source_items_ack", "final_settings_ack", "microphone_request", "microphone_attach"]);
  assert.ok(rows.every((r, i) => r.outcome === "ok" && Number.isSafeInteger(r.elapsedMs) && (!i || r.elapsedMs >= rows[i - 1].elapsedMs)));
  assert.ok(Object.isFrozen(rows) && rows.every(Object.isFrozen));
  assert.doesNotMatch(JSON.stringify(rows), /ek_|sk-|td-visitor|sourceId|owner|instructions|input_text|v=0|clientSecret/);
  await f.stopped(); assert.deepEqual(f.controller.snapshot.diagnostics, rows);
});

for (const [fault, stage, outcome] of [
  ["correlation", "preparation_validation", "invalid"], ["credential", "credential_validation", "invalid"],
  ["sdp-mime", "sdp_validation", "invalid"], ["settings", "initial_settings_ack", "invalid"],
  ["item", "source_items_ack", "invalid"], ["transcription-wrong", "final_settings_ack", "invalid"],
  ["provider", "initial_settings_ack", "provider"], ["context", "initial_settings_ack", "context_limit"],
]) test(`08G first failed stage ${fault}: ${stage}/${outcome}, no premature microphone`, async () => {
  const f = fixture("PDF", fault); f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.controller.snapshot.diagnostics!.at(-1)!.stage, stage);
  assert.equal(f.controller.snapshot.diagnostics!.at(-1)!.outcome, outcome);
  assert.equal(f.native.counts.media, 0); await f.stopped();
});

test("08G HTTP status is projected while response body and thrown errors never leak", async () => {
  const f = fixture(), base = f.deps.fetch;
  const forbidden = "sk-secret ek-secret td-visitor=private owner-hash private-document v=0 raw-provider-body";
  f.deps.fetch = async (url, init) => String(url) === "/api/voice-preparations"
    ? new Response(forbidden, { status: 503, headers: { "content-type": "application/json", "set-cookie": forbidden } }) : base(url, init);
  f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.deepEqual(f.controller.snapshot.diagnostics!.map(r => ({ stage: r.stage, outcome: r.outcome, httpStatus: r.httpStatus })),
    [{ stage: "preparation_http", outcome: "http_error", httpStatus: 503 }]);
  assert.ok(!JSON.stringify(f.controller.snapshot.diagnostics).includes(forbidden));
  assert.equal(f.native.counts.peers + f.native.counts.media + f.calls(), 0); await f.stopped();
});

for (const hold of ["prepare", "credential", "sdp", "final", "media", "attach"]) test(`08G Stop at ${hold} freezes diagnostics across late native/HTTP results`, async () => {
  const f = fixture("PDF", "", ["final", "media", "attach"].includes(hold) ? hold : "");
  if (["prepare", "credential", "sdp"].includes(hold)) f.hold(hold);
  f.start();
  const stages: Record<string, string> = { prepare: "preparation_http", credential: "credential_http", sdp: "sdp_http",
    final: "final_settings_ack", media: "microphone_request", attach: "microphone_attach" };
  await until(() => f.controller.snapshot.diagnostics?.at(-1)?.stage === stages[hold]);
  f.controller.stop(); const rows = f.controller.snapshot.diagnostics!;
  assert.equal(rows.at(-1)!.outcome, "cancelled");
  await f.stopped(); assert.deepEqual(f.controller.snapshot.diagnostics, rows);
});

test("08G malformed JSON and network exceptions have safe distinct stage outcomes", async () => {
  for (const network of [false, true]) {
    const f = fixture(), base = f.deps.fetch;
    f.deps.fetch = async (url, init) => {
      if (String(url) !== "/api/voice-preparations") return base(url, init);
      if (network) throw new Error("ek-private private-document provider-body");
      return new Response("{ek-private", { headers: { "content-type": "application/json" } });
    };
    f.start(); await until(() => f.controller.snapshot.phase === "failed");
    const row = f.controller.snapshot.diagnostics!.at(-1)!;
    assert.equal(row.stage, network ? "preparation_http" : "preparation_validation");
    assert.equal(row.outcome, network ? "unavailable" : "invalid");
    assert.doesNotMatch(JSON.stringify(f.controller.snapshot.diagnostics), /ek-private|private-document|provider-body/);
    await f.stopped();
  }
});

test("08G a stale diagnostic reporter cannot overwrite an explicit fresh attempt", async () => {
  const f = fixture(), prepare = f.adapters.prepare;
  const reports: VoiceSetupReporter[] = [];
  f.adapters.prepare = (identity, signal, report) => { reports.push(report!); return prepare(identity, signal, report); };
  f.start(); await until(() => f.controller.snapshot.microphone === "available"); await f.stopped();
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  const current = f.controller.snapshot;
  reports[0]("credential_http", "http_error", 403);
  assert.equal(f.controller.snapshot, current); assert.equal(f.calls(), 2);
  assert.equal(f.native.counts.violations, 0); await f.stopped();
});

for (const mime of ["application/sdp", "text/plain; charset=utf-8"]) test(`08E SDP201 ${mime} retains full ACK-before-media and Stop cleanup`, async () => {
  const f = fixture(), base = f.deps.fetch;
  f.deps.fetch = async (url, init) => {
    const response = await base(url, init);
    return String(url).startsWith("https://api.openai.com")
      ? new Response(response.body, { status: 201, headers: { "content-type": mime } }) : response;
  };
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  assert.equal(f.native.counts.remote, 1); assert.equal(f.native.counts.media, 1);
  assert.equal(f.native.counts.attached, 1); assert.equal(f.native.counts.violations, 0);
  await f.stopped();
});

for (const fault of ["html", "malformed-plain", "oversized-plain", "redirect"]) test(`08E SDP ${fault} still fails before remote description/media`, async () => {
  const f = fixture(), base = f.deps.fetch;
  f.deps.fetch = async (url, init) => {
    if (!String(url).startsWith("https://api.openai.com")) return base(url, init);
    return new Response(fault === "oversized-plain" ? "v=0\r\n" + "x".repeat(100_001) : "not SDP", {
      status: fault === "redirect" ? 302 : 201,
      headers: { "content-type": fault === "html" ? "text/html" : "text/plain; charset=utf-8" },
    });
  };
  f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.native.counts.remote, 0); assert.equal(f.native.counts.media, 0);
  await f.stopped();
});

for (const fault of ["expired", "correlation", "source", "policy", "mode", "manifest", "credential", "credential-expiry", "credential-correlation", "sdp-mime", "sdp-body", "settings", "item", "provider", "context", "malformed", "oversized"]) test(`08D ${fault} fails closed`, async () => {
  const f = fixture("PDF", fault); f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.native.counts.media, 0); assert.equal(f.controller.canSendQuestions, false);
  assert.ok(f.calls() <= 1); await f.stopped();
});
for (const phase of ["prepare", "credential", "sdp", "offer", "local", "remote", "config", "items", "final", "media", "attach", "play"]) test(`08D Stop during ${phase}; late completion cannot revive resources`, async () => {
  const f = fixture("PDF", "", ["prepare", "credential", "sdp"].includes(phase) ? "" : phase);
  if (["prepare", "credential", "sdp"].includes(phase)) f.hold(phase);
  f.start();
  if (phase === "prepare") await until(() => !!f.preparation());
  else if (phase === "credential") await until(() => f.calls() === 1);
  else if (phase === "sdp") await until(() => f.native.counts.local === 1);
  else if (phase === "play") { await until(() => f.controller.snapshot.microphone === "available"); void f.controller.playAudio(); await until(() => f.native.counts.plays === 1); }
  else await until(() => f.native.snapshot().pending > 0);
  await f.stopped(); assert.equal(f.controller.snapshot.phase, "ended"); assert.equal(f.controller.canSendQuestions, false);
});
test("08D microphone denied is terminal; no automatic text start or retry", async () => {
  const f = fixture(); f.native.control.denied = true; f.start(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.controller.snapshot.failure, "microphone"); assert.equal(f.native.counts.attached, 0); await f.stopped();
});
test("08D final effective ACK withheld prevents microphone; low negotiated message size closes", async () => {
  const f = fixture("PDF", "", "final"); f.start(); await until(() => f.native.snapshot().pending > 0);
  assert.equal(f.native.counts.media, 0); f.native.release(); await until(() => f.controller.snapshot.microphone === "available"); await f.stopped();
  const g = fixture(); g.native.control.maxMessageSize = 100; g.start(); await until(() => g.controller.snapshot.phase === "failed"); assert.equal(g.native.counts.media, 0); await g.stopped();
});
test("08D backpressure queues bounded ordered writes and Stop rejects all outstanding sends", async () => {
  const f = fakeBrowserVoice(), pc = f.deps.peer(), dc = pc.createDataChannel("oai-events", { ordered: true });
  pc.connectionState = "connected"; dc.readyState = "open"; f.control.buffered = 100_000;
  let failed = 0; const t = new BrowserVoiceTransport(pc as unknown as RTCPeerConnection, dc as unknown as RTCDataChannel, () => { failed++; t.close(); });
  const first = t.send('{"type":"test"}'), second = t.send('{"type":"test2"}');
  assert.equal(f.counts.sends, 0); f.control.buffered = 0; dc.dispatchEvent(new Event("bufferedamountlow")); await Promise.all([first, second]); assert.equal(f.counts.sends, 2);
  f.control.buffered = 100_000; const pending = t.send('{"type":"pending"}'); t.close(); await assert.rejects(pending); assert.equal(f.counts.listeners, 0); assert.equal(failed, 0);
});
test("08D owner-bound cancellation cannot cancel another owner or refund replay/attempts", async () => {
  const f = fixture(); const abort = new AbortController(), identity = { sourceId: f.row.id, runId: "local", connectionId: "local" };
  await f.adapters.prepare(identity, abort.signal); assert.equal(f.registry.resources.entries, 1);
  const other = createVisitor(config, Date.now()); f.registry.cancel(other, f.row.id, f.preparation()!.requestId as string, () => {});
  assert.equal(f.registry.resources.entries, 1); abort.abort(); await tick(); assert.equal(f.registry.resources.entries, 0);
  assert.equal(f.registry.resources.replayEntries, 1); assert.equal(f.calls(), 0); assert.equal(f.cancel(), 1);
});
for (const event of ["disconnect", "channel-close", "channel-error", "track-ended", "provider-active"]) test(`08D native ${event} releases transferred resources once`, async () => {
  const f = fixture(); f.start(); await until(() => f.controller.snapshot.microphone === "available");
  if (event === "disconnect") { const p = f.native.peers[0]; p.connectionState = "disconnected"; p.dispatchEvent(new Event("connectionstatechange")); }
  else if (event === "channel-close" || event === "channel-error") f.native.channels[0].dispatchEvent(new Event(event === "channel-close" ? "close" : "error"));
  else if (event === "track-ended") f.native.tracks.find(t => !t.remote)!.dispatchEvent(new Event("ended"));
  else f.native.emit({ type: "error", error: { code: "server_error" } });
  assert.equal(f.controller.snapshot.phase, "failed"); await f.stopped();
});
test("08D credential expiry while offer is pending forbids SDP exchange and releases peer", async () => {
  const f = fixture("PDF", "", "offer"); f.start(); await until(() => f.native.snapshot().pending > 0);
  f.deps.now = () => performance.now() + 70_000; f.native.release(); await until(() => f.controller.snapshot.phase === "failed");
  assert.equal(f.native.counts.remote, 0); assert.equal(f.native.counts.media, 0); await f.stopped();
});
for (const body of ["oversized", "stalled", "wrong-mime", "redirect"]) test(`08D ${body} preparation body is bounded/cancelled`, async () => {
  const f = fixture(); const base = f.deps.fetch; let cancelled = 0;
  f.deps.fetch = async (url, init) => {
    if (url !== "/api/voice-preparations") return base(url, init);
    if (body === "wrong-mime") return new Response("{}", { headers: { "content-type": "text/html" } });
    if (body === "redirect") return new Response("redirect", { status: 302, headers: { location: "https://08d.invalid/elsewhere" } });
    return new Response(new ReadableStream({ start(c) { if (body === "oversized") c.enqueue(new Uint8Array(24_500_001)); }, cancel() { cancelled++; } }), { headers: { "content-type": "application/json" } });
  };
  f.start(); if (body === "stalled") { await tick(); f.controller.stop(); } else await until(() => f.controller.snapshot.phase === "failed");
  await f.stopped(); if (body === "oversized" || body === "stalled") assert.equal(cancelled, 1);
  assert.equal(f.calls(), 0); assert.equal(f.native.counts.peers, 0);
});
test("08D transport fixed backpressure deadline and queue cap reject outstanding writes", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fakeBrowserVoice(), pc = f.deps.peer(), dc = pc.createDataChannel("oai-events", { ordered: true });
  pc.connectionState = "connected"; dc.readyState = "open"; f.control.buffered = 100_000;
  let failed = 0; const transport = new BrowserVoiceTransport(pc as unknown as RTCPeerConnection, dc as unknown as RTCDataChannel, () => { failed++; transport.close(); });
  const a = assert.rejects(transport.send("first")); t.mock.timers.tick(4999);
  const b = assert.rejects(transport.send("second")); t.mock.timers.tick(1); await Promise.all([a, b]);
  assert.equal(failed, 1); assert.equal(f.counts.sends, 0); assert.equal(f.counts.listeners, 0);
  const transport2 = new BrowserVoiceTransport(pc as unknown as RTCPeerConnection, dc as unknown as RTCDataChannel, () => transport2.close());
  const writes = []; for (let i = 0; i < 4105; i++) writes.push(assert.rejects(transport2.send("bounded")));
  await Promise.all(writes); assert.equal(f.counts.listeners, 0); assert.equal(f.counts.sends, 0);
});
test("08D provider error during held media stops late tracks without attachment", async () => {
  const f = fixture("PDF", "", "media"); f.start(); await until(() => f.native.snapshot().pending > 0);
  f.native.emit({ type: "error", error: { code: "context_length_exceeded" } });
  assert.equal(f.controller.snapshot.failure, "context_limit"); await f.stopped(); assert.equal(f.native.counts.attached, 0);
});
test("08D successful native connection owns one expiry timer; Stop releases all timers", async () => {
  const set = globalThis.setTimeout, clear = globalThis.clearTimeout, pending = new Set<ReturnType<typeof setTimeout>>();
  globalThis.setTimeout = ((fn: () => void, ms: number) => {
    const handle = set(() => { pending.delete(handle); fn(); }, ms); pending.add(handle); return handle;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => { pending.delete(id); clear(id); }) as typeof clearTimeout;
  const f = fixture();
  try {
    f.start(); await until(() => f.controller.snapshot.microphone === "available");
    assert.equal(pending.size, 1); await f.stopped(); assert.equal(pending.size, 0);
  } finally { f.controller.dispose(); f.registry.dispose(); globalThis.setTimeout = set; globalThis.clearTimeout = clear; }
});
test("08D mismatched adopted server run fails before connection; local connection identity stays private to ownership", async () => {
  const f = fixture(), prepare = f.adapters.prepare;
  f.adapters.prepare = async (identity, signal) => {
    const result = await prepare(identity, signal);
    if (!("input" in result)) throw new Error("Expected server projection");
    return { ...result, serverRunId: randomUUID() };
  };
  f.start(); await until(() => f.controller.snapshot.phase === "failed"); assert.equal(f.native.counts.peers, 0); await f.stopped();
});
test("08D lost cancellation has no retry and the ticket still expires by its 30-second TTL", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(), base = f.deps.fetch; let attempts = 0;
  f.deps.fetch = async (url, init) => { if (url === "/api/voice-preparations/cancel") { attempts++; throw new Error("lost cancellation"); } return base(url, init); };
  const abort = new AbortController();
  await f.adapters.prepare({ sourceId: f.row.id, runId: "local", connectionId: "local" }, abort.signal);
  abort.abort(); await tick(); assert.equal(f.registry.resources.entries, 1); assert.equal(attempts, 1);
  t.mock.timers.tick(30_000); assert.equal(f.registry.resources.entries, 0); assert.equal(attempts, 1); assert.equal(f.calls(), 0);
});
test("08D Stop between cancellation-wait settlement and prepare continuation makes zero HTTP calls/listeners", async () => {
  const f = fixture(), abort = new AbortController(); let calls = 0;
  f.deps.fetch = async () => { calls++; throw new Error("Must not request"); };
  const pending = f.adapters.prepare({ sourceId: f.row.id, runId: "local", connectionId: "local" }, abort.signal);
  queueMicrotask(() => abort.abort()); await assert.rejects(pending);
  assert.equal(calls, 0); assert.equal(getEventListeners(abort.signal, "abort").length, 0);
});

for (const finish of ["bind", "stop"] as const) test(`12C late track ${finish}: one automatic play, independent mute, no revival`, async () => {
  const f = fixture(); f.native.control.holdTrack = true;
  f.start(); await until(() => f.controller.snapshot.microphone === "available");
  assert.equal(f.native.counts.plays, 0); assert.equal(f.controller.snapshot.playback, "pending");
  f.controller.setSpeakerMuted(true);
  assert.equal(f.native.speakers[0].muted, true); assert.equal(f.native.snapshot().enabledTracks, 1);
  const pc = f.native.peers[0];
  if (finish === "stop") f.controller.stop();
  pc.dispatchEvent(pc.pendingTrack); await tick();
  assert.equal(f.native.counts.plays, finish === "bind" ? 1 : 0);
  assert.equal(f.native.speakers[0].muted, true);
  if (finish === "bind") {
    await until(() => f.controller.snapshot.playback === "available");
    f.controller.mute(); f.controller.setSpeakerMuted(false);
    assert.equal(f.native.snapshot().enabledTracks, 0); assert.equal(f.native.counts.plays, 1);
    f.controller.setSpeakerMuted(true); pc.dispatchEvent(pc.pendingTrack);
    assert.equal(f.native.speakers[0].muted, true); assert.equal(f.native.counts.plays, 1);
  }
  await f.stopped();
});

test("12C mute survives pending play settlement without new response or acquisition", async () => {
  const f = fixture("PDF", "", "play"); f.start();
  await until(() => f.native.counts.plays === 1);
  const sends = f.native.counts.sends;
  f.controller.setSpeakerMuted(true); await f.controller.playAudio();
  f.native.release("play"); await until(() => f.controller.snapshot.playback === "available");
  assert.equal(f.native.speakers[0].muted, true); assert.equal(f.controller.snapshot.speakerMuted, true);
  assert.equal(f.native.snapshot().enabledTracks, 1); assert.equal(f.native.counts.sends, sends);
  assert.equal(f.native.counts.plays, 1); assert.equal(f.native.counts.media, 1);
  await f.stopped();
});

for (const pending of ["track", "play"] as const) test(`12C ${pending} deadline cancels work and late completion cannot enable playback`, async () => {
  const f = fixture("PDF", "", pending === "play" ? "play" : "", 100);
  f.native.control.holdTrack = pending === "track";
  f.start(); await until(() => f.controller.snapshot.playback === "pending");
  f.controller.setSpeakerMuted(true);
  await until(() => f.controller.snapshot.playback === "blocked");
  if (pending === "track") f.native.peers[0].dispatchEvent(f.native.peers[0].pendingTrack);
  else f.native.release("play");
  await tick(); await tick();
  assert.equal(f.controller.snapshot.playback, "blocked");
  assert.equal(f.native.counts.plays, pending === "track" ? 0 : 1);
  assert.equal(f.native.speakers[0].muted, true);
  assert.equal(f.native.snapshot().enabledTracks, 1);
  if (pending === "play") assert.equal(f.native.counts.pauses, 1);
  f.native.control.hold = ""; await f.controller.playAudio();
  assert.equal(f.controller.snapshot.playback, "available"); assert.equal(f.native.speakers[0].muted, true);
  await f.stopped();
});
