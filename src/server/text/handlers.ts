import "server-only";
import type { TextConfig } from "./config.ts";
import { readVisitor } from "../proof/visitor.ts";
import { TEXT_QUESTION_LIMIT } from "../../shared/text-lifecycle.ts";
import { textUuid } from "../../shared/text-relay.ts";
import { RelayError, type TextRegistry } from "./registry.ts";
import { guardedAwait } from "../context/await.ts";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
export const textMethodNotAllowed = () => reply(405, { error: "Method not allowed" });
// A bounded byte stream and fixed body deadline, including absent/forged Content-Length.
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") throw new RelayError(400);
  const reader = request.body?.getReader();
  if (!reader) throw new RelayError(400);
  const abort = new AbortController(), cancel = () => abort.abort();
  const timer = setTimeout(cancel, 2000);
  request.signal.addEventListener("abort", cancel, { once: true });
  const guard = () => { if (abort.signal.aborted || request.signal.aborted) throw new RelayError(400); };
  try {
    guard();
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const { value, done } = await guardedAwait(() => reader.read(), abort.signal, guard);
      if (done) break;
      length += value.byteLength;
      if (length > 8192) throw new RelayError(400);
      chunks.push(value);
    }
    const result: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new RelayError(400);
    return result as Record<string, unknown>;
  } catch { throw new RelayError(400); }
  finally {
    clearTimeout(timer); request.signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {}); reader.releaseLock();
  }
}
const keys = (input: Record<string, unknown>, expected: string) => Object.keys(input).sort().join(",") === expected;

export function createTextHandlers(deps: { config: () => TextConfig | null; registry: TextRegistry; now?: () => number }) {
  const now = deps.now ?? Date.now;
  const handle = async (kind: "start" | "question" | "stop" | "stream", request: Request, id?: string) => {
    let release: (() => void) | undefined;
    try {
      const config = deps.config();
      if (!config) return reply(503, { error: "Text conversation unavailable" });
      if (request.method !== (kind === "stream" ? "GET" : "POST")) return textMethodNotAllowed();
      const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
      if ((kind === "stream" ? origin !== null && origin !== config.origin : origin !== config.origin)
        || !(kind === "stream" ? [null, "same-origin", "none"] : [null, "same-origin"]).includes(site)) throw new RelayError(403);
      const visitor = readVisitor(request.headers.get("cookie"), config, now());
      if (!visitor) throw new RelayError(401);
      release = deps.registry.admitCommand(visitor.owner, kind === "stop");
      if (kind === "stream") {
        if (!textUuid(id) || new URL(request.url).search !== "") throw new RelayError(400);
        const stream = await deps.registry.stream(visitor, id, request.signal);
        return new Response(stream, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
      }
      const input = await body(request);
      if (request.signal.aborted) throw new RelayError(400);
      if (kind === "start") {
        if (!keys(input, "requestId,sourceId") || !textUuid(input.sourceId) || !textUuid(input.requestId)) throw new RelayError(400);
        const sessionId = await deps.registry.start(visitor, input.sourceId, input.requestId, request.signal);
        return reply(201, { sessionId });
      }
      if (kind === "stop") {
        if (!keys(input, "requestId") || !textUuid(input.requestId)) throw new RelayError(400);
        deps.registry.stop(visitor, input.requestId); return reply(200, { ok: true });
      }
      if (!keys(input, "question,questionId,sessionId") || !textUuid(input.sessionId) || !textUuid(input.questionId)
        || typeof input.question !== "string" || !input.question.trim() || input.question.length > TEXT_QUESTION_LIMIT) throw new RelayError(400);
      await deps.registry.question(visitor, input.sessionId, input.questionId, input.question, request.signal);
      return reply(202, { ok: true });
    } catch (error) {
      const status = error instanceof RelayError ? error.status : 503;
      return reply(status, { error: status === 429 ? "Text session limit reached" : "Text session unavailable" });
    } finally { release?.(); }
  };
  return { start: (r: Request) => handle("start", r), question: (r: Request) => handle("question", r),
    stop: (r: Request) => handle("stop", r), stream: (r: Request, id: string) => handle("stream", r, id) };
}
