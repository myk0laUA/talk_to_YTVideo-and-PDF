// Public data only. Seconds throughout; fullText is segments.map(s => s.text).join("\n").
export type CaptionSegment = { text: string; startSeconds: number; durationSeconds: number };
export type CaptionTranscript = {
  videoId: string; canonicalUrl: string; language: string; provider: "youtube-transcript-plus@2.0.3";
  segments: CaptionSegment[]; fullText: string;
  // Omitted unless the selected upstream track explicitly identifies automatic captions.
  trackType?: "automatic";
};
export type CaptionFailureCode = "disabled" | "forbidden" | "invalid_request" | "invalid_input" | "limit_reached"
  | "unavailable" | "no_captions" | "rate_limited" | "blocked" | "timeout" | "cancelled"
  | "too_large" | "malformed" | "upstream_failure" | "internal";
export type CaptionStage = "watch" | "player" | "transcript";
export type CaptionFailure = {
  code: CaptionFailureCode; message: string; stage?: CaptionStage; upstreamStatus?: number;
};
export type CaptionResult = { ok: true; transcript: CaptionTranscript } | { ok: false; error: CaptionFailure };
export type CaptionProofInput = { video: string; language?: string };
