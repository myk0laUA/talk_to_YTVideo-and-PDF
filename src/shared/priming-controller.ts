import { bytes, freeze, sourceItemId, MAX_EVENT_BYTES, MAX_ITEMS, MAX_WIRE_BYTES, type Manifest, type SessionEvent, type SourceItem } from "./priming-manifest.ts";
import { isProviderInput, validateAdmission, validateProviderAdmission, type AdmissionInput as PrimingInput } from "./priming-admission.ts";
import { isContextLimit, matchesVoiceTranscription } from "./priming-provider-policy.ts";

export type PrimingState = "idle" | "configuring" | "priming" | "primed" | "stopped" | "failed";
export type Failure = "budget_unavailable" | "invalid_input" | "timeout" | "transport" | "protocol" | "configuration" | "provider" | "context_limit";
export type Basis = "verified-budget" | "synthetic-test-only" | "provider_enforced";
export type PrimingStatus = Readonly<{ state: PrimingState; acknowledged: number; expected: number;
  protocolReady: boolean; productionReady: false; basis?: Basis; failure?: Failure; message?: string }>;
export interface PrimingTransport {
  isOpen(): boolean;
  send(serializedEvent: string): void | Promise<void>;
  close(): void;
  // Adapter owns parsing and connection identity; disposal MUST remove all owned listeners.
  subscribe(receive: (event: unknown) => void, closed: () => void): () => void;
}
export interface PrimingClock { now(): number; setTimeout(callback: () => void, ms: number): unknown; clearTimeout(handle: unknown): void }
export type RunIdentity = Readonly<{ runId: string; connectionId: string }>;
type Run = { identity: RunIdentity; transport: PrimingTransport; input?: PrimingInput; basis?: Basis;
  deadline: number; timer?: unknown; unsubscribe?: () => void; closed: boolean; acknowledged: Set<string>;
  sent: Map<string, SourceItem>; stage: "initial" | "items" | "final" | "ready"; sessionId?: string;
  lastConfig?: string; writes: number; readyCalled: boolean };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const safe = (callback: () => void) => { try { callback(); } catch { /* Observer/cleanup failures cannot revive a run. */ } };
const messages: Record<Failure, string> = {
  budget_unavailable: "Verified source and transport budgets are required. Start a new session after review.",
  invalid_input: "Source setup is unavailable. Start a new session after review.",
  timeout: "Source setup timed out. Start a new session to retry.",
  transport: "The connection closed or could not send source context. Start a new session to retry.",
  protocol: "Source acknowledgment was invalid. Start a new session to retry.",
  configuration: "Session settings were not confirmed. Start a new session to retry.",
  provider: "The provider rejected source setup. Start a new session to retry.",
  context_limit: "This source exceeds the provider context limit. The full source preview is unchanged.",
};

/** One owned connection per run. No credential, authorization, persistence or media APIs. */
export class PrimingController {
  private run?: Run;
  private usedRuns = new Set<string>();
  private usedConnections = new Set<string>();
  private status: PrimingStatus = freeze({ state: "idle", acknowledged: 0, expected: 0, protocolReady: false, productionReady: false });
  private clock: PrimingClock;
  private notify: (status: PrimingStatus) => void;
  private onPrimed: (identity: RunIdentity, basis: Basis) => void;
  private timeoutMs: number;
  constructor(clock: PrimingClock, notify: (status: PrimingStatus) => void,
    onPrimed: (identity: RunIdentity, basis: Basis) => void, timeoutMs = 25_000) {
    this.clock = clock; this.notify = notify; this.onPrimed = onPrimed; this.timeoutMs = timeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120_000) throw new Error("Invalid setup deadline.");
  }
  get snapshot() { return this.status; }
  get canSendQuestions() { return this.status.state === "primed" && !!this.run && !this.run.closed; }
  // Sole test seam: tests subclass this in tests/priming only. No runtime flag or synthetic factory.
  protected admission(input: PrimingInput): Basis | undefined {
    return validateProviderAdmission(input) ? "provider_enforced" : validateAdmission(input) ? "verified-budget" : undefined;
  }
  private current(r: Run) { return this.run === r && !r.closed; }
  private update(r: Run, state: PrimingState, failure?: Failure) {
    this.status = freeze({ state, acknowledged: r.acknowledged.size, expected: r.input?.manifest.items.length ?? 0,
      basis: r.basis, protocolReady: state === "primed", productionReady: false,
      ...(failure ? { failure, message: messages[failure] } : {}) });
    safe(() => this.notify(this.status));
  }
  private cleanup(r: Run) {
    if (r.closed) return;
    r.closed = true;
    if (r.timer !== undefined) this.clock.clearTimeout(r.timer);
    r.timer = undefined; safe(() => r.unsubscribe?.()); r.unsubscribe = undefined;
    r.sent.clear(); r.acknowledged.clear(); r.input = undefined;
    safe(() => r.transport.close());
  }
  private fail(r: Run, failure: Failure) {
    if (!this.current(r)) return;
    this.update(r, "failed", failure); this.cleanup(r);
  }
  private live(r: Run) {
    if (!this.current(r)) return false;
    const now = this.clock.now();
    if (!Number.isFinite(now) || now >= r.deadline && !r.readyCalled) { this.fail(r, "timeout"); return false; }
    try { if (!r.transport.isOpen()) { this.fail(r, "transport"); return false; } }
    catch { this.fail(r, "transport"); return false; }
    return true;
  }
  /** Same active identity is idempotent; a different active identity must be explicitly stopped first.
   * Used identities are rejected; replacement requires a fresh run AND connection. At most 128 runs per controller.
   */
  start(identity: RunIdentity, input: PrimingInput, transport: PrimingTransport): boolean {
    if (this.run && !this.run.closed) return this.run.identity.runId === identity.runId
      && this.run.identity.connectionId === identity.connectionId && this.run.transport === transport;
    if (!id(identity.runId) || !id(identity.connectionId) || this.usedRuns.has(identity.runId)
      || this.usedConnections.has(identity.connectionId) || this.usedRuns.size >= 128) return false;
    const r: Run = { identity: freeze({ ...identity }), transport, deadline: this.clock.now() + this.timeoutMs,
      closed: false, acknowledged: new Set(), sent: new Map(), stage: "initial", writes: 0, readyCalled: false };
    this.usedRuns.add(identity.runId); this.usedConnections.add(identity.connectionId); this.run = r;
    try {
      r.input = freeze(structuredClone(input));
      const m = r.input.manifest;
      if (!m || m.runId !== identity.runId || !this.validManifest(m)) { this.fail(r, "invalid_input"); return false; }
      r.basis = this.admission(r.input);
      if (!r.basis) { this.fail(r, "budget_unavailable"); return false; }
      this.update(r, "configuring");
      if (!this.current(r)) return false;
      r.timer = this.clock.setTimeout(() => this.fail(r, "timeout"), Math.max(0, r.deadline - this.clock.now()));
      const unsubscribe = transport.subscribe(e => this.receive(r, e), () => this.fail(r, "transport"));
      if (!this.current(r)) { safe(unsubscribe); return false; } r.unsubscribe = unsubscribe;
      this.send(r, m.configure);
      return this.current(r);
    } catch { this.fail(r, "invalid_input"); return false; }
  }
  private validManifest(m: Manifest) {
    if (m.version !== "source-priming-v1" || !["voice", "text"].includes(m.mode) || !["A", "B"].includes(m.variant)
      || !Array.isArray(m.items) || !m.items.length || m.items.length > MAX_ITEMS
      || !Number.isSafeInteger(m.maxEventBytes) || m.maxEventBytes < 2048 || m.maxEventBytes > MAX_EVENT_BYTES) return false;
    const events = [m.configure, ...m.items, m.finalize], representation = events.map(e => JSON.stringify(e)).join("\n");
    if (representation !== m.representation || bytes(representation) !== m.bytes || m.bytes > MAX_WIRE_BYTES
      || events.some(e => bytes(JSON.stringify(e)) > m.maxEventBytes)) return false;
    const config = (e: SessionEvent, final: boolean) => e?.type === "session.update"
      && e.event_id === `${m.runId}_${final ? "final" : "config"}` && e.session?.type === "realtime"
      && typeof e.session.instructions === "string" && !!e.session.instructions
      && e.session.truncation === "disabled" && JSON.stringify(e.session.tools) === "[]"
      && JSON.stringify(e.session.output_modalities) === JSON.stringify([final && m.mode === "voice" ? "audio" : "text"])
      && JSON.stringify(e.session.audio?.input.turn_detection) === JSON.stringify(final && m.mode === "voice"
        ? { type: "server_vad", create_response: true, interrupt_response: true, idle_timeout_ms: null } : null);
    return config(m.configure, false) && config(m.finalize, true) && m.configure.session.instructions !== m.finalize.session.instructions
      && m.items.every((e, i) => e.type === "conversation.item.create" && e.event_id === `${m.runId}_create_${i}`
        && e.item.id === sourceItemId(m.runId, i) && e.item.type === "message" && e.item.role === "user"
        && e.item.content.length === 1 && e.item.content[0].type === "input_text" && typeof e.item.content[0].text === "string"
        && e.previous_item_id === (i ? m.items[i - 1].item.id : undefined));
  }
  private send(r: Run, event: object) {
    if (!this.live(r)) return;
    r.writes++;
    try {
      const result = r.transport.send(JSON.stringify(event));
      Promise.resolve(result).then(() => { if (!this.live(r)) return; r.writes--; this.advance(r); }, () => this.fail(r, "transport"));
    } catch { this.fail(r, "transport"); }
  }
  private advance(r: Run) {
    if (!this.live(r) || r.writes || !r.input) return;
    if (r.stage === "items" && r.acknowledged.size === r.input.manifest.items.length) {
      r.stage = "final"; this.send(r, r.input.manifest.finalize);
    } else if (r.stage === "ready" && !r.readyCalled) {
      r.readyCalled = true;
      if (r.timer !== undefined) this.clock.clearTimeout(r.timer); r.timer = undefined;
      // Drop all source payloads and ACK buffers after final confirmation; connection stays owned until Stop.
      this.update(r, "primed"); r.input = undefined; r.sent.clear(); r.acknowledged.clear();
      if (this.current(r)) safe(() => this.onPrimed(r.identity, r.basis!));
    }
  }
  private receive(r: Run, event: unknown) {
    if (!this.live(r)) return;
    if (!record(event) || typeof event.type !== "string") { this.fail(r, "protocol"); return; }
    // Whole parsed events only. Retain no inbound queue or unbounded event-id history.
    try { if (bytes(JSON.stringify(event)) > MAX_EVENT_BYTES + 8192) { this.fail(r, "protocol"); return; } }
    catch { this.fail(r, "protocol"); return; }
    if (event.type === "error") {
      const error = record(event.error) ? event.error : undefined;
      // Errors naming another client's event cannot reject this run; uncorrelated session errors can.
      if (typeof error?.event_id === "string" && !error.event_id.startsWith(`${r.identity.runId}_`)) return;
      this.fail(r, isContextLimit(error) ? "context_limit" : "provider"); return;
    }
    if (event.type === "response.created" && !r.readyCalled) { this.fail(r, "protocol"); return; }
    if ((event.type === "conversation.item.deleted" || event.type === "conversation.item.truncated")
      && typeof event.item_id === "string" && r.sent.has(event.item_id)) { this.fail(r, "protocol"); return; }
    if (event.type === "session.updated") {
      if (!r.input || r.stage === "ready") return;
      const session = event.session;
      if (!id(event.event_id) || !record(session) || !id(session.id) || session.object !== "realtime.session") { this.fail(r, "protocol"); return; }
      if (r.sessionId && session.id !== r.sessionId) { this.fail(r, "configuration"); return; }
      // Duplicate initial ACK is harmless while awaiting the final update. No unbounded event-id cache.
      const effectiveInput = record(session.audio) && record(session.audio.input) ? session.audio.input : undefined;
      const effectiveTurn = effectiveInput?.turn_detection;
      const fingerprint = JSON.stringify({ id: session.id, type: session.type, model: session.model,
        instructions: session.instructions, truncation: session.truncation, tools: session.tools,
        output_modalities: session.output_modalities, turn_detection: record(effectiveTurn) ? {
          type: effectiveTurn.type, create_response: effectiveTurn.create_response,
          interrupt_response: effectiveTurn.interrupt_response, idle_timeout_ms: effectiveTurn.idle_timeout_ms,
        } : effectiveTurn, ...(isProviderInput(r.input) ? { max_output_tokens: session.max_output_tokens,
          tool_choice: session.tool_choice, reasoning: session.reasoning, transcription: effectiveInput?.transcription,
          audio_output: record(session.audio) && record(session.audio.output) ? { voice: session.audio.output.voice } : undefined } : {}) });
      if (fingerprint === r.lastConfig) return;
      if (r.stage === "items") { this.fail(r, "configuration"); return; }
      const desired = (r.stage === "initial" ? r.input.manifest.configure : r.input.manifest.finalize).session;
      const audio = record(session.audio) && record(session.audio.input) ? session.audio.input : undefined;
      const turn = audio?.turn_detection, desiredTurn = desired.audio.input.turn_detection;
      const turnMatches = desiredTurn === null ? turn === null : record(turn) && turn.type === desiredTurn.type
        && turn.create_response === true && turn.interrupt_response === true && turn.idle_timeout_ms === null;
      const model = isProviderInput(r.input) ? r.input.policy.model : r.input.wireBudget.model;
      if (session.type !== "realtime" || session.model !== model || session.instructions !== desired.instructions || session.truncation !== "disabled"
        || JSON.stringify(session.tools) !== "[]" || JSON.stringify(session.output_modalities) !== JSON.stringify(desired.output_modalities) || !turnMatches) {
        this.fail(r, "configuration"); return;
      }
      const output = record(session.audio) && record(session.audio.output) ? session.audio.output : undefined;
      if (isProviderInput(r.input) && (session.max_output_tokens !== desired.max_output_tokens || session.tool_choice !== "none"
        || (desired.audio.input.transcription === null ? audio?.transcription !== null : !matchesVoiceTranscription(audio?.transcription)) || (r.input.policy.mode === "text"
          ? !record(session.reasoning) || session.reasoning.effort !== "minimal"
          : output?.voice !== desired.audio.output?.voice))) {
        this.fail(r, "configuration"); return;
      }
      r.sessionId = session.id; r.lastConfig = fingerprint;
      if (r.stage === "initial") {
        const items = r.input.manifest.items;
        r.stage = "items"; this.update(r, "priming");
        for (const e of items) {
          if (!this.live(r)) break;
          r.sent.set(e.item.id, e.item); this.send(r, e);
        }
      } else { r.stage = "ready"; this.advance(r); }
      return;
    }
    if (event.type !== "conversation.item.done" && event.type !== "conversation.item.added") return;
    if (!record(event.item) || !id(event.item.id)) { this.fail(r, "protocol"); return; }
    const expected = r.sent.get(event.item.id);
    if (!expected) return;
    const item = event.item;
    if (!id(event.event_id) || item.type !== "message" || item.role !== "user"
      || (event.type === "conversation.item.done" ? item.status !== "completed"
        : item.status !== undefined && !["completed", "incomplete", "in_progress"].includes(item.status as string))
      || !Array.isArray(item.content) || item.content.length !== 1
      || !record(item.content[0]) || item.content[0].type !== "input_text" || item.content[0].text !== expected.content[0].text) {
      this.fail(r, "protocol"); return;
    }
    if (event.type === "conversation.item.added") return;
    const index = r.input!.manifest.items.findIndex(e => e.item.id === item.id);
    const previous = index ? r.input!.manifest.items[index - 1].item.id : null;
    if (event.previous_item_id !== undefined && event.previous_item_id !== previous) { this.fail(r, "protocol"); return; }
    r.acknowledged.add(expected.id); this.update(r, "priming"); this.advance(r);
  }
  stop() {
    const r = this.run;
    if (!r || r.closed) return;
    this.update(r, "stopped"); this.cleanup(r);
  }
}
