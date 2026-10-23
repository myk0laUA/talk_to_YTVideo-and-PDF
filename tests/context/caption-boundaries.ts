import { captionFixture } from "./fixtures.ts";

/** Authored capacity fixtures only; no video, transcript service or semantic claim. */
export function captionBoundary(count = 4097, text = "a") {
  const segments = Array.from({ length: count }, (_, i) => ({ text, startSeconds: i * 1.25, durationSeconds: 0.75 }));
  return { ...captionFixture, segments, fullText: segments.map(s => s.text).join("\n") };
}
export const oversizedCaptions = () => captionBoundary(20_000, "<".repeat(40));
