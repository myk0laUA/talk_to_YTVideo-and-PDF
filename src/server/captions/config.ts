import { parseVisitorConfig, type VisitorConfig } from "../proof/config.ts";

export type CaptionConfig = VisitorConfig & { provider: "direct" | "supadata"; supadataApiKey?: string };
// Automatic selection is ingestion-only. Proof configuration deliberately excludes it.
export type CaptionSelectionConfig = Omit<CaptionConfig, "provider"> & {
  provider: CaptionConfig["provider"] | "auto"; directFirst?: boolean;
};
export const validSupadataKey = (key: string | undefined): key is string => !!key && /^[\x21-\x7e]{1,4096}$/.test(key);

export function parseCaptionConfig(env: Record<string, string | undefined>): CaptionConfig | null {
  if (env.CAPTION_PROOF_ENABLED !== "true") return null;
  const provider = env.CAPTION_PROOF_PROVIDER ?? "direct";
  if (!["direct", "supadata"].includes(provider) || env.NEXT_PUBLIC_SUPADATA_API_KEY) return null;
  const key = env.SUPADATA_API_KEY?.trim();
  if (provider === "supadata" && !validSupadataKey(key)) return null;
  // Explicitly permits loopback HTTP in a production Next build for this local trial only.
  // HTTPS remains mandatory for every other host; voice/text keep their existing rules.
  const visitor = parseVisitorConfig(env, env.CAPTION_PROOF_LOCAL_HTTP === "true");
  return visitor ? { ...visitor, provider: provider as CaptionConfig["provider"],
    ...(provider === "supadata" ? { supadataApiKey: key } : {}) } : null;
}
