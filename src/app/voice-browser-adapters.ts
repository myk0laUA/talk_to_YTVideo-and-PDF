"use client";
import { SourceSizeError } from "../shared/priming-failure.ts";

import { VoiceLifecycle, type VoiceAdapters, type VoiceConnection, type VoiceIdentity, type VoiceStatus, type VoiceTrack } from "../shared/voice-lifecycle.ts";
import { providerAdmissionRejection, type ProviderPrimingInput } from "../shared/priming-admission.ts";
import { matchesProviderVoicePolicy } from "../shared/priming-provider-policy.ts";
import { bytes, MAX_EVENT_BYTES, MAX_ITEMS, MAX_WIRE_BYTES } from "../shared/priming-manifest.ts";
import type { PrimingTransport } from "../shared/priming-controller.ts";
import type { PreparationRejection, VoiceSetupReporter, VoiceSetupStage } from "../shared/voice-diagnostics.ts";
import type { VoiceEventDiagnostics } from "../shared/voice-event-diagnostics.ts";
import { SessionAdmissionError, parseAdmissionRejection } from "../shared/session-admission.ts";

export type BrowserVoiceDependencies = {
  fetch: typeof fetch; peer: () => RTCPeerConnection; audio: () => HTMLAudioElement;
  stream: () => MediaStream; media: () => Promise<MediaStream>; uuid: () => string;
  /** Monotonic milliseconds, never the browser's calendar clock. */
  now: () => number;
  supportedCapture?: () => MediaTrackSupportedConstraints;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const unavailable = () => new Error("Voice connection unavailable");
const safely = (fn: () => void) => { try { fn(); } catch { /* Release remaining resources. */ } };
const cancelBody = (r: Response) => { void r.body?.cancel().catch(() => {}); };
class ReadFailure extends Error {
  readonly reason: PreparationRejection;
  constructor(reason: PreparationRejection) { super("Voice connection unavailable"); this.reason = reason; }
}

/** Interrupt even noncooperating browser operations; consume and release late results. */
function wait<T>(pending: Promise<T>, signal: AbortSignal, late: (v: T) => void = () => {}): Promise<T> {
  return new Promise((resolve, reject) => {
    let done = false;
    const abort = () => { if (!done) { done = true; signal.removeEventListener("abort", abort); reject(unavailable()); } };
    signal.addEventListener("abort", abort, { once: true });
    pending.then(v => {
      if (done || signal.aborted) { safely(() => late(v)); abort(); return; }
      done = true; signal.removeEventListener("abort", abort); resolve(v);
    }, () => { if (!done) { done = true; signal.removeEventListener("abort", abort); reject(unavailable()); } });
    if (signal.aborted) abort();
  });
}
async function read(response: Response, mime: string | readonly string[], limit: number, signal: AbortSignal, rejection = false) {
  const allowed = typeof mime === "string" ? [mime] : mime;
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const reason = (!response.ok && !rejection) || response.redirected ? "response_envelope"
    : !contentType || !allowed.includes(contentType) ? "response_mime"
    : Number(response.headers.get("content-length")) > limit ? "response_size" : !response.body ? "response_body" : undefined;
  if (reason) { cancelBody(response); throw new ReadFailure(reason); }
  const reader = response.body!.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  const decode = (value?: Uint8Array, stream = false) => {
    try { return decoder.decode(value, { stream }); } catch { throw new ReadFailure("response_utf8"); }
  };
  let size = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await wait(reader.read(), signal).catch(() => { throw new ReadFailure("response_body"); });
      if (done) return text + decode();
      size += value.byteLength; if (size > limit) throw new ReadFailure("response_size");
      text += decode(value, true);
    }
  } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}

/** Ordered reliable data channel. Bounded FIFO; one fixed drain deadline, no retries.
 * Native message dispatch is synchronous: no incoming event backlog is retained. */
export class BrowserVoiceTransport implements PrimingTransport {
  private receive?: (e: unknown) => void;
  private closed?: () => void;
  private ended = false;
  private queue: { raw: string; size: number; valid?: () => boolean; resolve: () => void; reject: (e: Error) => void }[] = [];
  private queuedBytes = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private events = 0;
  private receivedBytes = 0;
  private channel: RTCDataChannel;
  private peer: RTCPeerConnection;
  private fail: () => void;
  private trace?: VoiceEventDiagnostics;
  constructor(peer: RTCPeerConnection, channel: RTCDataChannel, fail: () => void, trace?: VoiceEventDiagnostics) {
    this.peer = peer; this.channel = channel; this.fail = fail;
    this.trace = trace;
    channel.bufferedAmountLowThreshold = 32_768;
    channel.addEventListener("message", this.message);
    channel.addEventListener("bufferedamountlow", this.drain);
    channel.addEventListener("close", this.failed);
    channel.addEventListener("error", this.failed);
  }
  private failed = () => { if (!this.ended) { this.fail(); this.closed?.(); } };
  private message = (e: MessageEvent) => {
    if (this.ended) return;
    try {
      if (typeof e.data !== "string" || e.data.length > 24_576) throw unavailable();
      const n = bytes(e.data); this.receivedBytes += n;
      if (n > 24_576 || ++this.events > 32_768 || this.receivedBytes > 16_000_000) throw unavailable();
      const event: unknown = JSON.parse(e.data);
      if (!record(event) || typeof event.type !== "string" || event.type.length > 128) throw unavailable();
      this.trace?.wire("inbound", event, this.bufferCounts());
      this.receive?.(event);
    } catch { this.failed(); }
  };
  isOpen() { return !this.ended && this.channel.readyState === "open" && this.peer.connectionState === "connected"; }
  private bufferCounts() { return { bufferedBytes: this.channel.bufferedAmount, queuedBytes: this.queuedBytes, queuedCommands: this.queue.length }; }
  private traceWrite(direction: "enqueue" | "send" | "drop", raw: string) {
    if (!this.trace) return;
    try { this.trace.wire(direction, JSON.parse(raw), this.bufferCounts()); } catch { /* Diagnostics never alter transport behavior. */ }
  }
  subscribe(receive: (event: unknown) => void, closed: () => void) {
    if (this.receive || !this.isOpen()) throw unavailable();
    this.receive = receive; this.closed = closed;
    return () => { this.receive = undefined; this.closed = undefined; };
  }
  send(raw: string, valid?: () => boolean) {
    const size = bytes(raw), negotiated = this.peer.sctp?.maxMessageSize;
    const max = negotiated === undefined || negotiated === 0 || negotiated === Infinity ? MAX_EVENT_BYTES : Math.min(MAX_EVENT_BYTES, negotiated);
    if (!this.isOpen() || !size || size > max || this.queue.length >= MAX_ITEMS + 8 || this.queuedBytes + size > MAX_WIRE_BYTES + 65_536) {
      this.failed(); return Promise.reject(unavailable());
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ raw, size, valid, resolve, reject }); this.queuedBytes += size;
      this.traceWrite("enqueue", raw);
      if (!this.timer) this.timer = setTimeout(this.failed, 5000);
      this.drain();
    });
  }
  private drain = () => {
    if (!this.isOpen()) { this.failed(); return; }
    try {
      while (this.queue.length && this.channel.bufferedAmount <= 65_536) {
        const item = this.queue.shift()!; this.queuedBytes -= item.size;
        try {
          if (!item.valid || item.valid()) { this.channel.send(item.raw); this.traceWrite("send", item.raw); }
          else this.traceWrite("drop", item.raw);
          item.resolve();
        } catch { item.reject(unavailable()); throw unavailable(); }
      }
      if (!this.queue.length) { clearTimeout(this.timer); this.timer = undefined; }
    } catch { this.failed(); }
  };
  close() {
    if (this.ended) return;
    this.ended = true; clearTimeout(this.timer); this.timer = undefined;
    this.channel.removeEventListener("message", this.message);
    this.channel.removeEventListener("bufferedamountlow", this.drain);
    this.channel.removeEventListener("close", this.failed);
    this.channel.removeEventListener("error", this.failed);
    for (const item of this.queue.splice(0)) item.reject(unavailable());
    this.queuedBytes = 0; this.receive = undefined; this.closed = undefined;
  }
  connectionLost() { this.closed?.(); }
}

type Prepared = { sourceId: string; connectionId: string; requestId: string; preparationId?: string;
  runId?: string; expires?: number; sourceExpires?: number; claimed: boolean; signal: AbortSignal; cancel: () => void };

/** Browser projections validate fidelity, never establish server provenance or authorization.
 * The dedicated routes reauthorize their own stored immutable preparation. */
export function browserVoiceAdapters(deps: BrowserVoiceDependencies): VoiceAdapters {
  let prepared: Prepared | undefined;
  const mediaAttempts = new WeakMap<AbortSignal, { identity: VoiceIdentity; live: () => boolean }>();
  let cancellation: Promise<void> = Promise.resolve();
  const send = async (suffix: string, body: object, signal: AbortSignal, report: VoiceSetupReporter) => {
    const started = deps.now();
    const stage = suffix ? "credential_http" : "preparation_http", validation = suffix ? "credential_validation" : "preparation_validation";
    report(stage, "pending");
    const response = await wait(deps.fetch(`/api/voice-preparations${suffix}`, { method: "POST", credentials: "same-origin", cache: "no-store",
      redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }), signal, cancelBody);
    report(stage, response.ok ? "ok" : "http_error", response.status);
    if (!suffix && response.status === 413) {
      let result: unknown;
      try { result = JSON.parse(await read(response, "application/json", 1024, signal, true)); }
      catch { throw unavailable(); }
      if (record(result) && result.code === "source_too_large") throw new SourceSizeError();
      throw unavailable();
    }
    if (response.status === 429 || response.status === 409) {
      let rejection;
      try { rejection = parseAdmissionRejection(JSON.parse(await read(response, "application/json", 1024, signal, true)), response.headers.get("retry-after")); }
      catch { /* An unrecognised response never invents a reset time. */ }
      if (rejection) throw new SessionAdmissionError(rejection);
      throw unavailable();
    }
    if (response.ok) report(validation, "pending");
    try {
      const text = await read(response, "application/json", suffix ? 2048 : 24_500_000, signal);
      try { return { result: JSON.parse(text) as unknown, started }; } catch { throw new ReadFailure("response_json"); }
    } catch (error) {
      if (response.ok && !signal.aborted) report(validation, "invalid", undefined,
        suffix ? undefined : error instanceof ReadFailure ? error.reason : "unknown");
      throw unavailable();
    }
  };
  const current = (identity: VoiceIdentity, signal: AbortSignal) => {
    const p = prepared;
    if (!p || p.signal !== signal || signal.aborted || p.sourceId !== identity.sourceId || p.connectionId !== identity.connectionId
      || p.runId !== identity.runId || !p.expires || p.expires <= deps.now() || !p.sourceExpires || p.sourceExpires <= deps.now()) throw unavailable();
    return p;
  };
  return {
    async prepare(identity, signal, report = () => {}) {
      if (!uuid(identity.sourceId) || signal.aborted) throw unavailable();
      // Explicit restart waits for the previous best-effort cancellation's bounded
      // completion, rather than racing its known unclaimed ticket on the server.
      await wait(cancellation, signal);
      if (signal.aborted) throw unavailable();
      const requestId = deps.uuid(); if (!uuid(requestId)) throw unavailable();
      const p: Prepared = { sourceId: identity.sourceId, connectionId: identity.connectionId, requestId, claimed: false, signal, cancel: () => {} };
      p.cancel = () => {
        signal.removeEventListener("abort", p.cancel);
        if (prepared === p) prepared = undefined;
        if (p.claimed) return;
        // Best effort only: lost/reordered cancellation retains the server's 30s TTL fallback.
        const cancel = new AbortController(), timer = setTimeout(() => cancel.abort(), 2000);
        cancellation = wait(Promise.resolve().then(() => deps.fetch("/api/voice-preparations/cancel", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
          keepalive: true, signal: cancel.signal, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: p.sourceId, requestId }) })), cancel.signal, cancelBody)
          .then(cancelBody, () => {}).finally(() => clearTimeout(timer));
      };
      prepared = p; signal.addEventListener("abort", p.cancel, { once: true });
      const { result, started } = await send("", { sourceId: identity.sourceId, requestId }, signal, report).catch(error => {
        // A recognised rejection is definitive: this request created no pending work.
        // Network/invalid responses retain best-effort cancellation and server TTL.
        if (error instanceof SessionAdmissionError || error instanceof SourceSizeError) p.claimed = true;
        throw error;
      });
      const reject = (reason: PreparationRejection): never => { report("preparation_validation", "invalid", undefined, reason); throw unavailable(); };
      if (prepared !== p || signal.aborted) throw unavailable();
      if (!record(result) || Object.keys(result).sort().join() !== "conversationReady,expiresAt,input,issuedAt,preparationId,providerConfirmed,requestId,timingVersion"
        || result.timingVersion !== "owned-voice-time-v1"
        || result.conversationReady !== false || result.providerConfirmed !== false) return reject("envelope");
      if (result.requestId !== requestId) return reject("request_identity");
      if (typeof result.preparationId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(result.preparationId)) return reject("ticket_identity");
      if (typeof result.expiresAt !== "number" || !Number.isSafeInteger(result.expiresAt)
        || typeof result.issuedAt !== "number" || !Number.isSafeInteger(result.issuedAt) || result.issuedAt <= 0
        || !Number.isFinite(started) || started < 0 || deps.now() < started) return reject("ticket_time");
      // Anchor at request START: charging the entire round trip (including body
      // decoding and validation) deliberately underestimates remaining validity.
      const ticketMs = result.expiresAt - result.issuedAt, ticketDeadline = started + ticketMs;
      if (ticketMs <= 0 || ticketDeadline <= deps.now()) return reject("ticket_expired");
      if (ticketMs > 30_000) return reject("ticket_future");
      const input = result.input as ProviderPrimingInput;
      const admission = providerAdmissionRejection(input);
      if (admission) return reject(admission);
      if (!matchesProviderVoicePolicy(input.policy)) return reject("policy");
      if (input.manifest.variant !== "B") return reject("voice_mode");
      if (!uuid(input.manifest.runId)) return reject("run_identity");
      if (input.variant.source.id !== identity.sourceId) return reject("source_identity");
      if (!["PDF", "YOUTUBE"].includes(input.variant.source.kind)) return reject("source_kind");
      const expires = Date.parse(input.variant.source.expiresAt);
      const sourceMs = expires - result.issuedAt, sourceDeadline = started + sourceMs;
      if (!Number.isFinite(expires) || sourceMs <= 0 || sourceMs > 3600_000 || sourceDeadline <= deps.now()) return reject("source_expiry");
      if (result.expiresAt > expires) return reject("ticket_source_expiry");
      if (ticketDeadline <= deps.now()) return reject("ticket_expired");
      Object.assign(p, { preparationId: result.preparationId, runId: input.manifest.runId, expires: ticketDeadline, sourceExpires: sourceDeadline });
      report("preparation_validation", "ok");
      return { input, serverRunId: input.manifest.runId };
    },
    async connect(identity, signal, observe = () => {}, trace) {
      let stage: VoiceSetupStage = "credential_http", pending = false;
      const report: VoiceSetupReporter = (next, outcome, status) => { stage = next; pending = outcome === "pending"; observe(next, outcome, status); };
      const p = current(identity, signal);
      const abort = new AbortController(), stop = () => abort.abort();
      signal.addEventListener("abort", stop, { once: true });
      const timer = setTimeout(() => { if (pending) report(stage, "timeout"); stop(); }, 15_000);
      let peer: RTCPeerConnection | undefined, channel: RTCDataChannel | undefined, audio: HTMLAudioElement | undefined;
      let transport: BrowserVoiceTransport | undefined, expiry: ReturnType<typeof setTimeout> | undefined;
      let clientSecret: string | undefined;
      let closed = false, transferred = false;
      const tracks = new Set<MediaStreamTrack>(), remove: (() => void)[] = [];
      const close = () => {
        if (closed) return; closed = true; clearTimeout(expiry);
        transport?.close(); for (const off of remove.splice(0)) safely(off);
        safely(() => channel?.close()); safely(() => peer?.close());
        for (const track of tracks) safely(() => track.stop()); tracks.clear();
        releaseAudio();
      };
      let audioReleased = false;
      const releaseAudio = () => { if (audioReleased) return; audioReleased = true;
        safely(() => { if (audio) { audio.pause(); audio.srcObject = null; audio.removeAttribute("src"); audio.load(); } }); };
      const fail = () => { if (closed) return; transport?.connectionLost(); close(); if (!transferred) stop(); };
      try {
        const { result, started } = await send("/credential", { sourceId: p.sourceId, requestId: p.requestId, preparationId: p.preparationId }, abort.signal, report);
        // No retained token on the adapter or connection; erase parsed DTO after fetch invocation.
        current(identity, signal);
        if (!record(result) || Object.keys(result).sort().join() !== "clientSecret,expiresAt,issuedAt,preparationId,timingVersion" || result.preparationId !== p.preparationId
          || result.timingVersion !== "owned-voice-time-v1" || typeof result.issuedAt !== "number" || !Number.isSafeInteger(result.issuedAt) || result.issuedAt <= 0
          || typeof result.clientSecret !== "string" || !/^ek_[A-Za-z0-9_-]{1,500}$/.test(result.clientSecret)
          || typeof result.expiresAt !== "number" || !Number.isSafeInteger(result.expiresAt * 1000)
          || !Number.isInteger(result.expiresAt) || !Number.isFinite(started) || started < 0 || deps.now() < started
          || result.expiresAt * 1000 <= result.issuedAt || result.expiresAt * 1000 > result.issuedAt + 65_000) throw unavailable();
        const credentialExpiry = started + (result.expiresAt * 1000 - result.issuedAt);
        if (credentialExpiry <= deps.now()) throw unavailable();
        p.claimed = true; signal.removeEventListener("abort", p.cancel); prepared = undefined;
        clientSecret = result.clientSecret; result.clientSecret = undefined;
        report("credential_validation", "ok");
        report("peer_creation", "pending");
        peer = deps.peer(); audio = deps.audio(); audio.autoplay = false; audio.muted = false;
        trace?.mark("peer_created");
        const remote = deps.stream();
        const pc = peer, speaker = audio;
        // Pre-negotiate send/receive audio with NO local microphone or sender track.
        const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        const ontrack = (e: RTCTrackEvent) => {
          for (const track of new Set([e.track, ...e.streams.flatMap(s => s.getTracks())])) {
            if (closed) { safely(() => track.stop()); continue; }
            tracks.add(track); remote.addTrack(track);
          }
          if (!closed) trace?.mark("remote_track", { remoteTracks: remote.getTracks().length });
          // Chromium can leave play() pending if srcObject was an empty stream.
          // Bind after the first remote track; repeated track events must not restart playback.
          if (!closed && speaker.srcObject !== remote) { speaker.srcObject = remote; trace?.mark("playback_bound", { remoteTracks: remote.getTracks().length }); }
        };
        pc.addEventListener("track", ontrack); remove.push(() => pc.removeEventListener("track", ontrack));
        channel = pc.createDataChannel("oai-events", { ordered: true });
        trace?.mark("channel_created");
        transport = new BrowserVoiceTransport(pc, channel, fail, trace);
        const onstate = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) fail(); };
        pc.addEventListener("connectionstatechange", onstate); remove.push(() => pc.removeEventListener("connectionstatechange", onstate));
        report("peer_creation", "ok");
        try {
          report("local_description", "pending");
          const offer = await wait(pc.createOffer(), abort.signal);
          await wait(pc.setLocalDescription(offer), abort.signal);
          if (!offer.sdp || bytes(offer.sdp) > 100_000 || !/^v=0\r?\n/.test(offer.sdp) || !/^m=audio /m.test(offer.sdp) || !/^m=application /m.test(offer.sdp)
            || credentialExpiry <= deps.now() || p.sourceExpires! <= deps.now() || signal.aborted) throw unavailable();
          report("local_description", "ok");
          report("sdp_http", "pending");
          const pending = deps.fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, signal: abort.signal,
            credentials: "omit", cache: "no-store", redirect: "error", headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" } });
          clientSecret = undefined;
          const response = await wait(pending, abort.signal, cancelBody);
          report("sdp_http", response.ok ? "ok" : "http_error", response.status);
          if (response.ok) report("sdp_validation", "pending");
          // The real calls endpoint can return SDP as text/plain. Keep the
          // bounded reader and SDP structure/native parser checks for both types.
          const sdp = await read(response, ["application/sdp", "text/plain"], 100_000, abort.signal);
          if (credentialExpiry <= deps.now() || p.sourceExpires! <= deps.now() || !/^v=0\r?\n/.test(sdp) || !/^m=audio /m.test(sdp) || !/^m=application /m.test(sdp)) throw unavailable();
          report("sdp_validation", "ok");
          report("remote_description", "pending");
          await wait(pc.setRemoteDescription({ type: "answer", sdp }), abort.signal);
          report("remote_description", "ok");
        } finally { clientSecret = undefined; }
        report("peer_channel_ready", "pending");
        await wait(new Promise<void>((resolve, reject) => {
          const ready = () => {
            if (closed) { reject(unavailable()); return; }
            if (pc.connectionState === "connected" && channel?.readyState === "open") resolve();
          };
          pc.addEventListener("connectionstatechange", ready); channel!.addEventListener("open", ready);
          const off = () => { pc.removeEventListener("connectionstatechange", ready); channel?.removeEventListener("open", ready); };
          remove.push(off); ready();
        }), abort.signal);
        if (signal.aborted || closed || credentialExpiry <= deps.now() || !p.sourceExpires || p.sourceExpires <= deps.now()) throw unavailable();
        report("peer_channel_ready", "ok");
        // Source expiry ends this local session; credential expiry only bounds negotiation.
        expiry = setTimeout(fail, Math.min(2_147_483_647, p.sourceExpires - deps.now()));
        const connection: VoiceConnection = { transport, close, playback: {
          async play(playSignal) {
            if (closed || playSignal.aborted || p.sourceExpires! <= deps.now()) throw unavailable();
            // Wait for actual binding, bounded and cancelled by the lifecycle playback deadline.
            if (!speaker.srcObject) await new Promise<void>((resolve, reject) => {
              const cleanup = () => { pc.removeEventListener("track", bound); playSignal.removeEventListener("abort", cancelled); };
              const bound = () => { if (speaker.srcObject) { cleanup(); resolve(); } };
              const cancelled = () => { cleanup(); reject(unavailable()); };
              pc.addEventListener("track", bound); playSignal.addEventListener("abort", cancelled, { once: true });
              bound();
            });
            if (closed || playSignal.aborted || p.sourceExpires! <= deps.now()) throw unavailable();
            const cancelPlay = () => { safely(() => speaker.pause()); };
            playSignal.addEventListener("abort", cancelPlay, { once: true });
            try { await wait(speaker.play(), playSignal); }
            finally { playSignal.removeEventListener("abort", cancelPlay); }
          },
          setMuted: muted => { if (!closed) speaker.muted = muted; }, release: releaseAudio,
        } };
        const live = () => !closed && p.sourceExpires! > deps.now();
        bindings.set(connection, { sender: transceiver.sender, signal, live });
        mediaAttempts.set(signal, { identity, live });
        remove.push(() => { bindings.delete(connection); mediaAttempts.delete(signal); });
        transferred = true; return connection;
      } catch (error) { close(); throw error instanceof SessionAdmissionError ? error : unavailable(); }
      finally { clientSecret = undefined; clearTimeout(timer); signal.removeEventListener("abort", stop); }
    },
    async acquireMedia(identity, signal, report = () => {}, trace) {
      const attempt = mediaAttempts.get(signal);
      if (!attempt || signal.aborted || !attempt.live() || attempt.identity.sourceId !== identity.sourceId
        || attempt.identity.runId !== identity.runId || attempt.identity.connectionId !== identity.connectionId) throw unavailable();
      report("microphone_request", "pending");
      const stopTracks = (s: MediaStream) => { for (const t of new Set(s.getTracks())) { t.enabled = false; safely(() => t.stop()); } };
      const stream = await wait(deps.media().then(stream => { for (const t of stream.getTracks()) t.enabled = false; return stream; }), signal, stopTracks);
      const native = [...new Set(stream.getTracks())];
      if (signal.aborted || native.length !== 1 || native[0].kind !== "audio" || native[0].readyState !== "live") { stopTracks(stream); throw unavailable(); }
      trace?.mark("media_acquired", { localTracks: native.length });
      let supported: unknown, effective: unknown;
      safely(() => { supported = deps.supportedCapture?.(); });
      safely(() => { effective = native[0].getSettings?.(); });
      trace?.processing(supported, effective);
      report("microphone_request", "ok");
      const wrappers: VoiceTrack[] = native.map(track => ({ get enabled() { return track.enabled; }, set enabled(v) { track.enabled = v; },
        get readyState() { return track.readyState; }, stop: () => track.stop(),
        subscribeEnded: callback => { track.addEventListener("ended", callback); return () => track.removeEventListener("ended", callback); } }));
      return { tracks: wrappers, async attach(connection) {
        const binding = bindings.get(connection);
        if (!binding || binding.signal !== signal || signal.aborted || !binding.live()) throw unavailable();
        await wait(binding.sender.replaceTrack(native[0]), signal);
        if (signal.aborted || !binding.live()) throw unavailable();
        trace?.mark("microphone_attached", { localTracks: native.length });
      }, release() { /* Lifecycle owns tracks and ended listeners; connection owns sender. */ } };
    },
  };
}
const bindings = new WeakMap<VoiceConnection, { sender: RTCRtpSender; signal: AbortSignal; live: () => boolean }>();
const clock = { now: () => performance.now(), setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms), clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>) };
// Stable function. Constructing/mounting/selecting a source acquires no provider/media resources.
export const createBrowserVoiceController = (notify: (status: VoiceStatus) => void) => new VoiceLifecycle(clock, browserVoiceAdapters({
  fetch: (...args) => fetch(...args), peer: () => new RTCPeerConnection(), audio: () => document.createElement("audio"),
  stream: () => new MediaStream(),
  // Prefer echo/noise processing before provider VAD. Ideal constraints remain
  // optional on devices that cannot apply them; never retry permission requests.
  // Requested settings do not establish effective processing or acoustic results.
  media: () => navigator.mediaDevices.getUserMedia({ audio: {
    echoCancellation: { ideal: true }, noiseSuppression: { ideal: true },
  } }), uuid: () => crypto.randomUUID(), now: clock.now,
  supportedCapture: () => navigator.mediaDevices.getSupportedConstraints?.() ?? {},
}), notify);
