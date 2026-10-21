import { projectResponseTerminal, type ResponseTerminal } from "./response-terminal.ts";

const wireEvents = ["session.update", "session.updated", "conversation.item.create", "conversation.item.added", "conversation.item.done",
  "input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped", "input_audio_buffer.committed",
  "conversation.item.input_audio_transcription.completed", "conversation.item.input_audio_transcription.failed",
  "response.create", "response.cancel", "response.created", "response.done", "response.output_item.added", "response.output_item.done",
  "output_audio_buffer.clear", "output_audio_buffer.started", "output_audio_buffer.stopped", "output_audio_buffer.cleared", "error"] as const;
const stages = ["session_start", "priming_start", "peer_created", "channel_created", "remote_track", "playback_bound",
  "media_acquired", "microphone_attached", "session_ready", "play_requested", "mute", "unmute", "session_end",
  "interruption_pending", "interruption_confirmed", "interruption_failed"] as const;
type Stage = typeof stages[number];
type Direction = "inbound" | "enqueue" | "send" | "drop";
const countKeys = ["bufferedBytes", "queuedBytes", "queuedCommands", "localTracks", "remoteTracks"] as const;
type Counts = Partial<Record<typeof countKeys[number], number>>;
export type VoiceEventRow = Readonly<Counts & { elapsedMs: number; direction: Direction | "local";
  event?: typeof wireEvents[number]; stage?: Stage; response?: number; item?: number; command?: number;
  terminal?: "completed" | "cancelled" | "failed" | "incomplete"; reason?: ResponseTerminal["reason"] }>;
const processingKeys = ["echoCancellation", "noiseSuppression", "autoGainControl"] as const;
type Processing = Readonly<Record<typeof processingKeys[number], boolean | "unknown">>;
export type VoiceEventSnapshot = Readonly<{ rows: readonly VoiceEventRow[]; limited: boolean;
  counts: Readonly<Record<Stage | Direction, number>>; responseOrdinals: number; itemOrdinals: number; commandOrdinals: number;
  capture?: Readonly<{ supported: Processing; effective: Processing }> }>;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const identity = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);

/** One memory-only recorder per explicit voice attempt. No logging, persistence or payload
 * retention. Times describe local observation, never heard words or an audio clock.
 * Keep newest 256 rows; maps stop at 128 identities each and never reuse ordinals.
 */
export class VoiceEventDiagnostics {
  private rows: readonly VoiceEventRow[] = Object.freeze([]);
  private responses = new Map<string, number>();
  private items = new Map<string, number>();
  private commands = new Map<string, number>();
  private ordinalCounts = { responseOrdinals: 0, itemOrdinals: 0, commandOrdinals: 0 };
  private counters = Object.fromEntries([...stages, "inbound", "enqueue", "send", "drop"].map(k => [k, 0])) as Record<Stage | Direction, number>;
  private capture?: VoiceEventSnapshot["capture"];
  private ended = false;
  private ready = false;
  private limited = false;
  private started: number;
  private now: () => number;
  constructor(now: () => number) { this.now = now; this.started = now(); }
  get snapshot(): VoiceEventSnapshot {
    return Object.freeze({ rows: this.rows, counts: Object.freeze({ ...this.counters }), limited: this.limited,
      ...this.ordinalCounts, ...(this.capture ? { capture: this.capture } : {}) });
  }
  private ordinal(map: Map<string, number>, value: unknown) {
    if (!identity(value)) return undefined;
    if (map.has(value)) return map.get(value);
    if (map.size >= 128) { this.limited = true; return undefined; }
    const next = map.size + 1; map.set(value, next); return next;
  }
  private append(row: Omit<VoiceEventRow, "elapsedMs">, counts: Counts = {}) {
    const safe: Counts = {};
    for (const k of countKeys) if (Number.isSafeInteger(counts[k]) && counts[k]! >= 0) safe[k] = Math.min(counts[k]!, 1_000_000_000);
    const duration = this.now() - this.started, previous = this.rows.at(-1)?.elapsedMs ?? 0;
    if (this.rows.length >= 256) this.limited = true;
    this.rows = Object.freeze([...this.rows.slice(-255), Object.freeze({ ...row, ...safe,
      elapsedMs: Math.max(previous, Number.isFinite(duration) ? Math.max(0, Math.min(3_600_000, Math.round(duration))) : previous) })]);
  }
  mark(stage: Stage, counts: Counts = {}) {
    if (this.ended || !stages.includes(stage)) return;
    if (stage === "session_ready") this.ready = true;
    this.counters[stage] = Math.min(1_000_000_000, this.counters[stage] + 1);
    this.append({ direction: "local", stage }, counts);
  }
  wire(direction: Direction, value: unknown, counts: Counts = {}) {
    if (this.ended || !["inbound", "enqueue", "send", "drop"].includes(direction) || !record(value)
      || !wireEvents.includes(value.type as typeof wireEvents[number])) return;
    const event = value.type as typeof wireEvents[number];
    this.counters[direction] = Math.min(1_000_000_000, this.counters[direction] + 1);
    const responseEnvelope = event === "response.created" || event === "response.done";
    const response = this.ordinal(this.responses, responseEnvelope && record(value.response) ? value.response.id : value.response_id);
    // Full-source ACKs can include thousands of items. They must not consume the
    // conversation's bounded item map before the microphone is attached.
    const item = this.ready || !["conversation.item.create", "conversation.item.added", "conversation.item.done"].includes(event)
      ? this.ordinal(this.items, record(value.item) ? value.item.id : value.item_id) : undefined;
    const command = direction !== "inbound" && ["response.cancel", "output_audio_buffer.clear", "response.create"].includes(event)
      ? this.ordinal(this.commands, value.event_id) : undefined;
    this.ordinalCounts = { responseOrdinals: this.responses.size, itemOrdinals: this.items.size, commandOrdinals: this.commands.size };
    const terminal = event === "response.done" && record(value.response) ? value.response.status : undefined;
    this.append({ direction, event, ...(response ? { response } : {}), ...(item ? { item } : {}), ...(command ? { command } : {}),
      ...(event === "response.done" && record(value.response) ? { reason: projectResponseTerminal(value.response).reason,
        ...(["completed", "cancelled", "failed", "incomplete"].includes(terminal as string) ? { terminal: terminal as VoiceEventRow["terminal"] } : {}) } : {}) }, counts);
  }
  processing(supported: unknown, effective: unknown) {
    if (this.ended) return;
    const project = (value: unknown): Processing => Object.freeze(Object.fromEntries(processingKeys.map(k =>
      [k, record(value) && typeof value[k] === "boolean" ? value[k] : "unknown"])) as Record<typeof processingKeys[number], boolean | "unknown">);
    this.capture = Object.freeze({ supported: project(supported), effective: project(effective) });
  }
  finish() { this.ended = true; this.responses.clear(); this.items.clear(); this.commands.clear(); }
}
