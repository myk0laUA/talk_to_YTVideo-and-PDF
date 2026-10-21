/** Product policy, not a token measurement, source authorization or account spending cap. */
export const PROVIDER_TEXT_POLICY = Object.freeze({ basis: "provider_enforced", model: "gpt-realtime-2.1-mini",
  policyVersion: "provider-text-full-source-2026-10-20-v1", mode: "text", maxOutputTokens: 512,
  reasoningEffort: "minimal", capacity: "checked_at_each_response" } as const);
export type ProviderTextPolicy = typeof PROVIDER_TEXT_POLICY;
/** Separate voice opt-in. No tokenizer/framing binding or pre-admitted capacity. */
export const PROVIDER_VOICE_POLICY = Object.freeze({ basis: "provider_enforced", model: "gpt-realtime-2.1-mini",
  policyVersion: "provider-voice-full-source-2026-10-21-v2", mode: "voice", maxOutputTokens: 512,
  voice: "marin", transcription: Object.freeze({ model: "gpt-4o-mini-transcribe" }), capacity: "checked_at_each_response" } as const);
export type ProviderVoicePolicy = typeof PROVIDER_VOICE_POLICY;
export type ProviderPolicy = ProviderTextPolicy | ProviderVoicePolicy;
/** Provider ACKs may expand omitted language/prompt to their empty defaults.
 * Reject other models, hints, forced languages and unreviewed settings. */
export function matchesVoiceTranscription(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.model === PROVIDER_VOICE_POLICY.transcription.model
    && (v.language === undefined || v.language === null)
    && (v.prompt === undefined || v.prompt === null || v.prompt === "")
    && Object.keys(v).every(k => ["model", "language", "prompt"].includes(k));
}
export function matchesProviderVoicePolicy(value: unknown): value is ProviderVoicePolicy {
  return JSON.stringify(value) === JSON.stringify(PROVIDER_VOICE_POLICY);
}
export function matchesProviderTextPolicy(value: unknown): value is ProviderTextPolicy {
  return JSON.stringify(value) === JSON.stringify(PROVIDER_TEXT_POLICY);
}

/** Error messages are never copied to UI/logs. Both error and response.status_details use codes. */
export function isContextLimit(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || typeof error.code !== "string") return false;
  return /context.*(limit|length)|token.*limit/.test(error.code);
}
