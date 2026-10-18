import { parseVisitorConfig } from "../proof/config.ts";
import { parseServerEnvironment, requireDatabaseUrl } from "../env-schema.ts";
import { validSupadataKey, type CaptionSelectionConfig } from "../captions/config.ts";

export type YoutubeSourceConfig = CaptionSelectionConfig & { cacheBypass?: boolean };

export function parseSourceConfig(env: Record<string, string | undefined>) {
  if (env.PDF_INGESTION_ENABLED !== "true") return null;
  try {
    requireDatabaseUrl(parseServerEnvironment(env));
    return parseVisitorConfig(env, env.PDF_INGESTION_LOCAL_HTTP === "true");
  } catch { return null; }
}

export function parseYoutubeSourceConfig(env: Record<string, string | undefined>): YoutubeSourceConfig | null {
  if (env.YOUTUBE_INGESTION_ENABLED !== "true" || env.NEXT_PUBLIC_SUPADATA_API_KEY) return null;
  const provider = env.YOUTUBE_INGESTION_PROVIDER;
  if (provider !== "direct" && provider !== "supadata" && provider !== "auto") return null;
  const key = env.SUPADATA_API_KEY?.trim();
  if (provider !== "direct" && !validSupadataKey(key)) return null;
  try {
    requireDatabaseUrl(parseServerEnvironment(env));
    const visitor = parseVisitorConfig(env, env.YOUTUBE_INGESTION_LOCAL_HTTP === "true");
    return visitor ? { ...visitor, provider, ...(provider !== "direct" ? { supadataApiKey: key } : {}),
      ...(provider === "auto" ? { directFirst: env.YOUTUBE_AUTO_DIRECT_FIRST === "true" } : {}),
      ...(env.YOUTUBE_CAPTION_CACHE_BYPASS === "true" ? { cacheBypass: true } : {}) } : null;
  } catch { return null; }
}

// Either fully configured ingestion permits owned reads/deletes of BOTH genuine kinds.
// Turning both off closes reads. Adapter credentials never enter the returned config.
export function parseSourceReadConfig(env: Record<string, string | undefined>) {
  const config = parseSourceConfig(env) ?? parseYoutubeSourceConfig(env);
  return config ? { origin: config.origin, secure: config.secure, cookieSecret: config.cookieSecret } : null;
}
