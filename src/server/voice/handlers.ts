import "server-only";
import type { VoiceConfig } from "./config.ts";
import { VoiceError, type VoiceRegistry } from "./registry.ts";
import { readVisitor } from "../proof/visitor.ts";
import { Admission } from "../proof/admission.ts";
import { guardedAwait } from "../context/await.ts";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
export const voiceMethodNotAllowed = () => reply(405, { error: "Method not allowed" });
export const voiceUuid = (v: unknown): v is string => typeof v === "string"
  && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);

async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") throw new VoiceError(400);
  const reader = request.body?.getReader(); if (!reader) throw new VoiceError(400);
  const abort = new AbortController(), cancel = () => abort.abort(), timer = setTimeout(cancel, 2000);
  request.signal.addEventListener("abort", cancel, { once: true });
  const guard = () => { if (abort.signal.aborted || request.signal.aborted) throw new VoiceError(400); };
  try {
    guard(); const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await guardedAwait(() => reader.read(), abort.signal, guard);
      if (done) break;
      size += value.byteLength; if (size > 512) throw new VoiceError(400);
      chunks.push(value);
    }
    const input: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VoiceError(400);
    return input as Record<string, unknown>;
  } catch { throw new VoiceError(400); }
  finally {
    clearTimeout(timer); request.signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {}); reader.releaseLock();
  }
}

export function createVoiceHandlers(deps: { config: () => VoiceConfig | null; registry: VoiceRegistry; now?: () => number }) {
  const now = deps.now ?? Date.now;
  // Bounds body readers/invalid commands separately from preparation and issuance.
  const commands = new Admission({ visitor: 30, ip: 100, global: 100, lifetime: 500, windowMs: 3600_000, concurrent: 4 });
  // Stop must be able to cancel a command already holding this owner's command
  // slot. A separate smaller bounded lane avoids admitting parallel issuance.
  const cancellations = new Admission({ visitor: 12, ip: 40, global: 40, lifetime: 100, windowMs: 3600_000, concurrent: 4 });
  async function handle(request: Request, operation: "prepare" | "credential" | "cancel") {
    let release: (() => void) | undefined;
    try {
      const config = deps.config(); if (!config) return reply(503, { error: "Voice preparation unavailable" });
      if (request.method !== "POST") return voiceMethodNotAllowed();
      if (new URL(request.url).search || request.headers.get("origin") !== config.origin
        || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))) throw new VoiceError(403);
      const cookie = request.headers.get("cookie"), visitor = readVisitor(cookie, config, now());
      if (!visitor) throw new VoiceError(401);
      const freshVisitor = () => {
        const current = deps.config();
        if (!current || JSON.stringify(current) !== JSON.stringify(config) || request.signal.aborted
          || readVisitor(request.headers.get("cookie"), current, now())?.owner !== visitor.owner) throw new VoiceError();
      };
      release = (operation === "cancel" ? cancellations : commands).acquire(visitor.owner, "unverified-network", now()) ?? undefined;
      if (!release) throw new VoiceError(429);
      const input = await body(request); freshVisitor();
      if (Object.keys(input).sort().join(",") !== (operation === "credential" ? "preparationId,requestId,sourceId" : "requestId,sourceId")
        || !voiceUuid(input.sourceId) || !voiceUuid(input.requestId)) throw new VoiceError(400);
      if (operation === "cancel") {
        deps.registry.cancel(visitor, input.sourceId, input.requestId, freshVisitor);
        return reply(200, { cancelled: true }); // Identical for absent/foreign/already consumed work.
      }
      if (operation === "prepare") return reply(201, await deps.registry.prepare(visitor, input.sourceId, input.requestId, request.signal, freshVisitor));
      if (typeof input.preparationId !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(input.preparationId)) throw new VoiceError(400);
      return reply(200, await deps.registry.credential(visitor, input.sourceId, input.requestId, input.preparationId,
        request.signal, freshVisitor, config.apiKey));
    } catch (error) {
      const status = error instanceof VoiceError ? error.status : 503;
      return reply(status, { error: status === 429 ? "Voice preparation limit reached" : "Voice preparation unavailable" });
    } finally { release?.(); }
  }
  return { prepare: (r: Request) => handle(r, "prepare"), credential: (r: Request) => handle(r, "credential"), cancel: (r: Request) => handle(r, "cancel") };
}
