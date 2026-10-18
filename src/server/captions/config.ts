import { parseVisitorConfig, type VisitorConfig } from "../proof/config.ts";

export function parseCaptionConfig(env: Record<string, string | undefined>): VisitorConfig | null {
  if (env.CAPTION_PROOF_ENABLED !== "true") return null;
  // Explicitly permits loopback HTTP in a production Next build for this local trial only.
  // HTTPS remains mandatory for every other host; voice/text keep their existing rules.
  return parseVisitorConfig(env, env.CAPTION_PROOF_LOCAL_HTTP === "true");
}
