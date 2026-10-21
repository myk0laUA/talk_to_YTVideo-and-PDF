import type { PrimingClock, PrimingTransport } from "./priming-controller.ts";
import { projectResponseTerminal, type ResponseTerminal } from "./response-terminal.ts";

export type InterruptEvent = Readonly<{ type: "response.cancel"; event_id: string; response_id: string }>
  | Readonly<{ type: "output_audio_buffer.clear"; event_id: string }>;
export type Generation = "idle" | "generating" | "completed" | "cancelled" | "failed" | "incomplete";
export type ResponseState = Readonly<{
  generation: Readonly<{ state: Generation; responseId?: string; terminal?: ResponseTerminal }>;
  input: Readonly<{ state: "idle" | "speaking" | "stopped"; itemId?: string }>;
  output: Readonly<{ state: "idle" | "streaming" | "stopped" | "cleared" | "unknown"; responseId?: string }>;
  interruption: Readonly<{ state: "idle" | "pending" | "confirmed" | "failed"; responseId?: string;
    origin?: "manual" | "vad"; failure?: "timeout" | "provider" | "superseded" }>;
  issue?: "response_failed" | "response_incomplete" | "provider" | "capacity";
}>;
export const emptyResponse = (): ResponseState => Object.freeze({
  generation: Object.freeze({ state: "idle" }), input: Object.freeze({ state: "idle" }),
  output: Object.freeze({ state: "idle" }), interruption: Object.freeze({ state: "idle" }),
});
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const time = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const MAX_IDS = 128;
type Pending = { responseId: string; origin: "manual" | "vad"; cancelId?: string; clearId?: string;
  generationDone: boolean; bufferDone: boolean; writes: number; timer?: unknown };

/** Scriptable WebRTC control state, never a claim about physical audibility.
 * Receives parsed events ONLY through the lifecycle's single owned subscription.
 * No event/source/audio history. At most 128 retired response + speech IDs per run;
 * reaching the cap requires explicit Stop/Start rather than forgetting tombstones.
 */
export class VoiceResponseController {
  private status = emptyResponse();
  private retired = new Set<string>();
  private speechIds = new Set<string>();
  private speechStart = -1;
  private speechEnd = -1;
  private outputEnded = false;
  private attempted = false;
  private pending?: Pending;
  private stopped = false;
  private sequence = 0;
  private conversationId?: string;
  private clock: PrimingClock;
  private transport: PrimingTransport;
  private runId: string;
  private notify: (s: ResponseState) => void;
  private transportFailed: () => void;
  private timeoutMs: number;
  constructor(clock: PrimingClock, transport: PrimingTransport, runId: string,
    notify: (s: ResponseState) => void, transportFailed: () => void, timeoutMs: number) {
    this.clock = clock; this.transport = transport; this.runId = runId;
    this.notify = notify; this.transportFailed = transportFailed; this.timeoutMs = timeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120_000) throw new Error("Invalid interruption deadline.");
  }
  get snapshot() { return this.status; }
  get canAcceptInput() { return !this.stopped && this.status.issue !== "capacity"; }
  private update(patch: Partial<ResponseState>) {
    if (this.stopped) return;
    this.status = Object.freeze({ ...this.status, ...patch });
    this.notify(this.status);
  }
  private fail(p: Pending, failure: "timeout" | "provider" | "superseded") {
    if (this.stopped || this.pending !== p) return;
    this.clearPending();
    this.update({ interruption: Object.freeze({ state: "failed", responseId: p.responseId, origin: p.origin, failure }),
      ...(this.status.output.responseId === p.responseId && !p.bufferDone
        ? { output: Object.freeze({ state: "unknown", responseId: p.responseId }) } : {}) });
  }
  private clearPending() {
    if (this.pending?.timer !== undefined) this.clock.clearTimeout(this.pending.timer);
    this.pending = undefined;
  }
  private confirm(p: Pending) {
    if (this.pending !== p || this.stopped || p.writes || !p.generationDone || !p.bufferDone) return;
    this.clearPending();
    this.update({ interruption: Object.freeze({ state: "confirmed", responseId: p.responseId, origin: p.origin }) });
  }
  private begin(responseId: string, origin: "manual" | "vad", bufferDone: boolean) {
    const p: Pending = { responseId, origin, bufferDone, writes: 0,
      generationDone: this.status.generation.responseId !== responseId || this.status.generation.state !== "generating" };
    this.pending = p; this.attempted = true;
    p.timer = this.clock.setTimeout(() => this.fail(p, "timeout"), this.timeoutMs);
    this.update({ interruption: Object.freeze({ state: "pending", responseId, origin }) });
    return p;
  }
  private open() {
    if (this.stopped) return false;
    try { if (this.transport.isOpen()) return true; } catch { /* Sanitized transport failure. */ }
    this.transportFailed(); return false;
  }
  private write(p: Pending, event: InterruptEvent, then: () => void) {
    if (!this.open() || this.pending !== p) return;
    p.writes++;
    try {
      const result = this.transport.send(JSON.stringify(event));
      Promise.resolve(result).then(() => {
        if (this.stopped || this.pending !== p) return;
        p.writes--; then(); this.confirm(p);
      }, () => { if (!this.stopped && this.pending === p) this.transportFailed(); });
    } catch { if (!this.stopped && this.pending === p) this.transportFailed(); }
  }
  /** No response.create, input mutation, truncation timing, mute or session teardown. */
  interrupt(): boolean {
    const g = this.status.generation, o = this.status.output;
    if (!this.canAcceptInput || this.pending || this.attempted || !g.responseId
      || g.state !== "generating" && !(o.responseId === g.responseId && ["streaming", "unknown"].includes(o.state))) return false;
    // clear is untargeted. Do not clear an older buffer while cancelling a newer response.
    if (o.responseId && o.responseId !== g.responseId && ["streaming", "unknown"].includes(o.state)) return false;
    const p = this.begin(g.responseId, "manual", false);
    const clear = () => {
      if (this.stopped || this.pending !== p) return;
      // Cancel may be asynchronous. Never let a delayed send clear a newer response.
      if (this.status.generation.responseId !== p.responseId ||
        this.status.output.responseId && this.status.output.responseId !== p.responseId
        && ["streaming", "unknown"].includes(this.status.output.state)) { this.fail(p, "superseded"); return; }
      if (p.bufferDone) { this.confirm(p); return; }
      p.clearId = `${this.runId}_interrupt_${++this.sequence}_clear`;
      this.write(p, { type: "output_audio_buffer.clear", event_id: p.clearId }, () => {});
    };
    if (g.state === "generating") {
      p.cancelId = `${this.runId}_interrupt_${++this.sequence}_cancel`;
      this.write(p, { type: "response.cancel", event_id: p.cancelId, response_id: p.responseId }, clear);
    } else clear(); // Generation already ended: only buffered audio remains.
    return true;
  }
  receive(event: unknown) {
    if (!this.canAcceptInput || !record(event) || !id(event.event_id) || typeof event.type !== "string") return;
    const e = event, g = this.status.generation;
    if (typeof e.type !== "string") return;
    if (e.type === "error") {
      if (!record(e.error)) return;
      const clientId = e.error.event_id, p = this.pending;
      if (p && (clientId === p.cancelId || clientId === p.clearId) && id(clientId)) {
        // A completed response can race cancel. Still require independent buffer confirmation.
        if (clientId === p.cancelId && p.generationDone) return;
        this.fail(p, "provider");
      } else if (clientId === undefined || clientId === null) this.update({ issue: "provider" });
      return; // Unrelated/stale command errors have no authority over this run.
    }
    if (e.type === "input_audio_buffer.speech_started" || e.type === "input_audio_buffer.speech_stopped") {
      if (!id(e.item_id)) return;
      if (e.type === "input_audio_buffer.speech_started") {
        if (!time(e.audio_start_ms) || e.audio_start_ms <= Math.max(this.speechStart, this.speechEnd) || this.speechIds.has(e.item_id)) return;
        if (this.speechIds.size >= MAX_IDS) { this.update({ issue: "capacity" }); return; }
        this.speechIds.add(e.item_id); this.speechStart = e.audio_start_ms;
        this.update({ input: Object.freeze({ state: "speaking", itemId: e.item_id }) });
        if (this.stopped || this.pending || this.attempted || g !== this.status.generation) return;
        const outputActive = ["streaming", "unknown"].includes(this.status.output.state);
        // Speech has no response ID: observe VAD only if one unambiguous response is active.
        if (g.responseId && (g.state === "generating" || outputActive)
          && (!outputActive || this.status.output.responseId === g.responseId)) {
          // Absence of a started event is not evidence that no audio was buffered.
          const bufferConfirmed = this.outputEnded && this.status.output.responseId === g.responseId;
          const p = this.begin(g.responseId, "vad", bufferConfirmed); this.confirm(p);
        }
      } else if (time(e.audio_end_ms) && e.audio_end_ms >= this.speechStart && this.status.input.itemId === e.item_id && this.status.input.state === "speaking") {
        this.speechEnd = e.audio_end_ms;
        this.update({ input: Object.freeze({ state: "stopped", itemId: e.item_id }) });
      }
      return;
    }
    if (e.type === "response.created" || e.type === "response.done") {
      if (!record(e.response) || !id(e.response.id)) return;
      const conversationId = e.response.conversation_id;
      if (conversationId !== undefined && (!id(conversationId) || this.conversationId && conversationId !== this.conversationId)) return;
      const responseId = e.response.id;
      if (e.type === "response.created") {
        if (e.response.status !== "in_progress" || responseId === g.responseId || this.retired.has(responseId)) return;
        if (this.retired.size >= MAX_IDS) { this.update({ issue: "capacity" }); return; }
        if (id(conversationId)) this.conversationId = conversationId;
        if (g.responseId) this.retired.add(g.responseId);
        this.outputEnded = false; this.attempted = false;
        this.update({ generation: Object.freeze({ state: "generating", responseId }), issue: undefined,
          ...(!["streaming", "unknown"].includes(this.status.output.state) ? { output: Object.freeze({ state: "idle" }) } : {}),
          ...(!this.pending ? { interruption: Object.freeze({ state: "idle" }) } : {}) });
      } else {
        const state = e.response.status;
        if (!["completed", "cancelled", "failed", "incomplete"].includes(state as string)) return;
        if (responseId === g.responseId && g.state === "generating") {
          this.update({ generation: Object.freeze({ state: state as Generation, responseId, terminal: projectResponseTerminal(e.response) }),
            ...(state === "failed" ? { issue: "response_failed" } : state === "incomplete" ? { issue: "response_incomplete" } : {}) });
        }
        const p = this.pending;
        if (p?.responseId === responseId) { p.generationDone = true; this.confirm(p); }
      }
      return;
    }
    if (!["output_audio_buffer.started", "output_audio_buffer.stopped", "output_audio_buffer.cleared"].includes(e.type) || !id(e.response_id)) return;
    const responseId = e.response_id, p = this.pending;
    if (e.type === "output_audio_buffer.started") {
      if (responseId !== g.responseId || this.outputEnded) return;
      // A started event can arrive after done; generation and buffer clocks are separate.
      this.update({ output: Object.freeze({ state: "streaming", responseId }) });
      if (p?.responseId === responseId && p.origin === "vad") p.bufferDone = false;
    } else {
      if (responseId !== g.responseId && responseId !== this.status.output.responseId && responseId !== p?.responseId) return;
      if (responseId === g.responseId) this.outputEnded = true;
      const state = e.type === "output_audio_buffer.cleared" ? "cleared" : "stopped";
      if (responseId === this.status.output.responseId || responseId === g.responseId && !["streaming", "unknown"].includes(this.status.output.state)) {
        this.update({ output: Object.freeze({ state, responseId }) });
      }
      if (p?.responseId === responseId) { p.bufferDone = true; this.confirm(p); }
    }
  }
  stop() {
    this.stopped = true; this.clearPending(); this.retired.clear(); this.speechIds.clear();
    this.conversationId = undefined;
    this.status = emptyResponse(); this.notify = () => {}; this.transportFailed = () => {};
  }
}
