// Developer-only diagnostic. No application imports at runtime, environment access or network APIs.
import type { ItemEvent, SessionEvent } from "../../src/shared/priming-manifest.ts";
import type { PrimingClock, PrimingTransport } from "../../src/shared/priming-controller.ts";

export const PROBE_MODELS = ["gpt-realtime-2.1", "gpt-realtime-2.1-mini"] as const;
export type ProbeModel = typeof PROBE_MODELS[number];
export type ProbeOptions = Readonly<{ model: ProbeModel; phase: "acknowledgments" | "response";
  maxOutputTokens: number; timeoutMs: number; maxRequests: number }>;
export const DEFAULT_LIMITS = Object.freeze({ maxOutputTokens: 64, timeoutMs: 15_000, maxRequests: 5 });
export const MAX_INBOUND_EVENTS = 128;
export const MAX_INBOUND_BYTES = 65_536;
const INSTRUCTIONS = "Use only the synthetic observatory fact supplied in this conversation. Answer the question with one word. Do not call tools.";
const CONTEXT = "Synthetic fact: The observatory access color is cobalt.";
const QUESTION = "What is the observatory access color? Reply with only the color.";
const EXPECTED = "cobalt";
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function validateProbeOptions(value: ProbeOptions): void {
  if (!value || !PROBE_MODELS.includes(value.model) || !["acknowledgments", "response"].includes(value.phase)
    || !Number.isSafeInteger(value.maxOutputTokens) || value.maxOutputTokens < 1 || value.maxOutputTokens > 64
    || !Number.isSafeInteger(value.timeoutMs) || value.timeoutMs < 100 || value.timeoutMs > 15_000
    || !Number.isSafeInteger(value.maxRequests) || value.maxRequests < (value.phase === "response" ? 5 : 3)
    || value.maxRequests > 5) throw new Error("Invalid probe options. No connection attempted.");
}

export function probeSequence(options: ProbeOptions) {
  validateProbeOptions(options);
  const configure: SessionEvent & { session: SessionEvent["session"] & { max_output_tokens: number; tool_choice: "none"; tracing: null; reasoning: { effort: "minimal" } } } = {
    type: "session.update", event_id: "probe_config", session: { type: "realtime", instructions: INSTRUCTIONS,
      output_modalities: ["text"], audio: { input: { turn_detection: null } }, tools: [], tool_choice: "none",
      truncation: "disabled", tracing: null, reasoning: { effort: "minimal" }, max_output_tokens: options.maxOutputTokens } };
  const context: ItemEvent = { type: "conversation.item.create", event_id: "probe_context_create",
    item: { id: "probe_context", type: "message", role: "user", content: [{ type: "input_text", text: CONTEXT }] } };
  const question: ItemEvent = { type: "conversation.item.create", event_id: "probe_question_create", previous_item_id: context.item.id,
    item: { id: "probe_question", type: "message", role: "user", content: [{ type: "input_text", text: QUESTION }] } };
  return { configure, context, question, respond: { type: "response.create", event_id: "probe_response",
    response: { output_modalities: ["text"], max_output_tokens: options.maxOutputTokens, tools: [], tool_choice: "none" } } } as const;
}

export type ProbeUsage = { input_tokens: number; output_tokens: number; total_tokens: number;
  input_token_details?: { text_tokens?: number; audio_tokens?: number; image_tokens?: number; cached_tokens?: number;
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number; image_tokens?: number } };
  output_token_details?: { text_tokens?: number; audio_tokens?: number } };
// Whitelist numeric fields only. Never copy provider strings, messages, arbitrary metadata or identifiers.
export function sanitizeUsage(value: unknown): ProbeUsage | null {
  if (!record(value) || !count(value.input_tokens) || !count(value.output_tokens) || !count(value.total_tokens)
    || value.total_tokens !== value.input_tokens + value.output_tokens) return null;
  const usage: ProbeUsage = { input_tokens: value.input_tokens, output_tokens: value.output_tokens, total_tokens: value.total_tokens };
  for (const key of ["input_token_details", "output_token_details"] as const) {
    const detail = value[key];
    if (detail === undefined || detail === null) continue;
    if (!record(detail)) return null;
    const clean: Record<string, number> = {};
    for (const field of key === "input_token_details" ? ["text_tokens", "audio_tokens", "image_tokens", "cached_tokens"] : ["text_tokens", "audio_tokens"]) {
      if (detail[field] === undefined) continue;
      if (!count(detail[field]) || detail[field] > (key === "input_token_details" ? usage.input_tokens : usage.output_tokens)) return null;
      clean[field] = detail[field];
    }
    usage[key] = clean;
    if (key === "input_token_details" && record(detail.cached_tokens_details)) {
      const cached: Record<string, number> = {};
      for (const field of ["text_tokens", "audio_tokens", "image_tokens"]) {
        if (detail.cached_tokens_details[field] === undefined) continue;
        if (!count(detail.cached_tokens_details[field]) || detail.cached_tokens_details[field] > (clean.cached_tokens ?? usage.input_tokens)) return null;
        cached[field] = detail.cached_tokens_details[field];
      }
      usage.input_token_details!.cached_tokens_details = cached;
    }
  }
  return usage;
}

type Failure = "timeout" | "cancelled" | "transport" | "protocol" | "configuration" | "provider" | "context_limit"
  | "request_limit" | "event_limit" | "response_failed" | "answer_mismatch" | "usage_missing_or_invalid" | "usage_limit";
export type ProbeReport = {
  version: "07d-v1"; environment: "mocked" | "live"; transport: "scripted" | "server-websocket";
  model: ProbeModel; phase: ProbeOptions["phase"]; startedAt: string; endedAt: string; elapsedMs: number;
  outcome: "PASS" | "FAIL" | "CANCELLED"; failure?: Failure; limits: ProbeOptions;
  counts: { connections: number; outboundEvents: number; requestUnits: number; responsesRequested: number; inboundEvents: number; closes: number };
  acknowledgments: { sessionCreated: boolean; sessionUpdated: boolean; contextItemDone: boolean; questionItemDone: boolean };
  conversationCreatedObserved: boolean;
  response: { created: boolean; completed: boolean; answerMatches: boolean; outputCharacters: number };
  usage: ProbeUsage | null; estimatedTextCostUsd: number | null;
  unresolved: string[]; productionReady: false; liveResult: "NOT_RUN" | "EXECUTED";
};

const systemClock: PrimingClock = { now: Date.now, setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/** One fixed sequence. The factory is called once, only after validation/cancellation checks.
 * No retry, injected content, source admission override, media, DB or credential machinery.
 */
export function runProbe(options: ProbeOptions, deps: { environment: "mocked" | "live"; open: () => PrimingTransport;
  clock?: PrimingClock; signal?: AbortSignal }): Promise<ProbeReport> {
  validateProbeOptions(options);
  const clock = deps.clock ?? systemClock;
  // Named projection prevents untyped callers from adding credential/metadata fields to the report.
  const limits: ProbeOptions = Object.freeze({ model: options.model, phase: options.phase, maxOutputTokens: options.maxOutputTokens,
    timeoutMs: options.timeoutMs, maxRequests: options.maxRequests });
  const sequence = probeSequence(limits), started = clock.now(), deadline = started + limits.timeoutMs;
  if (!Number.isFinite(started)) throw new Error("Invalid probe clock. No connection attempted.");
  const report: ProbeReport = { version: "07d-v1", environment: deps.environment,
    transport: deps.environment === "live" ? "server-websocket" : "scripted", model: limits.model, phase: limits.phase,
    startedAt: new Date(started).toISOString(), endedAt: "", elapsedMs: 0, outcome: "FAIL", limits,
    counts: { connections: 0, outboundEvents: 0, requestUnits: 0, responsesRequested: 0, inboundEvents: 0, closes: 0 },
    acknowledgments: { sessionCreated: false, sessionUpdated: false, contextItemDone: false, questionItemDone: false },
    conversationCreatedObserved: false, response: { created: false, completed: false, answerMatches: false, outputCharacters: 0 }, usage: null,
    estimatedTextCostUsd: null, productionReady: false, liveResult: "NOT_RUN",
    unresolved: ["WebRTC_voice_and_physical_audio_NOT_RUN", "exact_local_tokenizer_and_hidden_framing_unresolved",
      "full_source_and_history_admission_unverified", "production_integration_NOT_RUN",
      ...(limits.phase === "acknowledgments" ? ["text_response_and_usage_NOT_RUN"] : [])] };
  return new Promise(resolve => {
    let finished = false, transport: PrimingTransport | undefined, unsubscribe: (() => void) | undefined;
    const timer = { handle: undefined as unknown };
    let sessionId: string | undefined, responseId: string | undefined;
    let stage: "created" | "updated" | "context" | "question" | "response" = "created";
    const finish = (failure?: Failure) => {
      if (finished) return;
      finished = true;
      report.outcome = failure === "cancelled" ? "CANCELLED" : failure ? "FAIL" : "PASS";
      if (failure) report.failure = failure;
      clock.clearTimeout(timer.handle); deps.signal?.removeEventListener("abort", abort);
      try { unsubscribe?.(); } catch { /* Best-effort listener disposal; close still runs. */ }
      if (transport) { report.counts.closes++; try { transport.close(); } catch { /* No raw error output. */ } }
      report.endedAt = new Date(clock.now()).toISOString(); report.elapsedMs = clock.now() - started;
      resolve(structuredClone(report));
    };
    const abort = () => finish("cancelled");
    const live = () => {
      if (finished) return false;
      if (deps.signal?.aborted) { finish("cancelled"); return false; }
      if (!Number.isFinite(clock.now()) || clock.now() >= deadline) { finish("timeout"); return false; }
      return true;
    };
    const send = (event: object) => {
      if (!live()) return;
      if (report.counts.requestUnits >= limits.maxRequests) { finish("request_limit"); return; }
      report.counts.requestUnits++; report.counts.outboundEvents++;
      if (event === sequence.respond) report.counts.responsesRequested++;
      try {
        if (!transport!.isOpen()) { finish("transport"); return; }
        const sent = transport!.send(JSON.stringify(event));
        Promise.resolve(sent).catch(() => finish("transport"));
      } catch { finish("transport"); }
    };
    const receive = (event: unknown) => {
      if (!live()) return;
      try {
        report.counts.inboundEvents++;
        if (report.counts.inboundEvents > MAX_INBOUND_EVENTS) { finish("event_limit"); return; }
        if (!record(event) || typeof event.type !== "string" || Buffer.byteLength(JSON.stringify(event)) > MAX_INBOUND_BYTES) { finish("protocol"); return; }
        if (event.type === "error") {
          finish(record(event.error) && ["context_length_exceeded", "context_window_exceeded", "input_token_limit_exceeded"].includes(String(event.error.code)) ? "context_limit" : "provider"); return;
        }
        if (event.type === "rate_limits.updated") return;
        if (event.type === "conversation.created") {
          if (!report.acknowledgments.sessionCreated || report.conversationCreatedObserved || !record(event.conversation)
            || !id(event.conversation.id) || event.conversation.object !== "realtime.conversation") { finish("protocol"); return; }
          report.conversationCreatedObserved = true; return;
        }
        if (event.type === "session.created") {
          const s = event.session;
          if (stage !== "created" || !record(s) || !id(s.id) || s.type !== "realtime" || s.object !== "realtime.session" || s.model !== limits.model) { finish("configuration"); return; }
          sessionId = s.id; report.acknowledgments.sessionCreated = true; stage = "updated"; send(sequence.configure); return;
        }
        if (event.type === "session.updated") {
          const s = event.session, desired = sequence.configure.session;
          if (stage !== "updated" || !record(s) || s.id !== sessionId || s.type !== "realtime" || s.object !== "realtime.session" || s.model !== limits.model
            || s.instructions !== desired.instructions || s.truncation !== "disabled" || s.max_output_tokens !== limits.maxOutputTokens
            || !equal(s.output_modalities, ["text"]) || !equal(s.tools, []) || s.tool_choice !== "none"
            || !record(s.reasoning) || s.reasoning.effort !== "minimal"
            || s.tracing != null || !record(s.audio) || !record(s.audio.input) || s.audio.input.turn_detection !== null) { finish("configuration"); return; }
          report.acknowledgments.sessionUpdated = true; stage = "context"; send(sequence.context); return;
        }
        if ((event.type === "conversation.item.added" || event.type === "conversation.item.done") && record(event.item) && event.item.role === "user") {
          const expected = stage === "context" ? sequence.context : stage === "question" ? sequence.question : undefined;
          const item = event.item;
          if (!expected || item.id !== expected.item.id || item.type !== "message" || !equal(item.content, expected.item.content)
            || (expected.previous_item_id ? event.previous_item_id !== expected.previous_item_id : event.previous_item_id != null)
            || (event.type === "conversation.item.done" && item.status !== "completed")) { finish("protocol"); return; }
          if (event.type === "conversation.item.added") return;
          if (stage === "context") {
            report.acknowledgments.contextItemDone = true;
            if (limits.phase === "acknowledgments") { finish(); return; }
            stage = "question"; send(sequence.question);
          } else { report.acknowledgments.questionItemDone = true; stage = "response"; send(sequence.respond); }
          return;
        }
        // No automatic or unrelated response may precede the sole explicit response.create.
        if (stage !== "response" || report.counts.responsesRequested !== 1) { finish("protocol"); return; }
        if (event.type === "response.created") {
          if (responseId || !record(event.response) || !id(event.response.id)) { finish("protocol"); return; }
          responseId = event.response.id; report.response.created = true; return;
        }
        if (!responseId) { finish("protocol"); return; }
        if (event.type === "response.done") {
          const r = event.response;
          if (!record(r) || r.id !== responseId || !Array.isArray(r.output)) { finish("protocol"); return; }
          report.usage = sanitizeUsage(r.usage);
          if (report.usage && !(report.usage.input_token_details?.audio_tokens ?? 0) && !(report.usage.input_token_details?.image_tokens ?? 0)
            && !(report.usage.output_token_details?.audio_tokens ?? 0)) {
            const rates = limits.model === "gpt-realtime-2.1-mini" ? [0.6, 0.06, 2.4] : [4, 0.4, 24];
            const cached = report.usage.input_token_details?.cached_tokens ?? 0;
            report.estimatedTextCostUsd = ((report.usage.input_tokens - cached) * rates[0] + cached * rates[1] + report.usage.output_tokens * rates[2]) / 1e6;
          }
          if (r.status !== "completed") { finish("response_failed"); return; }
          report.response.completed = true;
          let text = "";
          for (const item of r.output) {
            if (!record(item) || item.type !== "message" || item.role !== "assistant" || !Array.isArray(item.content)) { finish("protocol"); return; }
            for (const part of item.content) {
              if (!record(part) || part.type !== "output_text" || typeof part.text !== "string") { finish("protocol"); return; }
              text += part.text;
            }
          }
          report.response.outputCharacters = text.length;
          report.response.answerMatches = text.trim().toLowerCase() === EXPECTED;
          if (!report.usage) { finish("usage_missing_or_invalid"); return; }
          if (report.usage.output_tokens > limits.maxOutputTokens || report.usage.input_tokens > 128_000
            || (report.usage.input_token_details?.audio_tokens ?? 0) > 0 || (report.usage.input_token_details?.image_tokens ?? 0) > 0
            || (report.usage.output_token_details?.audio_tokens ?? 0) > 0) { finish("usage_limit"); return; }
          finish(report.response.answerMatches ? undefined : "answer_mismatch"); return;
        }
        // Known text lifecycle notifications carry no readiness/accounting authority.
        const notifications = ["response.output_item.added", "response.output_item.done", "response.content_part.added",
          "response.content_part.done", "response.output_text.delta", "response.output_text.done"];
        if (notifications.includes(event.type) && event.response_id === responseId) return;
        if (["conversation.item.added", "conversation.item.done"].includes(event.type) && record(event.item)
          && event.item.type === "message" && event.item.role === "assistant") return;
        finish("protocol");
      } catch { finish("protocol"); }
    };
    if (deps.signal?.aborted) { finish("cancelled"); return; }
    deps.signal?.addEventListener("abort", abort, { once: true });
    timer.handle = clock.setTimeout(() => finish("timeout"), limits.timeoutMs);
    try {
      report.counts.connections = 1; report.counts.requestUnits = 1;
      if (deps.environment === "live") report.liveResult = "EXECUTED";
      transport = deps.open();
      const dispose = transport.subscribe(receive, () => finish("transport"));
      if (finished) dispose(); else unsubscribe = dispose;
    } catch { finish("transport"); }
  });
}
