/** Safe display facts only. Source membership does not establish semantic support. */
export type YoutubeEvidenceUnit = Readonly<{
  text: string;
  state: "pending" | "matched" | "unconfirmed" | "incomplete" | "format_error";
  references: readonly Readonly<{ segmentId: string; excerpt: string; startSeconds: number; url: string }>[];
}>;
