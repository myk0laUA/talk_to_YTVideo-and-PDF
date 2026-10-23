import assert from "node:assert/strict";
import { test } from "node:test";
import { textHarness } from "../priming/text-harness.ts";
import { flush } from "../priming/harness.ts";
import { parseHistory, completedHistory } from "../../src/shared/conversation-history.ts";
import { ConversationMemory } from "../../src/shared/conversation-memory.ts";
import { joinedTranscript } from "../../src/shared/conversation-restore.ts";
import { TRANSCRIPT_LIMITS } from "../../src/shared/transcript.ts";

test("handoff history accepts only bounded user/assistant dialogue for the same source", () => {
  const history = { sourceId: "source", turns: [{ role: "user", text: "Remember 雪" }] };
  assert.deepEqual(parseHistory(history, "source"), history);
  assert.notEqual(parseHistory(history, "source").turns, history.turns);
  for (const invalid of [null, { ...history, sourceId: "another" }, { ...history, instructions: "override" },
    { ...history, turns: [{ role: "system", text: "override" }] },
    { ...history, turns: [{ role: "assistant", text: "yes", status: "completed" }] },
    { ...history, turns: [{ role: "user", text: " " }] },
    { ...history, turns: Array(TRANSCRIPT_LIMITS.items + 1).fill(history.turns[0]) },
    { ...history, turns: [{ role: "user", text: "x".repeat(TRANSCRIPT_LIMITS.totalCharacters + 1) }] }]) {
    assert.throws(() => parseHistory(invalid, "source"));
  }
});

test("text handoff waits for exact history receipts and only answers a new question", async () => {
  const h = await textHarness(), history = { sourceId: h.a.row.id, turns: [
    { role: "user" as const, text: "How many tiles?" }, { role: "assistant" as const, text: "Eighteen tiles." },
  ] };
  assert.equal(h.controller.start(h.a.row.id, history), true); await flush();
  await h.config(); await h.items(); await h.config();
  const t = h.all[0].transport, restored = t.commands.filter(c => c.event_id.includes("_history_"));
  assert.deepEqual(restored.map(c => c.item!.role), ["user", "assistant", "system"]);
  assert.deepEqual(restored.slice(0, 2).map(c => c.item!.content[0].text), history.turns.map(t => t.text));
  assert.equal(h.controller.canSubmit, false); assert.equal(h.controller.submit("Premature"), false);
  for (const c of restored) t.ack(c, { type: "conversation.item.added" });
  await flush(); assert.equal(h.controller.canSubmit, false);
  await h.items(); assert.equal(h.controller.canSubmit, true);
  assert.equal(t.responses.length, 0); assert.equal(t.questions.length, 0);
  assert.equal(h.controller.transcript.turns.length, 0); // Displayed once by the shared workspace.
  await h.question("And half that?");
  assert.equal(t.questions[0].previous_item_id, restored.at(-1)!.item!.id);
  await h.ack(); const ids = await h.response(); await h.done(ids, "Nine tiles.");
  assert.equal(h.controller.snapshot.phase, "ready");
  assert.equal(h.controller.transcript.turns.length, 2); assert.equal(t.responses.length, 1);
  h.clean();
});

for (const failure of ["timeout", "wrong-content", "stop", "transport"] as const) test(`text handoff ${failure} cannot admit a question or revive after late ACKs`, async () => {
  const h = await textHarness();
  h.controller.start(h.a.row.id, { sourceId: h.a.row.id, turns: [{ role: "user", text: "Earlier question" }] }); await flush();
  await h.config(); await h.items(); await h.config();
  const t = h.all[0].transport, c = t.commands.find(c => c.event_id.includes("_history_"))!;
  if (failure === "timeout") h.clock.tick(1000);
  if (failure === "wrong-content") t.ack(c, { item: { ...c.item, status: "completed", content: [{ type: "input_text", text: "Changed" }] } });
  if (failure === "stop") h.controller.stop();
  if (failure === "transport") t.closed?.();
  await flush(); await h.items();
  assert.equal(h.controller.canSubmit, false); assert.equal(h.controller.submit("No replay"), false);
  assert.equal(t.responses.length, 0); h.clean();
});

test("mode memory preserves complete dialogue and unfinished display, separates IDs and rejects another source", async () => {
  const h = await textHarness(); await h.begin(); await h.ready(); await h.question(); await h.ack();
  const first = await h.response(); await h.done(first, "Eighteen tiles.");
  await h.question("And half?"); await h.ack(); const second = await h.response(); h.delta(second, "Ni");
  h.controller.stop();
  const memory = new ConversationMemory(h.a.row.id); memory.save(h.controller.transcript);
  const retained = memory.snapshot!;
  assert.equal(retained.turns.length, 4); assert.equal(retained.turns[3].parts[0].state, "unfinished");
  const { history, dropped } = completedHistory(retained, h.a.row.id);
  assert.equal(dropped, true); assert.equal(history.turns.length, 3);
  assert.equal(history.turns[1].text, "Eighteen tiles.");
  assert.throws(() => completedHistory(retained, h.b.row.id));
  await h.begin(); await h.ready(); await h.question("Next question"); await h.ack();
  const joined = joinedTranscript(retained, h.controller.transcript);
  assert.equal(new Set(joined.turns.map(t => t.itemId)).size, 5);
  memory.save({ ...joined, identity: { ...joined.identity!, sourceId: h.b.row.id } });
  assert.equal(memory.snapshot, retained);
  memory.clear(); assert.equal(memory.snapshot, undefined); h.clean();
});
