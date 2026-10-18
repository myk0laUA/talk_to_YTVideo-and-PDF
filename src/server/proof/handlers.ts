import "server-only";
import { createHash } from "node:crypto";
import { Admission, issuanceLimits, proofLimits } from "./admission.ts";
import type { ProofConfig } from "./config.ts";
import { createVisitor, readVisitor, visitorCookie } from "./visitor.ts";
import { establishProof, isOwnedReady, type ProofStore } from "./source.ts";
import type { Mint } from "./provider.ts";

const reply = (status: number, body: unknown, cookie?: string) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {}) },
});
const failure = (status: number, error: string) => reply(status, { error });

// Stream cap applies even without Content-Length; deadline also bounds slow bodies.
async function readInput(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const input = await Promise.race([
      new Promise<never>((_, reject) => { timer = setTimeout(() => { void reader.cancel().catch(() => {}); reject(new Error("Input timeout")); }, 2000); }),
      (async () => {
        const chunks: Uint8Array[] = []; let size = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 256) { void reader.cancel().catch(() => {}); return null; }
          chunks.push(value);
        }
        const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
      })(),
    ]);
    return input;
  } catch { return null; }
  finally { clearTimeout(timer); reader.releaseLock(); }
}

export function createProofHandlers(deps: { config: () => ProofConfig | null; store: ProofStore; mint: Mint; now?: () => number }) {
  const now = deps.now ?? Date.now;
  const proofAdmission = new Admission(proofLimits);
  const issuanceAdmission = new Admission(issuanceLimits);
  // No verified proxy trust contract exists. All callers share this conservative bucket.
  // Never use client-provided X-Forwarded-For, X-Real-IP, Host or forwarded host.
  const ipBucket = "unverified-network";

  async function handle(request: Request, credential: boolean): Promise<Response> {
    let release: (() => void) | undefined;
    try {
      const config = deps.config();
      if (!config || (credential && (!config.issuanceEnabled || !config.apiKey || !config.model))) return failure(503, "Feature unavailable");
      if (request.method !== "POST") return failure(405, "Method not allowed");
      if (request.headers.get("origin") !== config.origin
        || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))) return failure(403, "Request forbidden");
      const existing = readVisitor(request.headers.get("cookie"), config, now());
      if (credential && !existing) return failure(401, "Visitor required");
      const input = await readInput(request);
      if (!input || (credential
        ? Object.keys(input).length !== 1 || typeof input.sourceId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.sourceId)
        : Object.keys(input).length !== 0)) return failure(400, "Invalid request");
      const visitor = existing ?? createVisitor(config, now());
      release = (credential ? issuanceAdmission : proofAdmission).acquire(visitor.owner, ipBucket, now()) ?? undefined;
      if (!release) return failure(429, "Limit reached");
      if (!credential) {
        const source = await establishProof(deps.store, visitor, now);
        return reply(200, source, visitorCookie(visitor, config, now()));
      }
      const record = await deps.store.get(input.sourceId as string);
      if (!isOwnedReady(record, visitor, now())) return failure(404, "Source unavailable");
      if (request.signal.aborted) return failure(400, "Request cancelled");
      // Distinct domain from database owner marker; never forward the cookie bearer.
      const safetyIdentifier = createHash("sha256").update(`realtime-safety-v1:${visitor.owner}`).digest("hex");
      const result = await deps.mint({ apiKey: config.apiKey!, model: config.model!, safetyIdentifier });
      if (!isOwnedReady(record, visitor, now()) || request.signal.aborted) return failure(404, "Source unavailable");
      return reply(200, { clientSecret: result.clientSecret, expiresAt: result.expiresAt });
    } catch { return failure(503, "Service unavailable"); }
    finally { release?.(); }
  }
  return { proof: (request: Request) => handle(request, false), credential: (request: Request) => handle(request, true) };
}
