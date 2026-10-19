// Independent loopback bundle only. Positive admission and authored answers never enter src/.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { TextSession, type TextControllerFactory } from "../../src/app/text-session";
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
  open = true; closes = 0; subscriptions = 0; unsubscribes = 0; commands: Command[] = []; trace: string[] = [];
  receive?: (e: unknown) => void; stale?: (e: unknown) => void; sequence = 0;
  writeGate = deferred(); holdWrite = false;
  subscribe(receive: (e: unknown) => void) { this.receive = this.stale = receive; this.subscriptions++;
    return () => { this.receive = undefined; this.unsubscribes++; }; }
  isOpen() { return this.open; }
  send(raw: string) { const e: Command = JSON.parse(raw); this.commands.push(e); this.trace.push(`send:${e.type}`);
    if (this.holdWrite && e.item?.id.includes("_question_")) return this.writeGate.promise; }
  close() { this.open = false; this.closes++; }
  emit(e: object) { this.trace.push(`receive:${Reflect.get(e, "type")}`); this.receive?.({ event_id: `fixture_event_${++this.sequence}`, ...e }); }
  get questions() { return this.commands.filter(e => e.item?.id.includes("_question_")); }
  get responses() { return this.commands.filter(e => e.type === "response.create"); }
  config() { const c = this.commands.filter(c => c.session).at(-1); if (c) this.emit({ type: "session.updated", session: { ...c.session, object: "realtime.session", id: "session_fixture_10B", model: "offline-fixture-only" } }); }
  ack(c: Command, type = "conversation.item.done") { this.emit({ type, previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: type.endsWith("done") ? "completed" : "in_progress" } }); }
  items() { for (const c of this.commands.filter(c => c.item && !c.item.id.includes("_question_"))) this.ack(c); }
  question(final: boolean) { const c = this.questions.at(-1); if (c) this.ack(c, final ? "conversation.item.done" : "conversation.item.added"); }
  get ids() { return { response_id: `answer_response_${this.responses.length}`, item_id: `answer_item_${this.responses.length}`, output_index: 0, content_index: 0 }; }
  answer() { const c = this.responses.at(-1); if (!c) return;
    this.emit({ type: "response.created", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "in_progress", output_modalities: ["text"], metadata: c.response!.metadata } });
    this.emit({ type: "response.output_item.added", ...this.ids, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
    this.emit({ type: "conversation.item.added", previous_item_id: this.questions.at(-1)!.item!.id, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
  }
  partial(text = "FIXTURE10B partial answer 雪. ") { this.emit({ type: "response.output_text.delta", ...this.ids, delta: text }); }
  finish() { const text = "FIXTURE10B partial answer 雪. Complete synthetic answer.";
    this.emit({ type: "response.output_text.done", ...this.ids, text });
    this.emit({ type: "response.done", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "completed",
      output: [{ id: this.ids.item_id, type: "message", role: "assistant", content: [{ type: "output_text", text }] }] } }); }
  late() {
    const q = this.questions.at(-1), response = this.responses.at(-1);
    const stale = (event: object) => this.stale?.({ event_id: `late_${++this.sequence}`, ...event });
    if (q) stale({ type: "conversation.item.done", previous_item_id: q.previous_item_id ?? null, item: { ...q.item, status: "completed" } });
    if (response) stale({ type: "response.created", response: { id: this.ids.response_id, conversation_id: "conversation_fixture", status: "in_progress", output_modalities: ["text"], metadata: response.response!.metadata } });
    stale({ type: "response.output_text.delta", ...this.ids, delta: "STALE10B_MUST_NOT_APPEAR" });
  }
}
type RecordEntry = { clock: Clock; transports: Transport[]; states: string[]; disposed: number; prepare: number; connects: number;
  prepareGate: ReturnType<typeof deferred>; connectGate: ReturnType<typeof deferred>; admitGate: ReturnType<typeof deferred>; controller?: TextLifecycle };
const records: RecordEntry[] = [];
let scenario = "success";
const factory: TextControllerFactory = notify => {
  const mode = scenario;
  const r: RecordEntry = { clock: new Clock(), transports: [], states: [], disposed: 0, prepare: 0, connects: 0, prepareGate: deferred(), connectGate: deferred(), admitGate: deferred() };
  records.push(r);
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
    override dispose() { r.disposed++; super.dispose(); }
  }
  r.controller = new FixtureText(r.clock, {
    prepare: async identity => {
      r.prepare++;
      if (mode === "hold-preparation") await r.prepareGate.promise;
      const f = fixtures.find(f => f.id === identity.sourceId)!;
      const manifest = encodeManifest(f.variant, identity.runId, "text", 2048);
      return { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } };
    },
    connect: async () => { r.connects++; const t = new Transport(); t.holdWrite = mode === "hold-write"; r.transports.push(t);
      if (mode === "hold-connection") await r.connectGate.promise;
      return { transport: t, close: () => t.close() }; },
  }, (s: TextStatus) => { r.states.push(s.phase); notify(s); });
  return r.controller;
};
const flush = async () => { for (let n = 0; n < 32; n++) await Promise.resolve(); };
function Harness() {
  const [source, setSource] = useState(0), [mounted, setMounted] = useState(true), [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState(false);
  const t = () => records.at(-1)?.transports.at(-1);
  const act = (f: () => void) => async () => { f(); await flush(); setRevision(n => n + 1); };
  const audit = records.map(r => ({ states: r.states, disposed: r.disposed, prepare: r.prepare, connects: r.connects, timers: r.clock.timers.size,
    transports: r.transports.map(t => ({ questions: t.questions.length, responses: t.responses.length, exact: t.questions.map(c => c.item!.content[0].text),
      closes: t.closes, subscriptions: t.subscriptions, unsubscribes: t.unsubscribes, listening: !!t.receive, trace: t.trace })) }));
  return <main className="app-shell"><h1>Isolated text session fixture 10B</h1>
    <p>Deterministic local test only. These answers are authored fixtures.</p>
    <details><summary>Fixture controls</summary><div className="source-actions">
      <label>Scenario <select aria-label="Scenario" defaultValue="success" onChange={e => { scenario = e.target.value; setMounted(false); }}>{["success", "source-default", "turn-default", "hold-preparation", "hold-connection", "hold-admission", "hold-write"].map(s => <option key={s}>{s}</option>)}</select></label>
      <button onClick={() => { setMounted(true); setRevision(n => n + 1); }}>Mount session</button>
      <button onClick={() => { setSource(n => n === 0 ? 1 : 0); setRevision(n => n + 1); }}>Replace source</button>
      <button onClick={() => { setSource(-1); setRevision(n => n + 1); }}>Remove source</button>
      <button onClick={() => { setMounted(false); setRevision(n => n + 1); }}>Unmount session</button>
      <button onClick={act(() => {})}>Refresh audit</button>
      {[
        ["ACK initial", () => t()?.config()], ["ACK source", () => t()?.items()], ["ACK final", () => t()?.config()],
        ["ACK question added", () => t()?.question(false)], ["ACK question final", () => t()?.question(true)],
        ["Begin answer", () => t()?.answer()], ["Stream partial", () => t()?.partial()], ["Stream long", () => t()?.partial("Long synthetic line 日本語. ".repeat(180))],
        ["Finish answer", () => t()?.finish()], ["Fail answer", () => t()?.emit({ type: "error", error: { message: "PRIVATE10B_ERROR" } })],
        ["Expire timers", () => records.at(-1)?.clock.tick()],
        ["Release preparation", () => records.forEach(r => r.prepareGate.resolve())], ["Release connection", () => records.forEach(r => r.connectGate.resolve())],
        ["Release admission", () => records.forEach(r => r.admitGate.resolve())], ["Release question write", () => t()?.writeGate.resolve()],
        ["Deliver stale events", () => records.forEach(r => r.transports.forEach(t => t.late()))],
      ].map(([label, fn]) => <button key={label as string} onClick={act(fn as () => void)}>{label as string}</button>)}
    </div></details>
    <section className="source-reader"><h2>Source preview</h2><button onClick={() => setPreview(p => !p)} aria-expanded={preview}>Inspect source</button>
      {preview ? <p className="page-text">{source < 0 ? "No source selected." : fixtures[source].variant.source.sections?.map(s => s.text).join("\n")}</p> : null}</section>
    <section className="workspace source-workspace"><div className="conversation-panel"><h2>Conversation</h2>
      {mounted ? <TextSession source={source < 0 ? null : { id: fixtures[source].id, title: source === 0 ? "Synthetic source A — Alder station" : "Synthetic source B — Juniper workshop" }} createController={factory} /> : <p>Session unmounted.</p>}
    </div></section>
    <output aria-label="Fixture revision">{revision}</output><pre aria-label="Fixture audit">{JSON.stringify(audit)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
