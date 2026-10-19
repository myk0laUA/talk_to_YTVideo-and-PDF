import { chronology, ownerCreated, ownerDisposed, transferred, released, identityObserved, controllerCreated, acquired } from "./ownership";
// Independent loopback bundle only. Positive admission and authored answers never enter src/.
import { type TextControllerFactory } from "../../src/app/text-session";
import { TextLifecycle, type TextStatus, type TurnProposal } from "../../src/shared/text-lifecycle";
import { PrimingController, type PrimingClock, type PrimingStatus } from "../../src/shared/priming-controller";
import { encodeManifest, type SessionEvent } from "../../src/shared/priming-manifest";
import type { PrimingInput } from "../../src/shared/priming-admission";

type Fixture = { variant: Parameters<typeof encodeManifest>[0]; input: PrimingInput; id: string };
const fixtures: Fixture[] = JSON.parse(document.getElementById("inputs")!.textContent!);
type Command = { type: string; event_id: string; session?: SessionEvent["session"]; previous_item_id?: string;
  item?: { id: string; type: string; role: string; content: { type: string; text: string }[] }; response?: { metadata: { text_turn: string } } };
class Clock implements PrimingClock {
  at = 0; seq = 0; timers = new Map<number, { at: number; callback: () => void }>();
  now() { return this.at; }
  setTimeout(callback: () => void, ms: number) { const n = ++this.seq; this.timers.set(n, { at: this.at + ms, callback }); return n; }
  clearTimeout(n: unknown) { this.timers.delete(n as number); }
  tick() { this.at += 120_000; for (const [id, t] of this.timers) if (t.at <= this.at) { this.timers.delete(id); t.callback(); } }
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { resolve, promise }; }
class Transport {
  constructor() { acquired(this); }
  open = true; closes = 0; subscriptions = 0; unsubscribes = 0; commands: Command[] = []; trace: string[] = [];
  closed?: () => void;
  receive?: (e: unknown) => void; stale?: (e: unknown) => void; sequence = 0;
  writeGate = deferred(); holdWrite = false;
  subscribe(receive: (e: unknown) => void, closed: () => void) { this.closed = closed; this.receive = this.stale = receive; this.subscriptions++; transferred(this);
    return () => { this.receive = undefined; this.unsubscribes++; }; }
  disconnect() { this.open = false; this.closed?.(); }
  isOpen() { return this.open; }
  send(raw: string) { const e: Command = JSON.parse(raw); this.commands.push(e); this.trace.push(`send:${e.type}`);
    if (this.holdWrite && e.item?.id.includes("_question_")) return this.writeGate.promise; }
  close() { this.trace.push("close"); this.open = false; this.closes++; released(this); }
  emit(e: object) { this.trace.push(`receive:${Reflect.get(e, "type")}`); this.receive?.({ event_id: `fixture_event_${++this.sequence}`, ...e }); }
  get questions() { return this.commands.filter(e => e.item?.id.includes("_question_")); }
  get responses() { return this.commands.filter(e => e.type === "response.create"); }
  config() { const c = this.commands.filter(c => c.session).at(-1); if (c) this.emit({ type: "session.updated", session: { ...c.session, object: "realtime.session", id: "session_fixture_10C", model: "offline-fixture-only" } }); }
  ack(c: Command, type = "conversation.item.done") { this.emit({ type, previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: type.endsWith("done") ? "completed" : "in_progress" } }); }
  items() { for (const c of this.commands.filter(c => c.item && !c.item.id.includes("_question_"))) this.ack(c); }
  question(final: boolean) { const c = this.questions.at(-1); if (c) this.ack(c, final ? "conversation.item.done" : "conversation.item.added"); }
  get ids() { return { response_id: `answer_response_${this.responses.length}`, item_id: `answer_item_${this.responses.length}`, output_index: 0, content_index: 0 }; }
  answer() { const c = this.responses.at(-1); if (!c) return;
    this.emit({ type: "response.created", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "in_progress", output_modalities: ["text"], metadata: c.response!.metadata } });
    this.emit({ type: "response.output_item.added", ...this.ids, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
    this.emit({ type: "conversation.item.added", previous_item_id: this.questions.at(-1)!.item!.id, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
  }
  partial(text = "FIXTURE10C partial answer 雪. ") { this.emit({ type: "response.output_text.delta", ...this.ids, delta: text }); }
  finish() { const text = "FIXTURE10C partial answer 雪. Complete synthetic answer.";
    this.emit({ type: "response.output_text.done", ...this.ids, text });
    this.emit({ type: "response.done", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "completed",
      output: [{ id: this.ids.item_id, type: "message", role: "assistant", content: [{ type: "output_text", text }] }] } }); }
  late() {
    this.closed?.();
    const configuration = this.commands.filter(c => c.session).at(-1);
    if (configuration) this.stale?.({ type: "session.updated", event_id: "late_config", session: { ...configuration.session, object: "realtime.session", id: "late_session", model: "offline-fixture-only" } });
    for (const c of this.commands.filter(c => c.item)) this.stale?.({ type: "conversation.item.done", event_id: `late_${c.item!.id}`, previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: "completed" } });
    const q = this.questions.at(-1), response = this.responses.at(-1);
    const stale = (event: object) => this.stale?.({ event_id: `late_${++this.sequence}`, ...event });
    if (q) stale({ type: "conversation.item.done", previous_item_id: q.previous_item_id ?? null, item: { ...q.item, status: "completed" } });
    if (response) stale({ type: "response.created", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "in_progress", output_modalities: ["text"], metadata: response.response!.metadata } });
    stale({ type: "response.output_text.delta", ...this.ids, delta: "STALE10C_MUST_NOT_APPEAR" });
  }
}
type RecordEntry = { clock: Clock; transports: Transport[]; states: string[]; disposed: number; prepare: number; connects: number;
  prepareGate: ReturnType<typeof deferred>; connectGate: ReturnType<typeof deferred>; admitGate: ReturnType<typeof deferred>; controller?: TextLifecycle };
export const records: RecordEntry[] = [];
let scenario = "success";
export const setScenario = (value: string) => { scenario = value; };
export const factory: TextControllerFactory = notify => {
  const mode = scenario;
  const r: RecordEntry = { clock: new Clock(), transports: [], states: [], disposed: 0, prepare: 0, connects: 0, prepareGate: deferred(), connectGate: deferred(), admitGate: deferred() };
  records.push(r); const owner = ownerCreated('text');
  class FixturePriming extends PrimingController {
    protected override admission(input: PrimingInput) { return input.wireBudget.model === "offline-fixture-only" && input.wireBudget.verification === "synthetic" ? "synthetic-test-only" as const : undefined; }
  }
  class FixtureText extends TextLifecycle {
    protected override createPriming(callback: (s: PrimingStatus) => void, ready: () => void) {
      return mode === "source-default" ? super.createPriming(callback, ready) : new FixturePriming(r.clock, callback, ready, 1000);
    }
    protected override async admitTurn(proposal: TurnProposal, signal: AbortSignal) {
      if (mode === "turn-default") return super.admitTurn(proposal, signal);
      if (mode === "hold-admission") await r.admitGate.promise;
      return { proposal, maxOutputTokens: 200 };
    }
    override dispose() { r.disposed++; super.dispose(); ownerDisposed(owner); }
  }
  r.controller = new FixtureText(r.clock, {
    prepare: async identity => {
      r.prepare++; chronology.push({ event: "prepare", owner, source: identity.sourceId, run: identity.runId });
      if (mode === "hold-preparation") await r.prepareGate.promise;
      const f = fixtures.find(f => f.id === identity.sourceId)!;
      const manifest = encodeManifest(f.variant, identity.runId, "text", 2048);
      return { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } };
    },
    connect: async () => { r.connects++; chronology.push({ event: "acquire-connection", owner }); const t = new Transport(); t.holdWrite = mode === "hold-write"; r.transports.push(t);
      if (mode === "hold-connection") await r.connectGate.promise;
      return { transport: t, close: () => t.close() }; },
  }, (s: TextStatus) => { identityObserved(owner, s.identity); r.states.push(s.phase); notify(s); });
  controllerCreated(r.controller); return r.controller;
};
export const flush = async () => { for (let n = 0; n < 32; n++) await Promise.resolve(); };
