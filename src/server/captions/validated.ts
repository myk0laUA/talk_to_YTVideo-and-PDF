import "server-only";
import type { CaptionTranscript } from "../../shared/captions.ts";
import { normalizeVideo, validLanguage } from "./input.ts";
import { captionBounds } from "./provider.ts";

export function validatedTranscript(raw: unknown): CaptionTranscript {
  const invalid = () => { throw new Error("Invalid normalized captions"); };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid();
  const value = raw as Record<string, unknown>;
  const video = normalizeVideo(value.videoId);
  if (!video || value.videoId !== video.videoId || value.canonicalUrl !== video.canonicalUrl
    || !validLanguage(value.language) || (value.provider !== "youtube-transcript-plus@2.0.3" && value.provider !== "supadata")
    || (value.trackType !== undefined && value.trackType !== "automatic")
    || !Array.isArray(value.segments) || value.segments.length === 0 || value.segments.length > captionBounds.segments) return invalid();
  let characters = value.segments.length - 1;
  const segments = value.segments.map(s => {
    if (!s || typeof s !== "object" || Array.isArray(s) || typeof s.text !== "string" || !s.text.trim()
      || typeof s.startSeconds !== "number" || !Number.isFinite(s.startSeconds) || s.startSeconds < 0
      || typeof s.durationSeconds !== "number" || !Number.isFinite(s.durationSeconds) || s.durationSeconds < 0
      || !Number.isFinite(s.startSeconds + s.durationSeconds)) return invalid();
    characters += s.text.length;
    if (characters > captionBounds.characters) return invalid();
    return { text: s.text, startSeconds: s.startSeconds, durationSeconds: s.durationSeconds };
  });
  const fullText = segments.map(s => s.text).join("\n");
  if (fullText !== value.fullText) return invalid();
  return { ...video, language: value.language, provider: value.provider as CaptionTranscript["provider"], segments, fullText,
    ...(value.trackType === "automatic" ? { trackType: "automatic" as const } : {}) };
}
