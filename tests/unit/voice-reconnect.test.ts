import assert from "node:assert/strict";
import { test } from "node:test";
import { voiceHarness } from "../priming/voice-harness.ts";
import { flush } from "../priming/harness.ts";
import { voiceHistory, VoiceHistoryRestore, type HistoryEvent } from "../../src/shared/voice-history.ts";
import { bytes, MAX_EVENT_BYTES } from "../../src/shared/priming-manifest.ts";

async function harness() {
  const h = await voiceHarness(), history: HistoryEvent[][] = [];
  const connect = h.adapters.connect;
  h.adapters.connect = async (...args) => {
    const connection = await connect(...args), events: HistoryEvent[] = []; history.push(events);
    const send = connection.transport.send.bind(connection.transport);
    connection.transport.send = raw => {
      const event = JSON.parse(raw);
      if (event.event_id?.includes("_history_")) events.push(event); else return send(raw);
    };
    return connection;
  };
  const exchange = (complete = true, text = "There are eighteen tiles.") => {
    const t = h.all.at(-1)!.transport, run = h.controller.snapshot.identity!.runId;
    const source = h.inputs.get(run)!.manifest.items.at(-1)!.item.id;
    const user = `${run}_u`, item = `${run}_a`, response = `${run}_r`;
    let n = 0; const emit = (type: string, fields: object) => t.emit({ type, event_id: `${run}_event_${++n}`, ...fields });
    emit("input_audio_buffer.committed", { item_id: user, previous_item_id: source });
    emit("conversation.item.input_audio_transcription.completed", { item_id: user, content_index: 0, transcript: "How many tiles?" });
    emit("response.created", { response: { id: response, status: "in_progress", conversation_id: `${run}_conv` } });
    emit("response.output_item.added", { response_id: response, output_index: 0, item: { id: item, type: "message", role: "assistant", content: [] } });
    emit("conversation.item.added", { previous_item_id: user, item: { id: item, type: "message", role: "assistant", content: [] } });
    emit(complete ? "response.output_audio_transcript.done" : "response.output_audio_transcript.delta", {
      response_id: response, item_id: item, output_index: 0, content_index: 0, ...(complete ? { transcript: text } : { delta: text }) });
    if (complete) emit("response.done", { response: { id: response, status: "completed", conversation_id: `${run}_conv`, output: [] } });
  };
  const ack = async () => {
    for (const event of history.at(-1)!) h.all.at(-1)!.transport.emit({ type: "conversation.item.done", event_id: `ack_${event.item.id}`,
      previous_item_id: event.previous_item_id, item: { ...event.item, status: "completed" } });
    await flush();
  };
  return { ...h, history, exchange, ack };
}

test("network resume preserves dialogue and mutes, waits for source AND history ACKs, never generates a replay", async () => {
  const h = await harness(); await h.begin(); await h.ready(); h.exchange();
  h.controller.mute(); h.controller.setSpeakerMuted(true);
  const before = h.controller.transcript.turns;
  assert.equal(h.controller.suspend(), true); assert.equal(h.controller.canResume, true);
  assert.ok(h.all[0].tracks.every(t => t.stops === 1 && !t.enabled));
  assert.equal(h.controller.resume(), true); assert.equal(h.controller.resume(), false); await flush();
  assert.deepEqual(h.controller.transcript.turns, before);
  await h.ready(); assert.equal(h.calls.media, 1); assert.equal(h.controller.canSendQuestions, false);
  assert.deepEqual(h.history[1].map(e => e.item.role), ["user", "assistant", "system"]);
  assert.equal(h.history[1][0].item.content[0].text, "How many tiles?");
  assert.equal(h.history[1][1].item.content[0].text, "There are eighteen tiles.");
  assert.ok(h.history[1].every(e => e.type === "conversation.item.create"));
  await h.ack(); assert.equal(h.calls.media, 2);
  assert.equal(h.controller.snapshot.phase, "ready"); assert.equal(h.controller.snapshot.muted, true);
  assert.equal(h.all[1].counts.speakerMuted, true); assert.ok(h.all[1].tracks.every(t => !t.enabled));
  assert.deepEqual(h.controller.transcript.turns, before); h.controller.unmute(); assert.equal(h.controller.canSendQuestions, true);
  h.exchange(); assert.equal(h.controller.transcript.turns.length, 4);
  assert.equal(h.controller.suspend(), true); h.controller.resume(); await flush(); await h.ready(); await h.ack();
  assert.equal(h.controller.transcript.turns.length, 4); assert.equal(h.history[2].filter(e => e.item.role !== "system").length, 4);
  h.clean(); assert.equal(h.controller.canResume, false);
});

test("partial or untranscribed turns stay visible but are not fabricated into restored context", async () => {
  const h = await harness(); await h.begin(); await h.ready(); h.exchange(false);
  h.all[0].transport.emit({ type: "input_audio_buffer.committed", event_id: "lost_speech", item_id: "lost_user", previous_item_id: "voice_1_a" });
  h.controller.suspend(); h.controller.resume(); await flush(); await h.ready();
  assert.equal(h.controller.snapshot.historyOmitted, true);
  assert.equal(h.history[1].filter(e => e.item.role === "user").length, 1);
  assert.equal(h.history[1].filter(e => e.item.role === "assistant").length, 0);
  assert.equal(h.controller.transcript.turns.length, 3);
  assert.equal(h.controller.transcript.turns[1].parts[0].state, "unfinished");
  await h.ack(); h.clean();
});

for (const scenario of ["timeout", "wrong-content", "stop", "transport"] as const) test(`restoration ${scenario} never enables microphone or loses displayed history`, async () => {
  const h = await harness(); await h.begin(); await h.ready(); h.exchange();
  const old = h.all[0].transport.stale;
  h.controller.suspend(); h.controller.resume(); await flush(); await h.ready();
  old?.({ type: "error", error: { message: "stale" } });
  if (scenario === "timeout") h.clock.tick(1000);
  if (scenario === "wrong-content") { const e = h.history[1][0]; h.all[1].transport.emit({ type: "conversation.item.done",
    item: { ...e.item, status: "completed", content: [{ type: "input_text", text: "wrong history" }] } }); }
  if (scenario === "stop") h.controller.stop();
  if (scenario === "transport") h.all[1].transport.closed?.();
  await flush(); await h.ack();
  assert.equal(h.calls.media, 1); assert.equal(h.controller.canSendQuestions, false);
  assert.equal(h.controller.transcript.turns.length, 2);
  assert.equal(h.controller.canResume, scenario !== "stop"); h.clean();
});

test("explicit stop, source replacement, disposal and pre-conversation outage never arm resume", async () => {
  const h = await harness(); await h.begin(); assert.equal(h.controller.suspend(), false); assert.equal(h.controller.resume(), false);
  await h.begin(); await h.ready(); h.exchange(); h.controller.stop(); assert.equal(h.controller.resume(), false);
  await h.begin(); await h.ready(); h.exchange(); h.controller.suspend(); h.controller.reset(); assert.equal(h.controller.resume(), false);
  h.selectB(); await h.begin(); assert.equal(h.controller.transcript.turns.length, 0); await h.ready(); h.controller.suspend();
  h.controller.dispose(); assert.equal(h.controller.resume(), false); assert.equal(h.controller.transcript.turns.length, 0); h.clean();
});

test("history wire splitting preserves Unicode and JSON text exactly, with bounded events", async () => {
  const h = await harness(); await h.begin(); await h.ready(); const text = '雪😀"\\'.repeat(2000); h.exchange(true, text); h.controller.suspend();
  const result = voiceHistory(h.controller.transcript, "00000000-0000-0000-0000-000000000001", "last_source", 100);
  assert.equal(result.events.filter(e => e.item.role === "assistant").map(e => e.item.content[0].text).join(""), text);
  assert.ok(result.events.every(e => bytes(JSON.stringify(e)) <= MAX_EVENT_BYTES && e.item.id.length <= 32));
  assert.throws(() => voiceHistory({ ...h.controller.transcript, limit: "items" }, "run", "source", 100)); h.clean();
});

test("added-only and wrong predecessor cannot complete history restoration", async () => {
  const h = await harness(); await h.begin(); await h.ready(); h.exchange(); h.controller.suspend();
  const events = voiceHistory(h.controller.transcript, "resume", "source", 100).events;
  const r = new VoiceHistoryRestore(events); let complete = false; const done = r.done.then(() => { complete = true; });
  await r.send(() => {});
  for (const e of events) r.receive({ type: "conversation.item.added", item: e.item });
  await flush(); assert.equal(complete, false);
  const rejected = assert.rejects(done); r.receive({ type: "conversation.item.done", previous_item_id: "wrong", item: { ...events[0].item, status: "completed" } });
  await rejected; h.clean();
});
