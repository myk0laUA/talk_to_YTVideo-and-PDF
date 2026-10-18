import "server-only";
import { parseProofConfig } from "./config.ts";

// No database client or provider is invoked to render this page.
export function voiceProofAvailable(env: Record<string, string | undefined> = process.env): boolean {
  const config = parseProofConfig(env);
  return Boolean(config?.issuanceEnabled && config.apiKey && config.model && env.DATABASE_URL);
}

export function textProofAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return env.TEXT_PROOF_ENABLED === "true" && voiceProofAvailable(env);
}
