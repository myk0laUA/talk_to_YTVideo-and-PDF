import assert from "node:assert/strict";
import { test } from "node:test";
import { VoiceEventDiagnostics } from "../../src/shared/voice-event-diagnostics.ts";

test("08N chronology is a closed projection with monotonic observations and correlated local ordinals", () => {
  let now = 100;
  const d = new VoiceEventDiagnostics(() => now);
  const secret = "PRIVATE08N";
  d.mark("session_start"); now += 12;
  d.wire("inbound", { type: "input_audio_buffer.committed", item_id: secret, transcript: secret, audio: secret });
  d.wire("inbound", { type: "response.created", response: { id: secret, status: "in_progress", instructions: secret } });
  const command = { type: "response.cancel", response_id: secret, event_id: secret, clientSecret: secret, cookie: secret };
  d.wire("enqueue", command, { bufferedBytes: 100_000, queuedBytes: -1, queuedCommands: NaN, label: secret } as never);
  now = 0; d.wire("send", command);
  d.wire("inbound", { type: "response.done", response: { id: secret, status: "cancelled", status_details: { reason: "turn_detected", error: { message: secret } } } });
  d.wire("inbound", { type: secret, data: secret });
  d.wire(secret as never, command); d.mark(secret as never);
  d.processing({ echoCancellation: true, noiseSuppression: false, deviceId: secret }, { echoCancellation: false, label: secret });
  const s = d.snapshot;
  assert.equal(s.rows.length, 6); assert.equal(s.rows[2].response, 1); assert.equal(s.rows[1].item, 1);
  assert.deepEqual(s.rows.slice(3, 5).map(r => r.command), [1, 1]);
  assert.equal(s.rows.at(-1)?.reason, "turn_detected"); assert.equal(s.rows.at(-1)?.terminal, "cancelled");
  assert.equal(s.rows[4].elapsedMs, 12);
  assert.deepEqual(s.capture, { supported: { echoCancellation: true, noiseSuppression: false, autoGainControl: "unknown" },
    effective: { echoCancellation: false, noiseSuppression: "unknown", autoGainControl: "unknown" } });
  assert.doesNotMatch(JSON.stringify(s), /PRIVATE08N|clientSecret|cookie|transcript|deviceId|instructions|label|audio_end_ms/);
  assert.deepEqual(Object.keys(s.rows[3]).sort(), ["direction", "event", "response", "command", "bufferedBytes", "elapsedMs"].sort());
  d.finish(); const ended = d.snapshot;
  d.wire("inbound", command); d.mark("session_start"); d.processing({}, {});
  assert.deepEqual(d.snapshot, ended); assert.equal(ended.responseOrdinals, 1);
});

test("08N chronology bounds rows, numeric counters and all ordinal maps without aliasing old identities", () => {
  let now = 0; const d = new VoiceEventDiagnostics(() => now++);
  for (let i = 0; i < 500; i++) {
    d.wire("inbound", { type: "response.created", response: { id: `resp_${i}` } });
    d.wire("enqueue", { type: "response.cancel", response_id: `resp_${i}`, item_id: `item_${i}`, event_id: `cmd_${i}` });
  }
  d.wire("inbound", { type: "response.done", response: { id: "resp_0", status: "incomplete", status_details: { reason: "private" } } });
  const s = d.snapshot;
  assert.equal(s.rows.length, 256); assert.equal(s.limited, true);
  assert.equal(s.responseOrdinals, 128); assert.equal(s.itemOrdinals, 128); assert.equal(s.commandOrdinals, 128);
  assert.equal(s.rows.at(-1)?.response, 1); assert.equal(s.rows.at(-1)?.reason, "unknown");
  assert.equal(s.rows.at(-2)?.response, undefined); assert.equal(s.counts.enqueue, 500);
  assert.equal(s.counts.inbound, 501); assert.equal(s.counts.send, 0);
});

test("08N source ACK volume cannot exhaust conversation ordinals; source replacement uses fresh recorder", () => {
  const d = new VoiceEventDiagnostics(() => 0);
  for (let i = 0; i < 4096; i++) {
    const item = { id: `source_${i}`, content: [{ text: "PRIVATE08N" }] };
    d.wire("enqueue", { type: "conversation.item.create", item });
    d.wire("inbound", { type: "conversation.item.done", item });
  }
  assert.equal(d.snapshot.itemOrdinals, 0);
  d.mark("session_ready"); d.wire("inbound", { type: "input_audio_buffer.committed", item_id: "first_user" });
  assert.equal(d.snapshot.rows.at(-1)?.item, 1);
  const fresh = new VoiceEventDiagnostics(() => 0); assert.equal(fresh.snapshot.rows.length, 0);
  assert.equal(fresh.snapshot.itemOrdinals, 0);
  assert.doesNotMatch(JSON.stringify(d.snapshot), /PRIVATE08N|source_\d|first_user/);
});
