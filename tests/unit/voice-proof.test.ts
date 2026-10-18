import assert from "node:assert/strict";
import test from "node:test";
import { VoiceProofController, type VoiceDependencies, type VoiceState } from "../../src/app/proof/voice/voice-controller.ts";
import { voiceProofAvailable } from "../../src/server/proof/availability.ts";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const source = { id: "00000000-0000-4000-8000-000000000001", title: "Synthetic lighthouse", text: "The blue lighthouse has seven windows.", expiresAt: new Date(Date.now() + 3600000).toISOString() };
const credential = () => ({ clientSecret: "ek_synthetic", expiresAt: Math.floor(Date.now() / 1000) + 60 });
const sdp = "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n";
const answer = () => new Response(sdp, { headers: { "Content-Type": "application/sdp" } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function harness(options: { stage?: string; status?: number; sdpStatus?: number; dto?: unknown; denial?: boolean; startupMs?: number; sessionMs?: number; badSdp?: boolean } = {}) {
  const gate = deferred<void>(); const order: string[] = []; const signals: AbortSignal[] = [];
  const tracks: { stopped: number; onended: (() => void) | null; stop: () => void }[] = [];
  const peers: ReturnType<typeof makePeer>[] = []; const audios: ReturnType<typeof makeAudio>[] = [];
  let state!: VoiceState; let notifications = 0;
  const stage = async (name: string) => { order.push(name); if (options.stage === name) await gate.promise; };
  const track = () => { const t = { stopped: 0, onended: null, stop() { t.stopped++; } }; tracks.push(t); return t; };
  const stream = () => { const t = track(); return { getTracks: () => [t], getAudioTracks: () => [t] } as unknown as MediaStream; };
  function makeAudio() { const a = { autoplay: false, srcObject: null as unknown, paused: 0, reset: 0,
    async play() { await stage("play"); if (options.denial) throw new Error("private autoplay error"); }, pause() { a.paused++; }, removeAttribute() {}, load() { a.reset++; } }; return a; }
  function makePeer() {
    const channel = { readyState: "connecting", closed: 0, onmessage: null as ((e: { data: string }) => void) | null,
      onopen: null as (() => void) | null, onclose: null as (() => void) | null, onerror: null as (() => void) | null,
      close() { channel.closed++; } };
    const pc = { connectionState: "new", closed: 0, ontrack: null as ((event: { track: unknown; streams: MediaStream[] }) => void) | null,
      onconnectionstatechange: null as (() => void) | null, addTrack() { order.push("track"); },
      createDataChannel(name: string) { assert.equal(name, "oai-events"); order.push("channel"); return channel; },
      async createOffer() { await stage("offer"); return { type: "offer", sdp }; },
      async setLocalDescription() { await stage("local"); }, async setRemoteDescription() { await stage("remote"); },
      close() { pc.closed++; }, channel };
    return pc;
  }
  const deps: VoiceDependencies = {
    fetch: async (url, init) => {
      signals.push(init!.signal!); assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
      if (url === "/api/proof-source") { await stage("source"); return Response.json(source); }
      if (url === "/api/realtime/client-secret") { await stage("mint"); assert.deepEqual(JSON.parse(init!.body as string), { sourceId: source.id });
        return options.status ? new Response("private error", { status: options.status }) : Response.json(options.dto ?? credential()); }
      assert.equal(url, "https://api.openai.com/v1/realtime/calls");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer ek_synthetic");
      assert.equal(init?.credentials, "omit"); assert.equal(init?.body, sdp);
      await stage("sdp");
      if (options.sdpStatus) return new Response("private provider detail", { status: options.sdpStatus });
      if (options.badSdp) return new Response("private upstream body");
      if (options.stage === "body") return { ok: true, headers: new Headers({ "Content-Type": "application/sdp" }), text: async () => { await stage("body"); return sdp; } } as Response;
      return answer();
    },
    media: async () => { await stage("media"); if (options.denial) throw new Error("private permission error"); return stream(); },
    peer: () => { const pc = makePeer(); peers.push(pc); return pc as unknown as RTCPeerConnection; },
    audio: () => { const audio = makeAudio(); audios.push(audio); return audio as unknown as HTMLAudioElement; },
    stream: () => ({ addTrack() {} }) as unknown as MediaStream,
    startupMs: options.startupMs, sessionMs: options.sessionMs,
  };
  const controller = new VoiceProofController(deps, value => { state = value; notifications++; });
  const event = (value: unknown) => peers.at(-1)!.channel.onmessage?.({ data: typeof value === "string" ? value : JSON.stringify(value) });
  const ready = () => {
    const pc = peers.at(-1)!; pc.connectionState = "connected"; pc.channel.readyState = "open"; pc.channel.onopen?.(); pc.onconnectionstatechange?.();
    event({ type: "session.created", session: { type: "realtime", id: "sess_mock" } });
  };
  return { controller, deps, order, gate, tracks, peers, audios, event, ready, stream, signals, get state() { return state; }, get notifications() { return notifications; } };
}

test("page gate is false for disabled or incomplete configuration", () => {
  const env = { PROOF_ENABLED: "true", REALTIME_ISSUANCE_ENABLED: "true", APP_ORIGIN: "https://example.test", VISITOR_COOKIE_SECRET: "a".repeat(64), OPENAI_API_KEY: "synthetic", OPENAI_REALTIME_MODEL: "configured-model", DATABASE_URL: "postgresql://synthetic" };
  assert.equal(voiceProofAvailable({}), false); assert.equal(voiceProofAvailable(env), true);
  for (const key of Object.keys(env)) assert.equal(voiceProofAvailable({ ...env, [key]: "" }), false, key);
});
test("voice order, one Start, readiness signal, actual events and idempotent cleanup", async () => {
  const h = harness(); await Promise.all([h.controller.start(), h.controller.start()]);
  assert.deepEqual(h.order, ["source", "media", "mint", "track", "channel", "offer", "local", "sdp", "remote"]);
  assert.match(h.state.message, /waiting/); h.ready(); assert.match(h.state.message, /^Ready/);
  h.event({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", content_index: 0, transcript: "How many windows?" });
  h.event({ type: "response.output_audio_transcript.delta", item_id: "a1", content_index: 0, delta: "Sev" });
  h.event({ type: "response.output_audio_transcript.done", item_id: "a1", content_index: 0, transcript: "Seven windows." });
  h.event({ type: "response.output_audio_transcript.delta", item_id: "a1", content_index: 0, delta: "late" });
  assert.deepEqual(h.state.lines.map(l => l.text), ["How many windows?", "Seven windows."]);
  const old = h.peers[0].channel.onmessage!; const lateTrack = h.peers[0].ontrack!;
  h.peers[0].ontrack!({ track: h.stream().getTracks()[0], streams: [] }); await tick();
  assert.equal(h.state.playback, "enabled");
  h.controller.stop(); h.controller.stop();
  old({ data: '{"type":"error"}' }); lateTrack({ track: h.stream().getTracks()[0], streams: [] });
  assert.match(h.state.message, /^Ended/); assert.ok(h.tracks.every(t => t.stopped === 1));
  assert.equal(h.peers[0].closed, 1); assert.equal(h.peers[0].channel.closed, 1);
  assert.equal(h.peers[0].ontrack, null); assert.equal(h.peers[0].channel.onmessage, null);
  assert.equal(h.audios[0].srcObject, null); assert.equal(h.audios[0].paused, 1); assert.ok(h.signals.every(s => s.aborted));
});
for (const stage of ["source", "media", "mint", "offer", "local", "sdp", "body", "remote"]) {
  test(`Stop during ${stage}; ignored abort and late result cannot revive session`, async () => {
    const h = harness({ stage }); const start = h.controller.start(); await tick(); assert.ok(h.order.includes(stage));
    h.controller.stop(); await start; const stopped = h.state; h.gate.resolve(); await tick();
    assert.equal(h.state, stopped); assert.equal(h.state.active, false); assert.ok(h.tracks.every(t => t.stopped === 1));
    assert.ok(h.peers.every(p => p.closed === 1)); assert.ok(h.signals.every(s => s.aborted));
    if (["source", "media"].includes(stage)) assert.equal(h.order.includes("mint"), false);
  });
}
test("permission denial never mints", async () => {
  const h = harness({ denial: true }); await h.controller.start(); assert.deepEqual(h.order, ["source", "media"]); assert.match(h.state.message, /permission denied/);
});
test("explicit retry creates fresh resources and ignores old callbacks", async () => {
  const h = harness(); await h.controller.start(); const old = h.peers[0].channel.onmessage!; h.controller.stop();
  await h.controller.start(); old({ data: '{"type":"error"}' }); h.ready();
  assert.equal(h.peers.length, 2); assert.equal(h.order.filter(v => v === "mint").length, 2); assert.match(h.state.message, /^Ready/); h.controller.stop();
});
test("dispose during permission resolves late tracks without notifying unmounted UI", async () => {
  const h = harness({ stage: "media" }); const start = h.controller.start(); await tick(); h.controller.dispose(); const count = h.notifications;
  h.gate.resolve(); await start; await tick(); assert.equal(h.notifications, count); assert.ok(h.tracks.every(t => t.stopped === 1));
  await h.controller.start(); assert.equal(h.order.filter(v => v === "source").length, 1);
});
for (const status of [401, 403, 404, 429, 503]) test(`safe server status ${status} releases microphone without negotiation`, async () => {
  const h = harness({ status }); await h.controller.start(); assert.equal(h.state.active, false); assert.doesNotMatch(h.state.message, /private/);
  assert.equal(h.order.includes("sdp"), false); assert.ok(h.tracks.every(t => t.stopped === 1));
});
for (const dto of [{ clientSecret: "ordinary-key", expiresAt: 1 }, { ...credential(), expiresAt: 1 }, { ...credential(), extra: "private" }]) test("invalid or expired credential cannot reach transport", async () => {
  const h = harness({ dto }); await h.controller.start(); assert.match(h.state.message, /credential expired or is invalid/); assert.equal(h.peers.length, 0); assert.ok(h.tracks.every(t => t.stopped === 1));
});
test("expiry while creating SDP prevents negotiation", async () => {
  const h = harness({ stage: "offer" }); let now = Date.now(); h.deps.now = () => now; const start = h.controller.start(); await tick(); now += 70000; h.gate.resolve(); await start;
  assert.equal(h.order.includes("sdp"), false); assert.match(h.state.message, /expired before/);
});
test("invalid SDP and connection failure release resources", async () => {
  const invalid = harness({ badSdp: true }); await invalid.controller.start(); assert.match(invalid.state.message, /Invalid connection answer/);
  const h = harness(); await h.controller.start(); h.ready(); h.peers[0].connectionState = "failed"; h.peers[0].onconnectionstatechange!();
  assert.equal(h.state.active, false); assert.ok(h.tracks.every(t => t.stopped === 1));
});
test("startup and active session deadlines clean resources", async () => {
  const pending = harness({ stage: "media", startupMs: 10 }); await pending.controller.start(); assert.match(pending.state.message, /timed out/); pending.gate.resolve(); await tick(); assert.ok(pending.tracks.every(t => t.stopped === 1));
  const h = harness({ sessionMs: 10 }); await h.controller.start(); h.ready(); await new Promise(r => setTimeout(r, 25));
  assert.match(h.state.message, /60-second/); assert.equal(h.peers[0].closed, 1);
});
test("autoplay rejection offers explicit retry; late playback cannot update stopped session", async () => {
  const h = harness(); await h.controller.start(); h.audios[0].play = async () => { throw new Error("private"); };
  await h.controller.playAudio(); assert.equal(h.state.playback, "blocked"); h.audios[0].play = async () => {}; await h.controller.playAudio(); assert.equal(h.state.playback, "enabled");
  const gate = deferred<void>(); h.audios[0].play = () => gate.promise; const play = h.controller.playAudio(); h.controller.stop(); gate.resolve(); await play; assert.equal(h.state.playback, "none");
});
for (const event of ["not-json", {}, { type: "session.created" }, { type: "response.output_audio_transcript.delta", delta: "secret" }, { type: "error", error: { message: "private" } }, { type: "response.done", response: { status: "failed" } }]) test("malformed and error events use safe feedback and cleanup", async () => {
  const h = harness(); await h.controller.start(); h.event(event); assert.equal(h.state.active, false); assert.doesNotMatch(h.state.message, /secret|private/); assert.equal(h.peers[0].closed, 1);
});

for (const sdpStatus of [401, 403, 429, 503]) test(`SDP status ${sdpStatus} is sanitized with no retry`, async () => {
  const h = harness({ sdpStatus }); await h.controller.start(); assert.equal(h.state.active, false);
  assert.doesNotMatch(h.state.message, /private/); assert.equal(h.order.filter(v => v === "sdp").length, 1);
  assert.equal(h.order.includes("remote"), false); assert.ok(h.tracks.every(t => t.stopped === 1));
});
test("session.created alone cannot claim readiness; disposal closes a ready session", async () => {
  const h = harness(); await h.controller.start(); h.event({ type: "session.created", session: { type: "realtime", id: "sess_mock" } });
  assert.match(h.state.message, /Connecting/); h.ready(); assert.match(h.state.message, /^Ready/);
  h.peers[0].ontrack!({ track: h.stream().getTracks()[0], streams: [] }); await tick();
  h.controller.dispose(); assert.ok(h.tracks.every(t => t.stopped === 1)); assert.equal(h.peers[0].closed, 1); assert.equal(h.audios[0].srcObject, null);
});
test("default active timer ends at 60 seconds, not credential expiry", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness(); await h.controller.start(); h.ready();
  context.mock.timers.tick(59_999); assert.equal(h.state.active, true);
  context.mock.timers.tick(1); assert.equal(h.state.active, false); assert.ok(h.tracks.every(t => t.stopped === 1));
});
test("a stopped pending permission cannot attach its late stream to a retry", async () => {
  const h = harness({ stage: "media" }); const old = h.controller.start(); await tick(); h.controller.stop(); await old;
  const retry = h.controller.start(); await tick(); h.gate.resolve(); await retry; h.ready();
  assert.equal(h.order.filter(v => v === "mint").length, 1); assert.equal(h.tracks[0].stopped, 1); assert.equal(h.tracks[1].stopped, 0);
  h.controller.stop(); assert.ok(h.tracks.every(t => t.stopped === 1));
});
