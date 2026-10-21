// Explicit test-process preload. Production imports none of this file.
import assert from "node:assert/strict";
import { SyntheticSourceDatabase } from "../sources/database.ts";
const database = new SyntheticSourceDatabase(); globalThis.database = database.asClient();
const original = globalThis.fetch;
const counters = { calls: 0, aborts: 0, lateBodiesCancelled: 0 };
let scenario = "success", held = [];
globalThis.fetch = async (url, init) => {
  if (url !== "https://api.openai.com/v1/realtime/client_secrets") return original(url, init);
  counters.calls++;
  const data = JSON.parse(init.body), s = data.session;
  assert.deepEqual(data.expires_after, { anchor: "created_at", seconds: 60 });
  assert.equal(s.model, "gpt-realtime-2.1-mini"); assert.equal(s.max_output_tokens, 2048);
  assert.deepEqual(s.output_modalities, ["text"]); assert.deepEqual(s.tools, []);
  assert.equal(s.tool_choice, "none"); assert.equal(s.truncation, "disabled");
  assert.deepEqual(s.audio.input, { turn_detection: null, transcription: null });
  assert.equal(s.audio.output.voice, "marin"); assert.equal(s.instructions, "Context is loading; do not answer questions.");
  assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
  assert.match(init.headers["OpenAI-Safety-Identifier"], /^[a-f0-9]{64}$/);
  const mode = scenario;
  if (mode === "error") return new Response("PRIVATE02D_UPSTREAM_BODY", { status: 500 });
  if (mode === "malformed") return Response.json({ value: "INVALID02D", session: s });
  if (mode === "unsafe") return Response.json({ value: "ek_fake02d", expires_at: Math.floor(Date.now() / 1000) + 60, session: { ...s, output_modalities: ["audio"] } });
  const result = () => Response.json({ value: "ek_fake02d", expires_at: Math.floor(Date.now() / 1000) + (mode === "expired" ? -1 : 60), session: s });
  if (mode === "hold") {
    return new Promise(resolve => {
      const abort = () => { counters.aborts++; }; init.signal.addEventListener("abort", abort, { once: true });
      held.push(() => {
        init.signal.removeEventListener("abort", abort);
        if (init.signal.aborted) resolve(new Response(new ReadableStream({ cancel() { counters.lateBodiesCancelled++; } }), { headers: { "content-type": "application/json" } }));
        else resolve(result());
      });
    });
  }
  return result();
};
process.on("message", message => {
  if (!message?.voiceTestCommand) return;
  const { voiceTestCommand: command, requestId } = message;
  if (command === "seed") database.rows.set(message.row.id, { ...message.row, expiresAt: new Date(message.row.expiresAt) });
  else if (command === "change") {
    const row = database.rows.get(message.id);
    if (message.kind === "delete") database.rows.delete(message.id);
    else if (message.kind === "expiry") row.expiresAt = new Date(Date.now() - 1);
    else if (message.kind === "content") {
      const text = "Synthetic changed content02d";
      Object.assign(row, { fullText: text, pageCount: 1, characterCount: text.length, wordCount: 3,
        sections: [{ id: "page-1", pageNumber: 1, text }] });
    }
  }
  else if (command === "gate") process.env[message.field] = message.value;
  else if (command === "scenario") scenario = message.scenario;
  else if (command === "release") { const work = held; held = []; for (const fn of work) fn(); }
  else if (command !== "snapshot") throw new Error("Unknown isolated voice command");
  process.send?.({ voiceTestReply: requestId, snapshot: { ...counters, held: held.length, reads: database.reads,
    registry: globalThis.ownedVoiceRegistry02d?.resources ?? { entries: 0, timers: 0, pendingMints: 0, replayEntries: 0 } } });
});
