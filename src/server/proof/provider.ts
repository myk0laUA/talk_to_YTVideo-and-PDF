import "server-only";
import type { RealtimeCredentialDto } from "../../shared/proof.ts";
import { PROOF_TEXT } from "./source.ts";

export const CLIENT_SECRET_TTL_SECONDS = 60;
export const PROVIDER_DEADLINE_MS = 8000;
export type MintInput = { apiKey: string; model: string; safetyIdentifier: string };
export type Mint = (input: MintInput) => Promise<RealtimeCredentialDto>;

// Injectable transport; no SDK retries and no upstream body/error logging.
export function createMint(transport: typeof fetch = fetch, now = Date.now, deadlineMs = PROVIDER_DEADLINE_MS): Mint {
  return async ({ apiKey, model, safetyIdentifier }) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Provider unavailable")); }, deadlineMs);
      });
      return await Promise.race([timeout, (async () => {
        const response = await transport("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST", signal: controller.signal, cache: "no-store", redirect: "error",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": safetyIdentifier },
          body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: CLIENT_SECRET_TTL_SECONDS },
            session: { type: "realtime", model, max_output_tokens: 256,
              output_modalities: ["audio"],
              audio: { input: { transcription: { model: "gpt-4o-mini-transcribe" },
                turn_detection: { type: "server_vad", create_response: true, interrupt_response: true } },
                output: { voice: "marin" } },
              instructions: `Answer briefly using only this synthetic proof source: ${PROOF_TEXT}` } }),
        });
        if (!response.ok) { await response.body?.cancel(); throw new Error("Provider unavailable"); }
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("value" in data) || !("expires_at" in data)
          || typeof data.value !== "string" || !/^ek_[A-Za-z0-9_-]{1,500}$/.test(data.value)
          || typeof data.expires_at !== "number" || !Number.isInteger(data.expires_at)
          || data.expires_at <= Math.floor(now() / 1000) || data.expires_at > Math.floor(now() / 1000) + 65) {
          throw new Error("Provider unavailable");
        }
        return { clientSecret: data.value, expiresAt: data.expires_at };
      })()]);
    } catch { throw new Error("Provider unavailable"); }
    finally { clearTimeout(timer); }
  };
}
