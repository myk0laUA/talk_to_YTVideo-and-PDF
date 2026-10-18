// Operator-only direct experiment isolation. No environment access or network at import time.
export function directCaptionEnvironment(parent: Record<string, string | undefined>, origin: string, signingSecret: string) {
  return { ...parent, NODE_ENV: "production", NODE_OPTIONS: "", APP_ORIGIN: origin,
    CAPTION_PROOF_ENABLED: "true", CAPTION_PROOF_LOCAL_HTTP: "true", CAPTION_PROOF_PROVIDER: "direct",
    PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false",
    VISITOR_COOKIE_SECRET: signingSecret,
    NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "",
    OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1" };
}
