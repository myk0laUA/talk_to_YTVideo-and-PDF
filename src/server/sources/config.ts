import { parseVisitorConfig } from "../proof/config.ts";
import { parseServerEnvironment, requireDatabaseUrl } from "../env-schema.ts";

export function parseSourceConfig(env: Record<string, string | undefined>) {
  if (env.PDF_INGESTION_ENABLED !== "true") return null;
  try {
    requireDatabaseUrl(parseServerEnvironment(env));
    return parseVisitorConfig(env, env.PDF_INGESTION_LOCAL_HTTP === "true");
  } catch { return null; }
}
