import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import ts from "typescript";
import { TranscriptStore, TRANSCRIPT_LIMITS, type TranscriptLimits } from "../../src/shared/transcript.ts";
import { emptyResponse } from "../../src/shared/voice-response.ts";
import { voiceHarness } from "../priming/voice-harness.ts";
import { flush } from "../priming/harness.ts";

const identity = Object.freeze({ sourceId: "source_A", runId: "run_A", connectionId: "connection_A" });
const traces: unknown[] = [], limits: unknown[] = [];
let sequence = 0, providerCalls = 0;
const originalFetch = globalThis.fetch;
before(() => { globalThis.fetch = async () => { providerCalls++; throw new Error("External calls forbidden"); }; });
after(async () => {
  globalThis.fetch = originalFetch; assert.equal(providerCalls, 0);
  await mkdir("artifacts/local/09a", { recursive: true });
  await writeFile("artifacts/local/09a/transcript-matrix.json", JSON.stringify({ checkedUtc: new Date().toISOString(),
    context: "fixture-only, actual 07B/08A/08B composition, fake media/clock; no grounding/audibility evidence", providerCalls, traces, limits }, null, 2));
});
const event = (type: string, fields: object = {}) => ({ event_id: `transcript_${++sequence}`, type, ...fields });
const user = (itemId = "user_A", previous: string | null | undefined = "priming_A", content: object[] = [{ type: "input_audio" }]) => event("conversation.item.added", {
  previous_item_id: previous, item: { id: itemId, type: "message", role: "user", content },
});
const committed = (itemId = "user_A", previous: string | null | undefined = "priming_A") => event("input_audio_buffer.committed", { item_id: itemId, previous_item_id: previous });
const created = (id = "response_A", conv: unknown = "conv_fixture") => event("response.created", { response: { id, status: "in_progress", conversation_id: conv } });
const item = (id = "assistant_A", content: object[] = []) => ({ id, type: "message", role: "assistant", content });
const output = (itemId = "assistant_A", responseId = "response_A", at = 0, content: object[] = []) => event("response.output_item.added", {
  response_id: responseId, output_index: at, item: item(itemId, content),
});
const link = (itemId = "assistant_A", previous: string | null | undefined = "user_A") => event("conversation.item.added", {
  previous_item_id: previous, item: item(itemId),
});
const input = (kind: string, text: unknown = "question", itemId = "user_A", at: unknown = 0) => event(`conversation.item.input_audio_transcription.${kind}`, {
  item_id: itemId, content_index: at, ...(kind === "completed" ? { transcript: text } : kind === "failed" ? { error: { message: "PRIVATE_ERROR", code: "private" } } : { delta: text }),
});
const text = (kind: string, value: unknown = "answer", audio = true, itemId = "assistant_A", responseId = "response_A", at: unknown = 0, out: unknown = 0) => event(`response.${audio ? "output_audio_transcript" : "output_text"}.${kind}`, {
  item_id: itemId, response_id: responseId, content_index: at, output_index: out,
  ...(kind === "done" ? audio ? { transcript: value } : { text: value } : { delta: value }),
});
const done = (status = "completed", contents: object[] = [], id = "response_A") => event("response.done", { response: { id, status, output: contents } });
function store(overrides: Partial<TranscriptLimits> = {}) {
  const s = new TranscriptStore(overrides); s.start(identity, ["priming_A"]);
  const emit = (...events: unknown[]) => events.forEach(e => s.receive(identity, e));
  return { s, emit, snap: () => s.snapshot };
}
function exchange(overrides: Partial<TranscriptLimits> = {}) {
  const h = store(overrides); h.emit(user(), created(), output(), link()); return h;
}

test("08N delayed ASR and duplicate/interleaved events never assign assistant output to user", () => {
  const h = exchange();
  const answer = text("delta", "The neutral guide describes three paths.");
  h.emit(answer, answer, committed("user_B", "assistant_A"), user("user_B", "assistant_A"));
  h.emit(created("response_B"), output("assistant_B", "response_B"), link("assistant_B", "user_B"));
  h.emit(text("done", "Path two is shorter.", true, "assistant_B", "response_B"));
  h.emit(input("completed", "Please summarize the guide."), input("completed", "Which path is shorter?", "user_B"));
  // Deliberately cross the item/response roles; neither projection has authority.
  h.emit(text("done", "must not cross", true, "user_B", "response_B"), input("completed", "must not cross", "assistant_A"));
  assert.deepEqual(h.snap().turns.map(t => [t.role, t.parts[0]?.text]), [
    ["user", "Please summarize the guide."], ["assistant", "The neutral guide describes three paths."],
    ["user", "Which path is shorter?"], ["assistant", "Path two is shorter."],
  ]);
});

test("08N characterize interruption label separately from completed generation and absent cancellation", () => {
  const h = exchange(); h.emit(text("delta", "A neutral guide summary."));
  h.s.observe(identity, { ...emptyResponse(), interruption: { state: "pending", responseId: "response_A", origin: "vad" } });
  assert.equal(h.snap().turns[1].interrupted, true); // Existing presentation flag includes pending/failed.
  assert.equal(h.snap().turns[1].interruption, "pending");
  h.emit(done("completed"));
  h.s.observe(identity, { ...emptyResponse(), interruption: { state: "failed", responseId: "response_A", origin: "vad", failure: "timeout" } });
  assert.equal(h.snap().turns[1].interrupted, true); assert.equal(h.snap().turns[1].interruption, "failed");
  assert.equal(h.snap().turns[1].generation, "completed"); assert.equal(h.snap().turns[1].terminal?.reason, "completed");
});

test("08K incomplete terminal reason retains partial text through late text final and Stop", () => {
  const h = exchange(); h.emit(text("delta", "Partial summary"));
  h.emit(event("response.done", { response: { id: "response_A", status: "incomplete",
    status_details: { reason: "max_output_tokens", error: { message: "PRIVATE" } },
    usage: { output_tokens: 512 }, output: [] } }));
  h.emit(text("done", "Partial summary"), done("completed"));
  h.s.stop(); const turn = h.snap().turns[1];
  assert.equal(turn.generation, "incomplete");
  assert.equal(turn.terminal?.reason, "max_output_tokens");
  assert.equal(turn.parts[0].text, "Partial summary");
  assert.doesNotMatch(JSON.stringify(h.snap()), /PRIVATE/);
});

test("09C real ASR shapes preserve two content identities, failure drafts and stopped/stale isolation", () => {
  const h = exchange();
  const delta = input("delta", "partial speech"); h.emit(delta, delta);
  h.emit(input("completed", "second audio part", "user_A", 1), input("delta", "late ignored", "user_A", 1));
  h.emit(text("delta", "received answer"), done("cancelled"), input("failed"));
  assert.deepEqual(h.snap().turns.map(t => t.role), ["user", "assistant"]);
  assert.deepEqual(h.snap().turns[0].parts.map(p => [p.index, p.text, p.state]), [[0, "partial speech", "transcription_failed"], [1, "second audio part", "final"]]);
  assert.equal(h.snap().turns[1].generation, "cancelled");
  h.s.stop(); const stopped = h.snap(); h.emit(input("completed", "late final")); assert.deepEqual(h.snap(), stopped);
  const next = { ...identity, runId: "fresh09c", connectionId: "freshConnection09c" };
  h.s.start(next, ["priming_A"]); h.s.receive(identity, input("completed", "stale"));
  assert.equal(h.snap().turns.length, 0); h.s.reset(); assert.equal(h.snap().phase, "idle");
});
test("late user ASR fills its original turn across two responses and exact Unicode final", () => {
  const h = exchange(), exact = "  Café e\u0301 👩🏽‍🚀\n<script>& **plain**\t ";
  const draft = text("delta", "draft"); h.emit(draft, draft, text("done", exact), done());
  h.emit(user("user_B", "assistant_A"), created("response_B"), output("assistant_B", "response_B"), link("assistant_B", "user_B"),
    text("done", "second", true, "assistant_B", "response_B"), done("completed", [], "response_B"),
    input("completed", "first question"), input("completed", "second question", "user_B"));
  assert.deepEqual(h.snap().turns.map(t => t.itemId), ["user_A", "assistant_A", "user_B", "assistant_B"]);
  assert.deepEqual(h.snap().turns.map(t => t.parts[0].text), ["first question", exact, "second question", "second"]);
  assert.equal(h.snap().turns[1].playback, "unconfirmed"); assert.equal(h.snap().incomplete, false);
  traces.push({ scenario: "late-ASR-two-turn-order-exact-text", snapshot: h.snap() });
});

for (const audio of [false, true]) for (const reversed of [false, true]) test(`normalized ${audio ? "audio" : "text"}, final/delta reversed=${reversed}`, () => {
  const h = exchange(), draft = text("delta", "DRAFT", audio), final = text("done", " FINAL 🌍\n", audio);
  h.emit(...(reversed ? [final, draft, draft, final] : [draft, draft, final, final]), text("delta", "late", audio), text("done", "conflicting duplicate", audio));
  assert.equal(h.snap().turns[1].parts.length, 1); assert.equal(h.snap().turns[1].parts[0].text, " FINAL 🌍\n");
});
test("input delta ID dedup, completed before late delta, duplicate terminal stable", () => {
  const h = exchange(), e = input("delta", "part"); h.emit(e, e); assert.equal(h.snap().turns[0].parts[0].text, "part");
  h.emit(input("completed", "whole"), input("delta", "late"), input("completed", "changed"));
  assert.equal(h.snap().turns[0].parts[0].text, "whole");
});
test("response.done output is authoritative over modality/part/item finals without duplicate bubbles", () => {
  const h = exchange(); h.emit(text("done", "modality"), event("response.content_part.done", { item_id: "assistant_A", response_id: "response_A", output_index: 0, content_index: 0, part: { type: "audio", transcript: "part" } }),
    event("response.output_item.done", { response_id: "response_A", output_index: 0, item: item("assistant_A", [{ type: "audio", transcript: "item" }]) }),
    done("completed", [item("assistant_A", [{ type: "output_audio", transcript: "response final" }])]), text("done", "late modality"),
    done("completed", [item("assistant_A", [{ type: "output_audio", transcript: "duplicate final" }])]));
  assert.equal(h.snap().turns.length, 2); assert.equal(h.snap().turns[1].parts[0].text, "response final");
});
test("response.done before transcript.done leaves draft until dedicated final arrives", () => {
  const h = exchange(); h.emit(text("delta", "draft"), done());
  assert.equal(h.snap().turns[1].generation, "completed"); assert.equal(h.snap().turns[1].parts[0].state, "draft");
  h.emit(text("done", "exact final")); assert.equal(h.snap().turns[1].parts[0].text, "exact final");
});
test("added-part/item snapshots cannot regress a delta draft", () => {
  const h = exchange(); h.emit(text("delta", "draft"), output("assistant_A", "response_A", 0, [{ type: "audio", transcript: "" }]),
    event("response.content_part.added", { item_id: "assistant_A", response_id: "response_A", output_index: 0, content_index: 0, part: { type: "audio", transcript: "" } }));
  assert.equal(h.snap().turns[1].parts[0].text, "draft");
});
test("multiple distinct content parts, reverse output indexes and late predecessors", () => {
  const h = store(); h.emit(created(), output("assistant_B", "response_A", 1), text("done", "second item", false, "assistant_B", "response_A", 0, 1),
    output(), text("done", "part one", true, "assistant_A", "response_A", 0), text("done", "part two", false, "assistant_A", "response_A", 1),
    link("assistant_B", "assistant_A"), link(), user());
  assert.deepEqual(h.snap().turns.map(t => t.itemId), ["user_A", "assistant_A", "assistant_B"]);
  assert.deepEqual(h.snap().turns[1].parts.map(p => [p.index, p.kind, p.text]), [[0, "output_audio", "part one"], [1, "output_text", "part two"]]);
  assert.equal(h.snap().ordering, "established");
});
test("committed predecessor permits ASR before item.added, later item completion cannot erase it", () => {
  const h = store(); h.emit(committed(), input("completed", "spoken"), user(), event("conversation.item.done", { previous_item_id: "priming_A", item: { id: "user_A", type: "message", role: "user", content: [{ type: "input_audio", transcript: "not ASR authority" }] } }));
  assert.equal(h.snap().turns[0].parts[0].text, "spoken");
});
test("genuine input_text item normalized, and trusted priming IDs excluded even in aggregate output", () => {
  const h = store(); h.emit(user("priming_A", null, [{ type: "input_text", text: "SOURCE_PRIVATE" }]), input("completed", "SOURCE_PRIVATE", "priming_A"),
    user("typed", "priming_A", [{ type: "input_text", text: "typed draft" }]));
  h.emit(event("conversation.item.done", { previous_item_id: "priming_A", item: { id: "typed", type: "message", role: "user", content: [{ type: "input_text", text: "typed final" }] } }),
    created(), done("completed", [item("priming_A", [{ type: "output_text", text: "SOURCE_PRIVATE" }])]));
  assert.equal(h.snap().turns.length, 1); assert.equal(h.snap().turns[0].parts[0].text, "typed final");
  assert.doesNotMatch(JSON.stringify(h.snap()), /SOURCE_PRIVATE/);
});
for (const status of ["cancelled", "failed", "incomplete"]) test(`response ${status} preserves useful text separately from ASR failure`, () => {
  const h = exchange(); h.emit(text("done", "generated words"), done(status), input("delta", "rough"), input("failed"), input("delta", "late"));
  assert.equal(h.snap().turns[1].generation, status); assert.equal(h.snap().turns[1].parts[0].text, "generated words");
  assert.equal(h.snap().turns[0].parts[0].text, "rough"); assert.equal(h.snap().turns[0].parts[0].state, "transcription_failed");
  assert.doesNotMatch(JSON.stringify(h.snap()), /PRIVATE_ERROR|private/); traces.push({ scenario: status, snapshot: h.snap() });
});
for (const first of ["completed", "failed"]) test(`ASR ${first} first terminal wins`, () => {
  const h = exchange(); h.emit(input(first, "terminal"), input(first === "completed" ? "failed" : "completed", "changed"));
  assert.equal(h.snap().turns[0].parts[0].state, first === "completed" ? "final" : "transcription_failed");
});
test("unknown and foreign response/item IDs cannot create correlated text", () => {
  const h = exchange(); h.emit(created("foreign", "conv_other"), output("foreign_item", "foreign"), text("done", "LEAK", true, "foreign_item", "foreign"),
    text("done", "LEAK", true, "assistant_A", "foreign"), text("done", "LEAK", true, "unknown"), input("completed", "LEAK", "unknown"),
    event("response.done", { response: { id: "response_A", status: "completed", conversation_id: null, output: [item("assistant_A", [{ type: "output_audio", transcript: "LEAK" }])] } }),
    { ...user("other"), conversation_id: "conv_other" });
  assert.equal(h.snap().turns.length, 2); assert.doesNotMatch(JSON.stringify(h.snap()), /LEAK|foreign_item|other/);
});
for (const conv of [null, undefined, 123, "invalid id"]) test(`out-of-band or uncorrelated conversation ${conv} ignored`, () => {
  const h = store(); h.emit(event("response.created", { response: { id: "bad", status: "in_progress", conversation_id: conv } }), output("bad_item", "bad"), text("done", "LEAK", true, "bad_item", "bad"));
  assert.equal(h.snap().counts.responses, 0); assert.equal(h.snap().counts.items, 0);
});
test("provisional first-seen ordering resolves missing predecessor without moving established unrelated turns", () => {
  const h = store(); h.emit(user("established_A", null), user("provisional", "missing"), user("established_B", "established_A"));
  assert.equal(h.snap().ordering, "provisional");
  h.emit(user("missing", "established_B"));
  assert.equal(h.snap().ordering, "established");
  assert.deepEqual(h.snap().turns.filter(t => ["established_A", "established_B"].includes(t.itemId)).map(t => t.itemId), ["established_A", "established_B"]);
});
test("missing/null/unknown predecessor, cycles and conflicting links terminate deterministically", () => {
  const h = store(); h.emit(user("root", null), user("missing_prev", undefined), user("cycle_A", "cycle_B"), user("cycle_B", "cycle_A"),
    user("root", "cycle_A"), user("unrelated", "root"));
  assert.equal(h.snap().ordering, "conflict"); assert.equal(h.snap().turns.length, 5);
  assert.deepEqual(h.snap(), h.snap()); traces.push({ scenario: "ordering-conflict-cycle-missing", snapshot: h.snap() });
});
test("conflicting output index/item/part kind never aliases text into the wrong slot", () => {
  const h = exchange(); h.emit(text("done", "audio"), output("different", "response_A", 0), output("assistant_A", "response_A", 1), text("done", "wrong", false), text("done", "wrong", true, "assistant_A", "response_A", 0, 1));
  assert.equal(h.snap().turns.length, 2); assert.equal(h.snap().turns[1].parts[0].text, "audio"); assert.equal(h.snap().ordering, "conflict");
});

const malformed = [null, [], {}, { type: "response.done", event_id: "invalid id" }, event("response.output_text.done", { item_id: "assistant_A", response_id: "response_A", output_index: 0, content_index: -1, text: "LEAK" }),
  { ...input("delta", "LEAK"), content_index: undefined }, input("completed", {}, "user_A"), text("delta", {}, true), input("failed", "ignored", "user_A", -1), event("unrelated", { source: "LEAK", clientSecret: "LEAK" })];
malformed.forEach((e, i) => test(`malformed event ${i} stores no raw payload`, () => {
  const h = exchange(); h.emit(e); assert.doesNotMatch(JSON.stringify(h.snap()), /LEAK|clientSecret|source-priming-v1/);
  assert.equal(h.snap().counts.characters, 0);
}));

const limitCases: { key: keyof TranscriptLimits; setup: () => ReturnType<typeof store>; overflow: (h: ReturnType<typeof store>) => void }[] = [
  { key: "items", setup: () => store({ items: 1 }), overflow: h => h.emit(user("one", null), user("two", "one")) },
  { key: "partsPerItem", setup: () => exchange({ partsPerItem: 1 }), overflow: h => h.emit(text("done", "one"), text("done", "two", true, "assistant_A", "response_A", 1)) },
  { key: "partCharacters", setup: () => exchange({ partCharacters: 3 }), overflow: h => h.emit(text("delta", "abc"), text("delta", "d")) },
  { key: "totalCharacters", setup: () => exchange({ totalCharacters: 4 }), overflow: h => h.emit(input("completed", "ab"), text("done", "cde")) },
  { key: "eventIds", setup: () => store({ eventIds: 2 }), overflow: h => h.emit(user(), input("delta", "a"), input("delta", "b")) },
  { key: "responses", setup: () => store({ responses: 1 }), overflow: h => h.emit(created(), created("second")) },
  { key: "pending", setup: () => store({ pending: 1 }), overflow: h => h.emit(user("one", "missing"), user("two", "missing")) },
];
for (const c of limitCases) test(`explicit ${c.key} limit freezes text until reset/new session`, () => {
  const h = c.setup(); c.overflow(h); assert.equal(h.snap().phase, "limited"); assert.equal(h.snap().limit, c.key); assert.equal(h.snap().incomplete, true);
  const frozen = h.snap(); h.emit(input("completed", "RESURRECTION"), user("new", null), text("done", "RESURRECTION")); assert.deepEqual(h.snap(), frozen);
  limits.push({ limit: c.key, snapshot: frozen }); h.s.stop(); assert.equal(h.snap().limit, c.key);
  h.s.start({ ...identity, runId: "run_B" }, []); assert.equal(h.snap().turns.length, 0); assert.equal(h.snap().phase, "active");
});
test("oversized final/array/aggregate, and invalid limit configuration fail explicitly without truncated text", () => {
  const h = exchange(); h.emit(text("done", "x".repeat(TRANSCRIPT_LIMITS.partCharacters + 1)));
  assert.equal(h.snap().limit, "partCharacters"); assert.equal(h.snap().counts.characters, 0);
  const g = exchange(); g.emit(done("completed", [item("assistant_A", Array.from({ length: 17 }, () => ({ type: "output_text", text: "x" })))]));
  assert.equal(g.snap().limit, "partsPerItem");
  for (const value of [0, -1, Infinity, 1.5, TRANSCRIPT_LIMITS.items + 1]) assert.throws(() => new TranscriptStore({ items: value }));
});
test("snapshot and input mutation cannot corrupt store; stop/reset/dispose reject late identities", () => {
  const h = exchange(), e = text("done", "retained"); h.emit(e); Object.assign(e, { transcript: "mutated input" });
  const snap = h.snap(); assert.throws(() => { (snap.turns[1].parts[0] as { text: string }).text = "mutated snapshot"; });
  h.s.stop(); const stopped = h.snap(); h.emit(text("done", "late")); assert.deepEqual(h.snap(), stopped);
  assert.equal(stopped.turns[1].parts[0].text, "retained"); assert.equal(stopped.turns[0].parts[0].state, "unfinished");
  h.s.reset(); assert.equal(h.snap().identity, undefined); assert.equal(h.snap().counts.characters, 0);
  h.s.start({ ...identity, sourceId: "source_B", runId: "run_B", connectionId: "connection_B" }, []);
  h.emit(user(), text("done", "late A")); assert.equal(h.snap().turns.length, 0);
  h.s.dispose(); assert.equal(h.snap().phase, "disposed"); assert.equal(h.snap().identity, undefined); assert.equal(h.s.start(identity, []), false);
});

async function composed() {
  const h = await voiceHarness(); await h.begin(); await h.ready();
  const r = h.all[0], baseline = r.transport.outbound.length, emit = (...events: unknown[]) => events.forEach(e => r.transport.emit(e));
  const primingId = h.inputs.get("voice_1")!.manifest.items.at(-1)!.item.id;
  emit(user("user_A", primingId), created(), output(), link());
  return { ...h, r, emit, baseline };
}
test("actual 07B/08A/08B two-turn composition, interrupt and next response preserve text with honest playback", async () => {
  const h = await composed(), draft = text("delta", "generated draft"); h.emit(draft, draft, text("done", "generated full; not necessarily heard"));
  h.emit(event("output_audio_buffer.started", { response_id: "response_A" }));
  assert.equal(h.controller.interruptCurrentResponse(), true); await flush();
  h.emit(done("cancelled"), event("output_audio_buffer.cleared", { response_id: "response_A" }), input("completed", "late first question")); await flush();
  h.emit(user("user_B", "assistant_A"), created("response_B"), output("assistant_B", "response_B"), link("assistant_B", "user_B"),
    text("done", "second answer", true, "assistant_B", "response_B"), done("completed", [], "response_B"), input("completed", "follow-up", "user_B"));
  const snapshot = h.controller.transcript;
  assert.deepEqual(snapshot.turns.map(t => t.itemId), ["user_A", "assistant_A", "user_B", "assistant_B"]);
  assert.equal(snapshot.turns[1].interrupted, true); assert.equal(snapshot.turns[1].interruption, "confirmed");
  assert.equal(snapshot.turns[1].generation, "cancelled"); assert.equal(snapshot.turns[1].playback, "unconfirmed");
  assert.equal(snapshot.turns[1].parts[0].text, "generated full; not necessarily heard");
  assert.deepEqual(h.r.transport.outbound.slice(h.baseline).map(e => e.type), ["response.cancel", "output_audio_buffer.clear"]);
  h.clean(); traces.push({ scenario: "composed-interrupt-next-response", snapshot, cleanup: h.trace("composed"), afterStop: h.controller.transcript });
});
test("actual composition excludes every manifest source item and raw errors with zero new commands/media changes", async () => {
  const h = await composed(), sourceBefore = structuredClone(h.a.row), tracks = h.r.tracks.map(t => t.enabled);
  const manifest = h.inputs.get("voice_1")!.manifest;
  for (const m of manifest.items) h.emit(h.r.transport.item(m), input("completed", m.item.content[0].text, m.item.id), text("done", m.item.content[0].text, true, m.item.id));
  h.emit(text("delta", "safe draft"), input("failed"));
  assert.equal(h.controller.transcript.counts.items, 2); assert.doesNotMatch(JSON.stringify(h.controller.transcript), /source-priming-v1|PRIVATE_ERROR|clientSecret|ownerHash/);
  assert.deepEqual(h.a.row, sourceBefore); assert.deepEqual(h.r.tracks.map(t => t.enabled), tracks);
  assert.equal(h.r.transport.outbound.length, h.baseline); assert.equal(h.r.counts.attaches, 1); assert.equal(h.r.counts.plays, 0);
  h.clean(); traces.push({ scenario: "manifest-exclusion-no-commands", cleanup: h.trace("manifest-exclusion") });
});
for (const action of ["stop", "replacement", "source-reset", "dispose"] as const) test(`composed ${action} rejects late A events and releases all resources`, async () => {
  const h = await composed(); h.emit(text("delta", "A draft")); const stale = h.r.transport.stale!;
  if (action === "dispose") h.controller.dispose(); else if (action === "source-reset") h.controller.reset(); else h.controller.stop();
  const finished = h.controller.transcript;
  if (action === "source-reset") assert.equal(finished.counts.characters, 0);
  if (action === "replacement") { h.selectB(); await h.begin(); await h.ready(); }
  stale(text("done", "LATE_A_PRIVATE")); stale(user("late_A", null));
  if (action === "replacement") assert.equal(h.controller.transcript.turns.length, 0);
  else assert.deepEqual(h.controller.transcript, finished);
  h.clean(); h.controller.dispose(); assert.equal(h.controller.transcript.counts.characters, 0);
  traces.push({ scenario: action, cleanup: h.trace(action), disposed: h.controller.transcript });
});
test("unavailable production admission acquires zero transport/media and keeps transcript empty", async () => {
  const h = await voiceHarness(true); await h.begin(); assert.equal(h.calls.connect, 0); assert.equal(h.calls.media, 0);
  assert.equal(h.controller.transcript.counts.items, 0); h.clean(); traces.push({ scenario: "default-unavailable", cleanup: h.trace("default-unavailable") });
});
test("08B interruption facts alone never infer a heard prefix, timers or commands", () => {
  const h = exchange(); h.emit(text("done", "all generated words"));
  h.s.observe(identity, { ...emptyResponse(), interruption: { state: "failed", responseId: "response_A", failure: "timeout", origin: "manual" }, output: { state: "unknown", responseId: "response_A" } });
  assert.equal(h.snap().turns[1].interrupted, true); assert.equal(h.snap().turns[1].playback, "unconfirmed");
  assert.equal(h.snap().turns[1].parts[0].text, "all generated words");
  h.s.observe({ ...identity, connectionId: "stale" }, emptyResponse()); assert.equal(h.snap().turns[1].interruption, "failed");
});
test("duplicate response/item aggregates cannot add extra bubbles or parts", () => {
  const h = exchange(); h.emit(done("completed", [item("assistant_A", [{ type: "output_audio", transcript: "authoritative" }])]),
    done("failed", [item("assistant_A", [{ type: "output_audio", transcript: "changed" }, { type: "output_text", text: "extra" }]), item("extra_item")]));
  assert.equal(h.snap().turns.length, 2); assert.equal(h.snap().turns[1].parts.length, 1); assert.equal(h.snap().turns[1].generation, "completed");
  const g = exchange(); g.emit(event("response.output_item.done", { response_id: "response_A", output_index: 0, item: item("assistant_A", [{ type: "audio", transcript: "first" }]) }),
    event("response.output_item.done", { response_id: "response_A", output_index: 0, item: item("assistant_A", [{ type: "audio", transcript: "second" }, { type: "text", text: "extra" }]) }));
  assert.equal(g.snap().turns[1].parts.length, 1); assert.equal(g.snap().turns[1].parts[0].text, "first");
});
test("aggregate final can precede output-item registration and draft, then receive its predecessor", () => {
  const h = store(); h.emit(user(), created(), done("completed", [item("assistant_A", [{ type: "output_audio", transcript: "final first" }])]),
    text("delta", "late draft"), output(), link());
  assert.deepEqual(h.snap().turns.map(t => t.itemId), ["user_A", "assistant_A"]); assert.equal(h.snap().turns[1].parts[0].text, "final first");
});
test("part count and character accounting use exact replacement, preserve multiple user audio parts", () => {
  const h = exchange(); h.emit(input("delta", "long draft"), input("completed", "a"), input("completed", "b", "user_A", 1), text("delta", "draft"), text("done", "c"));
  assert.equal(h.snap().counts.characters, 3); assert.equal(h.snap().turns[0].parts.length, 2);
});
for (const key of ["sourceId", "runId", "connectionId"] as const) test(`stale ${key} cannot mutate current text or 08B facts`, () => {
  const h = exchange(), stale = { ...identity, [key]: "other" }, before = h.snap();
  h.s.receive(stale, input("completed", "LEAK")); h.s.observe(stale, { ...emptyResponse(), interruption: { state: "pending", responseId: "response_A" } });
  assert.deepEqual(h.snap(), before);
});
test("sibling predecessor conflicts stay explicit; established turns do not reorder for contradictory output indexes", () => {
  const h = store(); h.emit(user("root", null), created(), output("first", "response_A", 1), link("first", "root"),
    output("second", "response_A", 0), link("second", "first"), user("sibling", "root"));
  assert.equal(h.snap().ordering, "conflict");
  assert.deepEqual(h.snap().turns.filter(t => ["root", "first"].includes(t.itemId)).map(t => t.itemId), ["root", "first"]);
});
test("actual default item/part boundaries, replay history capacity and malformed-ID memory bounds", () => {
  const h = store();
  for (let i = 0; i < TRANSCRIPT_LIMITS.items; i++) h.emit(user(`u_${i}`, i ? `u_${i - 1}` : null));
  assert.equal(h.snap().counts.items, 128); assert.equal(h.snap().phase, "active"); h.emit(user("overflow", "u_127"));
  assert.equal(h.snap().limit, "items");
  const g = store({ eventIds: 3 }), e = user(); g.emit(e, e, e); assert.equal(g.snap().counts.eventIds, 1);
  g.emit({ ...e, event_id: "bad id" }, { ...e, event_id: "x".repeat(129) }); assert.equal(g.snap().counts.eventIds, 1);
  g.emit(input("delta", "a"), input("completed", "b"), input("delta", "c")); assert.equal(g.snap().limit, "eventIds");
});
test("reentrant source-reset observer cannot start a replacement before reset completes", async () => {
  const h = await composed(); h.emit(text("delta", "retained"));
  const push = h.states.push.bind(h.states); let accepted: boolean | undefined;
  h.states.push = (...states) => { const n = push(...states); if (states.some(s => s.phase === "ended")) accepted = h.controller.start(h.b.row.id); return n; };
  h.controller.reset(); assert.equal(accepted, false); assert.equal(h.controller.transcript.counts.characters, 0);
  assert.equal(h.calls.connect, 1); h.clean();
});
test("Stop from transcript observer detaches the one listener before late content", async () => {
  const h = await composed(), push = h.states.push.bind(h.states);
  h.states.push = (...states) => { const n = push(...states); if (h.controller.transcript.counts.characters > 0) h.controller.stop(); return n; };
  h.emit(text("delta", "draft"), text("done", "late"));
  assert.equal(h.controller.transcript.phase, "stopped"); assert.equal(h.controller.transcript.turns[1].parts[0].text, "draft"); h.clean();
});
test("emitted transcript module is browser-safe and adds no persistence/provider/command dependencies", async () => {
  const source = await readFile("src/shared/transcript.ts", "utf8"), output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependency = 'import { projectResponseTerminal } from "./response-terminal.ts";';
  assert.ok(output.includes(dependency));
  const terminal = ts.transpileModule(await readFile("src/shared/response-terminal.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  assert.doesNotMatch(output.replace(dependency, "") + terminal, /^import\s|fetch\(|WebSocket|RTCPeerConnection|getUserMedia|process\.env|localStorage|sessionStorage|\.send\(|setTimeout|innerHTML/m);
});
