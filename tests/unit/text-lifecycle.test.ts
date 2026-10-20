import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import ts from "typescript";
import { TEXT_QUESTION_LIMIT } from "../../src/shared/text-lifecycle.ts";
import type { TextConnection, TurnPermit } from "../../src/shared/text-lifecycle.ts";
import type { PrimingInput } from "../../src/shared/priming-admission.ts";
import { textHarness, deferred } from "../priming/text-harness.ts";
import { flush } from "../priming/harness.ts";

const traces: unknown[] = [];
let providerCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { providerCalls++; throw new Error("External fetch forbidden in 10A"); };
after(async () => {
  globalThis.fetch = originalFetch;
  assert.equal(providerCalls, 0);
  const path = process.env.TEXT_LIFECYCLE_EVIDENCE_PATH;
  if (path) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify({ scope: "local/scripted/synthetic", providerCalls, traces }, null, 2)); }
});

test("10A default source admission rejects synthetic budget before connection", async () => {
  const h = await textHarness("source-default"); await h.begin();
  assert.equal(h.controller.snapshot.failure, "budget_unavailable"); assert.equal(h.calls.connect, 0);
  assert.equal(h.controller.submit("question"), false); assert.equal(h.clock.timers.size, 0);
  traces.push(h.trace("default-source-unavailable"));
});
test("10A explicit unavailable preparation acquires nothing", async () => {
  const h = await textHarness(); h.adapters.prepare = async () => ({ status: "budget_unavailable" }); await h.begin();
  assert.equal(h.calls.connect, 0); assert.equal(h.controller.snapshot.failure, "budget_unavailable"); h.clean();
});
test("10A actual default per-turn accounting refuses sends even after synthetic priming", async () => {
  const h = await textHarness("turn-default"); await h.begin(); await h.ready(); await h.question();
  assert.equal(h.controller.snapshot.failure, "turn_budget_unavailable"); assert.equal(h.all[0].transport.questions.length, 0);
  traces.push(h.trace("default-turn-unavailable")); h.clean();
});
test("10A actual 07B text startup + exchange after denied microphone uses zero media APIs", async () => {
  const names = ["navigator", "Audio", "MediaStream", "RTCPeerConnection", "WebSocket", "document"];
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name)); let mediaCalls = 0;
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, get() { mediaCalls++; throw new Error("Denied microphone/media sentinel"); } });
  try {
    const h = await textHarness(); await h.begin(); await h.ready(); await h.question();
    const t = h.all[0].transport; assert.equal(t.questions.length, 1); assert.equal(t.responses.length, 0);
    await h.ack(); const ids = await h.response(); h.delta(ids, "Synthetic "); h.delta(ids, "answer 雪.", true); await h.done(ids);
    assert.equal(h.controller.snapshot.phase, "ready"); assert.equal(h.controller.transcript.incomplete, false);
    assert.equal(h.controller.transcript.turns.length, 2); assert.equal(mediaCalls, 0);
    assert.equal(h.controller.transcript.turns[0].parts[0].text, "  café 🌱 e\u0301\n雪\t ");
    assert.equal(h.controller.transcript.turns[1].parts[0].text, "Synthetic answer 雪.");
    assert.equal(h.controller.snapshot.productionReady, false); h.clean(); traces.push({ ...h.trace("complete-exchange-denied-media-sentinel"), mediaCalls });
  } finally { names.forEach((name, i) => { if (descriptors[i]) Object.defineProperty(globalThis, name, descriptors[i]!); else Reflect.deleteProperty(globalThis, name); }); }
});

for (const phase of ["initial-config", "items", "final-config", "final-write"] as const) test(`10A withheld priming ${phase} prevents question sends`, async () => {
  const h = await textHarness(); await h.begin();
  if (phase !== "initial-config") await h.config();
  if (phase === "final-config" || phase === "final-write") {
    const gate = deferred<void>();
    if (phase === "final-write") h.all[0].transport.sendAction = e => e.event_id.endsWith("_final") ? gate.promise : undefined;
    await h.items(); if (phase === "final-write") { await h.config(); assert.equal(h.controller.canSubmit, false); gate.resolve(); await flush(); }
  }
  if (phase !== "final-write") { assert.equal(h.controller.submit("question"), false); assert.equal(h.all[0].transport.questions.length, 0); }
  else assert.equal(h.controller.snapshot.phase, "ready");
  h.clean();
});
test("10A exact user item -> finalized ACK -> response request; writes must settle", async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  const gate = deferred<void>(), t = h.all[0].transport;
  t.sendAction = e => e.item?.id.includes("_question_") ? gate.promise : undefined;
  await h.question(); assert.equal(h.controller.snapshot.phase, "sending");
  const q = t.questions[0]; t.ack(q, { type: "conversation.item.added" }); await flush(); assert.equal(t.responses.length, 0);
  await h.ack(); assert.equal(t.responses.length, 0); assert.equal(h.controller.snapshot.phase, "sending");
  gate.resolve(); await flush(); assert.equal(t.responses.length, 1);
  await h.ack(); assert.equal(t.questions.length, 1); assert.equal(t.responses.length, 1);
  assert.equal(t.responses[0].response!.metadata.text_turn, q.item!.id);
  const policy = h.proposals[0].policy;
  assert.equal(t.responses[0].response!.max_output_tokens, policy.basis === "provider_enforced" ? policy.maxOutputTokens : policy.outputReserve);
  traces.push(h.trace("item-ack-write-response-order")); h.clean();
});
test("10A response completion also waits for response write settlement", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question();
  const gate = deferred<void>(); h.all[0].transport.sendAction = e => e.type === "response.create" ? gate.promise : undefined;
  await h.ack(); const ids = await h.response(); await h.done(ids);
  assert.equal(h.controller.canSubmit, false); gate.resolve(); await flush(); assert.equal(h.controller.canSubmit, true); h.clean();
});
for (const text of ["", "  \r\n\t", "x".repeat(TEXT_QUESTION_LIMIT + 1)]) test(`10A rejects invalid input length=${text.length}`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  assert.equal(h.controller.submit(text), false); assert.equal(h.calls.admit, 0); assert.equal(h.all[0].transport.questions.length, 0); h.clean();
});
test("10A bounded maximum question preserves exact Unicode/whitespace and no hidden queue", async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  const text = " 雪".repeat(500); await h.question(text);
  for (let n = 0; n < 30; n++) assert.equal(h.controller.submit("duplicate"), false);
  assert.equal(h.all[0].transport.questions[0].item!.content[0].text, text);
  await h.ack(); const ids = await h.response(); await h.done(ids); await flush();
  assert.equal(h.calls.admit, 1); assert.equal(h.all[0].transport.questions.length, 1); h.clean();
});
test("10A each subsequent question requires exact new history revision and policy", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question("first"); await h.ack();
  const ids = await h.response(); await h.done(ids); const revision = h.controller.snapshot.revision;
  await h.question("second"); assert.equal(h.proposals[1].revision, revision); assert.ok(revision > h.proposals[0].revision);
  assert.deepEqual(h.proposals[1].policy, h.proposals[0].policy); assert.ok(Object.isFrozen(h.proposals[1].policy));
  assert.equal(h.all[0].transport.questions[1].previous_item_id, ids.itemId); h.clean();
});
for (const change of ["different", "away-and-back"]) test(`10A stale draft admission ${change} sends nothing`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); const gate = deferred<TurnPermit | undefined>();
  h.accounting.admit = async () => gate.promise; await h.question("original");
  assert.equal(h.controller.snapshot.phase, "admitting"); h.controller.setQuestion("changed");
  if (change === "away-and-back") h.controller.setQuestion("original");
  gate.resolve({ proposal: h.proposals[0], maxOutputTokens: 200 }); await flush();
  assert.equal(h.controller.snapshot.failure, "stale_admission"); assert.equal(h.all[0].transport.questions.length, 0); h.clean();
});
for (const permit of ["none", "copied-proposal", "over-reserve", "NaN", "zero", "rejected"] as const) test(`10A invalid turn permit ${permit} never sends`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  h.accounting.admit = async p => {
    if (permit === "none") return undefined;
    if (permit === "rejected") throw new Error("SECRET provider data");
    return { proposal: permit === "copied-proposal" ? { ...p } : p, maxOutputTokens: permit === "over-reserve" ? 201 : permit === "NaN" ? NaN : 0 };
  };
  await h.question(); assert.equal(h.controller.snapshot.failure, "turn_budget_unavailable"); assert.equal(h.all[0].transport.questions.length, 0);
  assert.ok(!JSON.stringify(h.controller.snapshot).includes("SECRET")); h.clean();
});
for (const invalid of ["text", "role", "status", "previous", "content"] as const) test(`10A malformed matching ACK ${invalid} cannot trigger inference`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); const t = h.all[0].transport, q = t.questions[0];
  const item: Record<string, unknown> = { ...q.item, status: "completed" };
  if (invalid === "text") item.content = [{ type: "input_text", text: "changed" }];
  if (invalid === "role") item.role = "assistant";
  if (invalid === "status") item.status = "in_progress";
  if (invalid === "content") item.content = [];
  t.ack(q, { item, ...(invalid === "previous" ? { previous_item_id: "foreign" } : {}) }); await flush();
  assert.equal(t.responses.length, 0); assert.equal(h.controller.snapshot.failure, "protocol"); h.clean();
});
test("10A foreign item/response/metadata cannot complete current submit", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); const t = h.all[0].transport;
  t.ack(t.questions[0], { item: { ...t.questions[0].item, id: "foreign_item" } }); await flush(); assert.equal(t.responses.length, 0);
  await h.ack();
  t.emit({ type: "response.created", response: { id: "foreign_response", conversation_id: "other", status: "in_progress", output_modalities: ["text"], metadata: { text_turn: "other" } } });
  t.emit({ type: "response.done", response: { id: "foreign_response", status: "completed", output: [] } });
  assert.equal(h.controller.snapshot.phase, "awaiting-response"); assert.equal(h.controller.transcript.turns.length, 1);
  t.emit({ type: "session.updated", session: { id: "foreign_session" } });
  assert.equal(h.controller.snapshot.phase, "awaiting-response");
  const ids = await h.response();
  t.emit({ type: "response.output_text.delta", response_id: "foreign_response", item_id: ids.itemId, output_index: 0, content_index: 0, delta: "LEAK" });
  t.emit({ type: "conversation.item.done", conversation_id: "foreign_conversation", item: { id: ids.itemId, type: "message", role: "assistant", content: [{ type: "output_text", text: "LEAK" }] } });
  await h.done(ids); assert.ok(!JSON.stringify(h.controller.transcript).includes("LEAK")); h.clean();
});
test("10A final-before-delta and duplicate final reconcile once", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const ids = await h.response();
  h.delta(ids, "final 雪", true); h.delta(ids, "late delta"); h.delta(ids, "duplicate wrong", true);
  await h.done(ids, "authoritative 雪"); await h.done(ids, "duplicate wrong"); h.delta(ids, "after done");
  assert.equal(h.controller.transcript.turns.length, 2); assert.equal(h.controller.transcript.turns[1].parts[0].text, "authoritative 雪"); h.clean();
});
for (const status of ["cancelled", "failed", "incomplete"]) test(`10A ${status} response preserves received text honestly`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const ids = await h.response();
  h.delta(ids, "partial"); await h.done(ids, "partial final", status);
  assert.equal(h.controller.snapshot.phase, "failed"); const turn = h.controller.transcript.turns[1];
  assert.equal(turn.generation, status); assert.equal(turn.parts[0].text, "partial final"); assert.equal(h.controller.transcript.incomplete, true);
  traces.push(h.trace(`response-${status}`)); h.clean();
});
for (const stage of ["admission", "item-ack", "item-write", "response-created", "response-done", "response-write"] as const) test(`10A missing ${stage} times out without retransmission`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); const gate = deferred<void>();
  if (stage === "admission") h.accounting.admit = async () => new Promise(() => {});
  if (stage === "item-write") h.all[0].transport.sendAction = e => e.item?.id.includes("_question_") ? gate.promise : undefined;
  if (stage === "response-write") h.all[0].transport.sendAction = e => e.type === "response.create" ? gate.promise : undefined;
  await h.question();
  if (!["admission", "item-ack"].includes(stage)) await h.ack();
  if (stage === "response-done" || stage === "response-write") { const ids = await h.response(); if (stage === "response-write") await h.done(ids); }
  const counts = [h.all[0].transport.questions.length, h.all[0].transport.responses.length];
  h.clock.tick(501); await flush(); assert.equal(h.controller.snapshot.failure, "timeout");
  gate.resolve(); await flush(); assert.deepEqual([h.all[0].transport.questions.length, h.all[0].transport.responses.length], counts); h.clean();
});
for (const stage of ["item", "response"]) for (const failure of ["throw", "reject", "closed"] as const) test(`10A ${stage} send ${failure} fails closed once`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); const t = h.all[0].transport;
  if (stage === "response") await h.question();
  if (failure === "closed") t.open = false;
  else t.sendAction = () => { if (failure === "throw") throw new Error("SECRET"); return Promise.reject(new Error("SECRET")); };
  if (stage === "item") await h.question(); else await h.ack();
  assert.equal(h.controller.snapshot.failure, "connection"); assert.ok(t.questions.length <= 1); assert.ok(t.responses.length <= 1); h.clean();
});

for (const action of ["stop", "reset", "dispose", "source-B"] as const) for (const stage of ["preparation", "connection", "priming", "admission", "item", "response"] as const) {
  test(`10A ${action} at ${stage}: bounded cancellation, no late revival/leak`, async () => {
    const h = await textHarness();
    const prep = deferred<PrimingInput>(), conn = deferred<TextConnection>(), turn = deferred<TurnPermit | undefined>();
    if (stage === "preparation") h.adapters.prepare = async () => prep.promise;
    if (stage === "connection") h.adapters.connect = async () => conn.promise;
    await h.begin();
    if (["admission", "item", "response"].includes(stage)) await h.ready();
    if (stage === "admission") h.accounting.admit = async () => turn.promise;
    if (["admission", "item", "response"].includes(stage)) await h.question("old A question");
    if (stage === "response") { await h.ack(); const ids = await h.response(); h.delta(ids, "old partial"); }
    const old = h.controller.snapshot.identity!, stale = h.all[0]?.transport.stale;
    if (action === "source-B") h.controller.reset(); else h.controller[action]();
    if (action === "source-B") {
      h.adapters.prepare = async identity => h.inputFor(identity);
      h.adapters.connect = async () => { throw new Error("Replacement deliberately unavailable"); };
      await h.begin(h.b.row.id);
    }
    let lateCloses = 0;
    const lateConnection = { transport: { isOpen: () => true, send: () => {}, subscribe: () => () => {}, close: () => {} }, close: () => { lateCloses++; } };
    if (stage === "preparation") prep.resolve(h.inputFor(old));
    if (stage === "connection") conn.resolve(lateConnection);
    if (stage === "admission") turn.resolve({ proposal: h.proposals[0], maxOutputTokens: 200 });
    await flush();
    stale?.({ type: "response.done", event_id: "late_old", response: { id: "response_1", conversation_id: "conversation_text", status: "completed",
      output: [{ id: "answer_1", type: "message", role: "assistant", content: [{ type: "output_text", text: "LATE LEAK" }] }] } });
    assert.equal(h.controller.canSubmit, false); assert.ok(!JSON.stringify(h.controller.transcript).includes("LATE LEAK"));
    if (action !== "stop") assert.equal(h.controller.transcript.turns.length, 0);
    else if (stage === "response") assert.equal(h.controller.transcript.turns[1].parts[0].state, "unfinished");
    if (stage === "connection") assert.equal(lateCloses, 1);
    assert.equal(h.clock.timers.size, 0); h.clean();
    if (action === "source-B" && stage === "response") traces.push(h.trace("source-A-to-B-late-answer"));
  });
}

test("10A reset/new source starts empty; new explicit successful B uses only B source", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const ids = await h.response(); await h.done(ids);
  const oldReceive = h.all[0].transport.stale;
  h.controller.reset(); assert.equal(h.controller.transcript.turns.length, 0); assert.equal(h.controller.canSubmit, false);
  await h.begin(h.b.row.id); await h.ready();
  const t = h.all[1].transport;
  for (const c of t.commands.filter(c => c.item)) assert.equal(JSON.parse(c.item!.content[0].text).source.id, h.b.row.id);
  oldReceive?.({ type: "error", event_id: "old_error", error: { message: "PRIVATE" } });
  assert.equal(h.controller.snapshot.phase, "ready"); assert.equal(h.controller.transcript.turns.length, 0);
  assert.notEqual(h.states[0].identity!.runId, h.controller.snapshot.identity!.runId); h.clean();
});
test("10A explicit retry same source starts fresh and dispose is permanent", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); h.controller.stop();
  assert.equal(h.calls.connect, 1); await h.begin(); await h.ready(); assert.equal(h.controller.transcript.turns.length, 0);
  h.controller.dispose(); h.controller.dispose(); assert.equal(h.controller.start(h.a.row.id), false); h.clean();
});
test("10A observer reentrancy during cleanup cannot start or retain text", async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  h.all[0].connection.close = () => { h.all[0].closes++; h.all[0].transport.close(); assert.equal(h.controller.start(h.b.row.id), false); h.controller.reset(); throw new Error("SECRET"); };
  h.controller.dispose(); assert.equal(h.controller.transcript.phase, "disposed"); assert.equal(h.controller.transcript.turns.length, 0); h.clean();
});
test("10A transcript caps fail safely and retain received partial text", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const ids = await h.response();
  h.delta(ids, "received"); h.delta(ids, "x".repeat(16001));
  assert.equal(h.controller.snapshot.failure, "limit"); assert.equal(h.controller.transcript.turns[1].parts[0].text, "received"); h.clean();
});
test("10A bounded 32-turn session cannot grow pending IDs or queue", async () => {
  const h = await textHarness(); await h.begin(); await h.ready();
  for (let i = 0; i < 32; i++) { await h.question(`turn ${i}`); await h.ack(); const ids = await h.response(); await h.done(ids); }
  assert.equal(h.controller.transcript.turns.length, 64); assert.equal(h.controller.submit("33"), false);
  assert.equal(h.controller.snapshot.failure, "limit"); assert.equal(h.all[0].transport.questions.length, 32); h.clean();
});
test("10A malformed large/unknown/error events and transport closure are bounded and sanitized", async () => {
  for (const kind of ["large", "foreign-error", "error", "closed", "unknown"] as const) {
    const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); const t = h.all[0].transport;
    if (kind === "closed") t.closed?.();
    else if (kind === "large") t.emit({ type: "unknown", text: "x".repeat(80001) });
    else if (kind === "unknown") t.emit({ type: "unknown", text: "SECRET" });
    else t.emit({ type: "error", error: { message: "SECRET", ...(kind === "foreign-error" ? { event_id: "other" } : {}) } });
    assert.ok(!JSON.stringify(h.controller.snapshot).includes("SECRET"));
    if (kind === "unknown" || kind === "foreign-error") assert.equal(h.controller.snapshot.phase, "sending");
    else assert.equal(h.controller.snapshot.phase, "failed"); h.clean();
  }
});
test("10A browser-safe emitted graph has no media/provider/server/test runtime imports; public/proof gates unchanged", async () => {
  const visited = new Set<string>(), imports: Record<string, string[]> = {};
  async function visit(file: string) {
    const path = resolve(file); if (visited.has(path)) return; visited.add(path);
    const source = await readFile(path, "utf8");
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, removeComments: true } }).outputText;
    assert.ok(!/\b(navigator|document|Audio|MediaStream|RTCPeerConnection|WebSocket|fetch|localStorage|sessionStorage|process)\b/.test(emitted), path);
    const dependencies = [...emitted.matchAll(/from "([^"]+)"/g)].map(m => m[1]); imports[path] = dependencies;
    for (const dependency of dependencies) { assert.ok(dependency.startsWith("./")); assert.ok(!/server|tests|voice/.test(dependency)); await visit(resolve(dirname(path), dependency)); }
  }
  await visit("src/shared/text-lifecycle.ts"); assert.equal(visited.size, 6);
  const workspace = await readFile("src/app/source-workspace.tsx", "utf8");
  assert.ok(!workspace.includes("text-lifecycle")); assert.match(workspace, /<ConversationArea source=/);
  assert.doesNotMatch(workspace, /create(?:Voice|Text)?Controller=/); // Public UI supplies no controller or positive admission.
  traces.push({ scenario: "emitted-runtime-graph", imports });
});

for (const phase of ["preparation", "connection", "priming"] as const) test(`10A ${phase} timeout releases listeners/timers and late resources`, async () => {
  const h = await textHarness(), gate = deferred<TextConnection>(); let lateCloses = 0;
  if (phase === "preparation") h.adapters.prepare = async () => new Promise(() => {});
  if (phase === "connection") h.adapters.connect = async () => gate.promise;
  await h.begin(); h.clock.tick(1001); await flush();
  assert.equal(h.controller.snapshot.phase, "failed");
  if (phase === "connection") { gate.resolve({ transport: { isOpen: () => true, send: () => {}, close: () => {}, subscribe: () => () => {} }, close: () => { lateCloses++; } }); await flush(); assert.equal(lateCloses, 1); }
  h.clean();
});
for (const failure of ["preparation-reject", "connection-reject", "wrong-source", "wrong-mode"] as const) test(`10A setup ${failure} cannot admit a question`, async () => {
  const h = await textHarness();
  if (failure === "preparation-reject") h.adapters.prepare = async () => { throw new Error("SECRET"); };
  if (failure === "connection-reject") h.adapters.connect = async () => { throw new Error("SECRET"); };
  if (failure === "wrong-source" || failure === "wrong-mode") h.adapters.prepare = async identity => {
    const input = structuredClone(h.inputFor(failure === "wrong-source" ? { ...identity, sourceId: h.b.row.id } : identity));
    return failure === "wrong-mode" ? { ...input, manifest: { ...input.manifest, mode: "voice" } } : input;
  };
  await h.begin(); assert.equal(h.controller.canSubmit, false); assert.equal(h.controller.submit("question"), false);
  assert.equal(h.controller.snapshot.phase, "failed"); if (failure !== "connection-reject") assert.equal(h.calls.connect, 0); h.clean();
});
test("10A closed synchronously during subscription releases exactly once", async () => {
  const h = await textHarness();
  let closes = 0, removals = 0;
  h.adapters.connect = async () => ({ transport: { isOpen: () => true, send: () => {}, close: () => {},
    subscribe: (_receive, closed) => { closed(); return () => { removals++; }; } }, close: () => { closes++; } });
  await h.begin(); assert.equal(h.controller.snapshot.phase, "failed"); assert.equal(closes, 1); assert.equal(removals, 1);
  assert.equal(h.clock.timers.size, 0); h.clean();
});
test("10A safe snapshots immutable; unknown events do not change history revision", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const ids = await h.response(); h.delta(ids, "received");
  const snapshot = h.controller.transcript, revision = h.controller.snapshot.revision;
  assert.ok(Object.isFrozen(h.controller.snapshot)); assert.ok(Object.isFrozen(snapshot.turns[1].parts[0]));
  assert.throws(() => { (snapshot.turns[1].parts[0] as { text: string }).text = "mutated"; });
  h.all[0].transport.emit({ type: "unknown", text: "unused" }); assert.equal(h.controller.snapshot.revision, revision);
  assert.equal(h.controller.transcript.turns[1].parts[0].text, "received"); h.clean();
});
for (const malformed of ["bad-response-id", "bad-conversation", "bad-status", "audio-response", "audio-output"] as const) test(`10A matching malformed ${malformed} fails safely`, async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack(); const t = h.all[0].transport;
  if (malformed === "audio-output") {
    const ids = await h.response(); t.emit({ type: "response.output_item.added", response_id: ids.responseId, output_index: 1,
      item: { id: "audio_item", type: "message", role: "assistant", content: [{ type: "output_audio", transcript: "audio" }] } });
  } else t.emit({ type: "response.created", response: { id: malformed === "bad-response-id" ? "bad id" : "response_text",
    conversation_id: malformed === "bad-conversation" ? null : "conversation_text", status: malformed === "bad-status" ? "completed" : "in_progress",
    output_modalities: malformed === "audio-response" ? ["audio"] : ["text"], metadata: t.responses[0].response!.metadata } });
  assert.equal(h.controller.snapshot.failure, "protocol"); h.clean();
});
