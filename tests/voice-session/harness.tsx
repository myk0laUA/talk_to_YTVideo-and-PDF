// Independent loopback test bundle only. No positive admission or media adapter in src/.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { VoiceSession, type VoiceControllerFactory } from "../../src/app/voice-session";
import { VoiceLifecycle, type VoiceConnection, type VoiceMedia, type VoiceTrack } from "../../src/shared/voice-lifecycle";
import { PrimingController, type PrimingClock, type PrimingStatus } from "../../src/shared/priming-controller";
import { encodeManifest, type SessionEvent } from "../../src/shared/priming-manifest";
import type { PrimingInput } from "../../src/shared/priming-admission";

type Fixture = { variant: Parameters<typeof encodeManifest>[0]; input: PrimingInput; id: string };
const fixtures: Fixture[] = JSON.parse(document.getElementById("inputs")!.textContent!);
type Command = { type: string; event_id: string; response_id?: string; session?: SessionEvent["session"]; previous_item_id?: string;
  item?: { id: string; type: string; role: string; content: { type: string; text: string }[] } };
class Clock implements PrimingClock {
  at = 0; seq = 0; timers = new Map<number, { at: number; callback: () => void }>();
  now() { return this.at; }
  setTimeout(callback: () => void, ms: number) { const n = ++this.seq; this.timers.set(n, { at: this.at + ms, callback }); return n; }
  clearTimeout(n: unknown) { this.timers.delete(n as number); }
  tick() { this.at += 120_000; for (const [id, t] of this.timers) if (t.at <= this.at) { this.timers.delete(id); t.callback(); } }
}
function deferred() { let resolve!: () => void, reject!: (e: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { resolve, reject, promise }; }
class Track implements VoiceTrack {
  private on = false;
  readyState = "live"; stops = 0; subscriptions = 0; removals = 0; changes: boolean[] = [];
  listeners = new Set<() => void>(); stale?: () => void;
  get enabled() { return this.on; }
  set enabled(value: boolean) { if (this.on !== value) this.changes.push(value); this.on = value; }
  stop() { this.stops++; this.readyState = "ended"; }
  subscribeEnded(callback: () => void) { this.subscriptions++; this.listeners.add(callback); this.stale = callback;
    return () => { this.removals++; this.listeners.delete(callback); }; }
  end() { this.readyState = "ended"; for (const callback of this.listeners) callback(); }
}
class Transport {
  open = true; closes = 0; subscriptions = 0; unsubscribes = 0; commands: Command[] = []; trace: string[] = [];
  receive?: (e: unknown) => void; stale?: (e: unknown) => void; sequence = 0; response = "answer_A";
  cancelGate = deferred(); clearGate = deferred(); holdCancel = false; holdClear = false;
  subscribe(receive: (e: unknown) => void) { this.receive = this.stale = receive; this.subscriptions++;
    return () => { this.receive = undefined; this.unsubscribes++; }; }
  isOpen() { return this.open; }
  send(raw: string) { const e: Command = JSON.parse(raw); this.commands.push(e); this.trace.push(`send:${e.type}`);
    if (this.holdCancel && e.type === "response.cancel") return this.cancelGate.promise;
    if (this.holdClear && e.type === "output_audio_buffer.clear") return this.clearGate.promise;
  }
  close() { this.open = false; this.closes++; }
  emit(e: object) { this.trace.push(`receive:${Reflect.get(e, "type")}`); this.receive?.({ event_id: `fixture08c_${++this.sequence}`, ...e }); }
  config() { const c = this.commands.filter(c => c.session).at(-1); if (c) this.emit({ type: "session.updated", session: { ...c.session, object: "realtime.session", id: "session_08c", model: "offline-fixture-only" } }); }
  items(withhold = false) { for (const c of this.commands.filter(c => c.item).slice(withhold ? 1 : 0)) this.emit({ type: "conversation.item.done", previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: "completed" } }); }
  get ids() { return { response_id: this.response, item_id: `${this.response}_item`, output_index: 0, content_index: 0 }; }
  created(id = this.response, conversation = "conv_08c") { this.emit({ type: "response.created", response: { id, conversation_id: conversation, status: "in_progress", output: [] } }); }
  answer() {
    this.created();
    this.emit({ type: "input_audio_buffer.committed", item_id: `${this.response}_user`, previous_item_id: this.commands.filter(c => c.item).at(-1)!.item!.id });
    this.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: `${this.response}_user`, content_index: 0, transcript: "FIXTURE08C synthetic spoken question." });
    this.emit({ type: "response.output_item.added", ...this.ids, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
    this.emit({ type: "conversation.item.added", previous_item_id: `${this.response}_user`, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
  }
  partial(text = "FIXTURE08C generated speech text 雪. ") { this.emit({ type: "response.output_audio_transcript.delta", ...this.ids, delta: text }); }
  done(status = "completed", id = this.response, conversation = "conv_08c") { this.emit({ type: "response.done", response: { id, conversation_id: conversation, status, output: [] } }); }
  buffer(kind: string, id = this.response) { this.emit({ type: `output_audio_buffer.${kind}`, response_id: id }); }
  speech(kind: string) { this.emit({ type: `input_audio_buffer.speech_${kind}`, item_id: "speech_08c", [kind === "started" ? "audio_start_ms" : "audio_end_ms"]: kind === "started" ? 100 : 200 }); }
  late() {
    this.stale?.({ type: "response.created", event_id: "late_08c_created", response: { id: "late_08c", conversation_id: "conv_08c", status: "in_progress" } });
    this.stale?.({ type: "response.output_audio_transcript.delta", event_id: "late_08c_text", ...this.ids, delta: "STALE08C_MUST_NOT_APPEAR" });
    this.stale?.({ type: "output_audio_buffer.cleared", event_id: "late_08c_clear", response_id: this.response });
  }
}
function resources(mode: string) {
  const transport = new Transport(), tracks = [new Track(), new Track()], playGate = deferred();
  transport.holdCancel = mode === "hold-cancel"; transport.holdClear = mode === "hold-clear";
  const counts = { closes: 0, playbackReleases: 0, plays: 0, speakerMuted: false, mediaReleases: 0, attaches: 0 };
  const connection: VoiceConnection = { transport, close() { counts.closes++; transport.close(); }, playback: {
    setMuted(muted) { counts.speakerMuted = muted; },
    async play() { counts.plays++; if (mode === "blocked-playback" && counts.plays === 1) throw new Error("PRIVATE08C_ERROR");
      if (mode === "hold-playback") await playGate.promise; }, release() { counts.playbackReleases++; } } };
  const media: VoiceMedia = { tracks, attach() { if (tracks.some(t => t.enabled)) throw new Error("Attached enabled tracks"); counts.attaches++; }, release() { counts.mediaReleases++; } };
  return { transport, tracks, connection, media, counts, playGate, mediaReturned: false };
}
type RecordEntry = { clock: Clock; resources: ReturnType<typeof resources>[]; states: unknown[]; disposed: number; prepare: number; connects: number; media: number;
  prepareGate: ReturnType<typeof deferred>; connectGate: ReturnType<typeof deferred>; mediaGate: ReturnType<typeof deferred>; controller?: VoiceLifecycle };
const records: RecordEntry[] = [];
let scenario = "success";
const factory: VoiceControllerFactory = notify => {
  const mode = scenario;
  const r: RecordEntry = { clock: new Clock(), resources: [], states: [], disposed: 0, prepare: 0, connects: 0, media: 0,
    prepareGate: deferred(), connectGate: deferred(), mediaGate: deferred() };
  records.push(r);
  class Fixture08cPriming extends PrimingController {
    protected override admission(input: PrimingInput) { return input.preparedBudget.status === "offline_fit" && input.wireBudget.status === "offline_fit"
      && input.wireBudget.model === "offline-fixture-only" && input.wireBudget.verification === "synthetic" && input.wireBudget.unit === "synthetic-units"
      && input.wireBudget.representation === input.manifest.representation && input.wireBudget.measured === input.manifest.bytes ? "synthetic-test-only" as const : undefined; }
  }
  class Fixture08cVoice extends VoiceLifecycle {
    protected override createPriming(callback: (s: PrimingStatus) => void, ready: () => void) {
      return mode === "source-default" ? super.createPriming(callback, ready) : new Fixture08cPriming(r.clock, callback, ready, 1000);
    }
    override dispose() { r.disposed++; super.dispose(); }
  }
  r.controller = new Fixture08cVoice(r.clock, {
    prepare: async identity => { r.prepare++; if (mode === "hold-preparation") await r.prepareGate.promise;
      const f = fixtures.find(f => f.id === identity.sourceId)!;
      const manifest = encodeManifest(f.variant, identity.runId, "voice", 2048);
      return { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } }; },
    connect: async () => { r.connects++; const resource = resources(mode); r.resources.push(resource);
      if (mode === "hold-connection") await r.connectGate.promise; return resource.connection; },
    acquireMedia: async () => { r.media++; if (mode === "denied-microphone") throw new Error("PRIVATE08C_ERROR");
      const resource = r.resources.at(-1)!; if (mode === "hold-microphone") await r.mediaGate.promise;
      resource.mediaReturned = true; return resource.media; },
  }, s => { r.states.push({ phase: s.phase, microphone: s.microphone, playback: s.playback, muted: s.muted, response: s.response }); notify(s); });
  return r.controller;
};
const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };
function Harness() {
  const [source, setSource] = useState(0), [mounted, setMounted] = useState(true), [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState(false);
  const resource = () => records.at(-1)?.resources.at(-1), t = () => resource()?.transport;
  const act = (f: () => void) => async () => { f(); await flush(); setRevision(n => n + 1); };
  const audit = records.map(r => ({ states: r.states, disposed: r.disposed, prepare: r.prepare, connects: r.connects, media: r.media, timers: r.clock.timers.size,
    resources: r.resources.map(x => ({ ...x.counts, mediaReturned: x.mediaReturned,
      tracks: x.tracks.map(t => ({ enabled: t.enabled, changes: t.changes, stops: t.stops, subscriptions: t.subscriptions, removals: t.removals, listeners: t.listeners.size })),
      transport: { closes: x.transport.closes, subscriptions: x.transport.subscriptions, unsubscribes: x.transport.unsubscribes, listening: !!x.transport.receive,
        commands: x.transport.commands.map(c => ({ type: c.type, event_id: c.event_id, response_id: c.response_id, item_id: c.item?.id })), trace: x.transport.trace } })) }));
  return <main className="app-shell"><h1>Isolated voice controls fixture 08C</h1>
    <p>All microphone, playback and transport resources are simulated. No sound or provider is used.</p>
    <details><summary>Fixture controls</summary><div className="source-actions">
      <label>Scenario <select aria-label="Scenario" defaultValue="success" onChange={e => { scenario = e.target.value; setMounted(false); }}>{["success", "source-default", "denied-microphone", "hold-preparation", "hold-connection", "hold-microphone", "blocked-playback", "hold-playback", "hold-cancel", "hold-clear"].map(s => <option key={s}>{s}</option>)}</select></label>
      <button onClick={() => { setMounted(true); setRevision(n => n + 1); }}>Mount session</button>
      <button onClick={() => { setSource(n => n === 0 ? 1 : 0); setRevision(n => n + 1); }}>Replace source</button>
      <button onClick={() => { setSource(-1); setRevision(n => n + 1); }}>Remove source</button>
      <button onClick={() => { setMounted(false); setRevision(n => n + 1); }}>Unmount session</button>
      {[ ["Refresh audit", () => {}], ["ACK initial", () => t()?.config()], ["ACK source", () => t()?.items()], ["ACK all but one source", () => t()?.items(true)], ["ACK final", () => t()?.config()],
        ["Begin answer", () => t()?.answer()], ["Stream partial", () => t()?.partial()], ["Stream long", () => t()?.partial("Long synthetic speech text 日本語.\n".repeat(160))],
        ["Generation done", () => t()?.done()], ["Generation cancelled", () => t()?.done("cancelled")], ["Generation failed", () => t()?.done("failed")],
        ["Output started", () => t()?.buffer("started")], ["Output stopped", () => t()?.buffer("stopped")], ["Output cleared", () => t()?.buffer("cleared")],
        ["Speech started", () => t()?.speech("started")], ["Speech stopped", () => t()?.speech("stopped")],
        ["Duplicate response", () => t()?.created()], ["Foreign response", () => t()?.created("foreign", "foreign_conv")],
        ["Exhaust response capacity", () => { for (let n = 0; n < 130; n++) t()?.created(`capacity_${n}`); }],
        ["Next response", () => { const x = t(); if (x) { x.response = "answer_B"; x.answer(); } }],
        ["Old response events", () => { t()?.created("answer_A"); t()?.done("completed", "answer_A"); t()?.buffer("stopped", "answer_A"); }],
        ["Fail interruption", () => { const x = t(), c = x?.commands.filter(c => c.type === "output_audio_buffer.clear" || c.type === "response.cancel").at(-1); x?.emit({ type: "error", error: { event_id: c?.event_id, message: "PRIVATE08C_ERROR" } }); }],
        ["End microphone", () => resource()?.tracks[0].end()], ["Expire timers", () => records.at(-1)?.clock.tick()],
        ["Release preparation", () => records.forEach(r => r.prepareGate.resolve())], ["Release connection", () => records.forEach(r => r.connectGate.resolve())],
        ["Release microphone", () => records.forEach(r => r.mediaGate.resolve())], ["Release playback", () => records.forEach(r => r.resources.forEach(x => x.playGate.resolve()))],
        ["Release cancel", () => records.forEach(r => r.resources.forEach(x => x.transport.cancelGate.resolve()))], ["Release clear", () => records.forEach(r => r.resources.forEach(x => x.transport.clearGate.resolve()))],
        ["Deliver stale events", () => records.forEach(r => r.resources.forEach(x => { if (!x.transport.receive) { x.transport.late(); x.tracks.forEach(t => t.stale?.()); } }))],
      ].map(([label, fn]) => <button key={label as string} onClick={act(fn as () => void)}>{label as string}</button>)}
    </div></details>
    <section className="source-reader"><h2>Source preview</h2><button onClick={() => setPreview(p => !p)} aria-expanded={preview}>Inspect source</button>
      {preview ? <p className="page-text">{source < 0 ? "No source selected." : fixtures[source].variant.source.sections?.map(s => s.text).join("\n")}</p> : null}</section>
    <section className="workspace source-workspace"><div className="conversation-panel"><h2>Conversation</h2>
      {mounted ? <VoiceSession source={source < 0 ? null : { id: fixtures[source].id, title: source === 0 ? "Synthetic source A — Alder station" : "Synthetic source B — Juniper workshop" }} createController={factory} /> : <p>Session unmounted.</p>}
    </div></section>
    <output aria-label="Fixture revision">{revision}</output><pre aria-label="Fixture audit">{JSON.stringify(audit)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
