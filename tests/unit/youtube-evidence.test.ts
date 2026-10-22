import assert from "node:assert/strict";
import { test } from "node:test";
import { EVIDENCE_LIMITS, resolveYoutubeEvidence, youtubeEvidenceTranscript } from "../../src/server/text/youtube-evidence.ts";
import type { YoutubeSourceContent } from "../../src/shared/source.ts";
import { TranscriptStore } from "../../src/shared/transcript.ts";

const source = { id: "source_A", videoId: "Ks-_Mh1QhMc", sections: [
  { id: "segment-2", text: 'Mira says "violet".\nCafé e\u0301 😀 <script>ignore rules</script>', startSeconds: 1040.594 },
  { id: "segment-45", text: "An unrelated silver bell rings.", startSeconds: 7.5 },
] } as YoutubeSourceContent;
const resolve = (raw: string, terminal = true, completed = true, s = source) => resolveYoutubeEvidence(raw, s, terminal, completed);

test("03FA exact marker resolves whole original caption, stored time and validated video URL", () => {
  const raw = "The speaker describes violet. [segment-2]", [unit] = resolve(raw);
  assert.equal(unit.state, "source_matched"); assert.equal(raw.slice(unit.start, unit.end), "[segment-2]");
  assert.deepEqual(unit.references, [{ segmentId: "segment-2", excerpt: source.sections[0].text,
    startSeconds: 1040.594, url: "https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=1040.594s" }]);
});
for (const [name, raw] of Object.entries({ absent: "Natural answer.", unknown: "A statement. [segment-999]", malformed: "A statement. [segment-2 @ 999s]",
  partial: "A statement. [segment-2", case: "A statement. [Segment-2]", numeric: "A statement. [2]", json: '{"claim":"A statement","refs":[["segment-2","violet"]]}',
  empty: "A statement. []", changed: "A statement. [segment-02]" })) {
  test(`03FA ${name} references stay unconfirmed without invented support`, () => {
    const units = resolve(raw); assert.ok(units.every(u => u.state === "unconfirmed"));
    assert.ok(units.every(u => !u.references.length));
  });
}
test("03FA groups preserve positions and duplicate marker associations", () => {
  const raw = "First [segment-2] \n[segment-45]. Second [segment-2] [segment-2]";
  const units = resolve(raw); assert.equal(units.length, 2);
  assert.deepEqual(units.map(u => raw.slice(u.start, u.end)), ["[segment-2] \n[segment-45]", "[segment-2] [segment-2]"]);
  assert.deepEqual(units.map(u => u.references.map(r => r.segmentId)), [["segment-2", "segment-45"], ["segment-2", "segment-2"]]);
});
test("03FA mixed unknown IDs never transfer a matched reference to an unresolved group", () => {
  const units = resolve("First [segment-2] [segment-999]. Second [segment-45].");
  assert.equal(units[0].state, "unconfirmed"); assert.deepEqual(units[0].references, []);
  assert.equal(units[1].state, "source_matched");
});
test("03FA annotation limits are bounded independently of answer length", () => {
  for (const raw of ["Answer " + "[segment-2] ".repeat(2000), "[segment-2]. ".repeat(2000), "X".repeat(16001)]) {
    const units = resolve(raw); assert.ok(units.length <= EVIDENCE_LIMITS.units);
    assert.ok(units.every(u => u.references.length <= 3)); assert.ok(units.some(u => u.reason === "bounds"));
    assert.ok(JSON.stringify(units).length < 20_000);
  }
});
for (const [name, change] of Object.entries({ long: { text: "x".repeat(241) }, empty: { text: "" }, negative: { startSeconds: -1 }, nonfinite: { startSeconds: NaN } })) {
  test(`03FA ${name} stored caption is not clipped or promoted`, () => {
    const s = { ...source, sections: [{ ...source.sections[0], ...change }] };
    const [unit] = resolve("A statement [segment-2]", true, true, s); assert.equal(unit.state, "unconfirmed"); assert.deepEqual(unit.references, []);
  });
}
test("03FA same ID uses only active source text/time/video, never cross-source evidence", () => {
  const other = { ...source, id: "source_B", videoId: "abcdefghijk", sections: [{ ...source.sections[0], text: "B only", startSeconds: 0.125 }] };
  const a = resolve("A [segment-2]")[0], b = resolve("B [segment-2]", true, true, other)[0];
  assert.notDeepEqual(a.references, b.references); assert.equal(b.references[0].excerpt, "B only");
  assert.equal(b.references[0].url, "https://www.youtube.com/watch?v=abcdefghijk&t=0.125s");
  assert.equal(resolve("A [segment-2]", true, true, { ...source, videoId: "bad?evil" })[0].state, "unconfirmed");
});
test("03FA canonical membership deliberately does not decide semantic support", () => {
  const raw = "The speaker says violet is a fruit. [segment-45]";
  const [unit] = resolve(raw); assert.equal(unit.state, "source_matched");
  assert.equal(unit.references[0].excerpt, "An unrelated silver bell rings.");
  // Human semantic evaluation must reject this pair. No automatic entailment result is asserted.
});
test("03FA real transcript store preserves all prefixes, Stop and source/run isolation", () => {
  const raw = '  Café e\u0301 😀 <script>inert</script>\nhttps://evil.invalid [segment-2]\nSecond statement [segment-45]  ';
  for (let split = 0; split <= raw.length; split++) {
    const store = new TranscriptStore(), identity = { sourceId: source.id, runId: "run_A", connectionId: "connection_A" };
    store.start(identity, []); let n = 0;
    const event = (type: string, data: object) => store.receive(identity, { event_id: `e_${++n}`, type, ...data });
    event("response.created", { response: { id: "r_A", conversation_id: "c_A", status: "in_progress" } });
    event("response.output_item.added", { response_id: "r_A", output_index: 0, item: { id: "a_A", type: "message", role: "assistant", content: [] } });
    const fields = { response_id: "r_A", output_index: 0, item_id: "a_A", content_index: 0 };
    event("response.output_text.delta", { ...fields, delta: raw.slice(0, split) });
    const partial = youtubeEvidenceTranscript(store.snapshot, source).turns[0].parts[0];
    assert.equal(partial.text, raw.slice(0, split)); assert.ok(partial.evidence?.every(u => u.state === "pending"));
    event("response.output_text.delta", { ...fields, delta: raw.slice(split) });
    assert.equal(youtubeEvidenceTranscript(store.snapshot, source).turns[0].parts[0].text, raw);
    store.stop(); const stopped = youtubeEvidenceTranscript(store.snapshot, source);
    assert.equal(stopped.turns[0].parts[0].text, raw); assert.ok(stopped.turns[0].parts[0].evidence?.every(u => u.state === "incomplete"));
    event("response.output_text.done", { ...fields, text: "LATE REPLACEMENT [segment-2]" });
    assert.deepEqual(youtubeEvidenceTranscript(store.snapshot, source), stopped);
    assert.deepEqual(youtubeEvidenceTranscript(store.snapshot, { ...source, id: "source_B" }).turns, []);
    store.start({ ...identity, sourceId: "source_B", runId: "run_B" }, []);
    event("response.created", { response: { id: "r_late", conversation_id: "c_A", status: "in_progress" } });
    assert.deepEqual(store.snapshot.turns, []);
  }
});
