import "server-only";
import { RESPONSES_POLICY, type CandidateRequest, type CandidateTransport, type CandidateTokenBound, type PreparedCandidate } from "./responses-candidate.ts";

/** Fixed public endpoint, no redirects/retries, bounded body, no provider error bodies in exceptions. */
export function createResponsesTransport(apiKey: string, fetcher: typeof fetch = fetch): {
  generate: CandidateTransport; count: (prepared: PreparedCandidate, signal: AbortSignal) => Promise<CandidateTokenBound>;
} {
  if (!/^sk-[A-Za-z0-9_-]{10,500}$/u.test(apiKey)) throw new Error("candidate_key_unavailable");
  const post = async (path: "" | "/input_tokens", body: unknown, signal: AbortSignal): Promise<unknown> => {
    const response = await fetcher(`https://api.openai.com/v1/responses${path}`, { method: "POST", redirect: "error", signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error(`candidate_http_${response.status}`); }
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (signal.aborted) throw new Error("candidate_aborted");
        if (done) break;
        size += value.length;
        if (size > RESPONSES_POLICY.responseBytes) throw new Error("candidate_response_bounds");
        chunks.push(value);
      }
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  };
  return {
    generate: (request: CandidateRequest, signal) => post("", request, signal),
    count: async (prepared, signal) => {
      const { model, instructions, input, text, tools, reasoning } = prepared.request;
      const raw = await post("/input_tokens", { model, instructions, input, text, tools, reasoning }, signal);
      if (!raw || typeof raw !== "object" || !("input_tokens" in raw) || !("object" in raw) || raw.object !== "response.input_tokens"
        || !Number.isSafeInteger(raw.input_tokens) || Number(raw.input_tokens) <= 0 || Number(raw.input_tokens) > RESPONSES_POLICY.inputTokens) throw new Error("candidate_token_bound");
      return { basis: "responses.input_tokens", requestSha256: prepared.requestSha256, inputTokens: Number(raw.input_tokens) };
    },
  };
}
