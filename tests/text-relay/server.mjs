// Explicit test-process preloads. No production test flag, source fixture, or factory.
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const require = createRequire(import.meta.url), database = new SyntheticSourceDatabase();
globalThis.database = database.asClient();
const counters = { opens: 0, closes: 0, updates: 0, sources: 0, questions: 0, responses: 0, active: 0, acknowledgments: 0, fidelityChecks: 0, models: [] };
const sockets = new Set();
let scenario = "success", held = [], answerDelay = 100;
const wsPath = require.resolve("next/dist/compiled/ws");
require(wsPath);
class LocalProvider extends EventEmitter {
  readyState = 0; bufferedAmount = 0; sequence = 0; turns = 0; closed = false; timers = new Set(); sourceParts = [];
  constructor(url, options) {
    super(); counters.opens++; counters.active++; sockets.add(this);
    this.model = new URL(url).searchParams.get("model");
    assert.equal(this.model, "gpt-realtime-2.1");
    assert.equal(url, `wss://api.openai.com/v1/realtime?model=${this.model}`); counters.models.push(this.model);
    assert.equal(options.maxPayload, 80_000); assert.equal(options.followRedirects, false); assert.equal(options.perMessageDeflate, false);
    assert.match(options.headers.Authorization, /^Bearer sk-synthetic10d-/);
    assert.match(options.headers["OpenAI-Safety-Identifier"], /^[a-f0-9]{64}$/);
    this.later(() => { this.readyState = 1; this.emit("open"); }, scenario === "late-acquisition" ? 250 : 1);
  }
  later(fn, ms) { const timer = setTimeout(() => { this.timers.delete(timer); if (!this.closed) fn(); }, ms); this.timers.add(timer); }
  event(value) { if (!this.closed) this.emit("message", Buffer.from(JSON.stringify({ event_id: `fake10d_${++this.sequence}`, ...value })), false); }
  send(raw, callback) {
    assert.ok(!this.closed); const e = JSON.parse(raw);
    assert.ok(["session.update", "conversation.item.create", "response.create"].includes(e.type));
    if (e.type === "session.update") {
      assert.deepEqual(e.session.output_modalities, ["text"]); assert.equal(e.session.truncation, "disabled");
      assert.equal(e.session.max_output_tokens, 2048); assert.equal(e.session.reasoning.effort, "minimal");
      assert.deepEqual(e.session.tools, []); assert.equal(e.session.tool_choice, "none");
      assert.deepEqual(e.session.audio.input, { turn_detection: null, transcription: null });
      if (e.session.instructions.endsWith("Context loading complete.")) {
        const first = this.sourceParts[0], row = database.rows.get(first?.source.id);
        assert.ok(row); const sections = new Map();
        for (const fragment of this.sourceParts) {
          assert.equal(fragment.source.id, row.id); assert.equal(fragment.variant, "B");
          const identity = row.kind === "YOUTUBE" ? fragment.locator.id : fragment.sectionIndex;
          if (row.kind === "YOUTUBE") assert.equal(Object.hasOwn(fragment, "sectionIndex"), false);
          const parts = sections.get(identity) ?? []; parts.push(fragment); sections.set(identity, parts);
        }
        assert.equal(sections.size, first.sectionCount);
        const texts = [...sections.values()].map(parts => {
          let offset = 0;
          for (const [part, fragment] of parts.entries()) {
            assert.equal(fragment.part, part); assert.equal(fragment.offset, offset); offset += fragment.text.length;
            assert.equal(fragment.last, part === parts.length - 1);
          }
          return parts.map(p => p.text).join("");
        });
        assert.equal(texts.join(first.source.separator), row.fullText); counters.fidelityChecks++;
      }
      counters.updates++;
      this.later(() => this.event({ type: "session.updated", session: { ...e.session, model: this.model, id: "fake_session10d", object: "realtime.session" } }), 2);
    }
    if (e.type === "conversation.item.create") {
      const history = e.event_id.includes("_history_");
      const source = !history && e.item.id.includes("_source_");
      if (source) {
        counters.sources++; const fragment = JSON.parse(e.item.content[0].text);
        assert.equal(fragment.variant, "B");
        this.sourceParts.push(...(fragment.fragments
          ? fragment.fragments.map(part => ({ ...part, source: fragment.source, variant: fragment.variant })) : [fragment]));
      } else if (!history) counters.questions++;
      const ack = () => { counters.acknowledgments++; this.event({ type: "conversation.item.done", previous_item_id: e.previous_item_id ?? null, item: { ...e.item, status: "completed" } }); };
      if (scenario === "withheld-source" && source || scenario === "withheld-question" && !source) held.push(ack);
      else this.later(ack, 2);
    }
    if (e.type === "response.create") {
      counters.responses++; this.turns++;
      assert.deepEqual(e.response.output_modalities, ["text"]); assert.equal(e.response.max_output_tokens, 2048);
      assert.deepEqual(e.response.reasoning, { effort: "minimal" }); assert.deepEqual(e.response.tools, []);
      const response_id = `response_${this.turns}`, item_id = `answer_${this.turns}`;
      const text = this.turns === 1 ? "Synthetic10D answer begins. All source markers preserved." : "Synthetic10D follow-up ends. Full history retained. [segment-355] [segment-unknown] <script>inert</script>";
      const item = { id: item_id, type: "message", role: "assistant", status: "completed", content: [{ type: "text", text }] };
      this.later(() => {
        this.event({ type: "response.created", response: { id: response_id, conversation_id: "conversation10d", status: "in_progress", output_modalities: ["text"], metadata: e.response.metadata } });
        this.event({ type: "response.output_item.added", response_id, output_index: 0, item: { ...item, content: [], status: "in_progress" } });
        this.event({ type: "conversation.item.added", previous_item_id: e.response.metadata.text_turn, item: { ...item, content: [], status: "in_progress" } });
        this.event({ type: "response.output_text.delta", response_id, item_id, output_index: 0, content_index: 0, delta: text.slice(0, 26) });
      }, 5);
      this.later(() => {
        if (scenario === "context") {
          this.event({ type: "response.done", response: { id: response_id, conversation_id: "conversation10d", status: "failed", status_details: { error: { code: "context_length_exceeded", message: "PRIVATE10D_PROVIDER_BODY" } } } });
          return;
        }
        this.event({ type: "response.output_text.delta", response_id, item_id, output_index: 0, content_index: 0, delta: text.slice(26) });
        this.event({ type: "response.output_text.done", response_id, item_id, output_index: 0, content_index: 0, text });
        this.event({ type: "response.output_item.done", response_id, output_index: 0, item });
        this.event({ type: "conversation.item.done", previous_item_id: e.response.metadata.text_turn, item });
        this.event({ type: "response.done", response: { id: response_id, conversation_id: "conversation10d", status: "completed", output: [item] } });
      }, answerDelay);
    }
    queueMicrotask(() => callback());
  }
  terminate() {
    if (this.closed) throw new Error("Duplicate provider close");
    this.closed = true; this.readyState = 3; counters.closes++; counters.active--;
    for (const t of this.timers) clearTimeout(t); this.timers.clear();
    this.sourceParts = []; queueMicrotask(() => this.emit("close"));
  }
}
require.cache[wsPath].exports = LocalProvider;
process.on("message", async message => {
  if (!message?.textTestCommand) return;
  const { textTestCommand: command, requestId } = message;
  if (command === "seed") database.rows.set(message.row.id, { ...message.row, expiresAt: new Date(message.row.expiresAt) });
  else if (command === "delete") database.rows.delete(message.id);
  else if (command === "delay-read") database.delayReadMs = message.ms;
  else if (command === "drain") await database.queue; // Await a deliberately noncooperating synthetic read before reseeding its snapshot store.
  else if (command === "scenario") { scenario = message.scenario; answerDelay = message.answerDelay ?? 100; }
  else if (command === "release") { const work = held; held = []; for (const fn of work) fn(); }
  else if (command === "gate") { process.env.OWNED_SOURCE_TEXT_ENABLED = message.enabled ? "true" : "false"; process.env.OPENAI_API_KEY = message.key ? "sk-synthetic10d-no-live-contact" : ""; }
  else if (command !== "snapshot") throw new Error("Unknown test IPC command");
  process.send?.({ textTestReply: requestId, snapshot: { ...counters, registry: globalThis.ownedTextRegistry10d?.resources ?? { sessions: 0 },
    listeners: [...sockets].reduce((n, s) => n + s.eventNames().reduce((sum, name) => sum + s.listenerCount(name), 0), 0),
    timers: [...sockets].reduce((n, s) => n + s.timers.size, 0), sourceRows: database.rows.size, reads: database.reads,
    held: held.length, fixtureProvider: true } });
});
