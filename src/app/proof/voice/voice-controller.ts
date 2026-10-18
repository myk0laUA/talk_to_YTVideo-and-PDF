import type { ProofSourceDto, RealtimeCredentialDto } from "../../../shared/proof.ts";

export type VoiceState = {
  active: boolean; message: string; playback: "none" | "blocked" | "enabled";
  source?: ProofSourceDto; lines: { id: string; role: "user" | "assistant"; text: string; final: boolean }[];
};
export const initialVoiceState: VoiceState = { active: false, message: "Ready to start a proof. Microphone is off.", playback: "none", lines: [] };
export type VoiceDependencies = {
  fetch: typeof fetch; media: () => Promise<MediaStream>; peer: () => RTCPeerConnection;
  audio: () => HTMLAudioElement; stream: () => MediaStream; now?: () => number;
  startupMs?: number; sessionMs?: number;
};
type Attempt = {
  abort: AbortController; tracks: Set<MediaStreamTrack>; peer?: RTCPeerConnection;
  channel?: RTCDataChannel; audio?: HTMLAudioElement; remote?: MediaStream;
  credential?: RealtimeCredentialDto; timer?: ReturnType<typeof setTimeout>;
  created: boolean; negotiated: boolean; ready: boolean;
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const statusMessage = (status: number) => ({
  401: "Visitor session expired. Start again to establish a source.",
  403: "This request is not allowed from this origin.",
  404: "The proof source expired or is unavailable. Start again.",
  429: "Proof limit reached. Try later; no automatic retry will run.",
  503: "Voice proof is unavailable. Server configuration or service access needs review.",
}[status] ?? "The connection request failed. You can try Start again.");
class ProofFailure extends Error {}

export class VoiceProofController {
  private attempt?: Attempt;
  private disposed = false;
  private state: VoiceState = initialVoiceState;
  private deps: VoiceDependencies;
  private notify: (state: VoiceState) => void;
  constructor(deps: VoiceDependencies, notify: (state: VoiceState) => void) { this.deps = deps; this.notify = notify; }
  private current(a: Attempt) { return this.attempt === a && !a.abort.signal.aborted && !this.disposed; }
  private update(patch: Partial<VoiceState>) { this.state = { ...this.state, ...patch }; if (!this.disposed) this.notify(this.state); }
  private clean(a: Attempt) {
    a.abort.abort(); clearTimeout(a.timer); a.timer = undefined; a.credential = undefined;
    if (a.channel) { a.channel.onmessage = a.channel.onopen = a.channel.onclose = a.channel.onerror = null; a.channel.close(); }
    if (a.peer) { a.peer.ontrack = a.peer.onconnectionstatechange = null; a.peer.close(); }
    for (const track of a.tracks) { track.onended = null; track.stop(); }
    a.tracks.clear();
    if (a.audio) { a.audio.pause(); a.audio.srcObject = null; a.audio.removeAttribute("src"); a.audio.load(); }
    a.channel = undefined; a.peer = undefined; a.audio = undefined; a.remote = undefined;
  }
  stop(message = "Ended. Microphone and connection released.") {
    const a = this.attempt; this.attempt = undefined;
    if (a) this.clean(a);
    this.update({ active: false, playback: "none", message });
  }
  dispose() { this.disposed = true; this.stop(); this.notify = () => {}; }
  // All awaits are interruptible, even when a mock/browser operation ignores abort.
  private wait<T>(a: Attempt, pending: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const cancel = () => reject(new ProofFailure("Cancelled"));
      a.abort.signal.addEventListener("abort", cancel, { once: true });
      pending.then(value => { if (this.current(a)) resolve(value); else cancel(); }, reject)
        .finally(() => a.abort.signal.removeEventListener("abort", cancel));
      if (!this.current(a)) cancel();
    });
  }
  private async request(a: Attempt, path: string, body: object): Promise<unknown> {
    const response = await this.wait(a, this.deps.fetch(path, { method: "POST", credentials: "same-origin", cache: "no-store",
      redirect: "error", signal: a.abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    if (!response.ok) { void response.body?.cancel(); throw new ProofFailure(statusMessage(response.status)); }
    return this.wait(a, response.json());
  }
  async start() {
    if (this.attempt || this.disposed) return;
    const a: Attempt = { abort: new AbortController(), tracks: new Set(), created: false, negotiated: false, ready: false };
    this.attempt = a;
    this.update({ ...initialVoiceState, active: true, source: undefined, message: "Establishing the owned synthetic source…" });
    a.timer = setTimeout(() => { if (this.current(a)) this.stop("Connection timed out. Resources released; Start can try again."); }, this.deps.startupMs ?? 25_000);
    try {
      const source = await this.request(a, "/api/proof-source", {});
      if (!record(source) || typeof source.id !== "string" || !/^[a-f0-9-]{36}$/.test(source.id)
        || typeof source.title !== "string" || typeof source.text !== "string" || source.text.length > 4000
        || typeof source.expiresAt !== "string" || !(Date.parse(source.expiresAt) > (this.deps.now ?? Date.now)())) throw new ProofFailure("The proof source expired or is invalid. Start again.");
      this.update({ source: { id: source.id, title: source.title, text: source.text, expiresAt: source.expiresAt }, message: "Waiting for microphone permission…" });
      let media: MediaStream;
      try {
        media = await this.wait(a, this.deps.media().then(stream => {
          // getUserMedia cannot be aborted: dispose late tracks before returning.
          for (const track of stream.getTracks()) { if (this.current(a)) a.tracks.add(track); else track.stop(); }
          return stream;
        }));
      } catch { throw new ProofFailure("Microphone permission denied or unavailable. No credential was requested."); }
      if (!media.getAudioTracks().length) throw new ProofFailure("No microphone audio track is available.");
      this.update({ message: "Requesting one temporary credential…" });
      const dto = await this.request(a, "/api/realtime/client-secret", { sourceId: source.id });
      const now = Math.floor((this.deps.now ?? Date.now)() / 1000);
      if (!record(dto) || Object.keys(dto).sort().join() !== "clientSecret,expiresAt" || typeof dto.clientSecret !== "string"
        || !/^ek_[A-Za-z0-9_-]{1,500}$/.test(dto.clientSecret) || typeof dto.expiresAt !== "number" || !Number.isInteger(dto.expiresAt)
        || dto.expiresAt <= now || dto.expiresAt > now + 65) throw new ProofFailure("Temporary credential expired or is invalid. Start again.");
      a.credential = { clientSecret: dto.clientSecret, expiresAt: dto.expiresAt };
      // Drop the parsed response's token reference before any transport awaits.
      dto.clientSecret = undefined;
      this.update({ message: "Connecting; waiting for the session-ready signal…" });
      const pc = a.peer = this.deps.peer();
      const audio = a.audio = this.deps.audio(); audio.autoplay = false;
      a.remote = this.deps.stream(); audio.srcObject = a.remote;
      pc.ontrack = event => {
        const tracks = new Set([event.track, ...event.streams.flatMap(stream => stream.getTracks())]);
        for (const track of tracks) {
          if (!this.current(a)) { track.stop(); continue; }
          a.tracks.add(track); a.remote?.addTrack(track);
        }
        if (this.current(a)) void this.playAudio();
      };
      pc.onconnectionstatechange = () => {
        if (!this.current(a)) return;
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) this.stop("Connection lost. Resources released; Start can try again.");
        else this.ready(a);
      };
      for (const track of media.getTracks()) {
        track.onended = () => { if (this.current(a)) this.stop("Microphone ended. Connection released."); };
        pc.addTrack(track, media);
      }
      const channel = a.channel = pc.createDataChannel("oai-events");
      channel.onopen = () => this.ready(a);
      channel.onmessage = event => { if (this.current(a)) this.event(a, event.data); };
      channel.onerror = channel.onclose = () => { if (this.current(a)) this.stop("Event connection closed. Resources released."); };
      const offer = await this.wait(a, pc.createOffer());
      await this.wait(a, pc.setLocalDescription(offer));
      if (!offer.sdp || !a.credential || a.credential.expiresAt <= Math.floor((this.deps.now ?? Date.now)() / 1000)) throw new ProofFailure("Temporary credential expired before negotiation. Start again.");
      const negotiation = this.deps.fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST", body: offer.sdp, signal: a.abort.signal, credentials: "omit", cache: "no-store", redirect: "error",
        headers: { Authorization: `Bearer ${a.credential.clientSecret}`, "Content-Type": "application/sdp" },
      });
      a.credential = undefined;
      const response = await this.wait(a, negotiation);
      if (!response.ok) { void response.body?.cancel(); throw new ProofFailure(statusMessage(response.status)); }
      if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/sdp")) throw new ProofFailure("Invalid connection answer. Resources released.");
      const sdp = await this.wait(a, response.text());
      if (sdp.length > 100_000 || !/^v=0\r?\n/.test(sdp) || !/^m=audio /m.test(sdp)) throw new ProofFailure("Invalid connection answer. Resources released.");
      await this.wait(a, pc.setRemoteDescription({ type: "answer", sdp }));
      a.negotiated = true; this.ready(a);
    } catch (error) {
      if (this.current(a)) this.stop(error instanceof ProofFailure ? error.message : "Voice connection failed. Resources released; Start can try again.");
    }
  }
  private ready(a: Attempt) {
    if (!this.current(a) || a.ready || !a.created || !a.negotiated || a.peer?.connectionState !== "connected" || a.channel?.readyState !== "open") return;
    a.ready = true; clearTimeout(a.timer);
    a.timer = setTimeout(() => { if (this.current(a)) this.stop("Ended after the 60-second proof limit. Resources released."); }, this.deps.sessionMs ?? 60_000);
    this.update({ message: "Ready. Ask about the synthetic lighthouse." });
  }
  async playAudio() {
    const a = this.attempt; if (!a?.audio || !this.current(a)) return;
    try { await this.wait(a, a.audio.play()); if (this.current(a)) this.update({ playback: "enabled" }); }
    catch { if (this.current(a)) this.update({ playback: "blocked" }); }
  }
  private event(a: Attempt, raw: unknown) {
    try {
      if (typeof raw !== "string" || raw.length > 32_000) throw new Error();
      const e: unknown = JSON.parse(raw);
      if (!record(e) || typeof e.type !== "string") throw new Error();
      if (e.type === "error" || e.type === "conversation.item.input_audio_transcription.failed") {
        this.stop("The voice service reported an error. Resources released; Start can try again."); return;
      }
      if (e.type === "response.done") {
        if (!record(e.response) || typeof e.response.status !== "string") throw new Error();
        if (e.response.status === "failed") this.stop("The voice response failed. Resources released; Start can try again.");
        return;
      }
      if (e.type === "session.created") {
        if (!record(e.session) || e.session.type !== "realtime" || typeof e.session.id !== "string") throw new Error();
        a.created = true; this.ready(a); return;
      }
      const user = e.type === "conversation.item.input_audio_transcription.completed";
      const delta = e.type === "response.output_audio_transcript.delta";
      const done = e.type === "response.output_audio_transcript.done";
      if (!user && !delta && !done) return; // Other documented lifecycle events have no proof text.
      const text = delta ? e.delta : e.transcript;
      if (typeof e.item_id !== "string" || e.item_id.length > 200 || !Number.isInteger(e.content_index)
        || typeof text !== "string" || text.length > 8000) throw new Error();
      const id = `${user ? "user" : "assistant"}:${e.item_id}:${e.content_index}`;
      const previous = this.state.lines.find(line => line.id === id);
      if (previous?.final && delta) return;
      const line = { id, role: user ? "user" as const : "assistant" as const,
        text: (delta ? (previous?.text ?? "") + text : text).slice(0, 8000), final: !delta };
      this.update({ lines: (previous ? this.state.lines.map(item => item.id === id ? line : item) : [...this.state.lines, line]).slice(-30) });
    } catch { this.stop("Invalid voice event received. Resources released; Start can try again."); }
  }
}
