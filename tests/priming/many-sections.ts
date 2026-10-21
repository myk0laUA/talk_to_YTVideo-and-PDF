import { contextVariants } from "../../src/server/context/document.ts";
import { encodeManifest } from "../../src/shared/priming-manifest.ts";
import { PROVIDER_TEXT_POLICY } from "../../src/shared/priming-provider-policy.ts";

/** Authored data, not third-party captions. Exceeds the native 256 KB burst guard. */
export function manySections(runId = "text_1", count = 428) {
  const sections = Array.from({ length: count }, (_, i) => ({ id: `segment-${i + 1}`,
    text: `Authored delivery record ${i + 1}: preserve the ordered blue lantern inventory and every timestamp.`,
    startSeconds: i * 2.125, durationSeconds: 2.125 }));
  const variant = contextVariants({ contextVersion: "source-context-v1", promptVersion: "source-grounding-v1",
    source: { id: "12345678-1234-4234-8234-123456789abc", kind: "YOUTUBE", expiresAt: "2030-01-01T01:00:00.000Z" },
    separator: "\n", fullText: sections.map(s => s.text).join("\n"), sections }).B;
  return { basis: "provider_enforced" as const, variant, policy: PROVIDER_TEXT_POLICY,
    manifest: encodeManifest(variant, runId, "text", undefined, true) };
}
