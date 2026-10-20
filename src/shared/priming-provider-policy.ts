/** Product policy, not a token measurement, source authorization or account spending cap. */
export const PROVIDER_TEXT_POLICY = Object.freeze({ basis: "provider_enforced", model: "gpt-realtime-2.1-mini",
  policyVersion: "provider-text-full-source-2026-10-20-v1", mode: "text", maxOutputTokens: 512,
  reasoningEffort: "minimal", capacity: "checked_at_each_response" } as const);
export type ProviderTextPolicy = typeof PROVIDER_TEXT_POLICY;
export function matchesProviderTextPolicy(value: unknown): value is ProviderTextPolicy {
  return JSON.stringify(value) === JSON.stringify(PROVIDER_TEXT_POLICY);
}

/** Error messages are never copied to UI/logs. Both error and response.status_details use codes. */
export function isContextLimit(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || typeof error.code !== "string") return false;
  return /context.*(limit|length)|token.*limit/.test(error.code);
}
