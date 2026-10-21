import assert from "node:assert/strict";
import { test } from "node:test";
import { diagnoseYoutubeEvidence, resolveYoutubeEvidence } from "../../src/server/text/youtube-evidence.ts";
import type { YoutubeSourceContent } from "../../src/shared/source.ts";

const source = { id: "authored", videoId: "Ks-_Mh1QhMc", sections: [{ id: "segment-2", text: "The violet talk lasts 20 minutes for 20 people.", startSeconds: 1040.594 }] } as YoutubeSourceContent;
const value = { claim: "The speaker says 20 minutes for 20 people.", refs: [["segment-2", "20 minutes for 20 people"]] };

test("03Fc private diagnostics distinguish framing/schema/ID/quote/bounds/incomplete/missing", () => {
  const cases = [ ["{broken}", "framing"], [JSON.stringify({ claim: "readable", refs: {} }), "schema"],
    [JSON.stringify({ ...value, refs: [["segment-unknown", "20 minutes"]] }), "unknown_id"],
    [JSON.stringify({ ...value, refs: [["segment-2", "21 minutes"]] }), "quote_mismatch"],
    [JSON.stringify({ ...value, claim: "x".repeat(601) }), "bounds"], [JSON.stringify({ ...value, refs: [] }), "missing_references"] ];
  for (const [raw, reason] of cases) { const d = diagnoseYoutubeEvidence(raw, source, true, true); assert.equal(d.first, reason); assert.equal(d.matched, 0); assert.ok(!JSON.stringify(d).includes("violet")); }
  assert.equal(diagnoseYoutubeEvidence('{"claim":"Partial', source, true, false).first, "incomplete");
  assert.equal(diagnoseYoutubeEvidence(JSON.stringify(value), source, true, true).matched, 1);
});

for (const [name, raw] of Object.entries({ pretty: JSON.stringify(value, null, 2), fenced: '```json\n' + JSON.stringify(value, null, 2) + '\n```',
  reordered: JSON.stringify({ refs: value.refs, claim: value.claim }, null, 2), array: JSON.stringify([value]), decorative: '\n'.repeat(25) + JSON.stringify(value, null, 2) })) {
  test(`03Fc equivalent ${name} preserves one claim and exact matched evidence`, () => {
    const units = resolveYoutubeEvidence(raw, source, true, true);
    assert.equal(units.length, 1); assert.equal(units[0].text, value.claim); assert.equal(units[0].state, "matched");
    assert.equal(units[0].references[0].startSeconds, 1040.594);
  });
}

test("03Fc authored reproduction of captured mixed prose/JSON keeps facts but rejects decorative quotes/wrong ID", () => {
  const raw = 'The annual violet talk was 20 minutes for 20 people.\n' + JSON.stringify({ ...value, refs: [["segment-2", '"20 minutes for 20 people"']] });
  const units = resolveYoutubeEvidence(raw, source, true, true), d = diagnoseYoutubeEvidence(raw, source, true, true);
  assert.equal(units[0].text, "The annual violet talk was 20 minutes for 20 people."); assert.equal(units[1].text, value.claim);
  assert.ok(units.every(u => u.state === "unconfirmed")); assert.equal(d.counts.framing, 1); assert.equal(d.counts.quote_mismatch, 1);
  assert.equal(resolveYoutubeEvidence(JSON.stringify({ ...value, refs: [["segment-901", "20 minutes"]] }), source, true, true)[0].state, "unconfirmed");
});
test("03Fc whitespace-only match displays original newline; quotation/letter/ID changes stay rejected", () => {
  const original = "20 minutes\nfor 20 people", s = { ...source, sections: [{ ...source.sections[0], text: original }] };
  assert.equal(resolveYoutubeEvidence(JSON.stringify(value), s, true, true)[0].references[0].excerpt, original);
  for (const quote of ['"20 minutes for 20 people"', '21 minutes for 20 people']) assert.equal(resolveYoutubeEvidence(JSON.stringify({ ...value, refs: [["segment-2", quote]] }), s, true, true)[0].state, "unconfirmed");
});
test("03Fc every incremental prefix preserves only recognized top-level claim text; interrupted refs never match", () => {
  const raw = JSON.stringify({ refs: [], claim: 'The speaker says "violet". 😀' });
  for (let n = 1; n < raw.length; n++) {
    const units = resolveYoutubeEvidence(raw.slice(0, n), source, false, false);
    assert.ok(units.every(u => u.state !== "matched")); assert.ok(!units.some(u => u.text.includes('"refs":')));
    const stopped = resolveYoutubeEvidence(raw.slice(0, n), source, true, false);
    assert.ok(stopped.every(u => u.state !== "matched")); assert.ok(stopped.every(u => u.text || u.state === "format_error"));
  }
});
test("03Fc plain fallback is readable; unknown schemas/nested claim fields get explicit format failure", () => {
  assert.equal(resolveYoutubeEvidence("A natural answer without references.", source, true, true)[0].text, "A natural answer without references.");
  for (const raw of ['{"nested":{"claim":"NEVER_INFER_THIS"}}', '{"refs":[["segment-2","NEVER_INFER_THIS"]]}']) {
    const [unit] = resolveYoutubeEvidence(raw, source, true, true); assert.equal(unit.state, "format_error"); assert.equal(unit.text, "");
  }
});
test("03Fc depth and mapped excerpt bounds cannot expand the displayed evidence", () => {
  const s = { ...source, sections: [{ ...source.sections[0], text: '20 minutes' + ' '.repeat(1000) + 'for 20 people' }] };
  assert.equal(diagnoseYoutubeEvidence(JSON.stringify(value), s, true, true).first, "bounds");
  const deep = '{"claim":"Readable","refs":' + '['.repeat(20) + '0' + ']'.repeat(20) + '}';
  const d = diagnoseYoutubeEvidence(deep, source, true, true); assert.equal(d.first, "bounds"); assert.equal(d.matched, 0);
});
