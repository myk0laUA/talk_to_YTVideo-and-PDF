import "server-only";
import { parseSourceReadConfig } from "../sources/config.ts";
import type { VisitorConfig } from "../proof/config.ts";
import type { TextAvailability } from "../../shared/text-relay.ts";

export type TextConfig = VisitorConfig & { apiKey: string };
/** Exactly one default-false gate. Owned YouTube reads do not enable caption acquisition. */
export function parseTextConfig(env: Record<string, string | undefined>): TextConfig | null {
  if (env.OWNED_SOURCE_TEXT_ENABLED !== "true") return null;
  const config = parseSourceReadConfig(env), apiKey = env.OPENAI_API_KEY?.trim();
  if (!config || !apiKey || !/^sk-[A-Za-z0-9_-]{10,500}$/.test(apiKey)) return null;
  return { ...config, apiKey };
}
export function textAvailability(env: Record<string, string | undefined>): TextAvailability {
  return { available: parseTextConfig(env) !== null };
}
