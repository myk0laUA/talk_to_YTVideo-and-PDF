import "server-only";
import { parseSourceReadConfig } from "../sources/config.ts";
import type { VisitorConfig } from "../proof/config.ts";

export type VoiceConfig = VisitorConfig & { apiKey: string };
/** Independent default-false gate. Neither diagnostic nor text flags grant voice access. */
export function parseVoiceConfig(env: Record<string, string | undefined>): VoiceConfig | null {
  if (env.OWNED_SOURCE_VOICE_ENABLED !== "true") return null;
  const config = parseSourceReadConfig(env), apiKey = env.OPENAI_API_KEY?.trim();
  if (!config || !apiKey || !/^sk-[A-Za-z0-9_-]{10,500}$/.test(apiKey)) return null;
  return { ...config, apiKey };
}
