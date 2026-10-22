import "server-only";
import {createHash} from "node:crypto";

export const RESPONSES_POLICY = Object.freeze({ model: "gpt-5.4-mini-2026-03-17", inputTokens: 128_000,
  outputTokens: 4096, requestBytes: 512_000, responseBytes: 128_000, timeoutMs: 60_000,
  statements: 8, statementCharacters: 600, references: 16, historyMessages: 4, historyCharacters: 16_000 });
export type CandidateRequest = Readonly<{ model: string; instructions: string; input: readonly Readonly<{ role: "user" | "assistant"; content: string }>[];
  reasoning: { effort: "medium" }; max_output_tokens: number; store: false; truncation: "disabled";
  tools: readonly []; background: false; stream: false; service_tier: "default";
  text: { format: { type: "json_schema"; name: string; strict: true; schema: Readonly<Record<string, unknown>> } } }>;
export type CandidateTransport = (request: CandidateRequest, signal: AbortSignal) => Promise<unknown>;
export type CandidateTokenBound = { requestSha256: string; inputTokens: number; basis: "responses.input_tokens" };
export type CandidateUsage = { inputTokens: number; outputTokens: number; reasoningTokens: number | null; cachedTokens: number | null };
export type CandidateFailure = "invalid_input" | "budget" | "aborted" | "timeout" | "transport" | "refusal" | "incomplete" | "provider_failure" | "malformed";

export type PreparedResponseStage = Readonly<{request: CandidateRequest; requestSha256: string}>;
export type ResponseStageResult = {ok:true;value:unknown;usage:CandidateUsage|null;elapsedMs:number}|{ok:false;code:CandidateFailure;usage:CandidateUsage|null;elapsedMs:number};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
function usageOf(raw: Record<string, unknown>): CandidateUsage | null {
  if (!record(raw.usage)) return null;
  const u = raw.usage, integer = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
  if (!integer(u.input_tokens) || !integer(u.output_tokens)) return null;
  const r = record(u.output_tokens_details) ? u.output_tokens_details.reasoning_tokens : null;
  const c = record(u.input_tokens_details) ? u.input_tokens_details.cached_tokens : null;
  return { inputTokens: u.input_tokens, outputTokens: u.output_tokens, reasoningTokens: integer(r) && r <= u.output_tokens ? r : null,
    cachedTokens: integer(c) && c <= u.input_tokens ? c : null };
}

function parseEnvelope(raw: unknown): { code: CandidateFailure; usage: CandidateUsage | null } | { value: unknown; usage: CandidateUsage | null } {
  if (!record(raw)) return { code: "malformed", usage: null };
  const usage = usageOf(raw);
  if (raw.status === "incomplete") return { code: "incomplete", usage };
  if (raw.status !== "completed" || raw.error) return { code: "provider_failure", usage };
  if (!Array.isArray(raw.output)) return { code: "malformed", usage };
  const texts: string[] = [];
  for (const item of raw.output) {
    if (!record(item)) return { code: "malformed", usage };
    if (item.type === "reasoning") continue;
    if (item.type !== "message" || item.role !== "assistant" || item.status !== "completed" || !Array.isArray(item.content)) return { code: "malformed", usage };
    for (const part of item.content) {
      if (record(part) && part.type === "refusal") return { code: "refusal", usage };
      if (!record(part) || part.type !== "output_text" || !string(part.text, RESPONSES_POLICY.responseBytes)) return { code: "malformed", usage };
      texts.push(part.text);
    }
  }
  // No partial JSON, concatenated objects, repair, or fallback to raw model prose.
  if (texts.length !== 1 || Buffer.byteLength(texts[0]) > RESPONSES_POLICY.responseBytes) return { code: "malformed", usage };
  let data: unknown; try { data = JSON.parse(texts[0]); } catch { return { code: "malformed", usage }; }
  return {value:data,usage};
}

/** Shared buffered protocol/cancellation handling; no retries or schema truth assumptions. */
export async function executeResponseStage(prepared:PreparedResponseStage,deps:{transport:CandidateTransport;tokenBound:CandidateTokenBound;signal?:AbortSignal;timeoutMs?:number}):Promise<ResponseStageResult>{
  const start = performance.now(), fail = (code: CandidateFailure, usage: CandidateUsage | null = null): ResponseStageResult => ({ ok: false, code, usage, elapsedMs: performance.now() - start });
  if (createHash("sha256").update(JSON.stringify(prepared.request)).digest("hex") !== prepared.requestSha256 || Buffer.byteLength(JSON.stringify(prepared.request)) > RESPONSES_POLICY.requestBytes) return fail("invalid_input");
  if (!deps.tokenBound || deps.tokenBound.basis !== "responses.input_tokens" || deps.tokenBound.requestSha256 !== prepared.requestSha256
    || !Number.isSafeInteger(deps.tokenBound.inputTokens) || deps.tokenBound.inputTokens <= 0
    || deps.tokenBound.inputTokens > RESPONSES_POLICY.inputTokens) return fail("budget");
  const timeoutMs = deps.timeoutMs ?? RESPONSES_POLICY.timeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > RESPONSES_POLICY.timeoutMs) return fail("invalid_input");
  if (deps.signal?.aborted) return fail("aborted");
  const controller = new AbortController();
  let terminal: "aborted" | "timeout" | undefined, cancel!: (v: { cancelled: true }) => void;
  const cancellation = new Promise<{ cancelled: true }>(resolve => { cancel = resolve; });
  const stop = (code: "aborted" | "timeout") => { if (!terminal) { terminal = code; controller.abort(); cancel({ cancelled: true }); } };
  const abort = () => stop("aborted");
  deps.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => stop("timeout"), timeoutMs);
  try {
    const outcome = await Promise.race([cancellation, Promise.resolve().then(async () => {
      if (terminal) return { cancelled: true } as const;
      return deps.transport(prepared.request, controller.signal).then(raw => ({ raw }));
    })]);
    if (terminal) return fail(terminal);
    if (!("raw" in outcome)) return fail("aborted");
    const parsed = parseEnvelope(outcome.raw);
    if ("code" in parsed) return fail(parsed.code, parsed.usage);
    return {ok:true,value:parsed.value,usage:parsed.usage,elapsedMs:performance.now()-start};
  } catch { return fail(terminal ?? "transport"); }
  finally { clearTimeout(timer); deps.signal?.removeEventListener("abort", abort); }
}
