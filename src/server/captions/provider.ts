import "server-only";
import {
  fetchTranscript, YoutubeTranscriptDisabledError, YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError, YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError, type FetchParams,
} from "youtube-transcript-plus";
import type { CaptionResult, CaptionStage, CaptionTranscript } from "../../shared/captions.ts";
import { matchesCaptionLanguage, normalizeVideo, validLanguage } from "./input.ts";
import { CaptionError } from "./errors.ts";
import { readBounded } from "./bounded-body.ts";
import { canonicalDirectCaptionText } from "./entities.ts";

export const CAPTION_PROVIDER = "youtube-transcript-plus@2.0.3" as const;
export const captionBounds = { deadlineMs: 9000, segments: 20000, characters: 1_000_000,
  watchBytes: 4 * 1024 * 1024, playerBytes: 2 * 1024 * 1024, transcriptBytes: 2 * 1024 * 1024 } as const;
export type CaptionProvider = (input: { videoId: string; language?: string; signal: AbortSignal }) => Promise<CaptionResult>;

export function normalizeSegments(raw: unknown, videoId: string): CaptionTranscript {
  if (!Array.isArray(raw) || raw.length === 0) throw new CaptionError("no_captions", "Extractor returned no caption segments");
  if (raw.length > captionBounds.segments) throw new CaptionError("too_large", "Transcript exceeds 20000 segments");
  let characters = raw.length - 1;
  let language: string | undefined;
  const segments = raw.map(value => {
    if (!value || typeof value.text !== "string" || !value.text.trim()
      || typeof value.offset !== "number" || !Number.isFinite(value.offset) || value.offset < 0
      || typeof value.duration !== "number" || !Number.isFinite(value.duration) || value.duration < 0
      || !Number.isFinite(value.offset + value.duration) || !validLanguage(value.lang)
      || (language !== undefined && language !== value.lang)) throw new CaptionError("malformed", "Extractor returned invalid caption segments");
    language = value.lang;
    characters += value.text.length;
    if (characters > captionBounds.characters) throw new CaptionError("too_large", "Transcript exceeds 1000000 text characters");
    // Package 2.0.3 offset/duration are already seconds. Never sort, trim or truncate text.
    return { text: value.text, startSeconds: value.offset, durationSeconds: value.duration };
  });
  return { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`, language: language!,
    provider: CAPTION_PROVIDER, segments, fullText: segments.map(s => s.text).join("\n") };
}

// The release's regex parser silently skips unsupported XML nodes. Reject partial parsing.
function checkTranscriptXml(text: string): string[] {
  const wrapper = /^\s*(?:<\?xml[^?]*\?>\s*)?<transcript\b[^>]*>([\s\S]*)<\/transcript>\s*$/.exec(text);
  if (!text.trim()) throw new CaptionError("no_captions", "Caption endpoint returned an empty body", "transcript");
  if (!wrapper) throw new CaptionError("malformed", "Caption XML format is unsupported", "transcript");
  const texts: string[] = [];
  const remainder = wrapper[1].replace(/<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g, (_, start: string, duration: string, content: string) => {
    texts.push(content);
    if (!start.trim() || !duration.trim() || !Number.isFinite(Number(start)) || Number(start) < 0
      || !Number.isFinite(Number(duration)) || Number(duration) < 0) throw new CaptionError("malformed", "Caption XML timing is invalid", "transcript");
    return "";
  });
  if (remainder.trim()) throw new CaptionError("malformed", "Caption XML contains unsupported or malformed segments", "transcript");
  if (texts.length > captionBounds.segments) throw new CaptionError("too_large", "Transcript exceeds 20000 segments", "transcript");
  return texts;
}

export function createDirectCaptionProvider(options: { fetch?: typeof fetch; deadlineMs?: number } = {}): CaptionProvider {
  const network = options.fetch ?? fetch;
  return async input => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(input.videoId) || !normalizeVideo(input.videoId)
      || (input.language !== undefined && !validLanguage(input.language))) {
      return { ok: false, error: { code: "invalid_input", message: "Invalid video ID or language" } };
    }
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), options.deadlineMs ?? captionBounds.deadlineMs);
    const signal = AbortSignal.any([input.signal, deadline.signal]);
    let stage: CaptionStage = "watch";
    let automatic = false;
    let xmlTexts: string[] | undefined;
    try {
      const hook = (step: CaptionStage, maxBytes: number) => async (params: FetchParams) => {
        stage = step;
        signal.throwIfAborted();
        const url = new URL(params.url);
        if (url.protocol !== "https:" || url.username || url.password || url.port
          || !["www.youtube.com", "youtube.com"].includes(url.hostname)
          || url.pathname !== ({ watch: "/watch", player: "/youtubei/v1/player", transcript: "/api/timedtext" }[step])) {
          throw new CaptionError("blocked", "Extractor requested an unsupported upstream destination", step);
        }
        const response = await network(url, { method: params.method ?? "GET", body: params.body,
          headers: { ...params.headers, ...(input.language ? { "Accept-Language": input.language } : {}),
            ...(params.userAgent ? { "User-Agent": params.userAgent } : {}) },
          signal, redirect: "manual", cache: "no-store", credentials: "omit" });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          const code = response.status === 429 ? "rate_limited" : response.status === 401 || response.status === 403
            || (response.status >= 300 && response.status < 400) ? "blocked" : [404, 410].includes(response.status) ? "unavailable" : "upstream_failure";
          throw new CaptionError(code, "YouTube returned a non-success HTTP status", step, response.status);
        }
        const declared = response.headers.get("content-length");
        if (declared && Number(declared) > maxBytes) {
          void response.body?.cancel().catch(() => {});
          throw new CaptionError("too_large", "Response exceeds the proof byte limit", step);
        }
        let text = await readBounded(response.body, maxBytes, signal);
        if (step === "watch" && !/"INNERTUBE_API_KEY":"([^"]+)"|INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/.test(text)
          && !text.includes('class="g-recaptcha"')) throw new CaptionError("unavailable", "Watch page did not expose the extractor bootstrap key", step);
        if (step === "player") {
          let player;
          try { player = JSON.parse(text); } catch { throw new CaptionError("malformed", "Player response was not valid JSON", step); }
          const status = player?.playabilityStatus?.status;
          if (status && status !== "OK") throw new CaptionError(status === "LOGIN_REQUIRED" ? "blocked" : "unavailable",
            status === "LOGIN_REQUIRED" ? "Player requires sign-in; public extraction stopped" : "Player reports the video is not playable", step);
          const tracklist = player?.captions?.playerCaptionsTracklistRenderer ?? player?.playerCaptionsTracklistRenderer;
          const tracks = tracklist?.captionTracks;
          // Select from this already-bounded player response: no extra language-list
          // request/retry. The package then receives only the actual selected track.
          const candidates = Array.isArray(tracks) ? tracks.filter(t => validLanguage(t?.languageCode)
            && matchesCaptionLanguage(t.languageCode, input.language)) : [];
          const exact = candidates.find(t => t.languageCode.toLowerCase() === input.language?.toLowerCase());
          const selected = input.language ? exact ?? candidates.sort((a, b) => {
            const x = a.languageCode.toLowerCase(), y = b.languageCode.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
          })[0] : candidates[0];
          if (!selected) throw new CaptionError("no_captions", "Captions unavailable for the requested language", step);
          automatic = selected?.kind === "asr";
          tracklist.captionTracks = [selected];
          text = JSON.stringify(player);
        }
        if (step === "transcript") xmlTexts = checkTranscriptXml(text);
        signal.throwIfAborted();
        return new Response(text, { status: 200 });
      };
      // Cache is opt-in in 2.0.3. No cache object, metadata request or language-list request.
      // Language selection occurs in the player hook. Omitting the package's exact-only
      // selector preserves the regional tag it returns instead of relabeling it as en.
      const raw = await fetchTranscript(input.videoId, { signal, retries: 0,
        videoDetails: false, videoFetch: hook("watch", captionBounds.watchBytes),
        playerFetch: hook("player", captionBounds.playerBytes), transcriptFetch: hook("transcript", captionBounds.transcriptBytes) });
      signal.throwIfAborted();
      if (!xmlTexts || raw.length !== xmlTexts.length) throw new CaptionError("malformed", "Caption parser segment count mismatch", "transcript");
      const texts = xmlTexts;
      // Package 2.0.3 decodes only a short allowlist once. Use the validated raw
      // XML text to make depth independent of that lossy pass, retaining its
      // timing/language parsing. Final size validation follows canonicalization.
      const transcript = normalizeSegments(raw.map((segment, i) => ({ ...segment,
        text: canonicalDirectCaptionText(texts[i]) })), input.videoId);
      if (automatic) transcript.trackType = "automatic";
      return { ok: true, transcript };
    } catch (error) {
      if (input.signal.aborted) return { ok: false, error: { code: "cancelled", message: "Caption request cancelled", stage } };
      if (deadline.signal.aborted) return { ok: false, error: { code: "timeout", message: "YouTube exceeded the total upstream deadline", stage } };
      if (error instanceof CaptionError) return { ok: false, error: { ...error.failure, stage: error.failure.stage ?? stage } };
      const code = error instanceof YoutubeTranscriptTooManyRequestError ? "rate_limited"
        : error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError
          || error instanceof YoutubeTranscriptNotAvailableLanguageError ? "no_captions"
          : error instanceof YoutubeTranscriptVideoUnavailableError ? "unavailable" : "upstream_failure";
      return { ok: false, error: { code, message: code === "no_captions" ? "Extractor could not retrieve captions for the selected language"
        : code === "rate_limited" ? "YouTube presented a rate-limit or bot challenge" : "Direct caption extraction failed", stage } };
    } finally { clearTimeout(timer); }
  };
}
