import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import { HttpTextController } from "../../src/app/text-http-controller.ts";
import { TranscriptStore } from "../../src/shared/transcript.ts";
import type { TextRelaySnapshot } from "../../src/shared/text-relay.ts";

test("10D HTTP proxy ignores queued old readiness; Stop cancels reader and never retries a question", async () => {
  const original = globalThis.fetch, commands: { path: string; input?: Record<string, unknown> }[] = [];
  let output!: ReadableStreamDefaultController<Uint8Array>, cancels = 0;
  const stream = new ReadableStream<Uint8Array>({ start(c) { output = c; }, cancel() { cancels++; } });
  const snapshots: string[] = [], sessionId = randomUUID();
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const input = init?.body ? JSON.parse(String(init.body)) : undefined;
    commands.push({ path: url, input });
    return url.endsWith("/stream") ? new Response(stream, { headers: { "content-type": "application/x-ndjson" } })
      : Response.json(url === "/api/text-sessions" ? { sessionId } : { ok: true });
  }) as typeof fetch;
  const controller = new HttpTextController(s => snapshots.push(s.phase));
  const emit = async (phase: TextRelaySnapshot["status"]["phase"], questionId?: string) => {
    output.enqueue(new TextEncoder().encode(JSON.stringify({ status: { phase, protocolReady: phase === "ready", productionReady: false, revision: 0 },
      transcript: new TranscriptStore().snapshot, questionId }) + "\n")); await setImmediate();
  };
  try {
    assert.equal(controller.start(randomUUID()), true); await setImmediate();
    await emit("ready"); assert.equal(controller.canSubmit, true);
    assert.equal(controller.submit("One question"), true); await setImmediate();
    const questionId = commands.find(c => c.path.endsWith("/question"))!.input!.questionId as string;
    await emit("ready"); assert.equal(controller.canSubmit, false); assert.equal(controller.snapshot.phase, "admitting");
    assert.equal(controller.submit("Duplicate click"), false);
    await emit("ready", questionId); assert.equal(controller.canSubmit, true);
    controller.stop(); await setImmediate(); controller.dispose();
    assert.equal(cancels, 1); assert.equal(commands.filter(c => c.path.endsWith("/question")).length, 1);
    assert.equal(commands.filter(c => c.path.endsWith("/stop")).length, 1);
    assert.equal(snapshots.at(-1), "ended");
  } finally { controller.dispose(); globalThis.fetch = original; }
});

test("03F local Stop or connection loss retains natural claim and marks pending evidence incomplete", async () => {
  const original = globalThis.fetch;
  for (const failed of [false, true]) {
    let output!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({ start(c) { output = c; } });
    globalThis.fetch = (async (url: string) => url.endsWith("/stream")
      ? new Response(stream, { headers: { "content-type": "application/x-ndjson" } })
      : Response.json(url === "/api/text-sessions" ? { sessionId: randomUUID() } : { ok: true })) as typeof fetch;
    const controller = new HttpTextController(() => {});
    try {
      controller.start(randomUUID()); await setImmediate();
      const transcript = { ...new TranscriptStore().snapshot, phase: "active", turns: [{ itemId: "a", role: "assistant", ordering: "established",
        generation: "generating", interrupted: false, playback: "not_applicable", parts: [{ index: 0, kind: "output_text", state: "draft",
          text: "The speaker says this.", evidence: [{ text: "The speaker says this.", state: "pending", references: [] }] }] }] };
      output.enqueue(new TextEncoder().encode(JSON.stringify({ status: { phase: "responding", protocolReady: false, productionReady: false, revision: 0 }, transcript }) + "\n"));
      await setImmediate();
      if (failed) output.error(new Error("Synthetic connection loss")); else controller.stop();
      await setImmediate();
      const part = controller.transcript.turns[0].parts[0];
      assert.equal(part.text, "The speaker says this."); assert.equal(part.evidence?.[0].state, "incomplete"); assert.deepEqual(part.evidence?.[0].references, []);
      assert.equal(controller.snapshot.phase, failed ? "failed" : "ended");
    } finally { controller.dispose(); globalThis.fetch = original; }
  }
});
