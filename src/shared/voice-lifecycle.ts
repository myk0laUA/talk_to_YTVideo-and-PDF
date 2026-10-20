import { PrimingController, type PrimingClock, type PrimingStatus, type PrimingTransport, type RunIdentity } from "./priming-controller.ts";
import { isProviderInput, type AdmissionInput } from "./priming-admission.ts";
import { isContextLimit, matchesProviderVoicePolicy } from "./priming-provider-policy.ts";
import { VoiceResponseController, emptyResponse, type ResponseState } from "./voice-response.ts";
import { TranscriptStore } from "./transcript.ts";

export type VoiceIdentity = RunIdentity & Readonly<{ sourceId: string }>;
export type VoiceStatus = Readonly<{
  phase: "idle" | "connecting" | "priming" | "ready" | "ended" | "failed";
  identity?: VoiceIdentity; muted: boolean; protocolReady: boolean; productionReady: false;
  microphone: "none" | "pending" | "available";
  playback: "none" | "pending" | "available" | "blocked";
  response: ResponseState;
  basis?: PrimingStatus["basis"]; failure?: VoiceFailure; message: string;
}>;
export type VoiceFailure = "budget_unavailable" | "preparation" | "connection" | "priming" | "microphone" | "track_ended" | "context_limit" | "provider";
export interface VoiceTrack {
  enabled: boolean; readonly readyState: string; stop(): void;
  subscribeEnded(callback: () => void): () => void;
}
export interface VoiceConnection {
  transport: PrimingTransport;
  // Sole owner of peer/channel/transport close, including transport-owned listeners.
  close(): void;
  playback: { play(): Promise<void>; release(): void };
}
export interface VoiceMedia {
  // Exclusive outgoing microphone audio tracks, initially disabled. Coordinator owns stop().
  tracks: readonly VoiceTrack[];
  // Synchronous attachment only; must not enable tracks or create more resources.
  attach(connection: VoiceConnection): void;
  // Releases non-track bindings/listeners, independently of track.stop().
  release(): void;
}
export interface VoiceAdapters {
  // Read-only preparation. No media/transport acquisition or retained credentials.
  prepare(identity: VoiceIdentity, signal: AbortSignal): Promise<AdmissionInput | { status: "budget_unavailable" }>;
  connect(identity: VoiceIdentity, signal: AbortSignal): Promise<VoiceConnection>;
  acquireMedia(identity: VoiceIdentity, signal: AbortSignal): Promise<VoiceMedia>;
}
export type VoiceDeadlines = { preparationMs: number; connectionMs: number; primingMs: number; mediaMs: number; interruptionMs: number };
const defaults: VoiceDeadlines = { preparationMs: 25_000, connectionMs: 15_000, primingMs: 25_000, mediaMs: 30_000, interruptionMs: 5_000 };
const safely = (action: () => void) => { try { action(); } catch { /* Continue releasing other resources. */ } };
const messages: Record<VoiceFailure, string> = {
  budget_unavailable: "Verified source budgets are unavailable. Setup needs review before starting voice.",
  preparation: "Source preparation failed or timed out. Start again to retry.",
  connection: "Connection failed, closed or timed out. Start again to retry.",
  priming: "Source acknowledgment failed or timed out. Start again to retry.",
  microphone: "Microphone denied, unavailable or timed out. Start again, or select text fallback when available.",
  track_ended: "Microphone ended. Start again, or select text fallback when available.",
  context_limit: "This source exceeds the provider context limit. The full source preview is unchanged. Start a new session to retry.",
  provider: "The provider rejected voice. Microphone and connection released. Start a new session to retry.",
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
type Attempt = {
  identity: VoiceIdentity; abort: AbortController; priming?: PrimingController;
  connection?: VoiceConnection; media?: VoiceMedia; listeners: (() => void)[];
  response?: VoiceResponseController;
};

/** A data-only bridge permits 07B admission BEFORE any connection acquisition.
 * Only the initial configuration write can wait here. 07B owns its subscription/timer,
 * but close is borrowed: the coordinator alone closes the real connection.
 */
class PrimingBridge implements PrimingTransport {
  private route: (event: unknown, priming: () => void) => void;
  constructor(route: (event: unknown, priming: () => void) => void) { this.route = route; }
  private connection?: VoiceConnection;
  private receive?: (e: unknown) => void;
  private closed?: () => void;
  private unsubscribe?: () => void;
  private pending?: { raw: string; resolve: () => void; reject: () => void };
  private stopped = false;
  isOpen() { return !this.stopped && (!this.connection || this.connection.transport.isOpen()); }
  subscribe(receive: (e: unknown) => void, closed: () => void) {
    this.receive = receive; this.closed = closed;
    return () => { const unsubscribe = this.unsubscribe; this.unsubscribe = undefined;
      this.receive = this.closed = undefined; safely(() => unsubscribe?.()); };
  }
  send(raw: string) {
    if (this.stopped) throw new Error("Stopped");
    if (this.connection) return this.connection.transport.send(raw);
    return new Promise<void>((resolve, reject) => { this.pending = { raw, resolve, reject: () => reject(new Error("Stopped")) }; });
  }
  bind(connection: VoiceConnection) {
    if (this.stopped) return;
    this.connection = connection;
    const unsubscribe = connection.transport.subscribe(e => {
      if (!this.stopped) this.route(e, () => this.receive?.(e));
    }, () => { if (!this.stopped) this.closed?.(); });
    if (this.stopped) { safely(unsubscribe); return; }
    this.unsubscribe = unsubscribe;
    const pending = this.pending; this.pending = undefined;
    if (pending && !this.stopped) {
      try { Promise.resolve(connection.transport.send(pending.raw)).then(pending.resolve, pending.reject); }
      catch { pending.reject(); }
    }
  }
  close() {
    if (this.stopped) return;
    this.stopped = true;
    this.pending?.reject(); this.pending = undefined;
    const unsubscribe = this.unsubscribe; this.unsubscribe = undefined;
    this.receive = this.closed = undefined; this.connection = undefined;
    safely(() => unsubscribe?.());
  }
}

/** No UI, credential mint, authorization, provider adapter, question sender or persistence.
 * All adapters own partial acquisitions until successful return. They MUST release partial
 * resources on rejection (even after abort). Successful returns transfer exclusive ownership;
 * late returns are released here. Cancellation must not separately close transferred resources.
 * Observer callbacks may stop/replace synchronously; every boundary rechecks identity.
 */
export class VoiceLifecycle {
  private attempt?: Attempt;
  private disposed = false;
  private disposing = false;
  private cleaning = false;
  private resetting = false;
  private sequence = 0;
  private transcriptStore = new TranscriptStore();
  private clock: PrimingClock;
  private adapters: VoiceAdapters;
  private notify: (status: VoiceStatus) => void;
  private deadlines: VoiceDeadlines;
  private status: VoiceStatus = Object.freeze({ phase: "idle", muted: false, protocolReady: false,
    productionReady: false, microphone: "none", playback: "none", response: emptyResponse(), message: "Voice has not started." });
  constructor(clock: PrimingClock, adapters: VoiceAdapters, notify: (status: VoiceStatus) => void, deadlines: Partial<VoiceDeadlines> = {}) {
    this.clock = clock; this.adapters = adapters; this.notify = notify; this.deadlines = { ...defaults, ...deadlines };
    if (Object.values(this.deadlines).some(n => !Number.isSafeInteger(n) || n <= 0 || n > 120_000)) throw new Error("Invalid voice deadline.");
  }
  get snapshot() { return this.status; }
  get transcript() { return this.transcriptStore.snapshot; }
  get canSendQuestions() { return !!this.attempt && this.status.phase === "ready" && this.status.microphone === "available" && !this.status.muted
    && this.attempt.response?.canAcceptInput === true; }
  // Tests override ONLY to instantiate 07B's existing test-only subclass. No runtime switch.
  protected createPriming(notify: (s: PrimingStatus) => void, primed: () => void): PrimingController {
    return new PrimingController(this.clock, notify, primed, this.deadlines.primingMs);
  }
  private current(a: Attempt) { return this.attempt === a && !a.abort.signal.aborted && !this.disposed; }
  private update(patch: Partial<VoiceStatus>) {
    this.status = Object.freeze({ ...this.status, ...patch });
    safely(() => this.notify(this.status));
  }
  private releaseMedia(media: VoiceMedia) {
    for (const track of new Set(media.tracks)) { safely(() => { track.enabled = false; }); safely(() => track.stop()); }
    safely(() => media.release());
  }
  private releaseConnection(connection: VoiceConnection) {
    safely(() => connection.playback.release()); safely(() => connection.close());
  }
  private finish(a: Attempt, failure?: VoiceFailure) {
    if (!this.current(a)) return;
    // Invalidate first: abort/close/track callbacks and observers cannot revive this run.
    this.attempt = undefined;
    this.transcriptStore.stop();
    this.cleaning = true;
    a.abort.abort();
    a.response?.stop(); a.response = undefined;
    for (const remove of a.listeners.splice(0)) safely(remove);
    const priming = a.priming, media = a.media, connection = a.connection;
    a.priming = undefined; a.media = undefined; a.connection = undefined;
    safely(() => priming?.stop());
    if (media) this.releaseMedia(media);
    if (connection) this.releaseConnection(connection);
    this.cleaning = false;
    this.update({ phase: failure ? "failed" : "ended", identity: undefined, basis: undefined, failure,
      muted: false, protocolReady: false, microphone: "none", playback: "none", response: emptyResponse(),
      message: failure ? messages[failure] : "Ended. Microphone and connection released." });
  }
  /** Interruptible and bounded even when an adapter ignores AbortSignal. */
  private wait<T>(a: Attempt, pending: Promise<T>, ms: number, late: (value: T) => void = () => {}): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const clear = () => { a.abort.signal.removeEventListener("abort", cancel); this.clock.clearTimeout(timer); };
      const cancel = () => { if (!settled) { settled = true; clear(); reject(new Error("Cancelled")); } };
      const timer = this.clock.setTimeout(cancel, ms);
      a.abort.signal.addEventListener("abort", cancel, { once: true });
      pending.then(value => {
        if (settled || !this.current(a)) { safely(() => late(value)); cancel(); return; }
        settled = true; clear(); resolve(value);
      }, () => { if (!settled) { settled = true; clear(); reject(new Error("Unavailable")); } });
      if (!this.current(a)) cancel();
    });
  }
  /** Call only from an explicit user Start action. Active starts are rejected; retry is explicit.
   * Source replacement MUST call reset(); page departure calls stop(); unmount calls dispose().
   */
  start(sourceId: string): boolean {
    if (this.disposed || this.disposing || this.cleaning || this.resetting || this.attempt || !/^[A-Za-z0-9_-]{1,128}$/.test(sourceId)) return false;
    const n = ++this.sequence;
    const a: Attempt = { identity: Object.freeze({ sourceId, runId: `voice_${n}`, connectionId: `connection_${n}` }),
      abort: new AbortController(), listeners: [] };
    this.attempt = a;
    this.transcriptStore.reset();
    this.update({ phase: "connecting", identity: a.identity, muted: false, protocolReady: false, productionReady: false,
      microphone: "none", playback: "none", response: emptyResponse(), basis: undefined, failure: undefined, message: "Preparing voice setup; questions are disabled." });
    if (this.current(a)) void this.setup(a);
    return true;
  }
  private async setup(a: Attempt) {
    let failure: VoiceFailure = "preparation";
    try {
      const input = await this.wait(a, this.adapters.prepare(a.identity, a.abort.signal), this.deadlines.preparationMs);
      if (!this.current(a)) return;
      if (!("manifest" in input)) { this.finish(a, "budget_unavailable"); return; }
      const providerVoice = isProviderInput(input);
      if (isProviderInput(input) && !matchesProviderVoicePolicy(input.policy)) { this.finish(a, "budget_unavailable"); return; }
      if (input.manifest.mode !== "voice" || input.manifest.runId !== a.identity.runId
        || input.manifest.items.some(item => JSON.parse(item.item.content[0].text).source.id !== a.identity.sourceId)) {
        this.finish(a, "preparation"); return;
      }
      // One real subscription. Before the complete 07B barrier, only priming owns events.
      // Afterward response errors must not be misclassified as source/transport failures.
      this.transcriptStore.start(a.identity, input.manifest.items.map(item => item.item.id));
      const bridge = new PrimingBridge((event, priming) => {
        if (!this.current(a)) return;
        // Provider admission is a permission to attempt generation, never a capacity guarantee.
        // Keep terminal session errors observable while microphone acquisition is still pending.
        if (providerVoice && a.priming?.snapshot.protocolReady && record(event)) {
          if (event.type === "error" && record(event.error)
            && (event.error.event_id == null || typeof event.error.event_id === "string" && event.error.event_id.startsWith(`${a.identity.runId}_`))) {
            this.finish(a, isContextLimit(event.error) ? "context_limit" : "provider"); return;
          }
          if (event.type === "response.created" && this.status.microphone !== "available") {
            this.finish(a, "provider"); return;
          }
          if (event.type === "response.done" && record(event.response) && event.response.status === "failed"
            && typeof event.response.id === "string" && event.response.id === a.response?.snapshot.generation.responseId) {
            this.transcriptStore.receive(a.identity, event);
            this.finish(a, record(event.response.status_details) && isContextLimit(event.response.status_details.error) ? "context_limit" : "provider"); return;
          }
        }
        if (!a.priming?.snapshot.protocolReady) priming();
        else if (this.status.microphone === "available") {
          this.transcriptStore.receive(a.identity, event);
          a.response?.receive(event);
          // The same lifecycle observer can read transcript after input-only events too.
          if (this.current(a)) this.update({});
        }
      });
      a.response = new VoiceResponseController(this.clock, bridge, a.identity.runId, response => {
        if (!this.current(a)) return;
        this.transcriptStore.observe(a.identity, response);
        this.update({ response });
        if (this.current(a)) this.applyMute(a);
      }, () => this.finish(a, "connection"), this.deadlines.interruptionMs);
      a.priming = this.createPriming(s => {
        if (!this.current(a)) return;
        if (s.state === "failed") this.finish(a, s.failure === "budget_unavailable" ? "budget_unavailable"
          : s.failure === "transport" ? "connection" : providerVoice && s.failure === "context_limit" ? "context_limit"
          : providerVoice && s.failure === "provider" ? "provider" : "priming");
      }, () => { if (this.current(a)) void this.media(a); });
      // Actual 07B validates admission and manifest against an inert bridge first.
      if (!a.priming.start(a.identity, input, bridge) || !this.current(a)) return;
      failure = "connection";
      const connection = await this.wait(a, this.adapters.connect(a.identity, a.abort.signal), this.deadlines.connectionMs,
        value => this.releaseConnection(value));
      if (!this.current(a)) { this.releaseConnection(connection); return; }
      a.connection = connection;
      this.update({ phase: "priming", basis: a.priming.snapshot.basis, message: "Waiting for complete source acknowledgment; questions are disabled." });
      if (this.current(a)) bridge.bind(connection);
    } catch { if (this.current(a)) this.finish(a, failure); }
  }
  private async media(a: Attempt) {
    try {
      this.update({ phase: "ready", protocolReady: true, microphone: "pending",
        message: "Source protocol acknowledged. Waiting for microphone; voice questions are disabled." });
      if (!this.current(a)) return;
      const media = await this.wait(a, this.adapters.acquireMedia(a.identity, a.abort.signal), this.deadlines.mediaMs,
        value => this.releaseMedia(value));
      if (!this.current(a)) { this.releaseMedia(media); return; }
      a.media = media;
      for (const track of new Set(media.tracks)) track.enabled = false;
      if (!media.tracks.length || media.tracks.some(t => t.readyState !== "live")) throw new Error("No live microphone");
      for (const track of new Set(media.tracks)) {
        const remove = track.subscribeEnded(() => this.finish(a, "track_ended"));
        if (!this.current(a)) { safely(remove); return; }
        a.listeners.push(remove);
      }
      media.attach(a.connection!);
      if (!this.current(a)) return;
      this.update({ microphone: "available", message: "Lifecycle ready. Audio and provider behavior require separate verification." });
      if (this.current(a)) this.applyMute(a);
    } catch { if (this.current(a)) this.finish(a, "microphone"); }
  }
  private applyMute(a: Attempt) {
    try { for (const t of a.media?.tracks ?? []) t.enabled = this.canSendQuestions && t.readyState === "live"; }
    catch { this.finish(a, "microphone"); }
  }
  mute() { const a = this.attempt; if (!a) return; this.update({ muted: true }); if (this.current(a)) this.applyMute(a); }
  unmute() { const a = this.attempt; if (!a) return; this.update({ muted: false }); if (this.current(a)) this.applyMute(a); }
  interruptCurrentResponse(): boolean {
    const a = this.attempt;
    return !!a && this.current(a) && this.status.protocolReady && this.status.microphone === "available"
      && this.status.phase === "ready" && (a.response?.interrupt() ?? false);
  }
  async playAudio() {
    const a = this.attempt;
    if (!a?.connection || !this.current(a) || this.status.phase !== "ready" || this.status.playback === "pending") return;
    this.update({ playback: "pending" });
    if (!this.current(a)) return;
    try { await this.wait(a, a.connection.playback.play(), this.deadlines.mediaMs);
      if (this.current(a)) this.update({ playback: "available" }); }
    catch { if (this.current(a)) this.update({ playback: "blocked" }); }
  }
  stop() { if (this.attempt) this.finish(this.attempt); }
  /** Source replacement: existing Stop cleanup plus immediate release of old transcript text. */
  reset() {
    if (this.resetting) return;
    this.resetting = true;
    try { this.stop(); this.transcriptStore.reset(); } finally { this.resetting = false; }
  }
  dispose() { this.disposing = true; this.stop(); this.transcriptStore.dispose(); this.disposed = true; this.notify = () => {}; }
}
