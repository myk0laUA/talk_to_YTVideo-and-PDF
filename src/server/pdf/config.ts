import { parseVisitorConfig } from "../proof/config.ts";

export function parsePdfConfig(env: Record<string, string | undefined>) {
  return env.PDF_PROOF_ENABLED === "true"
    ? parseVisitorConfig(env, env.PDF_PROOF_LOCAL_HTTP === "true") : null;
}
