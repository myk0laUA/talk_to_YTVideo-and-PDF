import type { RunIdentity } from "./priming-controller.ts";
import type { ResponseState } from "./voice-response.ts";

export type TranscriptIdentity = RunIdentity & Readonly<{ sourceId: string }>;
type Kind = "input_audio" | "input_text" | "output_audio" | "output_text";
type Terminal = "generating" | "completed" | "cancelled" | "failed" | "incomplete" | "stopped";
type Part = { index: number; kind: Kind; text: string; rank: number; state: "draft" | "final" | "transcription_failed" | "unfinished" };
type Turn = { itemId: string; role: "user" | "assistant"; previous?: string | null;
  responseId?: string; outputIndex?: number; parts: Map<number, Part>; finalRank: number; conflict: boolean; established: boolean };
type Response = { state: Terminal; done: boolean; interrupted: boolean; interruption: ResponseState["interruption"]["state"]; output: ResponseState["output"]["state"] };
export type TranscriptLimits = { items: number; partsPerItem: number; partCharacters: number; totalCharacters: number;
  eventIds: number; responses: number; pending: number };
export const TRANSCRIPT_LIMITS: Readonly<TranscriptLimits> = Object.freeze({ items: 128, partsPerItem: 16,
  partCharacters: 16_000, totalCharacters: 128_000, eventIds: 4096, responses: 128, pending: 64 });
export type TranscriptSnapshot = Readonly<{
  phase: "idle" | "active" | "stopped" | "limited" | "disposed";
  identity?: TranscriptIdentity; incomplete: boolean; limit?: keyof TranscriptLimits;
  ordering: "established" | "provisional" | "conflict";
  counts: Readonly<{ items: number; parts: number; characters: number; eventIds: number; responses: number; pending: number }>;
  turns: readonly Readonly<{ itemId: string; role: "user" | "assistant"; responseId?: string; outputIndex?: number;
    previousItemId?: string | null; ordering: "established" | "provisional" | "conflict";
    generation?: Terminal; interrupted: boolean; interruption?: Response["interruption"]; playback: "unconfirmed" | "not_applicable";
    serverOutput?: Response["output"]; parts: readonly Readonly<{ index: number; kind: Kind; text: string; state: Part["state"] }>[] }>[];
}>;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const index = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const terminal = (v: unknown): v is Exclude<Terminal, "generating" | "stopped"> => ["completed", "cancelled", "failed", "incomplete"].includes(v as string);

/** Memory-only projections, never raw events. Owns no transport, timer, command, DOM or storage.
 * Unknown item/response correlations are ignored, not guessed or buffered. See TRANSCRIPT_09A.md.
 */
export class TranscriptStore {
  private phase: TranscriptSnapshot["phase"] = "idle";
  private identity?: TranscriptIdentity;
  private excluded = new Set<string>();
  private turns = new Map<string, Turn>();
  private responses = new Map<string, Response>();
  private seen = new Set<string>();
  private order: string[] = [];
  private conversationId?: string;
  private characters = 0;
  private limit?: keyof TranscriptLimits;
  private limits: TranscriptLimits;
  constructor(limits: Partial<TranscriptLimits> = {}) {
    this.limits = { ...TRANSCRIPT_LIMITS, ...limits };
    for (const key of Object.keys(this.limits) as (keyof TranscriptLimits)[]) {
      if (!Number.isSafeInteger(this.limits[key]) || this.limits[key] <= 0 || this.limits[key] > TRANSCRIPT_LIMITS[key]) throw new Error("Invalid transcript limit.");
    }
  }
  start(identity: TranscriptIdentity, primingItemIds: readonly string[]) {
    if (this.phase === "disposed") return false;
    if (![identity.sourceId, identity.runId, identity.connectionId].every(id)
      || primingItemIds.length > 4096 || !primingItemIds.every(id)) throw new Error("Invalid transcript identity.");
    this.clear(); this.identity = Object.freeze({ sourceId: identity.sourceId, runId: identity.runId, connectionId: identity.connectionId });
    this.excluded = new Set(primingItemIds); this.phase = "active"; return true;
  }
  private clear() {
    this.turns.clear(); this.responses.clear(); this.seen.clear(); this.excluded.clear(); this.order = [];
    this.characters = 0; this.conversationId = undefined; this.identity = undefined; this.limit = undefined;
  }
  reset() { if (this.phase !== "disposed") { this.clear(); this.phase = "idle"; } }
  dispose() { this.clear(); this.phase = "disposed"; }
  stop() {
    if (this.phase !== "active" && this.phase !== "limited") return;
    if (this.phase === "active") this.phase = "stopped";
    for (const t of this.turns.values()) for (const p of t.parts.values()) if (p.state === "draft") p.state = "unfinished";
    for (const r of this.responses.values()) if (r.state === "generating") r.state = "stopped";
    this.seen.clear(); this.excluded.clear();
  }
  private overflow(limit: keyof TranscriptLimits) { this.limit ??= limit; this.phase = "limited"; }
  private pending() { return [...this.turns.values()].filter(t => !t.established).length; }
  get snapshot(): TranscriptSnapshot {
    const turns = this.order.map(itemId => {
      const t = this.turns.get(itemId)!, r = t.responseId ? this.responses.get(t.responseId) : undefined;
      const parts = [...t.parts.values()].sort((a, b) => a.index - b.index).map(p => Object.freeze({ index: p.index, kind: p.kind, text: p.text, state: p.state }));
      return Object.freeze({ itemId, role: t.role, responseId: t.responseId, outputIndex: t.outputIndex, previousItemId: t.previous,
        ordering: t.conflict ? "conflict" as const : t.established ? "established" as const : "provisional" as const,
        generation: r?.state, interrupted: r?.interrupted ?? false, interruption: r?.interruption,
        playback: parts.some(p => p.kind === "output_audio") ? "unconfirmed" as const : "not_applicable" as const,
        serverOutput: r?.output, parts: Object.freeze(parts) });
    });
    return Object.freeze({ phase: this.phase, identity: this.identity, limit: this.limit,
      incomplete: !!this.limit || turns.some(t => t.ordering !== "established" || !t.parts.length || t.parts.some(p => p.state !== "final")
        || t.role === "assistant" && t.generation !== "completed"),
      ordering: turns.some(t => t.ordering === "conflict") ? "conflict" : turns.some(t => t.ordering === "provisional") ? "provisional" : "established",
      counts: Object.freeze({ items: turns.length, parts: turns.reduce((n, t) => n + t.parts.length, 0),
        characters: this.characters, eventIds: this.seen.size, responses: this.responses.size, pending: this.pending() }), turns: Object.freeze(turns) });
  }
  private item(itemId: unknown, role: Turn["role"]) {
    if (this.phase !== "active" || !id(itemId) || this.excluded.has(itemId)) return;
    let t = this.turns.get(itemId);
    if (t) return t.role === role ? t : undefined;
    if (this.turns.size >= this.limits.items) { this.overflow("items"); return; }
    t = { itemId, role, parts: new Map(), finalRank: 0, conflict: false, established: false };
    this.turns.set(itemId, t); this.order.push(itemId); return t;
  }
  private predecessor(t: Turn, value: unknown) {
    if (value !== null && !id(value)) return;
    if (t.previous !== undefined && t.previous !== value || value === t.itemId) { t.conflict = true; return; }
    if (t.previous === undefined && [...this.turns.values()].some(other => other !== t && other.previous === value)) t.conflict = true;
    t.previous = value;
  }
  private part(t: Turn, at: unknown, kind: Kind, text: unknown, rank: number, failed = false, delta = false) {
    if (this.phase !== "active" || !index(at) || typeof text !== "string") return;
    if (at >= this.limits.partsPerItem) { this.overflow("partsPerItem"); return; }
    const old = t.parts.get(at);
    if (old && old.kind !== kind) { t.conflict = true; return; }
    if (old && (old.rank > rank || old.rank === rank && rank > 0 || delta && old.rank > 0)) return;
    if (old && rank === 0 && !delta) return; // Added-item/part snapshots cannot erase a streamed draft.
    const length = (delta ? old?.text.length ?? 0 : 0) + text.length;
    if (length > this.limits.partCharacters) { this.overflow("partCharacters"); return; }
    const total = this.characters - (old?.text.length ?? 0) + length;
    if (total > this.limits.totalCharacters) { this.overflow("totalCharacters"); return; }
    this.characters = total;
    t.parts.set(at, { index: at, kind, text: delta ? (old?.text ?? "") + text : text, rank,
      state: failed ? "transcription_failed" : rank > 0 ? "final" : "draft" });
  }
  private contents(t: Turn, content: unknown, rank: number) {
    if (!Array.isArray(content) || rank > 0 && t.finalRank >= rank) return;
    if (content.length > this.limits.partsPerItem) { this.overflow("partsPerItem"); return; }
    content.forEach((p: unknown, at) => {
      if (!record(p)) return;
      if (t.role === "user") {
        if (p.type === "input_text") this.part(t, at, "input_text", p.text, rank);
        // Item completion is NOT input ASR completion. Never infer words from audio.
        if (p.type === "input_audio" && !t.parts.has(at)) this.part(t, at, "input_audio", "", 0);
      } else if (p.type === "output_audio" || p.type === "audio") this.part(t, at, "output_audio", p.transcript, rank);
      else if (p.type === "output_text" || p.type === "text") this.part(t, at, "output_text", p.text, rank);
    });
    if (rank > 0) t.finalRank = rank;
  }
  private output(responseId: unknown, outputIndex: unknown, item: unknown, rank: number) {
    if (this.phase !== "active" || !id(responseId) || !this.responses.has(responseId) || !index(outputIndex) || !record(item)
      || item.type !== "message" || item.role !== "assistant" || !id(item.id)) return;
    if (outputIndex >= this.limits.items) { this.overflow("items"); return; }
    const duplicate = [...this.turns.values()].find(t => t.responseId === responseId && t.outputIndex === outputIndex && t.itemId !== item.id);
    if (duplicate) { duplicate.conflict = true; return; }
    const t = this.item(item.id, "assistant"); if (!t) return;
    if (t.responseId !== undefined && (t.responseId !== responseId || t.outputIndex !== outputIndex)) { t.conflict = true; return; }
    t.responseId = responseId; t.outputIndex = outputIndex; this.contents(t, item.content, rank); return t;
  }
  /** Stable topological order. Freeze the relative order of already established turns;
   * only provisional turns may move. Conflicting/cyclic edges are flagged and omitted.
   */
  private reconcile() {
    const edges = new Map(this.order.map(k => [k, new Set<string>()]));
    const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
      if (from === to) return true; if (seen.has(from)) return false; seen.add(from);
      return [...edges.get(from) ?? []].some(k => reaches(k, to, seen));
    };
    const edge = (a: string, b: string, t: Turn) => { if (reaches(b, a)) t.conflict = true; else edges.get(a)!.add(b); };
    const established = this.order.filter(k => this.turns.get(k)!.established);
    established.forEach((k, i) => { if (i) edges.get(established[i - 1])!.add(k); });
    for (const t of this.turns.values()) if (typeof t.previous === "string" && this.turns.has(t.previous)) edge(t.previous, t.itemId, t);
    for (const responseId of this.responses.keys()) {
      const items = [...this.turns.values()].filter(t => t.responseId === responseId).sort((a, b) => a.outputIndex! - b.outputIndex!);
      items.forEach((t, i) => { if (i) edge(items[i - 1].itemId, t.itemId, t); });
    }
    const remaining = new Set(this.order), sorted: string[] = [];
    while (remaining.size) {
      const next = this.order.find(k => remaining.has(k) && ![...remaining].some(p => edges.get(p)!.has(k)))!;
      // All inserted edges are acyclic, with bounded graph size.
      remaining.delete(next); sorted.push(next);
    }
    this.order = sorted;
    for (const key of sorted) {
      const t = this.turns.get(key)!;
      if (!t.established) t.established = !t.conflict && (t.previous === null
        || typeof t.previous === "string" && (this.excluded.has(t.previous) || this.turns.get(t.previous)?.established === true));
    }
    if (this.pending() > this.limits.pending) this.overflow("pending");
  }
  receive(identity: TranscriptIdentity, event: unknown) {
    if (this.phase !== "active" || !this.identity || identity.sourceId !== this.identity.sourceId
      || identity.runId !== this.identity.runId || identity.connectionId !== this.identity.connectionId
      || !record(event) || !id(event.event_id) || typeof event.type !== "string" || this.seen.has(event.event_id)) return;
    const e = event, type = event.type, eventId = event.event_id;
    // Default-conversation item events have no conversation_id field. Reject explicit foreign envelopes.
    if (e.conversation_id !== undefined && e.conversation_id !== this.conversationId) return;
    const relevant = type === "input_audio_buffer.committed" || type === "conversation.item.added" || type === "conversation.item.done"
      || ["conversation.item.input_audio_transcription.delta", "conversation.item.input_audio_transcription.completed", "conversation.item.input_audio_transcription.failed"].includes(type) || type === "response.created" || type === "response.done"
      || ["response.output_item.added", "response.output_item.done", "response.content_part.added", "response.content_part.done",
        "response.output_text.delta", "response.output_text.done", "response.output_audio_transcript.delta", "response.output_audio_transcript.done"].includes(type);
    if (!relevant) return;
    if (this.seen.size >= this.limits.eventIds) { this.overflow("eventIds"); return; }
    this.seen.add(eventId);
    this.apply(e); this.reconcile();
  }
  private apply(e: Record<string, unknown> & { type?: unknown }) {
    const type = e.type as string;
    if (type === "response.created" || type === "response.done") {
      const r = e.response; if (!record(r) || !id(r.id)) return;
      if (type === "response.created") {
        if (r.status !== "in_progress" || !id(r.conversation_id) || this.conversationId && r.conversation_id !== this.conversationId || this.responses.has(r.id)) return;
        if (this.responses.size >= this.limits.responses) { this.overflow("responses"); return; }
        this.conversationId = r.conversation_id;
        this.responses.set(r.id, { state: "generating", done: false, interrupted: false, interruption: "idle", output: "idle" });
      } else {
        const response = this.responses.get(r.id);
        if (!response || response.done || r.conversation_id !== undefined && r.conversation_id !== this.conversationId || !terminal(r.status)) return;
        response.done = true;
        if (response.state === "generating") response.state = r.status;
        if (!Array.isArray(r.output)) return;
        if (r.output.length > this.limits.items) { this.overflow("items"); return; }
        r.output.forEach((item: unknown, i) => this.output(r.id, i, item, 4));
      }
      return;
    }
    if (type === "input_audio_buffer.committed") {
      const t = this.item(e.item_id, "user"); if (t) this.predecessor(t, e.previous_item_id); return;
    }
    if (type === "conversation.item.added" || type === "conversation.item.done") {
      const item = e.item;
      if (!record(item) || item.type !== "message" || !["user", "assistant"].includes(item.role as string)) return;
      const t = this.item(item.id, item.role as Turn["role"]); if (!t) return;
      this.predecessor(t, e.previous_item_id);
      if (t.role === "user" || t.responseId) this.contents(t, item.content, type.endsWith(".done") ? 3 : 0);
      return;
    }
    if (type.startsWith("conversation.item.input_audio_transcription.")) {
      const t = id(e.item_id) ? this.turns.get(e.item_id) : undefined;
      if (!t || t.role !== "user" || !index(e.content_index)) return;
      const old = t.parts.get(e.content_index);
      if (old && old.kind !== "input_audio") return;
      if (type.endsWith(".failed")) {
        if (record(e.error)) this.part(t, e.content_index, "input_audio", old?.text ?? "", 4, true);
      } else if (type.endsWith(".completed")) this.part(t, e.content_index, "input_audio", e.transcript, 4);
      else if (type.endsWith(".delta")) this.part(t, e.content_index, "input_audio", e.delta, 0, false, true);
      return;
    }
    if (type === "response.output_item.added" || type === "response.output_item.done") {
      this.output(e.response_id, e.output_index, e.item, type.endsWith(".done") ? 3 : 0); return;
    }
    const t = id(e.item_id) ? this.turns.get(e.item_id) : undefined;
    if (!t || t.role !== "assistant" || !t.responseId || t.responseId !== e.response_id || t.outputIndex !== e.output_index || !index(e.content_index)) return;
    if (type === "response.content_part.added" || type === "response.content_part.done") {
      if (!record(e.part)) return;
      const p = e.part, rank = type.endsWith(".done") ? 2 : 0;
      if (p.type === "audio") this.part(t, e.content_index, "output_audio", p.transcript, rank);
      else if (p.type === "text") this.part(t, e.content_index, "output_text", p.text, rank);
    } else {
      const audio = type.startsWith("response.output_audio_transcript."), final = type.endsWith(".done");
      this.part(t, e.content_index, audio ? "output_audio" : "output_text", final ? audio ? e.transcript : e.text : e.delta, final ? 1 : 0, false, !final);
    }
  }
  /** Existing 08B facts only. No inference of heard words or command emission. */
  observe(identity: TranscriptIdentity, facts: ResponseState) {
    if (this.phase !== "active" || !this.identity || identity.sourceId !== this.identity.sourceId || identity.runId !== this.identity.runId || identity.connectionId !== this.identity.connectionId) return;
    const interrupted = facts.interruption.responseId ? this.responses.get(facts.interruption.responseId) : undefined;
    if (interrupted && facts.interruption.state !== "idle") {
      interrupted.interrupted = true; interrupted.interruption = facts.interruption.state;
    }
    const output = facts.output.responseId ? this.responses.get(facts.output.responseId) : undefined;
    if (output) output.output = facts.output.state;
  }
}
