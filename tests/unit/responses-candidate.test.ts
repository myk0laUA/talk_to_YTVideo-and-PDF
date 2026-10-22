import assert from "node:assert/strict";
import { test } from "node:test";
import { getEventListeners } from "node:events";
import { prepareCandidate, runCandidate, validateCandidateSource, RESPONSES_POLICY, RESPONSES_SCHEMA,
  type CandidateSource, type CandidateTransport } from "../../src/server/text/responses-candidate.ts";
import { createResponsesTransport } from "../../src/server/text/responses-transport.ts";
import { responsesEvaluation } from "../../scripts/responses-eval.ts";

const source = (id = "source_A", text = 'The speaker says violet. 😀 e\u0301 <script>untrusted</script>'): CandidateSource => ({
  id, videoId: id === "source_A" ? "Ks-_Mh1QhMc" : "abcdefghijk", language: "sq",
  fullText: `${text}\n\nTwenty people.`, sections: [
    { id: "segment-19", text, startSeconds: 1040.594, durationSeconds: 0.001 },
    { id: "segment-2", text: "", startSeconds: 1.25, durationSeconds: 0 },
    { id: "segment-355", text: "Twenty people.", startSeconds: 0.125, durationSeconds: 2.37 },
  ],
});
const statement = (segment_ids = ["segment-19"]) => ({ text: "The speaker says violet.", classification: "source_claim", segment_ids, inference_basis: "" });
const envelope = (data: unknown = { statements: [statement()] }) => ({ status: "completed", output: [
  { type: "reasoning", summary: [] }, { type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(data) }] },
], usage: { input_tokens: 100, output_tokens: 40, output_tokens_details: { reasoning_tokens: 12 }, input_tokens_details: { cached_tokens: 50 } } });
const setup = (s = source()) => prepareCandidate({ source: s, question: "Summarize." });
const run = (raw: unknown, prepared = setup()) => runCandidate(prepared, { transport: async () => raw,
  tokenBound: { requestSha256: prepared.requestSha256, basis: "responses.input_tokens", inputTokens: 100 } });

test("Responses evaluation import is inert; explicit valid invocation required", async () => {
  await assert.rejects(responsesEvaluation([]), /Usage/u);
});

test("Responses full ordered source, empty captions, exact fractional locators, untrusted Unicode and history preserved", async () => {
  const original = { ...source(), sections: source().sections.map(s => ({ ...s })) }, history = [{ role: "user" as const, content: "Before" }, { role: "assistant" as const, content: "A bounded answer" }];
  const p = prepareCandidate({ source: original, question: "Now", history });
  const canonical = JSON.parse(p.request.input[0].content).canonical_source;
  assert.deepEqual(canonical.sections, original.sections);
  assert.equal(canonical.sections.map((s: { text: string }) => s.text).join(canonical.separator), original.fullText);
  assert.deepEqual(p.request.input.slice(1), [...history, { role: "user", content: "Now" }]);
  assert.ok(!p.request.input[0].content.includes("sectionIndex"));
  original.sections[0] = { ...original.sections[0], text: "mutated" };
  history[0].content = "changed"; assert.notEqual(p.source.sections[0].text, "mutated"); assert.equal(p.request.input[1].content, "Before");
  assert.ok(Object.isFrozen(p.source.sections[0])); assert.ok(Object.isFrozen(p.request.text.format.schema.properties));
  const r = await run(envelope(), p); assert.ok(r.ok); assert.equal(r.statements[0].references[0].startSeconds, 1040.594);
  assert.equal(r.statements[0].references[0].durationSeconds, 0.001);
  assert.equal(r.statements[0].references[0].url, "https://www.youtube.com/watch?v=Ks-_Mh1QhMc&t=1040.594s");
  assert.deepEqual(r.usage, { inputTokens: 100, outputTokens: 40, reasoningTokens: 12, cachedTokens: 50 });
});

test("Responses fixed request policy, no provider conversation or tools, strict schema throughout", () => {
  const r = setup().request;
  assert.equal(r.model, "gpt-5.4-mini-2026-03-17"); assert.deepEqual(r.reasoning, { effort: "medium" });
  assert.equal(r.max_output_tokens, 4096); assert.equal(r.truncation, "disabled"); assert.equal(r.store, false);
  assert.equal(r.background, false); assert.equal(r.stream, false); assert.deepEqual(r.tools, []);
  assert.ok(!("previous_response_id" in r)); assert.ok(!("conversation" in r));
  assert.equal(r.text.format.strict, true);
  const s = RESPONSES_SCHEMA; assert.equal(s.additionalProperties, false); assert.deepEqual(s.required, ["statements"]);
  assert.equal(s.properties.statements.items.additionalProperties, false);
  assert.equal(s.properties.statements.items.required.length, 4);
});

for (const ids of [[], ["segment-999"], ["segment-19", "segment-999"], ["segment-2"], ["19"], ["segment-019"]]) {
  test(`Responses unsupported references preserve answer, no repair or verified status: ${ids.join(",")}`, async () => {
    const r = await run(envelope({ statements: [statement(ids)] })); assert.ok(r.ok);
    assert.equal(r.answer, "The speaker says violet."); assert.equal(r.statements[0].evidenceState, "unconfirmed");
    assert.equal(r.statements[0].semanticSupport, "not_evaluated");
    assert.ok(r.statements[0].references.some(x => x.state === "unconfirmed") || ids.length === 0);
    assert.ok(!JSON.stringify(r).includes('"verified"'));
  });
}
test("Responses matching unrelated captions is membership only; source A/B with same IDs remains isolated", async () => {
  const a = await run(envelope()), b = await run(envelope(), setup(source("source_B", "B only")));
  assert.ok(a.ok && b.ok); assert.equal(b.sourceId, "source_B");
  assert.equal(b.statements[0].references[0].excerpt, "B only"); assert.equal(b.statements[0].semanticSupport, "not_evaluated");
  assert.ok(!JSON.stringify(b).includes("violet. 😀")); assert.notEqual(a.statements[0].references[0].url, b.statements[0].references[0].url);
});
test("Responses unavailable evidence stays unavailable; inference has labelled source basis", async () => {
  const r = await run(envelope({ statements: [
    { text: "The source does not provide it.", classification: "unavailable", segment_ids: [], inference_basis: "" },
    { text: "This may indicate violet.", classification: "inference", segment_ids: ["segment-19"], inference_basis: "The speaker describes violet." },
  ] }));
  assert.ok(r.ok); assert.equal(r.statements[0].evidenceState, "unavailable"); assert.match(r.answer, /Inference: This may indicate violet/u);
  const conflict = await run(envelope({ statements: [{ ...statement(), classification: "unavailable" }] }));
  assert.ok(conflict.ok); assert.equal(conflict.statements[0].evidenceState, "unconfirmed"); assert.equal(conflict.statements[0].references[0].excerpt, undefined);
});

const malformed: Record<string, unknown> = {
  extraRoot: { statements: [statement()], prose: "extra" }, empty: { statements: [] },
  tooMany: { statements: Array.from({ length: 9 }, () => statement()) }, tooLong: { statements: [{ ...statement(), text: "x".repeat(601) }] },
  blank: { statements: [{ ...statement(), text: "  " }] }, extraStatement: { statements: [{ ...statement(), url: "https://wrong" }] },
  tooManyRefs: { statements: [statement(Array(17).fill("segment-19"))] }, badId: { statements: [statement(["x".repeat(129)])] },
  missing: { statements: [{ text: "x" }] }, badClass: { statements: [{ ...statement(), classification: "verified" }] },
  coercedClass: { statements: [{ ...statement(), classification: ["source_claim"] }] },
  inferenceWithoutBasis: { statements: [{ ...statement(), classification: "inference" }] },
  sourceWithBasis: { statements: [{ ...statement(), inference_basis: "outside knowledge" }] },
};
for (const [name, data] of Object.entries(malformed)) test(`Responses validates server bounds ${name}`, async () => {
  const r = await run(envelope(data)); assert.ok(!r.ok); assert.equal(r.code, "malformed"); assert.ok(!("answer" in r));
});
for (const [name, raw, code] of [
  ["refusal", { ...envelope(), output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "No" }] }] }, "refusal"],
  ["token exhaustion", { ...envelope(), status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }, "incomplete"],
  ["failed", { status: "failed", output: [] }, "provider_failure"],
  ["partial JSON", { ...envelope(), output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: '{"statements":[' }] }] }, "malformed"],
  ["pending message", { ...envelope(), output: [{ ...envelope().output[1], status: "in_progress" }] }, "malformed"],
  ["no output", { ...envelope(), output: [] }, "malformed"],
  ["raw text", "unstructured", "malformed"],
  ["unexpected tool", { ...envelope(), output: [{ type: "function_call" }] }, "malformed"],
] as const) test(`Responses explicit ${name} without raw JSON prose`, async () => {
  const r = await run(raw); assert.ok(!r.ok); assert.equal(r.code, code); assert.ok(!("answer" in r));
});

test("Responses no call on invalid/budget/forged source; no ambient source lookup", async () => {
  for (const change of [{ fullText: "clipped" }, { videoId: "bad" }, { sections: [] },
    { sections: [source().sections[0], source().sections[0]] }, { sections: [{ ...source().sections[0], startSeconds: NaN }] }]) {
    assert.throws(() => validateCandidateSource({ ...source(), ...change }));
  }
  assert.throws(() => prepareCandidate({ source: source(), question: "x", history: [{ role: "user", content: "x".repeat(16001) }] }));
  const p = setup(); let calls = 0;
  for (const bound of [0, NaN, Infinity, -1, 1.5, 128001]) {
    const r = await runCandidate(p, { transport: async () => { calls++; return envelope(); }, tokenBound: { basis: "responses.input_tokens", requestSha256: p.requestSha256, inputTokens: bound } });
    assert.ok(!r.ok); assert.equal(r.code, "budget");
  }
  const r = await runCandidate(p, { transport: async () => { calls++; }, tokenBound: { basis: "responses.input_tokens", requestSha256: "different", inputTokens: 1 } });
  assert.ok(!r.ok); assert.equal(r.code, "budget"); assert.equal(calls, 0);
  const forged = await run(envelope(), { ...p }); assert.ok(!forged.ok); assert.equal(forged.code, "invalid_input");
});

test("Responses transport error makes one attempt, sanitizes exceptions", async () => {
  const p = setup(); let calls = 0;
  const r = await runCandidate(p, { tokenBound: { basis: "responses.input_tokens", requestSha256: p.requestSha256, inputTokens: 1 }, transport: async () => { calls++; throw new Error("private secret"); } });
  assert.ok(!r.ok); assert.equal(r.code, "transport"); assert.equal(calls, 1); assert.ok(!JSON.stringify(r).includes("secret"));
});
for (const kind of ["resolve", "reject"] as const) test(`Responses timeout and late ${kind} cannot revive output`, async () => {
  const p = setup(); let finish!: (v?: unknown) => void, seenSignal: AbortSignal | undefined;
  const transport: CandidateTransport = (_r, s) => { seenSignal = s; return new Promise((resolve, reject) => { finish = kind === "resolve" ? resolve : reject; }); };
  const r = await runCandidate(p, { transport, timeoutMs: 5, tokenBound: { basis: "responses.input_tokens", requestSha256: p.requestSha256, inputTokens: 1 } });
  assert.ok(!r.ok); assert.equal(r.code, "timeout"); assert.equal(seenSignal?.aborted, true); finish(envelope());
  await new Promise(resolve => setImmediate(resolve)); assert.ok(!("answer" in r));
});
test("Responses abort before/during call, listener cleanup, independent fresh run", async () => {
  const p = setup(), tokenBound = { basis: "responses.input_tokens" as const, requestSha256: p.requestSha256, inputTokens: 1 };
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const before = await runCandidate(p, { tokenBound, signal: controller.signal, transport: async () => { calls++; } });
  assert.ok(!before.ok); assert.equal(before.code, "aborted"); assert.equal(calls, 0);
  const active = new AbortController();
  const waiting = runCandidate(p, { tokenBound, signal: active.signal, transport: async () => { calls++; active.abort(); return envelope(); } });
  const result = await waiting; assert.ok(!result.ok); assert.equal(result.code, "aborted"); assert.equal(calls, 1);
  assert.equal(getEventListeners(active.signal, "abort").length, 0);
  const fresh = await run(envelope()); assert.ok(fresh.ok);
});

test("Responses fixed HTTP transport counts complete schema/instructions/history, rejects bad counts and bounded bodies", async () => {
  const seen: { url: string; init?: RequestInit }[] = [], p = setup();
  const fetcher = (async (url, init) => { seen.push({ url: String(url), init }); return Response.json(String(url).endsWith("input_tokens") ? { object: "response.input_tokens", input_tokens: 128000 } : envelope()); }) as typeof fetch;
  const transport = createResponsesTransport("sk-synthetic-candidate-only", fetcher), signal = new AbortController().signal;
  const count = await transport.count(p, signal); assert.equal(count.inputTokens, 128000);
  const counted = JSON.parse(String(seen[0].init?.body));
  for (const k of ["model", "instructions", "input", "text", "tools", "reasoning"] as const) assert.deepEqual(counted[k], p.request[k]);
  assert.equal(seen[0].init?.redirect, "error"); assert.equal(seen[0].url, "https://api.openai.com/v1/responses/input_tokens");
  const r = await runCandidate(p, { tokenBound: count, transport: transport.generate }); assert.ok(r.ok); assert.equal(seen.length, 2);
  for (const bad of [128001, null, 0, -1]) await assert.rejects(createResponsesTransport("sk-synthetic-candidate-only", (async () => Response.json({ object: "response.input_tokens", input_tokens: bad })) as typeof fetch).count(p, signal), /candidate_token_bound/u);
  await assert.rejects(createResponsesTransport("sk-synthetic-candidate-only", (async () => new Response("x".repeat(RESPONSES_POLICY.responseBytes + 1))) as typeof fetch).generate(p.request, signal), /bounds/u);
  await assert.rejects(createResponsesTransport("sk-synthetic-candidate-only", (async () => new Response("private error", { status: 401 })) as typeof fetch).generate(p.request, signal), /^Error: candidate_http_401$/u);
});
