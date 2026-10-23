import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { TextLifecycle, type TextAdapters, type TextConnection, type TextIdentity, type TextStatus, type TurnPermit, type TurnProposal } from "../../src/shared/text-lifecycle.ts";
import type { PrimingInput } from "../../src/shared/priming-admission.ts";
import type { PrimingStatus, PrimingTransport } from "../../src/shared/priming-controller.ts";
import { encodeManifest, type SourceItem, type SessionEvent } from "../../src/shared/priming-manifest.ts";
import { FakeClock, SyntheticPrimingController, fixture, flush } from "./harness.ts";

export function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export type Command = { type: string; event_id: string; session?: SessionEvent["session"]; item?: SourceItem; previous_item_id?: string;
  response?: { output_modalities: string[]; max_output_tokens: number; metadata: { text_turn: string } } };
export class TextTransport implements PrimingTransport {
  open = true; closes = 0; unsubscribes = 0; subscriptions = 0; sequence = 0;
  commands: Command[] = []; trace: string[] = [];
  receive?: (e: unknown) => void; stale?: (e: unknown) => void; closed?: () => void;
  sendAction?: (e: Command) => void | Promise<void>;
  subscribe(receive: (e: unknown) => void, closed: () => void) {
    this.subscriptions++; this.receive = this.stale = receive; this.closed = closed;
    return () => { this.unsubscribes++; this.receive = this.closed = undefined; };
  }
  isOpen() { return this.open; }
  close() { this.closes++; this.open = false; }
  send(raw: string) {
    assert.ok(this.open);
    const e: Command = JSON.parse(raw); assert.ok(["session.update", "conversation.item.create", "response.create"].includes(e.type));
    if (e.session) { assert.deepEqual(e.session.output_modalities, ["text"]); assert.equal(e.session.audio.input.turn_detection, null); }
    if (e.item) { assert.ok(["user", "assistant", "system"].includes(e.item.role)); assert.equal(e.item.content[0].type, String(e.item.role) === "assistant" ? "output_text" : "input_text"); }
    if (e.response) { assert.deepEqual(e.response.output_modalities, ["text"]); assert.ok(e.response.max_output_tokens > 0); }
    this.commands.push(e); this.trace.push(`send:${e.type}:${e.item?.id ?? e.event_id}`);
    return this.sendAction?.(e);
  }
  emit(e: Record<string, unknown>) { this.trace.push(`receive:${e.type}`); this.receive?.({ event_id: `server_${++this.sequence}`, ...e }); }
  config() {
    const e = this.commands.filter(c => c.type === "session.update").at(-1)!;
    this.emit({ type: "session.updated", session: { ...structuredClone(e.session), id: "session_text", object: "realtime.session", model: "offline-fixture-only" } });
  }
  ack(e: Command, extra: Record<string, unknown> = {}) {
    this.emit({ type: "conversation.item.done", previous_item_id: e.previous_item_id ?? null,
      item: { ...structuredClone(e.item), status: "completed" }, ...extra });
  }
  get questions() { return this.commands.filter(e => e.item?.id.includes("_question_")); }
  get responses() { return this.commands.filter(e => e.type === "response.create"); }
}
export async function textHarness(mode: "synthetic" | "source-default" | "turn-default" = "synthetic") {
  const a = await fixture("PDF", "B", "fixture", "text"), b = await fixture("YOUTUBE", "B", "fixture", "text");
  const clock = new FakeClock(), states: TextStatus[] = [], all: { transport: TextTransport; connection: TextConnection; closes: number }[] = [];
  const signals: AbortSignal[] = [], proposals: TurnProposal[] = [], inputs = new Map<string, PrimingInput>();
  const calls = { prepare: 0, connect: 0, admit: 0 };
  const inputFor = (identity: TextIdentity) => {
    const f = identity.sourceId === a.row.id ? a : b;
    const manifest = encodeManifest(f.prepared.variants.B, identity.runId, "text", 2048);
    const input = { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } };
    inputs.set(identity.runId, input); return input;
  };
  const adapters: TextAdapters = {
    prepare: async identity => inputFor(identity),
    connect: async () => {
      const transport = new TextTransport();
      const r = { transport, closes: 0, connection: { transport, close: () => { r.closes++; transport.close(); } } };
      all.push(r); return r.connection;
    },
  };
  const accounting = { admit: async (proposal: TurnProposal, signal: AbortSignal): Promise<TurnPermit | undefined> => {
    void signal; return { proposal, maxOutputTokens: 200 };
  } };
  class ScriptedText extends TextLifecycle {
    protected override createPriming(notify: (s: PrimingStatus) => void, primed: () => void) { return new SyntheticPrimingController(clock, notify, primed, 1000); }
    protected override admitTurn(p: TurnProposal, signal: AbortSignal) {
      calls.admit++; proposals.push(p);
      return mode === "turn-default" ? super.admitTurn(p, signal) : accounting.admit(p, signal);
    }
  }
  const Controller = mode === "source-default" ? TextLifecycle : ScriptedText;
  const controller = new Controller(clock, {
    prepare: (identity, signal) => { calls.prepare++; signals.push(signal); return adapters.prepare(identity, signal); },
    connect: (identity, signal) => { calls.connect++; return adapters.connect(identity, signal); },
  }, s => states.push(s), { preparationMs: 100, connectionMs: 200, primingMs: 1000, turnMs: 500 });
  const begin = async (sourceId = a.row.id) => { assert.equal(controller.start(sourceId), true); await flush(); };
  const config = async () => { all.at(-1)!.transport.config(); await flush(); };
  const items = async (withhold = false) => {
    const t = all.at(-1)!.transport;
    for (const c of t.commands.filter(c => c.item).slice(withhold ? 1 : 0)) t.ack(c);
    await flush();
  };
  const ready = async () => { await config(); await items(); await config(); assert.equal(controller.snapshot.phase, "ready"); };
  const question = async (text = "  café 🌱 e\u0301\n雪\t ") => { assert.equal(controller.submit(text), true); await flush(); };
  const ack = async () => { const t = all.at(-1)!.transport; t.ack(t.questions.at(-1)!); await flush(); };
  const response = async () => {
    const t = all.at(-1)!.transport, c = t.responses.at(-1)!;
    const responseId = `response_${t.responses.length}`, itemId = `answer_${t.responses.length}`;
    const metadata = c.response!.metadata;
    t.emit({ type: "response.created", response: { id: responseId, conversation_id: "conversation_text", status: "in_progress", output_modalities: ["text"], metadata } });
    t.emit({ type: "response.output_item.added", response_id: responseId, output_index: 0, item: { id: itemId, type: "message", role: "assistant", content: [] } });
    t.emit({ type: "conversation.item.added", previous_item_id: t.questions.at(-1)!.item!.id,
      item: { id: itemId, type: "message", role: "assistant", status: "in_progress", content: [] } });
    await flush(); return { responseId, itemId, metadata };
  };
  const delta = (ids: { responseId: string; itemId: string }, text: string, final = false) => all.at(-1)!.transport.emit({
    type: final ? "response.output_text.done" : "response.output_text.delta", response_id: ids.responseId, item_id: ids.itemId,
    output_index: 0, content_index: 0, ...(final ? { text } : { delta: text }) });
  const done = async (ids: { responseId: string; itemId: string }, text = "Synthetic answer 雪.", status = "completed") => {
    all.at(-1)!.transport.emit({ type: "response.done", response: { id: ids.responseId, conversation_id: "conversation_text", status,
      output: [{ id: ids.itemId, type: "message", role: "assistant", content: [{ type: "output_text", text }] }] } }); await flush();
  };
  const clean = () => {
    controller.stop(); assert.equal(clock.timers.size, 0);
    for (const s of signals) assert.equal(getEventListeners(s, "abort").length, 0);
    for (const r of all) { assert.equal(r.closes, 1); assert.equal(r.transport.closes, 1); assert.equal(r.transport.subscriptions, 1);
      assert.equal(r.transport.unsubscribes, 1); assert.equal(r.transport.receive, undefined); }
  };
  const trace = (scenario: string) => ({ scenario, states, calls, transcript: controller.transcript,
    transports: all.map(r => ({ closes: r.closes, unsubscribes: r.transport.unsubscribes, subscriptions: r.transport.subscriptions,
      questions: r.transport.questions.length, responses: r.transport.responses.length, trace: r.transport.trace })), timers: clock.timers.size });
  return { controller, clock, states, signals, calls, all, adapters, accounting, proposals, inputs, inputFor, a, b, begin, config, items, ready, question, ack, response, delta, done, clean, trace };
}
