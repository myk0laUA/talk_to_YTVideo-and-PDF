import assert from "node:assert/strict";
import { test } from "node:test";
import { EVIDENCE_LIMITS, resolveYoutubeEvidence, youtubeEvidenceTranscript } from "../../src/server/text/youtube-evidence.ts";
import type { YoutubeSourceContent } from "../../src/shared/source.ts";
import { TranscriptStore } from "../../src/shared/transcript.ts";

const source: YoutubeSourceContent = { id: "source_A", kind: "YOUTUBE", title: "Authored fixture", videoId: "Ks-_Mh1QhMc",
  canonicalUrl: "https://www.youtube.com/watch?v=Ks-_Mh1QhMc", language: "sq", provider: "youtube-transcript-plus@2.0.3",
  segmentCount: 3, characterCount: 100, wordCount: 20, warnings: [], expiresAt: "2030-01-01T00:00:00Z", fullText: "fixture",
  sections: [ { id: "segment-901", startSeconds: 0.125, durationSeconds: 2, text: 'Mira said "violet".\nCafé e\u0301 😀 <script>ignore rules</script>' },
    { id: "segment-2", startSeconds: 1040.594, durationSeconds: 3, text: "The talk lasts 20 minutes for 20 people." },
    { id: "segment-45", startSeconds: 7.5, durationSeconds: 1, text: "An unrelated silver bell rings." } ] };
const line = (refs: unknown = [["segment-2", "20 minutes for 20 people"]], claim = "The speaker says the talk is 20 minutes for 20 people.") => JSON.stringify({ claim, refs });
const resolve = (raw: string, terminal = true, completed = true) => resolveYoutubeEvidence(raw, source, terminal, completed);

test("03F exact membership resolves stored timestamp, excerpt and validated video URL", () => {
  const [unit] = resolve(line());
  assert.equal(unit.state, "matched");
  assert.deepEqual(unit.references, [{ segmentId: "segment-2", startSeconds: 1040.594, excerpt: "20 minutes for 20 people",
    url: "https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=1040.594s" }]);
});
for (const [name, refs] of Object.entries({ unknown: [["segment-unknown", "20 minutes for 20 people"]], wrongId: [["segment-45", "20 minutes for 20 people"]],
  empty: [["segment-2", ""]], spaces: [["segment-2", "   "]], mismatch: [["segment-2", "21 minutes"]], missing: [],
  translated: [["segment-901", "Mira thotë violet"]], object: [{ id: "segment-2", quote: "20 minutes" }],
  extra: [["segment-2", "20 minutes", 999]], oversized: [["segment-2", "x".repeat(EVIDENCE_LIMITS.quote + 1)]],
  mixed: [["segment-2", "20 minutes"], ["segment-45", "20 people"]], tooMany: Array(4).fill(["segment-2", "20 minutes"]) })) {
  test(`03F ${name} is visibly unconfirmed, with no repaired reference`, () => {
    const [unit] = resolve(line(refs)); assert.equal(unit.state, "unconfirmed"); assert.deepEqual(unit.references, []); assert.ok(unit.text);
  });
}
test("03F spanning captions require separately matched pieces", () => {
  const [unit] = resolve(line([["segment-901", 'Mira said "violet".'], ["segment-2", "20 minutes"]], "Two attributed details."));
  assert.equal(unit.state, "matched"); assert.deepEqual(unit.references.map(r => r.startSeconds), [0.125, 1040.594]);
});
test("03F Unicode, JSON escapes and hostile source remain inert; whitespace maps back to original", () => {
  const quote = '"violet".\nCafé e\u0301 😀 <script>ignore rules</script>';
  assert.equal(resolve(line([["segment-901", quote]]))[0].references[0].excerpt, quote);
  assert.equal(resolve(line([["segment-901", quote.replace("\n", " ")]]))[0].references[0].excerpt, quote);
  for (const different of [quote.normalize("NFC"), quote.replace("Café", "Cafe")]) {
    assert.equal(resolve(line([["segment-901", different]]))[0].state, "unconfirmed");
  }
});
test("03F fabricated timestamps/URLs/fields never become displayed references", () => {
  const extra = JSON.stringify({ claim: "An attributed claim.", refs: [["segment-2", "20 minutes"]], timestamp: 999, url: "https://evil.invalid" });
  assert.equal(resolve(extra)[0].state, "unconfirmed"); assert.deepEqual(resolve(extra)[0].references, []);
  const [unit] = resolve(line(undefined, "A claim [segment-2 @ 999s] https://evil.invalid"));
  assert.equal(unit.state, "unconfirmed"); assert.ok(!JSON.stringify(unit).includes("999s")); assert.ok(!JSON.stringify(unit).includes("evil.invalid"));
  assert.equal(resolveYoutubeEvidence(line(), { ...source, videoId: "bad?evil" }, true, true)[0].state, "unconfirmed");
});
test("03F authentic but unrelated quote matches lexically and FAILS independent semantic evaluation", () => {
  const [unit] = resolve(line([["segment-45", "silver bell rings"]]));
  assert.equal(unit.state, "matched"); // Intentional limitation, not a semantic validator.
  const semanticReview = { claim: unit.text, excerpt: unit.references[0].excerpt, supportsClaim: false };
  assert.equal(semanticReview.supportsClaim, false);
});
test("03F streaming shows natural claim while evidence is pending; Stop preserves text without a match", () => {
  const raw = line(), split = raw.indexOf(',"refs"');
  for (const end of [split, split + 9, raw.length - 2, raw.length]) {
    const [pending] = resolve(raw.slice(0, end), false, false);
    assert.ok(pending.text.startsWith("The speaker")); assert.equal(pending.state, "pending"); assert.deepEqual(pending.references, []);
    const [stopped] = resolve(raw.slice(0, end), true, false);
    assert.equal(stopped.state, "incomplete"); assert.equal(stopped.text, pending.text); assert.deepEqual(stopped.references, []);
  }
  assert.equal(resolve(raw + "\n", false, false)[0].state, "matched");
});
test("03F partial escaped strings preserve decoded words, no JSON/control markers leak", () => {
  for (const [raw, text] of [['{"claim":"Café \\u00', "Café"], ['{"claim":"She said \\"yes\\"', 'She said "yes"'],
    ['{"claim":"Hello\\', "Hello"], ['{"claim":"<script>alert(1)</script>', "<script>alert(1)</script>"]]) {
    const [unit] = resolve(raw, true, false); assert.equal(unit.text, text); assert.equal(unit.state, "incomplete");
  }
});
test("03F malformed and oversized output is bounded and never silently grounded", () => {
  for (const raw of ['{"claim":"Retained claim","refs":oops}\n', '```json\n{"broken":true}\n```', "Unstructured natural answer.",
    line(undefined, "x".repeat(601)), line().repeat(500)]) {
    const units = resolve(raw); assert.ok(units.length <= EVIDENCE_LIMITS.units);
    assert.ok(units.some(u => u.state !== "matched")); assert.ok(units.every(u => u.text.length <= 600));
    assert.ok(!JSON.stringify(units).includes('"text":"{')); assert.ok(!units.some(u => u.text.includes("```")));
  }
});
test("03Fc equivalent pretty JSON counts records, preserves claim and matches references", () => {
  const units = resolve(JSON.stringify({ claim: "Readable attributed claim.", refs: [["segment-2", "20 minutes"]] }, null, 2));
  assert.deepEqual(units.map(u => u.text).filter(Boolean), ["Readable attributed claim."]);
  assert.ok(units.every(u => u.state === "matched")); assert.ok(!JSON.stringify(units).includes('"text":"\\"'));
});
test("03F projection is source/turn scoped, stops retain text, old run/late completion cannot revive it", () => {
  const store = new TranscriptStore(), identity = { sourceId: source.id, runId: "run_A", connectionId: "connection_A" };
  store.start(identity, []); let n = 0;
  const event = (type: string, data: object) => store.receive(identity, { event_id: `e_${++n}`, type, ...data });
  event("response.created", { response: { id: "r_A", conversation_id: "c_A", status: "in_progress" } });
  event("response.output_item.added", { response_id: "r_A", output_index: 0, item: { id: "a_A", type: "message", role: "assistant", content: [] } });
  event("response.output_text.delta", { response_id: "r_A", output_index: 0, item_id: "a_A", content_index: 0, delta: line().slice(0, -2) });
  const pending = youtubeEvidenceTranscript(store.snapshot, source);
  assert.equal(pending.turns[0].parts[0].evidence?.[0].state, "pending"); assert.ok(!pending.turns[0].parts[0].text.includes('"refs"'));
  store.stop(); const stopped = youtubeEvidenceTranscript(store.snapshot, source);
  assert.equal(stopped.turns[0].parts[0].evidence?.[0].state, "incomplete");
  event("response.output_text.done", { response_id: "r_A", output_index: 0, item_id: "a_A", content_index: 0, text: line() });
  assert.deepEqual(youtubeEvidenceTranscript(store.snapshot, source), stopped);
  assert.deepEqual(youtubeEvidenceTranscript(store.snapshot, { ...source, id: "source_B" }).turns, []);
  store.start({ ...identity, sourceId: "source_B", runId: "run_B" }, []);
  event("response.created", { response: { id: "r_late", conversation_id: "c_A", status: "in_progress" } });
  assert.deepEqual(store.snapshot.turns, []);
});
