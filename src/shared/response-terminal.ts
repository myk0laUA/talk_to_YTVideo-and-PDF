/** Closed, memory-only projection. Never retain provider errors, text or raw usage objects. */
export type ResponseTerminal = Readonly<{
  reason: "completed" | "max_output_tokens" | "content_filter" | "turn_detected" | "client_cancelled" | "unknown";
  usage: Readonly<Partial<Record<"inputTokens" | "outputTokens" | "totalTokens" | "inputAudioTokens" | "inputTextTokens" | "outputAudioTokens" | "outputTextTokens", number>>>;
}>;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function projectResponseTerminal(response: Record<string, unknown>): ResponseTerminal {
  const details = record(response.status_details) ? response.status_details : {};
  const reason = response.status === "completed" ? "completed"
    : response.status === "incomplete" && (details.reason === "max_output_tokens" || details.reason === "content_filter") ? details.reason
    : response.status === "cancelled" && (details.reason === "turn_detected" || details.reason === "client_cancelled") ? details.reason : "unknown";
  const raw = record(response.usage) ? response.usage : {};
  const input = record(raw.input_token_details) ? raw.input_token_details : {};
  const output = record(raw.output_token_details) ? raw.output_token_details : {};
  const usage: Partial<Record<keyof ResponseTerminal["usage"], number>> = {};
  const values = { inputTokens: raw.input_tokens, outputTokens: raw.output_tokens, totalTokens: raw.total_tokens,
    inputAudioTokens: input.audio_tokens, inputTextTokens: input.text_tokens,
    outputAudioTokens: output.audio_tokens, outputTextTokens: output.text_tokens };
  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    const value = values[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) usage[key] = value;
  }
  return Object.freeze({ reason, usage: Object.freeze(usage) });
}

export function responseTerminalMessage(terminal?: ResponseTerminal): string {
  switch (terminal?.reason) {
    case "max_output_tokens": return "The answer reached its output limit. Ask for a shorter answer or a specific part.";
    case "content_filter": return "The provider stopped this answer because of its content filter.";
    case "turn_detected": return "The provider cancelled the answer after detecting speech.";
    case "client_cancelled": return "The answer was cancelled by a client request.";
    case "unknown": return "The provider did not report a recognized completion reason.";
    default: return "";
  }
}
