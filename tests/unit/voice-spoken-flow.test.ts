import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { voiceHarness } from "../priming/voice-harness.ts";
import { encodeManifest } from "../../src/shared/priming-manifest.ts";
import { VoiceEventDiagnostics } from "../../src/shared/voice-event-diagnostics.ts";

const source = "Cedar Loop is a two kilometre trail. Start at the north gate. Follow blue markers to the pond. The west bridge is closed; use the east boardwalk. Bring water and return before dusk.";
const evidence: unknown[] = [];
after(async () => {
  await mkdir("artifacts/local/08o", { recursive: true });
  await writeFile("artifacts/local/08o/replays.json", JSON.stringify({ environment: "synthetic events/media/clock, no model or acoustic proof", evidence }, null, 2));
});

for (const scenario of ["stop-silence", "stop-continue", "different-question", "zero-input-event", "blank-delayed-asr"] as const) {
  test(`08O ${scenario}: no client restart, re-prime, create or delayed-ASR control`, async () => {
    const h = await voiceHarness();
    h.adapters.prepare = async identity => {
      const input = h.makeInput(identity), variant = h.a.prepared.variants.B;
      const manifest = encodeManifest({ ...variant, source: { ...variant.source, sections: [{ id: "page-1", pageNumber: 1, text: source }] } }, identity.runId, "voice", 2048);
      const neutral = { ...input, manifest, wireBudget: { ...input.wireBudget, representation: manifest.representation, measured: manifest.bytes } };
      h.inputs.set(identity.runId, neutral); return neutral;
    };
    await h.begin(); await h.ready();
    const r = h.all[0], initial = JSON.stringify(r.transport.outbound), trace = new VoiceEventDiagnostics(() => h.clock.now());
    trace.mark("session_ready"); let seq = 0;
    const emit = (type: string, fields: object = {}) => {
      const event = { type, event_id: `o_${++seq}`, ...fields }; trace.wire("inbound", event); r.transport.emit(event);
    };
    const created = (id: string) => emit("response.created", { response: { id, status: "in_progress" } });
    const buffer = (kind: string, id: string) => emit(`output_audio_buffer.${kind}`, { response_id: id });
    const done = (id: string, status = "completed") => emit("response.done", { response: { id, status, status_details: { reason: "turn_detected" }, output: [] } });
    created("summary"); buffer("started", "summary");
    // A deterministic zero PCM input marker is an independent test premise, not inferred from ASR.
    const zeroInput = new Float32Array(24000); assert.ok(zeroInput.every(n => n === 0));
    if (scenario === "zero-input-event") h.controller.mute();
    emit("input_audio_buffer.speech_started", { item_id: "spoken", audio_start_ms: 100 });
    assert.equal(h.controller.snapshot.response.interruption.state, "pending");
    // Provider generation can complete before its audio ends. Labels do not establish cancellation.
    done("summary", scenario === "blank-delayed-asr" ? "completed" : "cancelled");
    const summaryTerminal = h.controller.snapshot.response.generation.terminal;
    assert.equal(summaryTerminal?.reason, scenario === "blank-delayed-asr" ? "completed" : "turn_detected");
    assert.equal(h.controller.snapshot.response.output.state, "streaming");
    buffer("cleared", "summary");
    emit("input_audio_buffer.speech_stopped", { item_id: "spoken", audio_end_ms: 500 });
    emit("input_audio_buffer.committed", { item_id: "spoken", previous_item_id: null });
    emit("conversation.item.added", { item: { id: "spoken", type: "message", role: "user", content: [{ type: "input_audio", transcript: "" }] } });
    created("reply"); buffer("started", "reply");
    const asr = scenario === "blank-delayed-asr" || scenario === "zero-input-event" ? "" : scenario === "different-question" ? "Which bridge is closed?" : "Stop.";
    emit("conversation.item.input_audio_transcription.completed", { item_id: "spoken", content_index: 0, transcript: asr });
    const user = h.controller.transcript.turns.find(t => t.itemId === "spoken");
    assert.equal(user?.role, "user"); assert.equal(user?.parts[0].text, asr);
    done("reply"); buffer("stopped", "reply");
    h.clock.tick(5000);
    assert.equal(h.controller.snapshot.response.generation.responseId, "reply");
    if (scenario === "stop-continue") {
      emit("input_audio_buffer.speech_started", { item_id: "continue", audio_start_ms: 6000 });
      emit("input_audio_buffer.speech_stopped", { item_id: "continue", audio_end_ms: 6600 });
      emit("input_audio_buffer.committed", { item_id: "continue" });
      created("continued"); buffer("started", "continued"); done("continued"); buffer("stopped", "continued");
      // Retired/late A events must not restore the previous output.
      created("summary"); buffer("started", "summary"); done("summary");
      assert.equal(h.controller.snapshot.response.generation.responseId, "continued");
      assert.equal(h.controller.snapshot.response.output.responseId, "continued");
    }
    assert.equal(JSON.stringify(r.transport.outbound), initial);
    assert.deepEqual(h.calls, { prepare: 1, connect: 1, media: 1 });
    assert.equal(r.counts.attaches, 1);
    evidence.push({ scenario, knownSyntheticZeroSamples: scenario === "zero-input-event" ? zeroInput.length : undefined,
      postReadySentCommands: 0, calls: { ...h.calls }, trace: trace.snapshot, summaryTerminal, terminal: h.controller.snapshot.response.generation.terminal });
    h.clean(); trace.finish();
  });
}
