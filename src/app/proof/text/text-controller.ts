import type { ProofSourceDto } from "../../../shared/proof.ts";

export const QUESTION_LIMIT = 1000;
export type TextState = {
  phase: "idle" | "connecting" | "ready" | "waiting" | "ended" | "error";
  message: string; validation: string; source?: ProofSourceDto;
  lines: { id: string; text: string; status: "streaming" | "complete" | "incomplete" }[];
};
export const initialTextState: TextState = { phase: "idle", message: "Ready to start. No microphone is needed.", validation: "", lines: [] };
export type TextSocket = Pick<WebSocket, "readyState" | "send" | "close" | "onopen" | "onmessage" | "onclose" | "onerror">;
export type TextDependencies = { fetch: typeof fetch; socket: (url: string, protocols: string[]) => TextSocket; now?: () => number; startupMs?: number; sessionMs?: number; responseMs?: number };
type Part = { text: string; final: boolean };
type Attempt = { abort: AbortController; socket?: TextSocket; model?: string; confirmed: boolean; ready: boolean;
  timer?: ReturnType<typeof setTimeout>; responseTimer?: ReturnType<typeof setTimeout>; events: number;
  pending?: { id?: string; parts: Map<string, Part> }; completed: Set<string> };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
class SafeFailure extends Error {}
const httpMessage = (status: number) => ({ 401: "Visitor session expired. Start again.", 403: "Request forbidden for this origin.", 404: "Source expired or unavailable. Start again.", 429: "Proof limit reached. Try later.", 503: "Text proof unavailable. Server configuration or service access needs review." }[status] ?? "Request failed. Start again.");

export class TextProofController {
  private attempt?: Attempt;
  private disposed = false;
  private state: TextState = initialTextState;
  private deps: TextDependencies;
  private notify: (state: TextState) => void;
  constructor(deps: TextDependencies, notify: (state: TextState) => void) { this.deps = deps; this.notify = notify; }
  private current(a: Attempt) { return this.attempt === a && !a.abort.signal.aborted && !this.disposed; }
  private update(patch: Partial<TextState>) { this.state = { ...this.state, ...patch }; if (!this.disposed) this.notify(this.state); }
  stop(message = "Ended. Connection released. Start begins a fresh conversation.", phase: "ended" | "error" = "ended") {
    const a = this.attempt; this.attempt = undefined;
    if (a) {
      a.abort.abort(); clearTimeout(a.timer); clearTimeout(a.responseTimer);
      if (a.socket) { a.socket.onopen = a.socket.onmessage = a.socket.onclose = a.socket.onerror = null; try { a.socket.close(); } catch {} }
      a.socket = undefined; a.model = undefined; a.pending = undefined; a.completed.clear();
    }
    this.update({ phase, message, validation: "", lines: this.state.lines.map(line => line.status === "streaming" ? { ...line, status: "incomplete" } : line) });
  }
  dispose() { this.disposed = true; this.stop(); this.notify = () => {}; }
  private fail(message = "Text connection failed. Start again to retry.") { this.stop(message, "error"); }
  private wait<T>(a: Attempt, pending: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const cancel = () => { a.abort.signal.removeEventListener("abort", cancel); reject(new SafeFailure("Cancelled")); };
      a.abort.signal.addEventListener("abort", cancel, { once: true });
      pending.then(value => { a.abort.signal.removeEventListener("abort", cancel); if (this.current(a)) resolve(value); else cancel(); }, error => { a.abort.signal.removeEventListener("abort", cancel); reject(error); });
      if (!this.current(a)) cancel();
    });
  }
  private async request(a: Attempt, path: string, body: object): Promise<unknown> {
    const response = await this.wait(a, this.deps.fetch(path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", redirect: "error", signal: a.abort.signal }));
    if (!response.ok) { void response.body?.cancel(); throw new SafeFailure(httpMessage(response.status)); }
    return this.wait(a, response.json());
  }
  async start() {
    if (this.attempt || this.disposed) return;
    const a: Attempt = { abort: new AbortController(), confirmed: false, ready: false, events: 0, completed: new Set() };
    this.attempt = a;
    this.update({ ...initialTextState, source: undefined, phase: "connecting", message: "Connecting to the synthetic source…" });
    a.timer = setTimeout(() => { if (this.current(a)) this.fail("Connection timed out. Start again to retry."); }, this.deps.startupMs ?? 25000);
    try {
      const source = await this.request(a, "/api/proof-source", {});
      if (!record(source) || typeof source.id !== "string" || !/^[a-f0-9-]{36}$/.test(source.id) || typeof source.text !== "string" || source.text.length > 4000 || typeof source.title !== "string" || source.title.length > 200 || typeof source.expiresAt !== "string" || !(Date.parse(source.expiresAt) > (this.deps.now ?? Date.now)())) throw new SafeFailure("Source expired or invalid. Start again.");
      this.update({ source: { id: source.id, title: source.title, text: source.text, expiresAt: source.expiresAt } });
      const dto = await this.request(a, "/api/realtime/client-secret", { sourceId: source.id, mode: "text" });
      try {
        const now = Math.floor((this.deps.now ?? Date.now)() / 1000);
        if (!record(dto) || Object.keys(dto).sort().join() !== "clientSecret,expiresAt,model" || typeof dto.clientSecret !== "string" || !/^ek_[A-Za-z0-9_-]{1,500}$/.test(dto.clientSecret) || typeof dto.expiresAt !== "number" || !Number.isInteger(dto.expiresAt) || dto.expiresAt <= now || dto.expiresAt > now + 65 || typeof dto.model !== "string" || !/^[A-Za-z0-9._-]{1,100}$/.test(dto.model)) throw new SafeFailure("Temporary credential expired or invalid. Start again.");
        a.model = dto.model;
        a.socket = this.deps.socket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(dto.model)}`, ["realtime", `openai-insecure-api-key.${dto.clientSecret}`]);
      } finally { if (record(dto)) dto.clientSecret = undefined; }
      const socket = a.socket;
      socket.onopen = () => { if (this.current(a)) this.ready(a); };
      socket.onmessage = e => { if (this.current(a)) this.event(a, e.data); };
      socket.onerror = socket.onclose = () => { if (this.current(a)) this.fail("Connection closed or rejected. Start again to retry."); };
    } catch (error) { if (this.current(a)) this.fail(error instanceof SafeFailure ? error.message : undefined); }
  }
  private ready(a: Attempt) {
    if (!this.current(a) || a.ready || !a.confirmed || a.socket?.readyState !== 1) return;
    a.ready = true; clearTimeout(a.timer);
    a.timer = setTimeout(() => { if (this.current(a)) this.stop("Ended after the 60-second proof limit."); }, this.deps.sessionMs ?? 60000);
    this.update({ phase: "ready", message: "Ready. Ask about the synthetic lighthouse." });
  }
  send(question: string): boolean {
    const a = this.attempt;
    if (!a?.ready || !this.current(a) || a.pending || a.socket?.readyState !== 1) return false;
    if (!question.trim() || question.length > QUESTION_LIMIT) { this.update({ validation: `Enter a question of 1–${QUESTION_LIMIT} characters.` }); return false; }
    if (a.completed.size >= 20) { this.stop("Ended after 20 proof answers. Start a fresh conversation."); return false; }
    a.pending = { parts: new Map() };
    this.update({ phase: "waiting", validation: "", message: "Waiting for answer…" });
    a.responseTimer = setTimeout(() => { if (this.current(a)) this.fail("Answer timed out. Start again for a fresh conversation."); }, this.deps.responseMs ?? 20000);
    try {
      a.socket.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: question.trim() }] } }));
      a.socket.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["text"] } }));
      return true;
    } catch { this.fail(); return false; }
  }
  private publish(a: Attempt) {
    const pending = a.pending; if (!pending?.id) return;
    const text = [...pending.parts.values()].map(p => p.text).join("\n");
    if (text.length > 8000) throw new Error();
    const lines = this.state.lines.filter(line => line.id !== pending.id);
    this.update({ lines: [...lines, { id: pending.id, text, status: "streaming" as const }].slice(-10) });
  }
  private event(a: Attempt, raw: unknown) {
    try {
      if (typeof raw !== "string" || raw.length > 64000 || ++a.events > 2000) throw new Error();
      const e: unknown = JSON.parse(raw); if (!record(e) || typeof e.type !== "string") throw new Error();
      if (e.type === "error") { this.fail("Provider reported an error. Start again to retry."); return; }
      if (e.type === "session.created" || e.type === "session.updated") {
        const s = e.session;
        if (!record(s) || !id(s.id) || s.type !== "realtime" || s.model !== a.model || !Array.isArray(s.output_modalities) || s.output_modalities.length !== 1 || s.output_modalities[0] !== "text" || !record(s.audio) || !record(s.audio.input) || s.audio.input.turn_detection !== null || s.max_output_tokens !== 256) throw new Error();
        a.confirmed = true; this.ready(a); return;
      }
      const p = a.pending;
      if (!p) return;
      if (e.type === "response.created") {
        if (!record(e.response) || !id(e.response.id)) throw new Error();
        if (a.completed.has(e.response.id)) return;
        if (p.id && p.id !== e.response.id) throw new Error();
        p.id = e.response.id; return;
      }
      if (e.type === "response.output_text.delta" || e.type === "response.output_text.done") {
        if (e.response_id !== p.id || !p.id) return;
        if (!id(e.item_id) || !Number.isInteger(e.content_index) || (e.content_index as number) < 0 || (e.content_index as number) > 15 || !Number.isInteger(e.output_index) || (e.output_index as number) < 0 || (e.output_index as number) > 15) throw new Error();
        const key = `${e.output_index}:${e.item_id}:${e.content_index}`;
        const part = p.parts.get(key) ?? { text: "", final: false };
        const final = e.type === "response.output_text.done";
        const text = final ? e.text : e.delta; if (typeof text !== "string") throw new Error();
        if (part.final) return;
        p.parts.set(key, { text: final ? text : part.text + text, final });
        if (p.parts.size > 16) throw new Error();
        this.publish(a); return;
      }
      if (e.type === "response.done") {
        if (!record(e.response) || e.response.id !== p.id || !p.id) return;
        const r = e.response;
        if (r.status !== "completed") { this.fail("Answer incomplete or cancelled. Start again to retry."); return; }
        if (!Array.isArray(r.output) || r.output.length > 16) throw new Error();
        p.parts.clear();
        for (const [outputIndex, item] of r.output.entries()) {
          if (!record(item) || !id(item.id) || item.type !== "message" || item.role !== "assistant" || item.status !== "completed" || !Array.isArray(item.content) || item.content.length > 16) throw new Error();
          for (const [contentIndex, content] of item.content.entries()) {
            if (!record(content) || content.type !== "output_text" || typeof content.text !== "string") throw new Error();
            p.parts.set(`${outputIndex}:${item.id}:${contentIndex}`, { text: content.text, final: true });
          }
        }
        if (!p.parts.size) throw new Error();
        this.publish(a); a.completed.add(p.id); clearTimeout(a.responseTimer); a.responseTimer = undefined;
        this.update({ phase: "ready", message: "Ready. Answer complete; ask a follow-up.", lines: this.state.lines.map(line => line.id === p.id ? { ...line, status: "complete" } : line) });
        a.pending = undefined;
      }
    } catch { this.fail("Invalid or oversized provider event. Start again to retry."); }
  }
}

