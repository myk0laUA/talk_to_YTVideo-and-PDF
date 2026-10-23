import "server-only";
import { captionCacheKey, type CaptionCache } from "../captions/cache.ts";
import type { YoutubeSourceConfig } from "./config.ts";
import type { CaptionSelectionConfig } from "../captions/config.ts";
import type { CaptionProvider } from "../captions/provider.ts";
import { isEnglish, matchesCaptionLanguage, normalizeVideo, validLanguage } from "../captions/input.ts";
import { readBounded } from "../captions/bounded-body.ts";
import { Admission } from "../proof/admission.ts";
import { CaptionAdmission, captionLimits } from "../captions/admission.ts";
import { sourceAdmissionFailure } from "./admission.ts";
import { CaptionCoordinator, captionJobKey } from "../captions/coordinator.ts";
import { validatedTranscript } from "../captions/validated.ts";
import { captionBounds } from "../captions/provider.ts";
import { supadataBounds } from "../captions/supadata.ts";
import { automaticBounds } from "../captions/automatic.ts";
import { createVisitor, readVisitor, visitorCookie } from "../proof/visitor.ts";
import type { SourceFailureCode, SourceResult } from "../../shared/source.ts";
import { captionRecord, requireLive, requireOwned, SourceError, sourceDto, type SourceRepository } from "./service.ts";

const errors: Record<SourceFailureCode, [number, string]> = {
  disabled: [503, "YouTube import unavailable"], forbidden: [403, "Request forbidden"],
  visitor_required: [401, "Visitor cookie required; retry once with the issued cookie"],
  invalid_request: [400, "Send only video and optional language as JSON within 512 bytes and 2 seconds"],
  invalid_input: [400, "Use a valid YouTube URL and English captions (en or an English regional tag)."],
  limit_reached: [429, "Caption service busy or request limit reached; try again later"],
  unavailable: [422, "Video unavailable for caption retrieval"], storage_unavailable: [503, "Source storage unavailable; try again later"],
  replacement_conflict: [409, "Another import completed; replace the source deliberately when ready"],
  no_captions: [422, "English captions are unavailable for this video. Choose a video with English captions."],
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

export function createYoutubeSourceHandler(deps: { config: () => YoutubeSourceConfig | null; repository: SourceRepository; cache: CaptionCache;
  provider: (input: Parameters<CaptionProvider>[0], config: CaptionSelectionConfig) => ReturnType<CaptionProvider>;
  admission?: Admission; coordinator?: CaptionCoordinator; now?: () => number }) {
  const admission = deps.admission ?? new CaptionAdmission(captionLimits);
  const coordinator = deps.coordinator ?? new CaptionCoordinator();
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
      // Next may bundle the proof route separately; do not rely on cross-bundle instanceof.
      const sharedAdmission = "attemptImport" in admission ? admission as CaptionAdmission : null;
      const attempt = sharedAdmission ? sharedAdmission.attemptImport(visitor.owner, "unverified-network", now())
        : admission.attempt(visitor.owner, "unverified-network", now());
      if ("rejection" in attempt) return sourceAdmissionFailure(attempt.rejection);
      const lease = "lease" in attempt ? attempt.lease : undefined;
      release = "lease" in attempt ? attempt.lease.release : attempt.release;
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
      if (fields.language !== undefined && !isEnglish(fields.language)) return fail("invalid_input");
      const language = (fields.language as string | undefined) ?? "en";
      const key = captionCacheKey(video.videoId, language);
      const jobKey = captionJobKey(key, config);
      if (lease && !lease.bind(config.cacheBypass ? Symbol() : jobKey)) return sourceAdmissionFailure({ reason: "busy" });
      const work = async (signal: AbortSignal) => {
        const live = () => { if (signal.aborted) throw signal.reason instanceof SourceError ? signal.reason : new SourceError("cancelled"); };
        let transcript = config.cacheBypass ? null : await deps.cache.get(key, new Date(now()));
        live();
        const hit = transcript !== null;
        if (!transcript) {
          const result = await deps.provider({ videoId: video.videoId, ...(language ? { language } : {}), signal }, config);
          live();
          if (!result.ok) throw new SourceError(result.error.code);
          transcript = result.transcript;
        }
        try {
          transcript = validatedTranscript(transcript);
          if (transcript.canonicalUrl !== video.canonicalUrl
            || !matchesCaptionLanguage(transcript.language, language)
            || (!hit && config.provider !== "auto" && transcript.provider !== (config.provider === "direct" ? "youtube-transcript-plus@2.0.3" : "supadata"))) throw new Error();
        } catch { throw new SourceError("malformed"); }
        live();
        if (!hit && !config.cacheBypass) await deps.cache.put(key, transcript, new Date(now()));
        live();
        // The registry holds public data only. Neither a caller nor an adapter can mutate it.
        for (const segment of transcript.segments) Object.freeze(segment);
        Object.freeze(transcript.segments);
        return Object.freeze(transcript);
      };
      // Operator bypass is structurally uncoalesced, just like the proof handler.
      const budget = config.provider === "direct" ? captionBounds.deadlineMs : supadataBounds.deadlineMs;
      const transcript = config.cacheBypass
        ? config.provider === "auto"
          ? await new CaptionCoordinator().run(jobKey, request.signal, automaticBounds.deadlineMs, work)
          : await work(request.signal)
        : await coordinator.run(jobKey, request.signal, budget, work);
      guard();
      const candidate = captionRecord(transcript, visitor);
      const saved = await deps.repository.replace(candidate, guard);
      guard(); requireOwned(saved, visitor, now());
      if (saved.id !== candidate.id) throw new SourceError("storage_unavailable");
      return reply(201, { ok: true, source: sourceDto(saved) });
    } catch (error) { return fail(error instanceof SourceError ? error.code : "internal"); }
    finally { release?.(); }
  };
}
