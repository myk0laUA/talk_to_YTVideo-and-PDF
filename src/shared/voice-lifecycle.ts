import { PrimingController, type PrimingClock, type PrimingStatus, type PrimingTransport, type RunIdentity } from "./priming-controller.ts";
import { isProviderInput, validateProviderAdmission, type AdmissionInput, type ProviderPrimingInput } from "./priming-admission.ts";
import { isContextLimit, matchesProviderVoicePolicy } from "./priming-provider-policy.ts";
import { VoiceResponseController, emptyResponse, type ResponseState } from "./voice-response.ts";
import { TranscriptStore, type TranscriptSnapshot } from "./transcript.ts";
import { joinedTranscript, voiceHistory, VoiceHistoryRestore, type HistoryEvent } from "./conversation-restore.ts";
import { VoiceSetupDiagnostics, type VoiceSetupDiagnostic, type VoiceSetupReporter } from "./voice-diagnostics.ts";
import { VoiceEventDiagnostics } from "./voice-event-diagnostics.ts";
import { SessionAdmissionError, type AdmissionRejection } from "./session-admission.ts";
import { SOURCE_SIZE_MESSAGE, SourceSizeError } from "./priming-failure.ts";

export type VoiceIdentity = RunIdentity & Readonly<{ sourceId: string }>;
export type VoiceStatus = Readonly<{
  phase: "idle" | "connecting" | "priming" | "ready" | "ended" | "failed";
  identity?: VoiceIdentity; muted: boolean; speakerMuted: boolean; protocolReady: boolean; productionReady: false;
  microphone: "none" | "pending" | "available";
  playback: "none" | "pending" | "available" | "blocked";
  response: ResponseState;
  basis?: PrimingStatus["basis"]; failure?: VoiceFailure; message: string;
  diagnostics?: readonly VoiceSetupDiagnostic[];
  admission?: AdmissionRejection;
  historyOmitted?: boolean;
}>;
export type VoiceFailure = "source_too_large" | "admission" | "budget_unavailable" | "preparation" | "connection" | "priming" | "microphone" | "track_ended" | "context_limit" | "provider" | "history";
export interface VoiceTrack {
  enabled: boolean; readonly readyState: string; stop(): void;
  subscribeEnded(callback: () => void): () => void;
}
export interface VoiceConnection {
  transport: PrimingTransport;
  // Sole owner of peer/channel/transport close, including transport-owned listeners.
  close(): void;
  playback: { play(signal: AbortSignal): Promise<void>; setMuted(muted: boolean): void; release(): void };
}
export interface VoiceMedia {
  // Exclusive outgoing microphone audio tracks, initially disabled. Coordinator owns stop().
  tracks: readonly VoiceTrack[];
  // Attach to the pre-negotiated sender; never enable tracks or create resources.
  // Async replaceTrack must settle before microphone input can be enabled.
  attach(connection: VoiceConnection): void | Promise<void>;
  // Releases non-track bindings/listeners, independently of track.stop().
  release(): void;
}
export interface VoiceAdapters {
  // Read-only preparation. No media/transport acquisition or retained credentials.
  prepare(identity: VoiceIdentity, signal: AbortSignal, report?: VoiceSetupReporter): Promise<AdmissionInput | { status: "budget_unavailable" }
    | { input: ProviderPrimingInput; serverRunId: string }>;
  connect(identity: VoiceIdentity, signal: AbortSignal, report?: VoiceSetupReporter, trace?: VoiceEventDiagnostics): Promise<VoiceConnection>;
  acquireMedia(identity: VoiceIdentity, signal: AbortSignal, report?: VoiceSetupReporter, trace?: VoiceEventDiagnostics): Promise<VoiceMedia>;
}
export type VoiceDeadlines = { preparationMs: number; connectionMs: number; primingMs: number; mediaMs: number; interruptionMs: number };
const defaults: VoiceDeadlines = { preparationMs: 25_000, connectionMs: 15_000, primingMs: 25_000, mediaMs: 30_000, interruptionMs: 5_000 };
const safely = (action: () => void) => { try { action(); } catch { /* Continue releasing other resources. */ } };
const messages: Record<VoiceFailure, string> = {
  history: "Conversation history could not be restored. Your received text is still here.",
  source_too_large: SOURCE_SIZE_MESSAGE,
  admission: "Voice cannot start right now. Text mode is available separately.",
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
  diagnostics: VoiceSetupDiagnostics;
  trace: VoiceEventDiagnostics;
  resuming?: boolean; history?: HistoryEvent[]; restore?: VoiceHistoryRestore;
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
  send(raw: string, valid?: () => boolean) {
    if (this.stopped) throw new Error("Stopped");
    if (this.connection) return this.connection.transport.send(raw, valid);
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
  private previousTranscript?: TranscriptSnapshot;
  private continuation?: { sourceId: string; muted: boolean; speakerMuted: boolean };
  private eventTrace?: VoiceEventDiagnostics;
  private clock: PrimingClock;
  private adapters: VoiceAdapters;
  private notify: (status: VoiceStatus) => void;
  private deadlines: VoiceDeadlines;
  private status: VoiceStatus = Object.freeze({ phase: "idle", muted: false, speakerMuted: false, protocolReady: false,
    productionReady: false, microphone: "none", playback: "none", response: emptyResponse(), message: "Voice has not started." });
  constructor(clock: PrimingClock, adapters: VoiceAdapters, notify: (status: VoiceStatus) => void, deadlines: Partial<VoiceDeadlines> = {}) {
    this.clock = clock; this.adapters = adapters; this.notify = notify; this.deadlines = { ...defaults, ...deadlines };
    if (Object.values(this.deadlines).some(n => !Number.isSafeInteger(n) || n <= 0 || n > 120_000)) throw new Error("Invalid voice deadline.");
  }
  get snapshot() { return this.status; }
  get transcript() { return joinedTranscript(this.previousTranscript, this.transcriptStore.snapshot); }
  get canResume() { return !!this.continuation && !this.attempt && !this.disposed; }
  get eventDiagnostics() { return this.eventTrace?.snapshot; }
  get canSendQuestions() { return !!this.attempt && this.status.phase === "ready" && this.status.microphone === "available" && !this.status.muted
    && this.attempt.response?.canAcceptInput === true; }
  // Tests override ONLY to instantiate 07B's existing test-only subclass. No runtime switch.
  protected createPriming(notify: (s: PrimingStatus) => void, primed: () => void): PrimingController {
    return new PrimingController(this.clock, notify, primed, this.deadlines.primingMs);
  }
  private current(a: Attempt) { return this.attempt === a && !a.abort.signal.aborted && !this.disposed; }
  private report(a: Attempt): VoiceSetupReporter {
    return (stage, outcome, status, reason) => {
      if (!this.current(a)) return;
      a.diagnostics.report(stage, outcome, status, reason);
      // Progress is read with the next lifecycle notification; observing it cannot
      // synchronously Stop between a native resource acquisition and its cleanup.
      this.status = Object.freeze({ ...this.status, diagnostics: a.diagnostics.snapshot });
    };
  }
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
  private finish(a: Attempt, failure?: VoiceFailure, admission?: AdmissionRejection) {
    if (!this.current(a)) return;
    if (failure === "connection" && (this.status.microphone === "available" || a.resuming)) this.remember(a);
    a.diagnostics.finish(failure ? a.diagnostics.snapshot.at(-1)?.stage.endsWith("_validation") ? "invalid" : "unavailable" : "cancelled");
    // Invalidate first: abort/close/track callbacks and observers cannot revive this run.
    this.attempt = undefined;
    a.trace.mark("session_end"); a.trace.finish();
    this.transcriptStore.stop();
    this.cleaning = true;
    a.abort.abort();
    a.restore?.stop(); a.restore = undefined; a.history = undefined;
    a.response?.stop(); a.response = undefined;
    for (const remove of a.listeners.splice(0)) safely(remove);
    const priming = a.priming, media = a.media, connection = a.connection;
    a.priming = undefined; a.media = undefined; a.connection = undefined;
    safely(() => priming?.stop());
    if (media) this.releaseMedia(media);
    if (connection) this.releaseConnection(connection);
    this.cleaning = false;
    this.update({ phase: failure ? "failed" : "ended", identity: undefined, basis: undefined, failure, admission,
      muted: false, speakerMuted: false, protocolReady: false, microphone: "none", playback: "none", response: emptyResponse(),
      diagnostics: a.diagnostics.snapshot,
      message: failure ? messages[failure] : "Ended. Microphone and connection released." });
  }
  /** Interruptible and bounded even when an adapter ignores AbortSignal. */
  private wait<T>(a: Attempt, pending: Promise<T>, ms: number, late: (value: T) => void = () => {}): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const clear = () => { a.abort.signal.removeEventListener("abort", cancel); this.clock.clearTimeout(timer); };
      const cancel = () => { if (!settled) { settled = true; clear(); reject(new Error("Cancelled")); } };
      const timer = this.clock.setTimeout(() => { if (!settled && this.current(a)) a.diagnostics.finish("timeout"); cancel(); }, ms);
      a.abort.signal.addEventListener("abort", cancel, { once: true });
      pending.then(value => {
        if (settled || !this.current(a)) { safely(() => late(value)); cancel(); return; }
        settled = true; clear(); resolve(value);
      }, error => { if (!settled) { settled = true; clear(); reject(error instanceof SessionAdmissionError || error instanceof SourceSizeError ? error : new Error("Unavailable")); } });
      if (!this.current(a)) cancel();
    });
  }
  /** Start follows an explicit Start or mode selection. Active starts are rejected.
   * Source replacement MUST call reset(); page departure calls stop(); unmount calls dispose().
   */
  start(sourceId: string, history?: TranscriptSnapshot): boolean {
    if (history && history.identity?.sourceId !== sourceId) return false;
    return this.begin(sourceId, false, history);
  }
  private remember(a: Attempt) { this.continuation = { sourceId: a.identity.sourceId, muted: this.status.muted, speakerMuted: this.status.speakerMuted }; }
  /** Network suspension retains same-source dialogue and user mute choices, but releases all media. */
  suspend(): boolean {
    const a = this.attempt;
    if (a && (this.status.microphone === "available" || a.resuming)) { this.remember(a); this.finish(a); }
    else if (a) this.finish(a);
    return this.canResume;
  }
  resume(): boolean { return this.canResume && this.begin(this.continuation!.sourceId, true); }
  private begin(sourceId: string, resuming: boolean, history?: TranscriptSnapshot): boolean {
    if (this.disposed || this.disposing || this.cleaning || this.resetting || this.attempt || !/^[A-Za-z0-9_-]{1,128}$/.test(sourceId)) return false;
    const n = ++this.sequence;
    const a: Attempt = { identity: Object.freeze({ sourceId, runId: `voice_${n}`, connectionId: `connection_${n}` }),
      abort: new AbortController(), listeners: [], diagnostics: new VoiceSetupDiagnostics(this.clock.now.bind(this.clock)),
      trace: new VoiceEventDiagnostics(this.clock.now.bind(this.clock)), resuming };
    this.eventTrace = a.trace; a.trace.mark("session_start");
    this.attempt = a;
    this.previousTranscript = resuming ? this.transcript : history;
    if (!resuming) this.continuation = undefined;
    this.transcriptStore.reset();
    this.update({ phase: "connecting", identity: a.identity, muted: resuming ? this.continuation!.muted : false,
      speakerMuted: resuming ? this.continuation!.speakerMuted : false, historyOmitted: undefined, protocolReady: false, productionReady: false,
      microphone: "none", playback: "none", response: emptyResponse(), basis: undefined, failure: undefined, admission: undefined, diagnostics: a.diagnostics.snapshot, message: "Preparing voice setup; questions are disabled." });
    if (this.current(a)) void this.setup(a);
    return true;
  }
  private async setup(a: Attempt) {
    let failure: VoiceFailure = "preparation";
    try {
      const prepared = await this.wait(a, this.adapters.prepare(a.identity, a.abort.signal, this.report(a)), this.deadlines.preparationMs);
      if (!this.current(a)) return;
      // The owned HTTP boundary selects the immutable manifest identity. Keep the local
      // connection identity for stale-work ownership; never rewrite server source/events.
      if ("input" in prepared) {
        if (!validateProviderAdmission(prepared.input) || !matchesProviderVoicePolicy(prepared.input.policy)
          || prepared.serverRunId !== prepared.input.manifest.runId || !/^[A-Za-z0-9_-]{1,48}$/.test(prepared.serverRunId)) {
          this.finish(a, "preparation"); return;
        }
        a.identity = Object.freeze({ ...a.identity, runId: prepared.serverRunId });
        this.update({ identity: a.identity });
        if (!this.current(a)) return;
      }
      const input = "input" in prepared ? prepared.input : prepared;
      if (!("manifest" in input)) { this.finish(a, "budget_unavailable"); return; }
      const providerVoice = isProviderInput(input);
      if (isProviderInput(input) && !matchesProviderVoicePolicy(input.policy)) { this.finish(a, "budget_unavailable"); return; }
      if (input.manifest.mode !== "voice" || input.manifest.runId !== a.identity.runId
        || input.manifest.items.some(item => JSON.parse(item.item.content[0].text).source.id !== a.identity.sourceId)) {
        this.finish(a, "preparation"); return;
      }
      if (this.previousTranscript) {
        failure = "history";
        const history = voiceHistory(this.previousTranscript, a.identity.runId, input.manifest.items.at(-1)!.item.id, input.manifest.bytes);
        a.history = history.events;
        this.update({ historyOmitted: history.dropped });
        if (!this.current(a)) return;
      }
      // One real subscription. Before the complete 07B barrier, only priming owns events.
      // Afterward response errors must not be misclassified as source/transport failures.
      this.transcriptStore.start(a.identity, [...input.manifest.items.map(item => item.item.id), ...(a.history?.map(e => e.item.id) ?? [])]);
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
        else if (a.restore) a.restore.receive(event);
        else if (this.status.microphone === "available") {
          this.transcriptStore.receive(a.identity, event);
          a.response?.receive(event);
          // The same lifecycle observer can read transcript after input-only events too.
          if (this.current(a)) this.update({});
        }
      });
      a.response = new VoiceResponseController(this.clock, bridge, a.identity.runId, response => {
        if (!this.current(a)) return;
        if (response.interruption.state !== this.status.response.interruption.state && response.interruption.state !== "idle")
          a.trace.mark(`interruption_${response.interruption.state}`);
        this.transcriptStore.observe(a.identity, response);
        this.update({ response });
        if (this.current(a)) this.applyMute(a);
      }, () => this.finish(a, "connection"), this.deadlines.interruptionMs);
      a.priming = this.createPriming(s => {
        if (!this.current(a)) return;
        const report = this.report(a);
        if (s.state === "priming") {
          if (a.diagnostics.snapshot.at(-1)?.stage === "initial_settings_ack") report("initial_settings_ack", "ok");
          if (s.acknowledged < s.expected) report("source_items_ack", "pending");
          else { report("source_items_ack", "ok"); report("final_settings_ack", "pending"); }
        } else if (s.state === "primed") report("final_settings_ack", "ok");
        else if (s.state === "failed") a.diagnostics.finish(s.failure === "timeout" ? "timeout"
          : s.failure === "provider" ? "provider" : s.failure === "context_limit" ? "context_limit"
          : s.failure === "configuration" || s.failure === "protocol" || s.failure === "invalid_input" ? "invalid" : "unavailable");
        if (s.state === "failed") this.finish(a, s.failure === "budget_unavailable" ? "budget_unavailable"
          : s.failure === "transport" ? "connection" : providerVoice && s.failure === "context_limit" ? "context_limit"
          : providerVoice && s.failure === "provider" ? "provider" : "priming");
      }, () => { if (this.current(a)) void this.restoreAndListen(a); });
      // Actual 07B validates admission and manifest against an inert bridge first.
      a.trace.mark("priming_start");
      if (!a.priming.start(a.identity, input, bridge) || !this.current(a)) return;
      failure = "connection";
      const connection = await this.wait(a, this.adapters.connect(a.identity, a.abort.signal, this.report(a), a.trace), this.deadlines.connectionMs,
        value => this.releaseConnection(value));
      if (!this.current(a)) { this.releaseConnection(connection); return; }
      a.connection = connection;
      this.report(a)("initial_settings_ack", "pending");
      this.update({ phase: "priming", basis: a.priming.snapshot.basis, message: "Waiting for complete source acknowledgment; questions are disabled." });
      if (this.current(a)) bridge.bind(connection);
    } catch (error) { if (this.current(a)) this.finish(a, error instanceof SourceSizeError ? "source_too_large" : error instanceof SessionAdmissionError ? "admission" : failure,
      error instanceof SessionAdmissionError ? error.rejection : undefined); }
  }
  private async restoreAndListen(a: Attempt) {
    if (a.history?.length) {
      const restore = new VoiceHistoryRestore(a.history); a.restore = restore; a.history = undefined;
      this.update({ message: "Restoring the conversation before enabling the microphone." });
      const completed = this.wait(a, restore.done, this.deadlines.primingMs);
      if (this.current(a)) void restore.send(raw => a.connection!.transport.send(raw));
      try { await completed; }
      catch { if (this.current(a)) this.finish(a, "history"); return; }
      if (!this.current(a)) return;
      a.restore = undefined;
    }
    if (this.current(a)) await this.media(a);
  }
  private async media(a: Attempt) {
    try {
      this.update({ phase: "ready", protocolReady: true, microphone: "pending",
        message: "Source protocol acknowledged. Waiting for microphone; voice questions are disabled." });
      if (!this.current(a)) return;
      const media = await this.wait(a, this.adapters.acquireMedia(a.identity, a.abort.signal, this.report(a), a.trace), this.deadlines.mediaMs,
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
      this.report(a)("microphone_attach", "pending");
      await this.wait(a, Promise.resolve(media.attach(a.connection!)), this.deadlines.mediaMs);
      if (!this.current(a)) return;
      this.report(a)("microphone_attach", "ok");
      a.connection!.playback.setMuted(this.status.speakerMuted);
      a.trace.mark("session_ready");
      this.update({ microphone: "available", message: "Lifecycle ready. Audio and provider behavior require separate verification." });
      if (this.current(a)) { this.applyMute(a); void this.playAudio(); }
    } catch { if (this.current(a)) this.finish(a, "microphone"); }
  }
  private applyMute(a: Attempt) {
    try { for (const t of a.media?.tracks ?? []) t.enabled = this.canSendQuestions && t.readyState === "live"; }
    catch { this.finish(a, "microphone"); }
  }
  mute() { const a = this.attempt; if (!a) return; a.trace.mark("mute"); this.update({ muted: true }); if (this.current(a)) this.applyMute(a); }
  unmute() { const a = this.attempt; if (!a) return; a.trace.mark("unmute"); this.update({ muted: false }); if (this.current(a)) this.applyMute(a); }
  interruptCurrentResponse(): boolean {
    const a = this.attempt;
    return !!a && this.current(a) && this.status.protocolReady && this.status.microphone === "available"
      && this.status.phase === "ready" && (a.response?.interrupt() ?? false);
  }
  setSpeakerMuted(muted: boolean) {
    const a = this.attempt;
    if (!a?.connection || !this.current(a)) return;
    a.connection.playback.setMuted(muted);
    this.update({ speakerMuted: muted });
  }
  async playAudio() {
    const a = this.attempt;
    if (!a?.connection || !this.current(a) || this.status.phase !== "ready" || this.status.playback === "pending") return;
    a.trace.mark("play_requested");
    this.update({ playback: "pending" });
    if (!this.current(a)) return;
    const playbackAbort = new AbortController();
    const abortPlayback = () => playbackAbort.abort();
    a.abort.signal.addEventListener("abort", abortPlayback, { once: true });
    try { await this.wait(a, a.connection.playback.play(playbackAbort.signal), this.deadlines.mediaMs);
      if (this.current(a)) this.update({ playback: "available" }); }
    catch { if (this.current(a)) this.update({ playback: "blocked" }); }
    finally { playbackAbort.abort(); a.abort.signal.removeEventListener("abort", abortPlayback); }
  }
  stop() { this.continuation = undefined; if (this.attempt) this.finish(this.attempt); }
  /** Source replacement: existing Stop cleanup plus immediate release of old transcript text. */
  reset() {
    if (this.resetting) return;
    this.resetting = true;
    try { this.stop(); this.previousTranscript = undefined; this.transcriptStore.reset(); this.eventTrace = undefined; } finally { this.resetting = false; }
  }
  dispose() { this.disposing = true; this.stop(); this.previousTranscript = undefined; this.eventTrace = undefined; this.transcriptStore.dispose(); this.disposed = true; this.notify = () => {}; }
}
