import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { buildPassageCatalog, catalogSelectionSchema, prepareCatalogSelection, resolveCatalogSelection, runCatalogCandidate, CATALOG_BOUNDS } from "../../src/server/text/responses-catalog.ts";
import { catalogEvaluation } from "../../scripts/catalog-eval.ts";
import type { CandidateSource } from "../../src/server/text/responses-candidate.ts";
import type { CandidateRequest } from "../../src/server/text/responses-stage.ts";
import type { PassageDependencies } from "../../src/server/text/responses-passages.ts";

const source = (count = 110): CandidateSource => {
  const sections = Array.from({ length: count }, (_, i) => ({ id: `segment-${9000 - i * 7}`, text: i === 1 ? "" : `Original ${i} café e\u0301 😀 &amp;`, startSeconds: i * 2.125, durationSeconds: 1.5 }));
  return { id: "catalog-A", videoId: "Ks-_Mh1QhMc", language: "sq", sections, fullText: sections.map(s => s.text).join("\n") };
};
const envelope = (value: unknown) => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 30 } });
function fake(s = source()) {
  const requests: CandidateRequest[] = [], counts: CandidateRequest[] = []; let reservations = 0;
  const ids = buildPassageCatalog(s).blocks.map(b => b.id);
  const deps: PassageDependencies = { reserve: async () => { reservations++; return true; },
    count: async p => { counts.push(p.request); return { basis: "responses.input_tokens", inputTokens: 100, requestSha256: p.requestSha256 }; },
    transport: async r => { requests.push(r); return envelope(r.text.format.name === "catalog_block_selection_v1" ? { availability: "selected", block_ids: [ids[1], ids[0], ids[1]] }
      : { statements: [{ text: "The speaker describes the source.", classification: "source_claim", passage_ids: [ids[1], ids[0]], inference_basis: "" }] }); } };
  return { deps, requests, counts, ids, reservations: () => reservations };
}
test("Catalog evaluation import is inert", async () => { await assert.rejects(catalogEvaluation([]), /Usage/u); });
test("Catalog greedy partition is lossless including sparse IDs, Unicode and empty captions; every eight distinct blocks fits96", () => {
  const s = source(121), c = buildPassageCatalog(s), strip = (x: typeof c.blocks[number]["sections"][number]) => ({ id: x.id, text: x.text, startSeconds: x.startSeconds, durationSeconds: x.durationSeconds });
  assert.deepEqual(c.blocks.flatMap(b => b.sections.map(strip)), s.sections);
  assert.equal(c.blocks.flatMap(b => b.sections).map(s => s.text).join(c.separator), s.fullText);
  assert.deepEqual(c.blocks.map(b => b.sections.length), [...Array(10).fill(12), 1]);
  assert.ok(c.blocks.every(b => b.sections.length <= 12 && b.endSeconds - b.startSeconds <= 120));
  // Largest eight dominate every other possible eight-element subset.
  assert.ok(c.blocks.map(b => b.sections.length).sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0) <= 96);
  assert.deepEqual(buildPassageCatalog(s), c); assert.ok(Object.isFrozen(c.blocks[0].sections[0]));
  assert.deepEqual(catalogSelectionSchema(c).properties.block_ids.items.enum, c.blocks.map(b => b.id));
  assert.equal(catalogSelectionSchema(c).properties.block_ids.maxItems, 8);
});
test("Catalog envelopes include durations and backward times; exactly120 accepted, impossible singleton rejected", () => {
  const rows = [{ id: "segment-a", text: "a", startSeconds: 100, durationSeconds: 20 }, { id: "segment-b", text: "", startSeconds: 0, durationSeconds: 1 },
    { id: "segment-c", text: "c", startSeconds: 121, durationSeconds: 0 }];
  const s = { ...source(), sections: rows, fullText: "a\n\nc" }, c = buildPassageCatalog(s);
  assert.deepEqual(c.blocks.map(b => b.sections.length), [2, 1]); assert.equal(c.blocks[0].startSeconds, 0); assert.equal(c.blocks[0].endSeconds, 120);
  assert.equal(c.blocks[0].sections[0].url, "https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=100s");
  const long = { ...s, sections: [{ ...rows[0], durationSeconds: 120.0001 }], fullText: "a" };
  assert.throws(() => buildPassageCatalog(long), /invalid_input/u);
});
for (const field of ["id", "videoId", "language", "text", "locator", "tail"] as const) test(`Catalog IDs bind entire source including ${field}`, () => {
  const s = source(), changed = structuredClone(s) as { id: string; videoId: string; language: string; sections: { id: string; text: string; startSeconds: number; durationSeconds: number }[]; fullText: string };
  if (field === "id") changed.id = "different";
  if (field === "videoId") changed.videoId = "abcdefghijk";
  if (field === "language") changed.language = "en";
  if (field === "text") changed.sections[0].text += "!";
  if (field === "tail") changed.sections.at(-1)!.text += "!";
  if (field === "locator") changed.sections[0].durationSeconds += 0.001;
  changed.fullText = changed.sections.map(s => s.text).join("\n");
  const before = buildPassageCatalog(s), after = buildPassageCatalog(changed);
  assert.ok(after.blocks.every(b => !before.blocks.some(a => a.id === b.id)));
  assert.throws(() => resolveCatalogSelection(changed, { availability: "selected", block_ids: [before.blocks[0].id] }), /invalid_passages/u);
});
test("Catalog Stage1 entire source once with original locator IDs; Stage2 exactly selected canonical blocks and multi-block references", async () => {
  const s = source(), f = fake(s), history = [{ role: "assistant" as const, content: "Old assertion is not evidence." }];
  const result = await runCatalogCandidate({ source: s, question: "Summary?", history }, f.deps);
  assert.ok(result.ok); assert.equal(f.requests.length, 2); assert.equal(f.counts.length, 2); assert.equal(f.reservations(), 1);
  const visible = JSON.parse(f.requests[0].input[0].content).canonical_catalog;
  assert.deepEqual(visible.blocks.flatMap((b: { sections: unknown[] }) => b.sections), buildPassageCatalog(s).blocks.flatMap(b => b.sections));
  assert.deepEqual(Object.keys(visible.blocks[0]), ["id", "sections"]);
  assert.ok(!f.requests[0].input[0].content.includes("fullText")); assert.ok(!f.requests[0].input[0].content.includes("sectionIndex"));
  const selected = JSON.parse(f.requests[1].input[0].content).selected_evidence.passages;
  assert.deepEqual(selected, [buildPassageCatalog(s).blocks[1], buildPassageCatalog(s).blocks[0]]);
  assert.deepEqual(f.requests[0].input.slice(1), f.requests[1].input.slice(1));
  assert.ok(!f.requests[1].input[0].content.includes(s.sections[99].text));
  assert.equal(result.statements[0].references.length, 2); assert.equal(result.statements[0].semanticSupport, "not_evaluated");
  assert.equal(result.statements[0].evidenceState, "source_matched");
  for (const r of f.requests) { assert.equal(r.store, false); assert.equal(r.truncation, "disabled"); assert.equal(r.max_output_tokens, 4096); assert.deepEqual(r.tools, []); }
});
for (const value of [{ availability: "selected", block_ids: ["unknown"] }, { availability: "selected", passages: [{ start_id: "segment-a", end_id: "segment-b" }] },
  { availability: "selected", block_ids: [] }, { availability: "unavailable", block_ids: ["unknown"] }, { availability: "selected", block_ids: Array(9).fill("unknown") },
  { availability: "verified", block_ids: [] }, { availability: "selected", block_ids: [42] }, { availability: "selected", block_ids: [], extra: 1 }]) {
  test(`Catalog invalid output terminal before composition: ${JSON.stringify(value)}`, async () => {
    const f = fake(); f.deps.transport = async r => { f.requests.push(r); return envelope(value); };
    const r = await runCatalogCandidate({ source: source(), question: "Q?" }, f.deps);
    assert.ok(!r.ok); assert.equal(r.code, "invalid_passages"); assert.equal(f.counts.length, 1); assert.equal(f.requests.length, 1);
  });
}
for (const availability of ["unavailable", "insufficient_evidence"]) test(`Catalog ${availability} requires empty selection and composes uncertainty`, async () => {
  const f = fake(); f.deps.transport = async r => { f.requests.push(r); return envelope(r.text.format.name === "catalog_block_selection_v1" ? { availability, block_ids: [] }
    : { statements: [{ text: "The evidence does not provide this.", classification: "unavailable", passage_ids: [], inference_basis: "" }] }); };
  const r = await runCatalogCandidate({ source: source(), question: "Q?" }, f.deps); assert.ok(r.ok);
  assert.equal(r.selection.passages.length, 0); assert.equal(f.requests.length, 2); assert.equal(r.statements[0].evidenceState, "unavailable");
});
test("Catalog bounds reject without reservation, counting or generation", async () => {
  const many = source(513), huge = source(1);
  const cases = [{ ...many, sections: many.sections.map((s, i) => ({ ...s, startSeconds: i * 121 })) },
    { ...huge, sections: [{ ...huge.sections[0], durationSeconds: 120.001 }] },
    { ...huge, sections: [{ ...huge.sections[0], text: "\\".repeat(290000) }] }].map(s => ({ ...s, fullText: s.sections.map(s => s.text).join("\n") }));
  for (const s of cases) { const f = fake(); const r = await runCatalogCandidate({ source: s, question: "Q?" }, f.deps);
    assert.ok(!r.ok); assert.equal(f.reservations(), 0); assert.equal(f.counts.length, 0); assert.equal(f.requests.length, 0); }
  assert.equal(CATALOG_BOUNDS.selectedBlocks * CATALOG_BOUNDS.captionsPerBlock, 96);
  assert.throws(() => prepareCatalogSelection({ source: source(), question: "" }));
});
for (const phase of ["reserve", "select:prepared", "select:counted", "select:generating", "select:raw", "select:selected", "compose:prepared", "compose:counted", "compose:generating", "compose:raw"]) test(`Catalog abort ${phase} prevents subsequent work`, async () => {
  const f = fake(), controller = new AbortController(); f.deps.signal = controller.signal;
  if (phase === "reserve") f.deps.reserve = async () => { controller.abort(); return true; };
  f.deps.observe = async (stage, event) => { if (`${stage}:${event}` === phase) controller.abort(); };
  const r = await runCatalogCandidate({ source: source(), question: "Q?" }, f.deps); assert.ok(!r.ok); assert.equal(r.code, "aborted");
  const calls = f.requests.length, counts = f.counts.length; await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.requests.length, calls); assert.equal(f.counts.length, counts); assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});
for (const stage of ["select", "compose"]) for (const kind of ["counter", "transport", "timeout"]) test(`Catalog ${stage} ${kind} terminal without retry`, async () => {
  const f = fake(), original = f.deps.transport, count = f.deps.count;
  const match = (r: CandidateRequest) => (r.text.format.name === "catalog_block_selection_v1" ? "select" : "compose") === stage;
  f.deps.count = async (p, signal) => { if (match(p.request) && kind === "counter") throw new Error("secret"); return count(p, signal); };
  f.deps.transport = async (r, signal) => { if (match(r)) { if (kind === "transport") { f.requests.push(r); throw new Error("secret"); }
    if (kind === "timeout") await new Promise(resolve => setTimeout(resolve, 40)); } return original(r, signal); };
  if (kind === "timeout") f.deps.timeoutMs = 10;
  const r = await runCatalogCandidate({ source: source(), question: "Q?" }, f.deps);
  assert.ok(!r.ok); assert.equal(r.code, kind === "counter" ? "counting" : kind === "timeout" ? "timeout" : "transport");
  assert.ok(!JSON.stringify(r).includes("secret"));
  if (kind !== "timeout") assert.equal(f.requests.length, (stage === "select" ? 0 : 1) + (kind === "transport" ? 1 : 0));
  await new Promise(resolve => setTimeout(resolve, 45)); assert.ok(f.requests.length <= (stage === "select" ? 1 : 2));
});
