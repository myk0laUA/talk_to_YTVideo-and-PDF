"use client";

import { TEXT_QUESTION_LIMIT, type TextStatus } from "../shared/text-lifecycle.ts";
import { TranscriptStore, type TranscriptSnapshot } from "../shared/transcript.ts";
import { textUuid, type TextController, type TextRelaySnapshot } from "../shared/text-relay.ts";

type Attempt = { requestId: string; sourceId: string; abort: AbortController; sessionId?: string; questionId?: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>; stopping: boolean; watchdog?: ReturnType<typeof setTimeout> };
const running = new Set<TextStatus["phase"]>(["connecting", "priming", "ready", "admitting", "sending", "awaiting-response", "responding"]);
const empty = () => new TranscriptStore().snapshot;

/** Browser ownership/HTTP adapter only. The server runs the accepted TextLifecycle/ACK gates.
 * No model, source text, credentials, provider events, media or automatic retries cross this API.
 */
export class HttpTextController implements TextController {
  private value: TextStatus = { phase: "idle", protocolReady: false, productionReady: false, revision: 0 };
  private text: TranscriptSnapshot = empty();
  private active?: Attempt;
  private disposed = false;
  private draft = "";
  private notify: (status: TextStatus) => void;
  constructor(notify: (status: TextStatus) => void) { this.notify = notify; }
  get snapshot() { return this.value; }
  get transcript() { return this.text; }
  get canSubmit() { return !!this.active && !this.active.questionId && this.value.phase === "ready" && this.value.protocolReady; }
  private publish(status: TextStatus) { this.value = status; if (!this.disposed) this.notify(status); }
  private current(a: Attempt) { return this.active === a && !this.disposed && !a.abort.signal.aborted; }
  private async post(path: string, input: object, signal?: AbortSignal, keepalive = false) {
    const response = await fetch(`/api/text-sessions${path}`, { method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", cache: "no-store", body: JSON.stringify(input), signal, keepalive });
    if (!response.ok) throw new Error("Text session unavailable");
    return response;
  }
  start(sourceId: string) {
    if (this.disposed || this.active || !textUuid(sourceId)) return false;
    const a: Attempt = { requestId: crypto.randomUUID(), sourceId, abort: new AbortController(), stopping: false };
    this.active = a; this.text = empty(); this.draft = "";
    this.publish({ phase: "connecting", protocolReady: false, productionReady: false, revision: 0 });
    a.watchdog = setTimeout(() => { if (this.current(a)) this.finish(a, true); }, 30_000);
    void this.open(a); return true;
  }
  private async open(a: Attempt) {
    try {
      const response = await this.post("", { sourceId: a.sourceId, requestId: a.requestId }, a.abort.signal);
      const result: unknown = await response.json();
      if (!this.current(a)) return;
      if (!result || typeof result !== "object" || !("sessionId" in result) || !textUuid(result.sessionId)) throw new Error("Invalid session");
      a.sessionId = result.sessionId;
      const stream = await fetch(`/api/text-sessions/${a.sessionId}/stream`, { cache: "no-store", credentials: "same-origin", signal: a.abort.signal });
      if (!stream.ok || !stream.body || !stream.headers.get("content-type")?.startsWith("application/x-ndjson")) throw new Error("Stream unavailable");
      const reader = stream.body.getReader(), decoder = new TextDecoder();
      a.reader = reader;
      let pending = "";
      try {
        while (this.current(a)) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          // One bounded server snapshot; never retain an unbounded partial network frame.
          if (pending.length > 2_000_000) throw new Error("Stream limit");
          let newline: number;
          while ((newline = pending.indexOf("\n")) >= 0 && this.current(a)) {
            const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
            const next = JSON.parse(line) as TextRelaySnapshot;
            if (!next?.status || !next.transcript || !Array.isArray(next.transcript.turns)
              || next.transcript.turns.length > 128 || typeof next.status.phase !== "string"
              || next.status.productionReady !== false) throw new Error("Invalid stream");
            clearTimeout(a.watchdog);
            a.watchdog = setTimeout(() => { if (this.current(a)) this.finish(a, true); }, 30_000);
            // A heartbeat queued before the POST must not reopen the composer for a second question.
            if (a.questionId && next.questionId !== a.questionId && running.has(next.status.phase)) continue;
            if (next.status.phase === "ready") a.questionId = undefined;
            this.text = next.transcript;
            this.publish(next.status);
            if (!running.has(next.status.phase)) { this.finish(a, false); return; }
          }
        }
        if (this.current(a)) this.finish(a, true);
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); a.reader = undefined; }
    } catch { if (this.current(a)) this.finish(a, true); }
  }
  setQuestion(text: string) {
    if (this.disposed || typeof text !== "string" || text.length > TEXT_QUESTION_LIMIT) return false;
    this.draft = text; return true;
  }
  submit(text?: string) {
    const a = this.active;
    if (!a?.sessionId || !this.canSubmit || (text !== undefined && !this.setQuestion(text)) || !this.draft.trim()) return false;
    const question = this.draft;
    a.questionId = crypto.randomUUID();
    this.publish({ ...this.value, phase: "admitting", protocolReady: false });
    void this.post("/question", { sessionId: a.sessionId, questionId: a.questionId, question }, a.abort.signal)
      .catch(() => { if (this.current(a)) this.finish(a, true); });
    return true;
  }
  private retain() {
    this.text = { ...this.text, phase: "stopped", turns: this.text.turns.map(turn => ({ ...turn,
      ...(turn.generation === "generating" ? { generation: "stopped" as const } : {}),
      parts: turn.parts.map(part => ({ ...part, ...(part.state === "draft" ? { state: "unfinished" as const } : {}),
        ...(part.evidence ? { evidence: part.evidence.map(unit => unit.state === "pending"
          ? { ...unit, state: "incomplete" as const, references: [] } : unit) } : {}) })) })) };
  }
  private finish(a: Attempt, failed: boolean, userStop = false) {
    if (this.active !== a || a.stopping) return;
    a.stopping = true; this.active = undefined;
    clearTimeout(a.watchdog);
    void a.reader?.cancel().catch(() => {});
    a.abort.abort(); this.draft = "";
    // Same opaque Start identity for pre-response cancellation and for an acquired session.
    void this.post("/stop", { requestId: a.requestId }, undefined, true).catch(() => {});
    if (failed || userStop) {
      this.retain();
      this.publish({ ...this.value, identity: undefined, phase: failed ? "failed" : "ended", protocolReady: false,
        ...(failed ? { failure: "connection" as const } : { failure: undefined }) });
    }
  }
  stop() { if (this.active) this.finish(this.active, false, true); }
  reset() { this.stop(); this.text = empty(); this.draft = ""; }
  dispose() { if (this.disposed) return; this.stop(); this.disposed = true; this.text = empty(); this.notify = () => {}; }
}

// Stable module function: source/mode changes unmount the existing owner before constructing another.
export const createHttpTextController = (notify: (status: TextStatus) => void) => new HttpTextController(notify);
