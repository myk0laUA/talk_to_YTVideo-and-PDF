import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveYoutubeEvidence, youtubeEvidenceTranscript } from "../../src/server/text/youtube-evidence.ts";
import type { YoutubeSourceContent } from "../../src/shared/source.ts";
import { TranscriptStore, type TranscriptSnapshot } from "../../src/shared/transcript.ts";

const source = { id: "authored", videoId: "Ks-_Mh1QhMc", sections: [{ id: "segment-2", text: "Authored whole caption.", startSeconds: 1.25 }] } as YoutubeSourceContent;
const project = (raw: string, s = source, generation: TranscriptSnapshot["turns"][number]["generation"] = "completed") => youtubeEvidenceTranscript({ ...new TranscriptStore().snapshot,
  phase: "active", identity: { sourceId: source.id, runId: "r", connectionId: "c" },
  turns: [{ itemId: "a", role: "assistant", ordering: "established", playback: "not_applicable", generation, interrupted: false,
    parts: [{ kind: "output_text", text: raw, state: "final", index: 0 }] }] }, s);
for (const raw of [ '1){"claim":"First authored claim.","refs":[["segment-2","bad"]}\n2){"claim":"Later authored claim.","refs":[["segment-3","bad"]}',
  '```json\n{"nested":{"claim":"Do not infer this"}}\n```', "  Unicode e\u0301 😀\n<script>inert</script> & **literal** https://evil.invalid  ",
  "No references. ".repeat(1000), "Referenced. [segment-2] ".repeat(200), "A [segment-2] [bad] and [segment-2 @ 999s]" ]) {
  test(`03FA annotation failure cannot replace any of ${raw.length} received characters`, () => {
    const part = project(raw).turns[0].parts[0]; assert.equal(part.text, raw); assert.ok(part.evidence?.length);
  });
}
test("03FA unexpected resolver failure keeps text and explicit unconfirmed status", () => {
  const s = { ...source, get sections(): never { throw new Error("Authored resolver failure"); } };
  const part = project("Readable [segment-2]", s).turns[0].parts[0];
  assert.equal(part.text, "Readable [segment-2]"); assert.equal(part.evidence?.[0].state, "unconfirmed");
});
for (const generation of ["stopped", "failed", "incomplete", "cancelled", "generating"] as const) {
  test(`03FA ${generation} output cannot finalize source annotations`, () => {
    const part = project("Readable [segment-2]", source, generation).turns[0].parts[0];
    assert.equal(part.text, "Readable [segment-2]"); assert.ok(part.evidence?.every(u => u.state === (generation === "generating" ? "pending" : "incomplete")));
  });
}
test("03FA every marker prefix remains pending until successful terminal output", () => {
  const raw = "A statement [segment-2].";
  for (let n = 0; n <= raw.length; n++) {
    assert.ok(resolveYoutubeEvidence(raw.slice(0, n), source, false, false).every(u => u.state === "pending" && !u.references.length));
    assert.ok(resolveYoutubeEvidence(raw.slice(0, n), source, true, false).every(u => u.state === "incomplete" && !u.references.length));
  }
  assert.equal(resolveYoutubeEvidence(raw, source, true, true)[0].state, "source_matched");
});
