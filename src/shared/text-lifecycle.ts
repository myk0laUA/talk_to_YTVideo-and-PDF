import { PrimingController, type PrimingClock, type PrimingStatus, type PrimingTransport } from "./priming-controller.ts";
import { isProviderInput, type AdmissionInput, type WireBudget } from "./priming-admission.ts";
import { isContextLimit, matchesProviderTextPolicy, type ProviderTextPolicy } from "./priming-provider-policy.ts";
import { bytes, freeze } from "./priming-manifest.ts";
import { TranscriptStore, type TranscriptIdentity } from "./transcript.ts";

export const TEXT_QUESTION_LIMIT = 1000;
export type TextIdentity = TranscriptIdentity;
export type TextStatus = Readonly<{
  phase: "idle" | "connecting" | "priming" | "ready" | "admitting" | "sending" | "awaiting-response" | "responding" | "ended" | "failed";
  identity?: TextIdentity; protocolReady: boolean; productionReady: false;
  revision: number; basis?: PrimingStatus["basis"]; failure?: TextFailure;
}>;
export type TextFailure = "budget_unavailable" | "preparation" | "connection" | "priming" | "turn_budget_unavailable" | "stale_admission" | "timeout" | "protocol" | "provider" | "limit" | "context_limit";
export interface TextConnection { transport: PrimingTransport; close(): void }
export interface TextAdapters {
  // Partial acquisitions remain adapter-owned until successful return; rejection MUST release them.
  // Successful return transfers exclusive ownership, including late returns after abort.
  prepare(identity: TextIdentity, signal: AbortSignal): Promise<AdmissionInput | { status: "budget_unavailable" }>;
  connect(identity: TextIdentity, signal: AbortSignal): Promise<TextConnection>;
}
export type TurnProposal = Readonly<{
  identity: TextIdentity; revision: number; questionRevision: number; question: string; itemId: string;
  policy: ProviderTextPolicy | Readonly<{ basis?: "measured" } & Pick<WireBudget, "model" | "tokenizer" | "policyVersion" | "capacity" | "historyAllowance" | "outputReserve" | "framingAllowance">>;
}>;
export type TurnPermit = Readonly<{ proposal: TurnProposal; maxOutputTokens: number }>;
type Deadlines = { preparationMs: number; connectionMs: number; primingMs: number; turnMs: number };
const defaults: Deadlines = { preparationMs: 25_000, connectionMs: 15_000, primingMs: 25_000, turnMs: 30_000 };
const safe = (f: () => void) => { try { f(); } catch { /* Finish all cleanup even if an adapter/observer throws. */ } };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);

/** Borrowed close; coordinator alone owns connection.close(). One real subscription.
 * The only buffered command is 07B's initial configuration, before connection acquisition.
 */
class TextBridge implements PrimingTransport {
  private connection?: TextConnection;
  private receive?: (e: unknown) => void;
  private closed?: () => void;
  private remove?: () => void;
  private pending?: { raw: string; resolve: () => void; reject: () => void };
  private stopped = false;
  private route: (e: unknown, prime: () => void) => void;
  private lost: () => void;
  constructor(route: (e: unknown, prime: () => void) => void, lost: () => void) { this.route = route; this.lost = lost; }
  isOpen() { return !this.stopped && (!this.connection || this.connection.transport.isOpen()); }
  subscribe(receive: (e: unknown) => void, closed: () => void) {
    this.receive = receive; this.closed = closed;
    return () => this.close();
  }
  send(raw: string): void | Promise<void> {
    if (this.stopped) throw new Error("Stopped");
    if (this.connection) return this.connection.transport.send(raw);
    if (this.pending) throw new Error("Configuration already pending");
    return new Promise<void>((resolve, reject) => { this.pending = { raw, resolve, reject: () => reject(new Error("Stopped")) }; });
  }
  bind(connection: TextConnection) {
    this.connection = connection;
    const remove = connection.transport.subscribe(e => {
      if (!this.stopped) this.route(e, () => this.receive?.(e));
    }, () => { if (!this.stopped) { this.closed?.(); this.lost(); } });
    if (this.stopped) { safe(remove); return; }
    this.remove = remove;
    const pending = this.pending; this.pending = undefined;
    if (pending) {
      try { Promise.resolve(connection.transport.send(pending.raw)).then(pending.resolve, pending.reject); }
      catch { pending.reject(); }
    }
  }
  close() {
    if (this.stopped) return;
    this.stopped = true;
    this.pending?.reject(); this.pending = undefined;
    const remove = this.remove; this.remove = undefined;
    this.receive = this.closed = undefined; this.connection = undefined;
    safe(() => remove?.());
  }
}
type Pending = { proposal: TurnProposal; timer?: unknown; itemSent: boolean; itemAck: boolean; itemWritten: boolean;
  responseSent: boolean; responseWritten: boolean; responseId?: string; done: boolean; outputLimit?: number; items: Set<string> };
type Attempt = { identity: TextIdentity; abort: AbortController; priming?: PrimingController; bridge?: TextBridge;
  connection?: TextConnection; policy?: TurnProposal["policy"]; previous?: string; sessionId?: string; conversationId?: string;
  pending?: Pending; turns: number; revision: number };

/** Data-only text lifecycle. No provider implementation, credentials, media, persistence or UI.
 * A Start always clears history. Stop preserves received text; reset/dispose erase it.
 */
export class TextLifecycle {
  private attempt?: Attempt;
  private disposed = false;
  private cleaning = false;
  private sequence = 0;
  private question = "";
  private questionRevision = 0;
  private store = new TranscriptStore();
  private deadlines: Deadlines;
  private clock: PrimingClock;
  private adapters: TextAdapters;
  private notify: (s: TextStatus) => void;
  private status: TextStatus = freeze({ phase: "idle", protocolReady: false, productionReady: false, revision: 0 });
  constructor(clock: PrimingClock, adapters: TextAdapters, notify: (s: TextStatus) => void,
    deadlines: Partial<Deadlines> = {}) {
    this.clock = clock; this.adapters = adapters; this.notify = notify;
    this.deadlines = { ...defaults, ...deadlines };
    if (Object.values(this.deadlines).some(n => !Number.isSafeInteger(n) || n <= 0 || n > 120_000)) throw new Error("Invalid text deadline.");
  }
  get snapshot() { return this.status; }
  get transcript() { return this.store.snapshot; }
  get canSubmit() { return !!this.attempt && this.status.phase === "ready" && !this.attempt.pending; }
  protected createPriming(notify: (s: PrimingStatus) => void, primed: () => void) {
    return new PrimingController(this.clock, notify, primed, this.deadlines.primingMs);
  }
  /** Measured accounting stays unavailable. The explicit provider policy permits one attempt only.
   * Future server integration must revalidate source authority and enforce the selected settings.
   * Positive synthetic subclass overrides exist ONLY under tests/.
   */
  protected async admitTurn(proposal: TurnProposal, signal: AbortSignal): Promise<TurnPermit | undefined> {
    // This is permission to attempt one response, with capacity checked by the provider each time.
    // It is never a fit estimate. Server source authority remains the subsequent adapter's obligation.
    return !signal.aborted && matchesProviderTextPolicy(proposal.policy)
      ? { proposal, maxOutputTokens: proposal.policy.maxOutputTokens } : undefined;
  }
  private current(a: Attempt) { return this.attempt === a && !a.abort.signal.aborted && !this.disposed; }
  private update(patch: Partial<TextStatus>) { this.status = freeze({ ...this.status, ...patch }); safe(() => this.notify(this.status)); }
  private finish(a: Attempt, failure?: TextFailure) {
    if (!this.current(a)) return;
    this.attempt = undefined; this.cleaning = true;
    this.store.stop(); a.abort.abort();
    if (a.pending?.timer !== undefined) this.clock.clearTimeout(a.pending.timer);
    a.pending = undefined; a.policy = undefined; this.question = ""; this.questionRevision++;
    safe(() => a.priming?.stop()); safe(() => a.bridge?.close());
    const connection = a.connection; a.connection = undefined; safe(() => connection?.close());
    this.update({ phase: failure ? "failed" : "ended", identity: undefined, protocolReady: false, basis: undefined, failure });
    this.cleaning = false;
  }
  private wait<T>(a: Attempt, pending: Promise<T>, ms: number, late: (value: T) => void = () => {}): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const clear = () => { a.abort.signal.removeEventListener("abort", cancel); this.clock.clearTimeout(timer); };
      const cancel = () => { if (!settled) { settled = true; clear(); reject(new Error("Unavailable")); } };
      const timer = this.clock.setTimeout(cancel, ms);
      a.abort.signal.addEventListener("abort", cancel, { once: true });
      pending.then(value => {
        if (settled || !this.current(a)) { safe(() => late(value)); cancel(); return; }
        settled = true; clear(); resolve(value);
      }, cancel);
      if (!this.current(a)) cancel();
    });
  }
  start(sourceId: string) {
    if (this.disposed || this.cleaning || this.attempt || !id(sourceId) || this.sequence >= 128) return false;
    const n = ++this.sequence;
    const a: Attempt = { identity: freeze({ sourceId, runId: `text_${n}`, connectionId: `text_connection_${n}` }),
      abort: new AbortController(), turns: 0, revision: 0 };
    this.attempt = a; this.store.reset(); this.question = ""; this.questionRevision++;
    this.update({ phase: "connecting", identity: a.identity, revision: 0, protocolReady: false, basis: undefined, failure: undefined });
    if (this.current(a)) void this.setup(a);
    return true;
  }
  private async setup(a: Attempt) {
    let failure: TextFailure = "preparation";
    try {
      const prepared = await this.wait(a, this.adapters.prepare(a.identity, a.abort.signal), this.deadlines.preparationMs);
      if (!this.current(a)) return;
      if (!("manifest" in prepared)) { this.finish(a, "budget_unavailable"); return; }
      const input = freeze(structuredClone(prepared));
      if (input.manifest.mode !== "text" || input.manifest.runId !== a.identity.runId
        || input.manifest.items.some(e => JSON.parse(e.item.content[0].text).source.id !== a.identity.sourceId)) throw new Error("Invalid source");
      if (isProviderInput(input)) {
        if (!matchesProviderTextPolicy(input.policy)) throw new Error("Invalid text policy");
        a.policy = input.policy;
      }
      else {
        const { model, tokenizer, policyVersion, capacity, historyAllowance, outputReserve, framingAllowance } = input.wireBudget;
        a.policy = freeze({ model, tokenizer, policyVersion, capacity, historyAllowance, outputReserve, framingAllowance });
      }
      a.previous = input.manifest.items.at(-1)?.item.id;
      this.store.start(a.identity, input.manifest.items.map(e => e.item.id));
      a.bridge = new TextBridge((event, prime) => {
        if (!this.current(a)) return;
        if (!a.priming?.canSendQuestions) {
          prime();
          // Keep only the session identity from configuration accepted by actual 07B.
          if (this.current(a) && record(event) && event.type === "session.updated" && record(event.session) && id(event.session.id)) a.sessionId = event.session.id;
        } else this.receive(a, event);
      }, () => this.finish(a, "connection"));
      a.priming = this.createPriming(s => {
        if (this.current(a) && s.state === "failed") this.finish(a, s.failure === "budget_unavailable" ? "budget_unavailable" : s.failure === "transport" ? "connection" : s.failure === "context_limit" ? "context_limit" : "priming");
      }, () => { if (this.current(a)) this.update({ phase: "ready", protocolReady: true }); });
      if (!a.priming.start(a.identity, input, a.bridge) || !this.current(a)) return;
      failure = "connection";
      const connection = await this.wait(a, this.adapters.connect(a.identity, a.abort.signal), this.deadlines.connectionMs, c => c.close());
      if (!this.current(a)) { safe(() => connection.close()); return; }
      a.connection = connection;
      this.update({ phase: "priming", basis: a.priming.snapshot.basis });
      if (this.current(a)) a.bridge.bind(connection);
    } catch { if (this.current(a)) this.finish(a, failure); }
  }
  /** Draft changes invalidate awaited admission, including change-away-and-back. Never trim submitted text. */
  setQuestion(text: string): boolean {
    if (this.disposed || typeof text !== "string" || text.length > TEXT_QUESTION_LIMIT) return false;
    if (text !== this.question) { this.question = text; this.questionRevision++; }
    return true;
  }
  submit(text?: string): boolean {
    const a = this.attempt;
    if (!a || !this.canSubmit || !a.priming?.canSendQuestions) return false;
    if (text !== undefined && !this.setQuestion(text)) return false;
    if (!this.question.trim()) return false;
    if (a.turns >= 32) { this.finish(a, "limit"); return false; }
    const proposal = freeze({ identity: a.identity, revision: a.revision, questionRevision: this.questionRevision,
      question: this.question, itemId: `${a.identity.runId}_question_${++a.turns}`, policy: a.policy! });
    const p: Pending = { proposal, itemSent: false, itemAck: false, itemWritten: false, responseSent: false, responseWritten: false, done: false, items: new Set() };
    a.pending = p;
    p.timer = this.clock.setTimeout(() => this.finish(a, "timeout"), this.deadlines.turnMs);
    this.update({ phase: "admitting" });
    if (this.current(a)) void this.admit(a, p);
    return true; // Accepted for processing, never a delivery/answer claim.
  }
  private async admit(a: Attempt, p: Pending) {
    try {
      const permit = await this.wait(a, this.admitTurn(p.proposal, a.abort.signal), this.deadlines.turnMs);
      if (!this.current(a) || a.pending !== p) return;
      if (a.revision !== p.proposal.revision || this.questionRevision !== p.proposal.questionRevision
        || this.question !== p.proposal.question || !a.priming?.canSendQuestions) { this.finish(a, "stale_admission"); return; }
      const outputLimit = p.proposal.policy.basis === "provider_enforced" ? p.proposal.policy.maxOutputTokens : p.proposal.policy.outputReserve;
      if (!permit || permit.proposal !== p.proposal || !Number.isSafeInteger(permit.maxOutputTokens)
        || permit.maxOutputTokens <= 0 || permit.maxOutputTokens > 4096 || permit.maxOutputTokens > outputLimit) {
        this.finish(a, "turn_budget_unavailable"); return;
      }
      p.outputLimit = permit.maxOutputTokens;
      this.update({ phase: "sending" });
      if (!this.current(a)) return;
      p.itemSent = true;
      this.write(a, p, { type: "conversation.item.create", event_id: `${p.proposal.itemId}_create`, previous_item_id: a.previous,
        item: { id: p.proposal.itemId, type: "message", role: "user", content: [{ type: "input_text", text: p.proposal.question }] } }, () => { p.itemWritten = true; this.advance(a, p); });
    } catch { if (this.current(a)) this.finish(a, "turn_budget_unavailable"); }
  }
  private write(a: Attempt, p: Pending, event: object, settled: () => void) {
    if (!this.current(a) || a.pending !== p) return;
    try {
      if (!a.bridge?.isOpen()) throw new Error("Closed");
      Promise.resolve(a.bridge.send(JSON.stringify(event))).then(() => {
        if (this.current(a) && a.pending === p) settled();
      }, () => this.finish(a, "connection"));
    } catch { this.finish(a, "connection"); }
  }
  private advance(a: Attempt, p: Pending) {
    if (!this.current(a) || a.pending !== p) return;
    if (p.itemWritten && p.itemAck && !p.responseSent) {
      p.responseSent = true;
      this.update({ phase: "awaiting-response" });
      this.write(a, p, { type: "response.create", event_id: `${p.proposal.itemId}_response`, response: {
        ...(p.proposal.policy.basis === "provider_enforced" ? { tools: [], tool_choice: "none", reasoning: { effort: "minimal" } } : {}),
        output_modalities: ["text"], max_output_tokens: p.outputLimit, metadata: { text_turn: p.proposal.itemId } } }, () => { p.responseWritten = true; this.advance(a, p); });
    }
    if (p.done && p.responseWritten) {
      this.clock.clearTimeout(p.timer); p.timer = undefined; a.pending = undefined;
      this.question = ""; this.questionRevision++;
      this.update({ phase: "ready", revision: a.revision });
    }
  }
  private project(a: Attempt, event: unknown) {
    this.store.receive(a.identity, event); a.revision++;
    if (this.store.snapshot.phase === "limited") this.finish(a, "limit");
    else this.update({ revision: a.revision });
  }
  private receive(a: Attempt, event: unknown) {
    if (!this.current(a)) return;
    try {
      if (!record(event) || !id(event.event_id) || typeof event.type !== "string" || bytes(JSON.stringify(event)) > 80_000) { this.finish(a, "protocol"); return; }
      const e = event, p = a.pending;
      if (e.conversation_id !== undefined && e.conversation_id !== a.conversationId) return;
      if (e.type === "error") {
        const error = record(e.error) ? e.error : undefined;
        if (error?.event_id !== undefined && error.event_id !== `${p?.proposal.itemId}_create` && error.event_id !== `${p?.proposal.itemId}_response`) return;
        this.finish(a, isContextLimit(error) ? "context_limit" : "provider"); return;
      }
      // Configuration mutation invalidates source readiness; retry requires a fresh attempt.
      if (e.type === "session.updated") {
        if (record(e.session) && id(e.session.id) && e.session.id !== a.sessionId) return;
        this.finish(a, "protocol"); return;
      }
      if (!p || p.done) return;
      if (e.type === "conversation.item.done" || e.type === "conversation.item.added") {
        const item = e.item;
        if (!record(item)) return;
        if (item.id === p.proposal.itemId && p.itemSent) {
          if (item.type !== "message" || item.role !== "user" || (e.type === "conversation.item.done" ? item.status !== "completed"
            : item.status !== undefined && !["completed", "in_progress", "incomplete"].includes(item.status as string))
            || !Array.isArray(item.content) || item.content.length !== 1 || !record(item.content[0])
            || item.content[0].type !== "input_text" || item.content[0].text !== p.proposal.question
            || e.previous_item_id !== a.previous) { this.finish(a, "protocol"); return; }
          if (e.type === "conversation.item.done" && !p.itemAck) {
            p.itemAck = true; this.project(a, e); this.advance(a, p);
          }
        } else if (typeof item.id === "string" && p.items.has(item.id)) this.project(a, e);
        return;
      }
      if (e.type === "response.created") {
        const r = e.response;
        if (!p.responseSent || !record(r) || !record(r.metadata) || r.metadata.text_turn !== p.proposal.itemId) return;
        if (!id(r.id) || !id(r.conversation_id) || r.status !== "in_progress"
          || JSON.stringify(r.output_modalities) !== '["text"]' || a.conversationId && a.conversationId !== r.conversation_id) { this.finish(a, "protocol"); return; }
        if (p.responseId) { if (p.responseId !== r.id) this.finish(a, "protocol"); return; }
        a.conversationId = r.conversation_id; p.responseId = r.id;
        this.project(a, e); if (this.current(a)) this.update({ phase: "responding" }); return;
      }
      if (e.type === "response.done") {
        const r = e.response;
        if (!p.responseId || !record(r) || r.id !== p.responseId || r.conversation_id !== a.conversationId) return;
        // The documented response schema makes output optional, including for failed responses.
        // Retain already-received text and mark generation failed even if no output was produced.
        if (r.status === "failed" && record(r.status_details) && isContextLimit(r.status_details.error) && r.output === undefined) {
          this.project(a, { ...e, response: { ...r, output: [] } });
          this.finish(a, "context_limit"); return;
        }
        if (!["completed", "cancelled", "failed", "incomplete"].includes(r.status as string) || !Array.isArray(r.output)) { this.finish(a, "protocol"); return; }
        if (r.output.length > 16) { this.finish(a, "limit"); return; }
        if (r.output.some(item => !this.textItem(item))) { this.finish(a, "protocol"); return; }
        this.project(a, e);
        if (!this.current(a)) return;
        p.done = true;
        if (r.status !== "completed" || !r.output.length || this.store.snapshot.incomplete) {
          this.finish(a, r.status === "failed" && record(r.status_details) && isContextLimit(r.status_details.error) ? "context_limit" : "provider"); return;
        }
        a.previous = r.output.at(-1).id;
        this.advance(a, p); return;
      }
      if (!p.responseId || e.response_id !== p.responseId) return;
      if (e.type === "response.output_item.added" || e.type === "response.output_item.done") {
        if (!this.textItem(e.item)) { this.finish(a, "protocol"); return; }
        if (p.items.size >= 16 && !p.items.has(e.item.id)) { this.finish(a, "limit"); return; }
        p.items.add(e.item.id); this.project(a, e); return;
      }
      if (typeof e.item_id === "string" && p.items.has(e.item_id) && ["response.output_text.delta", "response.output_text.done", "response.content_part.added", "response.content_part.done"].includes(e.type as string)) {
        if (e.type === "response.content_part.added" || e.type === "response.content_part.done") {
          if (!record(e.part) || e.part.type !== "text") { this.finish(a, "protocol"); return; }
        }
        this.project(a, e);
      }
    } catch { this.finish(a, "protocol"); }
  }
  private textItem(item: unknown): item is { id: string; content: unknown[] } {
    return record(item) && id(item.id) && item.type === "message" && item.role === "assistant" && Array.isArray(item.content)
      && item.content.length <= 16 && item.content.every(p => record(p) && ["text", "output_text"].includes(p.type as string) && typeof p.text === "string");
  }
  stop() { if (this.attempt) this.finish(this.attempt); }
  reset() {
    if (this.cleaning || this.disposed) return;
    this.cleaning = true;
    try { if (this.attempt) this.finish(this.attempt); this.store.reset(); this.question = ""; this.questionRevision++; }
    finally { this.cleaning = false; }
  }
  dispose() {
    if (this.disposed) return;
    this.cleaning = true; this.stop(); this.disposed = true; this.store.dispose(); this.question = ""; this.notify = () => {};
  }
}
