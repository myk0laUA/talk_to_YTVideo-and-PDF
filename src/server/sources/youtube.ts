import "server-only";
import type { CaptionConfig } from "../captions/config.ts";
import type { CaptionProvider } from "../captions/provider.ts";
import { normalizeVideo, validLanguage } from "../captions/input.ts";
import { readBounded } from "../captions/bounded-body.ts";
import { Admission } from "../proof/admission.ts";
import { captionLimits } from "../captions/admission.ts";
import { createVisitor, readVisitor, visitorCookie } from "../proof/visitor.ts";
import type { SourceFailureCode, SourceResult } from "../../shared/source.ts";
import { captionRecord, requireLive, requireOwned, SourceError, sourceDto, type SourceRepository } from "./service.ts";

const errors: Record<SourceFailureCode, [number, string]> = {
  disabled: [503, "YouTube import unavailable"], forbidden: [403, "Request forbidden"],
  visitor_required: [401, "Visitor cookie required; retry once with the issued cookie"],
  invalid_request: [400, "Send only video and optional language as JSON within 512 bytes and 2 seconds"],
  invalid_input: [400, "Invalid YouTube URL, video ID or language"],
  limit_reached: [429, "Caption service busy or request limit reached; try again later"],
  unavailable: [422, "Video unavailable for caption retrieval"], storage_unavailable: [503, "Source storage unavailable; try again later"],
  replacement_conflict: [409, "Another import completed; replace the source deliberately when ready"],
  no_captions: [422, "No native captions available for this video or language"],
  rate_limited: [429, "Caption provider rate limit reached; try again later"],
  blocked: [502, "Caption provider could not access this video"],
  timeout: [504, "Caption import deadline exceeded"], cancelled: [408, "Caption import cancelled"],
  too_large: [413, "Captions exceed supported size"], malformed: [502, "Caption provider returned invalid or incomplete captions"],
  upstream_failure: [502, "Caption retrieval failed"], internal: [500, "Caption import failed"],
  quota_exhausted: [503, "Caption provider quota exhausted; operator action required"],
  provider_limited: [503, "Caption provider limit requires operator review"],
  wrong_type: [415, "Expected JSON"], encrypted: [422, "Unsupported source"], no_text: [422, "Empty source"],
  extraction_limit: [422, "Source exceeds extraction limits"],
};
const reply = (status: number, value: SourceResult, cookie?: string) => Response.json(value, { status, headers: {
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {}),
} });
const fail = (code: SourceFailureCode, cookie?: string) => reply(errors[code][0], { ok: false, error: { code, message: errors[code][1] } }, cookie);

export function createYoutubeSourceHandler(deps: { config: () => CaptionConfig | null; repository: SourceRepository;
  provider: (input: Parameters<CaptionProvider>[0], config: CaptionConfig) => ReturnType<CaptionProvider>;
  admission?: Admission; now?: () => number }) {
  const admission = deps.admission ?? new Admission(captionLimits);
  const now = deps.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      const config = deps.config();
      if (!config) return fail("disabled");
      if (request.method !== "POST") return reply(405, { ok: false, error: { code: "invalid_request", message: "Method not allowed" } });
      if (request.headers.get("origin") !== config.origin || ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))) return fail("forbidden");
      const visitor = readVisitor(request.headers.get("cookie"), config, now());
      if (!visitor) return fail("visitor_required", visitorCookie(createVisitor(config, now()), config, now()));
      const guard = () => requireLive(visitor, request.signal, now());
      guard();
      release = admission.acquire(visitor.owner, "unverified-network", now()) ?? undefined;
      if (!release) return fail("limit_reached");
      if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") return fail("invalid_request");
      const length = request.headers.get("content-length");
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > 512)) return fail("invalid_request");
      const deadline = new AbortController();
      const timer = setTimeout(() => deadline.abort(), 2000);
      let value: unknown;
      try { value = JSON.parse(await readBounded(request.body, 512, AbortSignal.any([request.signal, deadline.signal]))); }
      catch { guard(); return fail("invalid_request"); }
      finally { clearTimeout(timer); }
      guard();
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k => k !== "video" && k !== "language")) return fail("invalid_request");
      const fields = value as Record<string, unknown>;
      const video = normalizeVideo(fields.video);
      if (!video || ("language" in fields && !validLanguage(fields.language))) return fail("invalid_input");
      const result = await deps.provider({ videoId: video.videoId, ...(fields.language ? { language: fields.language as string } : {}), signal: request.signal }, config);
      guard();
      if (!result.ok) return fail(result.error.code);
      let candidate;
      try {
        candidate = captionRecord(result.transcript, visitor);
        if (candidate.canonicalOrigin !== video.canonicalUrl || candidate.provider !== (config.provider === "direct" ? "youtube-transcript-plus@2.0.3" : "supadata")) return fail("malformed");
      } catch { return fail("malformed"); }
      guard();
      const saved = await deps.repository.replace(candidate, guard);
      guard(); requireOwned(saved, visitor, now());
      if (saved.id !== candidate.id) throw new SourceError("storage_unavailable");
      return reply(201, { ok: true, source: sourceDto(saved) });
    } catch (error) { return fail(error instanceof SourceError ? error.code : "internal"); }
    finally { release?.(); }
  };
}
