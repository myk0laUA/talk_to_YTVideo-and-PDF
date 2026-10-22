/** Safe display facts only. Source membership does not establish semantic support. */
export type YoutubeEvidenceUnit = Readonly<{
  /** Original marker-group offsets in unchanged answer, not inferred claim boundaries. */
  start: number;
  end: number;
  state: "pending" | "source_matched" | "unconfirmed" | "incomplete";
  reason?: "missing" | "malformed" | "unknown_id" | "long_excerpt" | "invalid_source" | "bounds";
  references: readonly Readonly<{ segmentId: string; excerpt: string; startSeconds: number; url: string }>[];
}>;
