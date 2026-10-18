import "server-only";
import type { CaptionFailureCode, CaptionResult } from "../../shared/captions.ts";
import type { VisitorConfig } from "../proof/config.ts";
import { Admission } from "../proof/admission.ts";
import { CaptionAdmission, captionLimits } from "./admission.ts";
import { createVisitor, readVisitor, visitorCookie } from "../proof/visitor.ts";
import type { CaptionProvider } from "./provider.ts";
import { normalizeVideo, validLanguage } from "./input.ts";
import { readBounded } from "./bounded-body.ts";

const reply = (status: number, result: CaptionResult, cookie?: string) => Response.json(result, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    ...(cookie ? { "Set-Cookie": cookie } : {}) },
});
const fail = (status: number, code: CaptionFailureCode, message: string) => reply(status, { ok: false, error: { code, message } });
const statuses: Record<CaptionFailureCode, number> = { disabled: 503, forbidden: 403, invalid_request: 400,
  invalid_input: 400, limit_reached: 429, unavailable: 422, no_captions: 422, rate_limited: 429,
  blocked: 502, timeout: 504, cancelled: 408, too_large: 413, malformed: 502, upstream_failure: 502, internal: 500,
  quota_exhausted: 503, provider_limited: 503 };

export function createCaptionHandler<Config extends VisitorConfig>(deps: {
  config: () => Config | null;
  provider: (input: Parameters<CaptionProvider>[0], config: Config) => ReturnType<CaptionProvider>;
  now?: () => number;
  admission?: Admission;
}) {
  const now = deps.now ?? Date.now;
  // All IPs share one untrusted-network bucket; forwarding headers cannot bypass it.
  const admission = deps.admission ?? new CaptionAdmission(captionLimits);
  return async (request: Request): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      const config = deps.config();
      if (!config) return fail(503, "disabled", "Feature unavailable");
      if (request.method !== "POST") return fail(405, "invalid_request", "Method not allowed");
      if (request.headers.get("origin") !== config.origin || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))) {
        return fail(403, "forbidden", "Request forbidden");
      }
      const visitor = readVisitor(request.headers.get("cookie"), config, now()) ?? createVisitor(config, now());
      // Includes slow/invalid bodies in bounded admission. No upstream work until validation.
      release = admission.acquire(visitor.owner, "unverified-network", now()) ?? undefined;
      if (!release) return fail(429, "limit_reached", "Limit reached");
      if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") return fail(400, "invalid_request", "Expected a small JSON object");
      const bodyDeadline = new AbortController();
      const timer = setTimeout(() => bodyDeadline.abort(), 2000);
      let input: unknown;
      try {
        input = JSON.parse(await readBounded(request.body, 512, AbortSignal.any([request.signal, bodyDeadline.signal])));
      } catch { return fail(400, "invalid_request", "Expected a JSON object within 512 bytes and 2 seconds"); }
      finally { clearTimeout(timer); }
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(k => k !== "video" && k !== "language")) {
        return fail(400, "invalid_request", "Unsupported request fields");
      }
      const fields = input as Record<string, unknown>;
      const video = normalizeVideo(fields.video);
      if (!video || ("language" in fields && !validLanguage(fields.language))) return fail(400, "invalid_input", "Invalid YouTube URL, video ID or language");
      if (request.signal.aborted) return fail(408, "cancelled", "Caption request cancelled");
      const result = await deps.provider({ videoId: video.videoId, ...(fields.language ? { language: fields.language as string } : {}), signal: request.signal }, config);
      if (request.signal.aborted) return fail(408, "cancelled", "Caption request cancelled");
      // Signed cookie is for admission only; no Source, source ID, credential or owner DTO.
      return reply(result.ok ? 200 : statuses[result.error.code], result, visitorCookie(visitor, config, now()));
    } catch { return fail(500, "internal", "Caption proof failed"); }
    finally { release?.(); }
  };
}
