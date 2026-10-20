import "server-only";
import { PROVIDER_VOICE_POLICY as policy } from "../../shared/priming-provider-policy.ts";
import type { RealtimeCredentialDto } from "../../shared/proof.ts";
import { guardedAwait } from "../context/await.ts";
import { freeze } from "../../shared/priming-manifest.ts";

export const VOICE_SECRET_TTL_SECONDS = 60;
export const VOICE_PROVIDER_DEADLINE_MS = 8000;
export const VOICE_PROVIDER_BODY_BYTES = 32_768;
// Matches 07G's initial barrier. Source data enters only through acknowledged full-source priming.
export const initialVoiceSession = freeze({ type: "realtime", model: policy.model,
  instructions: "Context is loading; do not answer questions.", output_modalities: ["text"],
  max_output_tokens: policy.maxOutputTokens, tools: [], tool_choice: "none", truncation: "disabled",
  audio: { input: { turn_detection: null, transcription: null }, output: { voice: policy.voice } } });

export type VoiceMint = (input: { apiKey: string; safetyIdentifier: string; signal: AbortSignal }) => Promise<RealtimeCredentialDto>;
export function validVoiceCredential(value: unknown, at: number): value is RealtimeCredentialDto {
  if (!value || typeof value !== "object" || !("clientSecret" in value) || !("expiresAt" in value)) return false;
  return typeof value.clientSecret === "string" && /^ek_[A-Za-z0-9_-]{1,500}$/.test(value.clientSecret)
    && typeof value.expiresAt === "number" && Number.isSafeInteger(value.expiresAt)
    && value.expiresAt > Math.floor(at / 1000) && value.expiresAt <= Math.floor(at / 1000) + VOICE_SECRET_TTL_SECONDS + 5;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function safeSession(v: unknown) {
  if (!object(v) || !object(v.audio) || !object(v.audio.input) || !object(v.audio.output)) return false;
  return v.type === "realtime" && v.model === policy.model && JSON.stringify(v.output_modalities) === '["text"]'
    && v.instructions === initialVoiceSession.instructions && v.max_output_tokens === policy.maxOutputTokens
    && JSON.stringify(v.tools) === "[]" && v.tool_choice === "none" && v.truncation === "disabled"
    && v.audio.input.turn_detection === null && v.audio.input.transcription === null && v.audio.output.voice === policy.voice;
}

/** Single attempt; bounded fetch AND body; late/unabortable response bodies are cancelled. Never logs keys/errors. */
export function createVoiceMint(transport: typeof fetch = fetch, now = Date.now, deadlineMs = VOICE_PROVIDER_DEADLINE_MS): VoiceMint {
  return async ({ apiKey, safetyIdentifier, signal }) => {
    const abort = new AbortController(), cancel = () => abort.abort();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const timer = setTimeout(cancel, deadlineMs);
    signal.addEventListener("abort", cancel, { once: true });
    const guard = () => { if (signal.aborted || abort.signal.aborted) throw new Error("Voice provider unavailable"); };
    try {
      if (signal.aborted) cancel(); guard();
      const work = transport("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST", signal: abort.signal, cache: "no-store", redirect: "error",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": safetyIdentifier },
        body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: VOICE_SECRET_TTL_SECONDS }, session: initialVoiceSession }),
      }).then(response => {
        if (abort.signal.aborted) { void response.body?.cancel().catch(() => {}); throw new Error("Voice provider unavailable"); }
        return response;
      });
      const response = await guardedAwait(() => work, abort.signal, guard);
      if (!response.ok || response.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") {
        void response.body?.cancel().catch(() => {}); throw new Error("Voice provider unavailable");
      }
      reader = response.body?.getReader();
      if (!reader) throw new Error("Voice provider unavailable");
      const chunks: Uint8Array[] = []; let size = 0;
      for (;;) {
        const { value, done } = await guardedAwait(() => reader!.read(), abort.signal, guard);
        if (done) break;
        size += value.byteLength;
        if (size > VOICE_PROVIDER_BODY_BYTES) throw new Error("Voice provider unavailable");
        chunks.push(value);
      }
      const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
      if (!object(data) || !safeSession(data.session)) throw new Error("Voice provider unavailable");
      const result = { clientSecret: data.value, expiresAt: data.expires_at };
      guard(); if (!validVoiceCredential(result, now())) throw new Error("Voice provider unavailable");
      return { clientSecret: result.clientSecret, expiresAt: result.expiresAt };
    } catch { throw new Error("Voice provider unavailable"); }
    finally {
      clearTimeout(timer); signal.removeEventListener("abort", cancel); abort.abort();
      if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  };
}
