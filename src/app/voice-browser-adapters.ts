"use client";

import { VoiceLifecycle, type VoiceAdapters, type VoiceConnection, type VoiceIdentity, type VoiceStatus, type VoiceTrack } from "../shared/voice-lifecycle.ts";
import { validateProviderAdmission, type ProviderPrimingInput } from "../shared/priming-admission.ts";
import { matchesProviderVoicePolicy } from "../shared/priming-provider-policy.ts";
import { bytes, MAX_EVENT_BYTES, MAX_ITEMS, MAX_WIRE_BYTES } from "../shared/priming-manifest.ts";
import type { PrimingTransport } from "../shared/priming-controller.ts";

export type BrowserVoiceDependencies = {
  fetch: typeof fetch; peer: () => RTCPeerConnection; audio: () => HTMLAudioElement;
  stream: () => MediaStream; media: () => Promise<MediaStream>; uuid: () => string; now: () => number;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const unavailable = () => new Error("Voice connection unavailable");
const safely = (fn: () => void) => { try { fn(); } catch { /* Release remaining resources. */ } };
const cancelBody = (r: Response) => { void r.body?.cancel().catch(() => {}); };

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
async function read(response: Response, mime: string | readonly string[], limit: number, signal: AbortSignal) {
  const allowed = typeof mime === "string" ? [mime] : mime;
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!response.ok || response.redirected || !contentType || !allowed.includes(contentType)
    || Number(response.headers.get("content-length")) > limit || !response.body) { cancelBody(response); throw unavailable(); }
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await wait(reader.read(), signal);
      if (done) return text + decoder.decode();
      size += value.byteLength; if (size > limit) throw unavailable();
      text += decoder.decode(value, { stream: true });
    }
  } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}

/** Ordered reliable data channel. Bounded FIFO; one fixed drain deadline, no retries.
 * Native message dispatch is synchronous: no incoming event backlog is retained. */
export class BrowserVoiceTransport implements PrimingTransport {
  private receive?: (e: unknown) => void;
  private closed?: () => void;
  private ended = false;
  private queue: { raw: string; size: number; resolve: () => void; reject: (e: Error) => void }[] = [];
  private queuedBytes = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private events = 0;
  private receivedBytes = 0;
  private channel: RTCDataChannel;
  private peer: RTCPeerConnection;
  private fail: () => void;
  constructor(peer: RTCPeerConnection, channel: RTCDataChannel, fail: () => void) {
    this.peer = peer; this.channel = channel; this.fail = fail;
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
      this.receive?.(event);
    } catch { this.failed(); }
  };
  isOpen() { return !this.ended && this.channel.readyState === "open" && this.peer.connectionState === "connected"; }
  subscribe(receive: (event: unknown) => void, closed: () => void) {
    if (this.receive || !this.isOpen()) throw unavailable();
    this.receive = receive; this.closed = closed;
    return () => { this.receive = undefined; this.closed = undefined; };
  }
  send(raw: string) {
    const size = bytes(raw), negotiated = this.peer.sctp?.maxMessageSize;
    const max = negotiated === undefined || negotiated === 0 || negotiated === Infinity ? MAX_EVENT_BYTES : Math.min(MAX_EVENT_BYTES, negotiated);
    if (!this.isOpen() || !size || size > max || this.queue.length >= MAX_ITEMS + 8 || this.queuedBytes + size > MAX_WIRE_BYTES + 65_536) {
      this.failed(); return Promise.reject(unavailable());
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ raw, size, resolve, reject }); this.queuedBytes += size;
      if (!this.timer) this.timer = setTimeout(this.failed, 5000);
      this.drain();
    });
  }
  private drain = () => {
    if (!this.isOpen()) { this.failed(); return; }
    try {
      while (this.queue.length && this.channel.bufferedAmount <= 65_536) {
        const item = this.queue.shift()!; this.queuedBytes -= item.size;
        try { this.channel.send(item.raw); item.resolve(); } catch { item.reject(unavailable()); throw unavailable(); }
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
  let cancellation: Promise<void> = Promise.resolve();
  const send = async (suffix: string, body: object, signal: AbortSignal) => {
    const response = await wait(deps.fetch(`/api/voice-preparations${suffix}`, { method: "POST", credentials: "same-origin", cache: "no-store",
      redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }), signal, cancelBody);
    return JSON.parse(await read(response, "application/json", suffix ? 2048 : 24_500_000, signal)) as unknown;
  };
  const current = (identity: VoiceIdentity, signal: AbortSignal) => {
    const p = prepared;
    if (!p || p.signal !== signal || signal.aborted || p.sourceId !== identity.sourceId || p.connectionId !== identity.connectionId
      || p.runId !== identity.runId || !p.expires || p.expires <= deps.now() || !p.sourceExpires || p.sourceExpires <= deps.now()) throw unavailable();
    return p;
  };
  return {
    async prepare(identity, signal) {
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
      const result = await send("", { sourceId: identity.sourceId, requestId }, signal);
      if (prepared !== p || signal.aborted || !record(result) || Object.keys(result).sort().join() !== "conversationReady,expiresAt,input,preparationId,providerConfirmed,requestId"
        || result.requestId !== requestId || result.conversationReady !== false || result.providerConfirmed !== false
        || typeof result.preparationId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(result.preparationId)
        || typeof result.expiresAt !== "number" || !Number.isSafeInteger(result.expiresAt) || result.expiresAt <= deps.now() || result.expiresAt > deps.now() + 30_000) throw unavailable();
      const input = result.input as ProviderPrimingInput;
      if (!validateProviderAdmission(input) || !matchesProviderVoicePolicy(input.policy) || input.manifest.variant !== "B"
        || !uuid(input.manifest.runId) || input.variant.source.id !== identity.sourceId
        || !["PDF", "YOUTUBE"].includes(input.variant.source.kind)) throw unavailable();
      const expires = Date.parse(input.variant.source.expiresAt);
      if (!Number.isFinite(expires) || expires <= deps.now() || result.expiresAt > expires) throw unavailable();
      Object.assign(p, { preparationId: result.preparationId, runId: input.manifest.runId, expires: result.expiresAt, sourceExpires: expires });
      return { input, serverRunId: input.manifest.runId };
    },
    async connect(identity, signal) {
      const p = current(identity, signal);
      const abort = new AbortController(), stop = () => abort.abort();
      signal.addEventListener("abort", stop, { once: true });
      const timer = setTimeout(stop, 15_000);
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
        const result = await send("/credential", { sourceId: p.sourceId, requestId: p.requestId, preparationId: p.preparationId }, abort.signal);
        // No retained token on the adapter or connection; erase parsed DTO after fetch invocation.
        current(identity, signal);
        if (!record(result) || Object.keys(result).sort().join() !== "clientSecret,expiresAt,preparationId" || result.preparationId !== p.preparationId
          || typeof result.clientSecret !== "string" || !/^ek_[A-Za-z0-9_-]{1,500}$/.test(result.clientSecret)
          || typeof result.expiresAt !== "number" || !Number.isInteger(result.expiresAt)
          || result.expiresAt * 1000 <= deps.now() || result.expiresAt * 1000 > deps.now() + 65_000) throw unavailable();
        p.claimed = true; signal.removeEventListener("abort", p.cancel); prepared = undefined;
        clientSecret = result.clientSecret; result.clientSecret = undefined;
        const credentialExpiry = result.expiresAt * 1000;
        peer = deps.peer(); audio = deps.audio(); audio.autoplay = false;
        const remote = deps.stream(); audio.srcObject = remote;
        const pc = peer, speaker = audio;
        // Pre-negotiate send/receive audio with NO local microphone or sender track.
        const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        const ontrack = (e: RTCTrackEvent) => {
          for (const track of new Set([e.track, ...e.streams.flatMap(s => s.getTracks())])) {
            if (closed) { safely(() => track.stop()); continue; }
            tracks.add(track); remote.addTrack(track);
          }
        };
        pc.addEventListener("track", ontrack); remove.push(() => pc.removeEventListener("track", ontrack));
        channel = pc.createDataChannel("oai-events", { ordered: true });
        transport = new BrowserVoiceTransport(pc, channel, fail);
        const onstate = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) fail(); };
        pc.addEventListener("connectionstatechange", onstate); remove.push(() => pc.removeEventListener("connectionstatechange", onstate));
        try {
          const offer = await wait(pc.createOffer(), abort.signal);
          await wait(pc.setLocalDescription(offer), abort.signal);
          if (!offer.sdp || bytes(offer.sdp) > 100_000 || !/^v=0\r?\n/.test(offer.sdp) || !/^m=audio /m.test(offer.sdp) || !/^m=application /m.test(offer.sdp)
            || credentialExpiry <= deps.now() || signal.aborted) throw unavailable();
          const pending = deps.fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, signal: abort.signal,
            credentials: "omit", cache: "no-store", redirect: "error", headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" } });
          clientSecret = undefined;
          const response = await wait(pending, abort.signal, cancelBody);
          // The real calls endpoint can return SDP as text/plain. Keep the
          // bounded reader and SDP structure/native parser checks for both types.
          const sdp = await read(response, ["application/sdp", "text/plain"], 100_000, abort.signal);
          if (credentialExpiry <= deps.now() || !/^v=0\r?\n/.test(sdp) || !/^m=audio /m.test(sdp) || !/^m=application /m.test(sdp)) throw unavailable();
          await wait(pc.setRemoteDescription({ type: "answer", sdp }), abort.signal);
        } finally { clientSecret = undefined; }
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
        // Source expiry ends this local session; credential expiry only bounds negotiation.
        expiry = setTimeout(fail, Math.min(2_147_483_647, p.sourceExpires - deps.now()));
        const connection: VoiceConnection = { transport, close, playback: {
          play: () => closed ? Promise.reject(unavailable()) : speaker.play(), release: releaseAudio,
        } };
        bindings.set(connection, { sender: transceiver.sender, signal, live: () => !closed });
        remove.push(() => bindings.delete(connection));
        transferred = true; return connection;
      } catch { close(); throw unavailable(); }
      finally { clientSecret = undefined; clearTimeout(timer); signal.removeEventListener("abort", stop); }
    },
    async acquireMedia(_identity, signal) {
      const stopTracks = (s: MediaStream) => { for (const t of new Set(s.getTracks())) { t.enabled = false; safely(() => t.stop()); } };
      const stream = await wait(deps.media().then(stream => { for (const t of stream.getTracks()) t.enabled = false; return stream; }), signal, stopTracks);
      const native = [...new Set(stream.getTracks())];
      if (signal.aborted || native.length !== 1 || native[0].kind !== "audio" || native[0].readyState !== "live") { stopTracks(stream); throw unavailable(); }
      const wrappers: VoiceTrack[] = native.map(track => ({ get enabled() { return track.enabled; }, set enabled(v) { track.enabled = v; },
        get readyState() { return track.readyState; }, stop: () => track.stop(),
        subscribeEnded: callback => { track.addEventListener("ended", callback); return () => track.removeEventListener("ended", callback); } }));
      return { tracks: wrappers, async attach(connection) {
        const binding = bindings.get(connection);
        if (!binding || binding.signal !== signal || signal.aborted || !binding.live()) throw unavailable();
        await wait(binding.sender.replaceTrack(native[0]), signal);
        if (signal.aborted || !binding.live()) throw unavailable();
      }, release() { /* Lifecycle owns tracks and ended listeners; connection owns sender. */ } };
    },
  };
}
const bindings = new WeakMap<VoiceConnection, { sender: RTCRtpSender; signal: AbortSignal; live: () => boolean }>();
const clock = { now: Date.now, setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms), clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>) };
// Stable function. Constructing/mounting/selecting a source acquires no provider/media resources.
export const createBrowserVoiceController = (notify: (status: VoiceStatus) => void) => new VoiceLifecycle(clock, browserVoiceAdapters({
  fetch: (...args) => fetch(...args), peer: () => new RTCPeerConnection(), audio: () => document.createElement("audio"),
  stream: () => new MediaStream(), media: () => navigator.mediaDevices.getUserMedia({ audio: true }), uuid: () => crypto.randomUUID(), now: Date.now,
}), notify);
