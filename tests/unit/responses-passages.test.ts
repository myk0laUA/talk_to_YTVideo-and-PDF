import assert from "node:assert/strict";
import { test } from "node:test";
import { getEventListeners } from "node:events";
import { runPassageCandidate, preparePassageSelection, resolvePassageSelection, PASSAGE_BOUNDS,
  type PassageDependencies, type PassageStage } from "../../src/server/text/responses-passages.ts";
import type { CandidateSource } from "../../src/server/text/responses-candidate.ts";
import type { CandidateRequest } from "../../src/server/text/responses-stage.ts";
import { passagesEvaluation } from "../../scripts/passages-eval.ts";

const source = (id = "A"): CandidateSource => ({ id, videoId: id === "A" ? "Ks-_Mh1QhMc" : "abcdefghijk", language: "sq",
  fullText: 'Speaker describes café 😀.\n\nThe violet result.\nPRIVATE_TAIL_NOT_SELECTED\nLast caption.', sections: [
    { id: "segment-19", text: "Speaker describes café 😀.", startSeconds: 12.125, durationSeconds: 0.5 },
    { id: "segment-2", text: "", startSeconds: 12.625, durationSeconds: 0 },
    { id: "segment-alpha", text: "The violet result.", startSeconds: 13.001, durationSeconds: 0.1 },
    { id: "segment-501", text: "PRIVATE_TAIL_NOT_SELECTED", startSeconds: 99.2, durationSeconds: 0.3 },
    { id: "segment-7", text: "Last caption.", startSeconds: 100.25, durationSeconds: 0.1 },
  ] });
const selected = { availability: "selected", passages: [{ start_id: "segment-19", end_id: "segment-alpha" }] };
const envelope = (value: unknown) => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value) }] }],
  usage: { input_tokens: 100, output_tokens: 20, output_tokens_details: { reasoning_tokens: 10 } } });
const compose = (request: CandidateRequest) => {
  const evidence = JSON.parse(request.input[0].content).selected_evidence;
  return { statements: [{ text: evidence.availability === "selected" ? "The speaker describes violet." : "The evidence does not provide the requested fact.",
    classification: evidence.availability === "selected" ? "source_claim" : "unavailable", passage_ids: evidence.passages.map((p: { id: string }) => p.id), inference_basis: "" }] };
};
function fake(overrides: Partial<PassageDependencies> = {}) {
  const requests: CandidateRequest[] = [], counts: CandidateRequest[] = [], events: { stage: PassageStage; event: string; data: unknown }[] = [];
  let reservations = 0;
  const deps: PassageDependencies = {
    reserve: async allocation => { reservations++; assert.deepEqual(allocation, { stages: 2, inputCap: 128000, outputCap: 4096, stageUsd: 0.115, totalUsd: 0.23 }); return true; },
    count: async p => { counts.push(p.request); return { basis: "responses.input_tokens", inputTokens: 100, requestSha256: p.requestSha256 }; },
    transport: async request => { requests.push(request); return envelope(request.text.format.name === "complete_passage_selection_v1" ? selected : compose(request)); },
    observe: async (stage, event, data) => { events.push({ stage, event, data }); }, ...overrides,
  };
  return { deps, requests, counts, events, reservations: () => reservations };
}
const input = () => ({ source: source(), question: "Summarize the speaker." });

test("Passages evaluation import is inert and requires explicit invocation", async () => {
  await assert.rejects(passagesEvaluation([]), /Usage/u);
});

test("Passages full source first, exact bounded history both stages, only selected evidence second", async () => {
  const f = fake(), s = source();
  const result = await runPassageCandidate({ source: s, question: "Current?", history: [{ role: "user", content: "Earlier?" }, { role: "assistant", content: "Untrusted old assertion" }] }, f.deps);
  assert.ok(result.ok); assert.equal(f.reservations(), 1); assert.equal(f.requests.length, 2); assert.equal(f.counts.length, 2);
  const full = JSON.parse(f.requests[0].input[0].content).canonical_source;
  assert.deepEqual(full.sections, s.sections); assert.equal(full.sections.map((x: { text: string }) => x.text).join(full.separator), s.fullText);
  const second = f.requests[1].input[0].content; assert.ok(!second.includes("PRIVATE_TAIL_NOT_SELECTED")); assert.ok(!second.includes("canonical_source"));
  assert.deepEqual(f.requests[0].input.slice(1), f.requests[1].input.slice(1));
  const p = result.selection.passages[0]; assert.deepEqual(p.sections.map(section => ({ id: section.id, text: section.text,
    startSeconds: section.startSeconds, durationSeconds: section.durationSeconds })), s.sections.slice(0, 3));
  assert.equal(p.excerpt, "Speaker describes café 😀.\n\nThe violet result."); assert.equal(p.startSeconds, 12.125); assert.equal(p.endSeconds, 13.100999999999999);
  assert.equal(p.sections[2].url, "https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=13.001s");
  assert.equal(result.statements[0].semanticSupport, "not_evaluated"); assert.equal(result.statements[0].evidenceState, "source_matched");
  assert.ok(Object.isFrozen(p.sections[0]));
  assert.ok(f.events.findIndex(e => e.event === "selected") < f.events.findIndex(e => e.stage === "compose" && e.event === "generating"));
  for (const r of f.requests) { assert.equal(r.store, false); assert.equal(r.truncation, "disabled"); assert.equal(r.max_output_tokens, 4096); assert.deepEqual(r.reasoning, { effort: "medium" }); assert.deepEqual(r.tools, []); assert.equal(r.background, false); }
});

test("Passages sparse IDs resolve original order with no arithmetic, expansion, sorting or text normalization", () => {
  const s = source(), p = resolvePassageSelection(s, { availability: "selected", passages: [{ start_id: "segment-2", end_id: "segment-alpha" }] }).passages[0];
  assert.deepEqual(p.sections.map(x => x.id), ["segment-2", "segment-alpha"]); assert.equal(p.excerpt, "\nThe violet result.");
  assert.equal(p.startId, "segment-2"); assert.equal(p.endId, "segment-alpha");
  const request = preparePassageSelection({ source: s, question: "Why?" }); assert.ok(Object.isFrozen(request.request.input));
});

for (const [name, value] of Object.entries({ unknown: { availability: "selected", passages: [{ start_id: "segment-19", end_id: "segment-missing" }] },
  reversed: { availability: "selected", passages: [{ start_id: "segment-alpha", end_id: "segment-19" }] },
  overlap: { availability: "selected", passages: [selected.passages[0], selected.passages[0]] },
  extra: { ...selected, padding: 1 }, emptySelected: { availability: "selected", passages: [] },
  inventedStatus: { availability: "verified", passages: [] }, unavailableWithPassages: { availability: "unavailable", passages: selected.passages },
  extraEndpoint: { availability: "selected", passages: [{ ...selected.passages[0], next: "segment-501" }] },
  tooMany: { availability: "selected", passages: Array(9).fill(selected.passages[0]) } })) {
  test(`Passages rejects ${name} before stage2 counting/generation`, async () => {
    const f = fake(); f.deps.transport = async r => { f.requests.push(r); return envelope(value); };
    const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.code, "invalid_passages"); assert.equal(result.stage, "select");
    assert.equal(f.counts.length, 1); assert.equal(f.requests.length, 1);
  });
}
test("Passages exact24caption/120second boundaries and aggregate bounds reject without clipping", () => {
  const sections = Array.from({ length: 100 }, (_, i) => ({ id: `segment-${1000 - i * 3}`, text: `Caption ${i}`, startSeconds: i, durationSeconds: 1 }));
  const s: CandidateSource = { ...source(), sections, fullText: sections.map(s => s.text).join("\n") };
  const range = (a: number, b: number) => ({ start_id: sections[a].id, end_id: sections[b].id });
  assert.equal(resolvePassageSelection(s, { availability: "selected", passages: [range(0, 23)] }).passages[0].sections.length, 24);
  assert.throws(() => resolvePassageSelection(s, { availability: "selected", passages: [range(0, 24)] }));
  assert.throws(() => resolvePassageSelection(s, { availability: "selected", passages: [range(0, 23), range(24, 47), range(48, 71), range(72, 95), range(96, 96)] }));
  const duration = (n: number) => { const sections = [{ ...source().sections[0], startSeconds: 0, durationSeconds: n }]; return { ...source(), sections, fullText: sections[0].text }; };
  assert.equal(resolvePassageSelection(duration(120), { availability: "selected", passages: [{ start_id: "segment-19", end_id: "segment-19" }] }).passages.length, 1);
  assert.throws(() => resolvePassageSelection(duration(120.0001), { availability: "selected", passages: [{ start_id: "segment-19", end_id: "segment-19" }] }));
});

for (const availability of ["unavailable", "insufficient_evidence"]) test(`Passages ${availability} still composes uncertainty with no invented evidence`, async () => {
  const f = fake(); f.deps.transport = async r => { f.requests.push(r); return envelope(r.text.format.name === "complete_passage_selection_v1" ? { availability, passages: [] } : compose(r)); };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(result.ok); assert.equal(f.requests.length, 2);
  assert.equal(result.statements[0].classification, "unavailable"); assert.deepEqual(result.statements[0].references, []);
});

for (const ids of [[], ["unknown_passage"], ["segment-19"]]) test(`Passages unknown/missing references never erase prose or acquire support: ${ids}`, async () => {
  const f = fake(); f.deps.transport = async r => envelope(r.text.format.name === "complete_passage_selection_v1" ? selected : { statements: [{ ...compose(r).statements[0], passage_ids: ids }] });
  const result = await runPassageCandidate(input(), f.deps); assert.ok(result.ok); assert.equal(result.answer, "The speaker describes violet.");
  assert.equal(result.statements[0].evidenceState, "unconfirmed"); assert.equal(result.statements[0].semanticSupport, "not_evaluated");
});
test("Passages same range in different explicit sources cannot acquire each others IDs or excerpts", async () => {
  const a = await runPassageCandidate(input(), fake().deps), b = await runPassageCandidate({ ...input(), source: source("B") }, fake().deps);
  assert.ok(a.ok && b.ok); assert.notEqual(a.selection.passages[0].id, b.selection.passages[0].id);
  assert.notEqual(a.selection.passages[0].sections[0].url, b.selection.passages[0].sections[0].url);
});

for (const mutation of ["extra", "long", "tooMany", "badClass", "inferenceNoBasis", "extraRefs", "blank"] as const) test(`Passages validates composition ${mutation} server-side`, async () => {
  const f = fake(); f.deps.transport = async r => {
    if (r.text.format.name === "complete_passage_selection_v1") return envelope(selected);
    const value = compose(r), s = value.statements[0];
    if (mutation === "extra") return envelope({ ...value, raw_quote: "invented" });
    if (mutation === "tooMany") value.statements = Array(9).fill(s);
    if (mutation === "long") s.text = "x".repeat(281);
    if (mutation === "blank") s.text = " ";
    if (mutation === "badClass") s.classification = "verified";
    if (mutation === "inferenceNoBasis") s.classification = "inference";
    if (mutation === "extraRefs") s.passage_ids = Array(4).fill(s.passage_ids[0]);
    return envelope(value);
  };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.stage, "compose"); assert.equal(result.code, "malformed");
});
test("Passages mixed references preserve answer unconfirmed; inference label and source basis retained", async () => {
  const f = fake(); f.deps.transport = async r => envelope(r.text.format.name === "complete_passage_selection_v1" ? selected : {
    statements: [{ ...compose(r).statements[0], text: "This may imply violet.", classification: "inference", inference_basis: "The passage describes violet.", passage_ids: [...compose(r).statements[0].passage_ids, "foreign_passage"] }] });
  const result = await runPassageCandidate(input(), f.deps); assert.ok(result.ok); assert.equal(result.answer, "Inference: This may imply violet.");
  assert.equal(result.statements[0].evidenceState, "unconfirmed"); assert.equal(result.statements[0].references[0].state, "source_matched");
  assert.equal(result.statements[0].references[1].state, "unconfirmed");
});
test("Passages unavailable selection cannot produce a fabricated source claim", async () => {
  const f = fake(); f.deps.transport = async r => envelope(r.text.format.name === "complete_passage_selection_v1" ? { availability: "unavailable", passages: [] } : {
    statements: [{ ...compose(r).statements[0], text: "Invented result.", classification: "source_claim" }] });
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.stage, "compose"); assert.equal(result.code, "malformed");
});

for (const stage of ["select", "compose"] as const) for (const code of ["transport", "refusal", "incomplete", "malformed", "provider_failure"] as const) {
  test(`Passages ${stage} ${code} is terminal with safe stage diagnostics and no retries`, async () => {
    const f = fake(); f.deps.transport = async r => {
      f.requests.push(r); const current = r.text.format.name === "complete_passage_selection_v1" ? "select" : "compose";
      if (current !== stage) return envelope(selected);
      if (code === "transport") throw new Error("private_exception_secret");
      if (code === "refusal") return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "No" }] }] };
      if (code === "incomplete") return { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } };
      if (code === "provider_failure") return { status: "failed" };
      return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: '{"partial":' }] }] };
    };
    const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.stage, stage); assert.equal(result.code, code);
    assert.equal(f.requests.length, stage === "select" ? 1 : 2); assert.equal(f.counts.length, f.requests.length);
    assert.ok(!JSON.stringify(result).includes("private_exception_secret")); assert.equal(result.diagnostics.at(-1)?.state, "failed");
  });
}
for (const stage of ["select", "compose"] as const) for (const mode of ["throws", "over", "mismatch"] as const) test(`Passages ${stage} counter ${mode} never starts that generation`, async () => {
  const f = fake(); f.deps.count = async p => {
    f.counts.push(p.request); if ((p.request.text.format.name === "complete_passage_selection_v1" ? "select" : "compose") === stage) {
      if (mode === "throws") throw new Error("private_counter_secret");
      return { basis: "responses.input_tokens", inputTokens: mode === "over" ? 128001 : 100, requestSha256: mode === "mismatch" ? "wrong" : p.requestSha256 };
    } return { basis: "responses.input_tokens", inputTokens: 100, requestSha256: p.requestSha256 };
  };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.stage, stage);
  assert.equal(result.code, mode === "throws" ? "counting" : "budget"); assert.equal(f.requests.length, stage === "select" ? 0 : 1);
});

for (const phase of ["reserve", "select:prepared", "select:counted", "select:generating", "select:raw", "select:selected", "compose:prepared", "compose:counted", "compose:generating", "compose:raw"]) {
  test(`Passages abort at ${phase} prevents every subsequent counter/generation and cleans listeners`, async () => {
    const controller = new AbortController(), f = fake({ signal: controller.signal });
    if (phase === "reserve") f.deps.reserve = async () => { controller.abort(); return true; };
    f.deps.observe = async (stage, event) => { if (phase === `${stage}:${event}`) controller.abort(); };
    const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.code, "aborted");
    const calls = f.requests.length, counts = f.counts.length; await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.requests.length, calls); assert.equal(f.counts.length, counts); assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    if (phase === "select:selected") assert.equal(counts, 1);
    if (phase === "compose:counted" || phase === "compose:generating") assert.equal(calls, 1);
  });
}
for (const waitAt of ["reserve", "count1", "generate1", "count2", "generate2"]) test(`Passages one deadline covers ${waitAt}; late result cannot revive or start next work`, async () => {
  let finish!: (value: unknown) => void; const pending = new Promise(resolve => { finish = resolve; }), f = fake({ timeoutMs: 10 });
  const count = f.deps.count, generate = f.deps.transport;
  if (waitAt === "reserve") f.deps.reserve = async () => { await pending; return true; };
  f.deps.count = async (p, signal) => { const n = p.request.text.format.name === "complete_passage_selection_v1" ? "1" : "2"; if (waitAt === "count" + n) await pending; return count(p, signal); };
  f.deps.transport = async (r, signal) => { const n = r.text.format.name === "complete_passage_selection_v1" ? "1" : "2"; if (waitAt === "generate" + n) await pending; return generate(r, signal); };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.code, "timeout");
  const events = f.events.length; finish(envelope(selected)); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.events.length, events); assert.ok(!("answer" in result));
  if (waitAt.endsWith("1")) assert.ok(!f.events.some(e => e.stage === "compose"));
});
test("Passages invalid inputs/deadline/denied reservation/pre-abort make no model calls", async () => {
  for (const timeoutMs of [0, -1, 120001, NaN]) { const f = fake({ timeoutMs }); const r = await runPassageCandidate(input(), f.deps); assert.ok(!r.ok); assert.equal(f.counts.length, 0); }
  const f = fake({ reserve: async () => false }); const r = await runPassageCandidate(input(), f.deps); assert.ok(!r.ok); assert.equal(r.code, "budget"); assert.equal(f.counts.length, 0);
  const bad = await runPassageCandidate({ ...input(), source: { ...source(), fullText: "clipped" } }, fake().deps); assert.ok(!bad.ok); assert.equal(bad.code, "invalid_input");
  const controller = new AbortController(); controller.abort(); const before = fake({ signal: controller.signal }); const stopped = await runPassageCandidate(input(), before.deps); assert.ok(!stopped.ok); assert.equal(stopped.code, "aborted"); assert.equal(before.reservations(), 0);
  assert.equal(PASSAGE_BOUNDS.operationMs, 120000);
});

for (const where of ["select_count", "select_generation", "compose_count", "compose_generation"] as const) test(`Passages late rejection at ${where} stays terminal`, async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<never>((_resolve, no) => { reject = no; }), f = fake({ timeoutMs: 10 });
  const count = f.deps.count, generate = f.deps.transport;
  f.deps.count = async (p, signal) => {
    if (where === (p.request.text.format.name === "complete_passage_selection_v1" ? "select_count" : "compose_count")) await pending;
    return count(p, signal);
  };
  f.deps.transport = async (r, signal) => {
    if (where === (r.text.format.name === "complete_passage_selection_v1" ? "select_generation" : "compose_generation")) await pending;
    return generate(r, signal);
  };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.code, "timeout");
  const events = f.events.length; reject(new Error("private_late_secret")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.events.length, events); assert.ok(!JSON.stringify(result).includes("private_late_secret"));
});
test("Passages overall deadline is not renewed between stages", async () => {
  const f = fake({ timeoutMs: 100 }), generate = f.deps.transport, count = f.deps.count;
  f.deps.transport = async (r, signal) => { if (r.text.format.name === "complete_passage_selection_v1") await new Promise(resolve => setTimeout(resolve, 60)); return generate(r, signal); };
  f.deps.count = async (p, signal) => { if (p.request.text.format.name === "atomic_passage_statements_v1") await new Promise(resolve => setTimeout(resolve, 60)); return count(p, signal); };
  const result = await runPassageCandidate(input(), f.deps); assert.ok(!result.ok); assert.equal(result.code, "timeout");
  assert.equal(f.requests.length, 1); assert.ok(!("answer" in result));
});
