// Pure configuration validation; runtime environment access stays in runtime.ts.
export type ProofConfig = {
  origin: string; secure: boolean; cookieSecret: string;
  issuanceEnabled: boolean; textEnabled?: boolean; apiKey?: string; model?: string;
};

export type VisitorConfig = Pick<ProofConfig, "origin" | "secure" | "cookieSecret">;

export function parseVisitorConfig(env: Record<string, string | undefined>, allowLocalHttp = false): VisitorConfig | null {
  if (env.NEXT_PUBLIC_VISITOR_COOKIE_SECRET || env.NEXT_PUBLIC_OPENAI_API_KEY) return null;
  const cookieSecret = env.VISITOR_COOKIE_SECRET ?? "";
  if (!/^[a-f0-9]{64}$/i.test(cookieSecret)) return null;
  try {
    const url = new URL(env.APP_ORIGIN ?? "");
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((!local && url.protocol !== "https:") || url.origin !== env.APP_ORIGIN) return null;
    if (env.NODE_ENV === "production" && local && !allowLocalHttp) return null;
    return { origin: url.origin, secure: url.protocol === "https:", cookieSecret };
  } catch { return null; }
}

export function parseProofConfig(env: Record<string, string | undefined>): ProofConfig | null {
  if (env.PROOF_ENABLED !== "true") return null;
  const visitor = parseVisitorConfig(env);
  if (!visitor) return null;
    const model = env.OPENAI_REALTIME_MODEL?.trim();
    return {
      ...visitor,
      issuanceEnabled: env.REALTIME_ISSUANCE_ENABLED === "true",
      textEnabled: env.TEXT_PROOF_ENABLED === "true",
      apiKey: env.OPENAI_API_KEY?.trim() || undefined,
      model: model && /^[a-zA-Z0-9._-]{1,100}$/.test(model) ? model : undefined,
    };
}
