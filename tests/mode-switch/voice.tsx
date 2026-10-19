import { chronology, ownerCreated, ownerDisposed, transferred, released, identityObserved, controllerCreated, acquired } from "./ownership";
// Independent loopback test bundle only. No positive admission or media adapter in src/.
import { type VoiceControllerFactory } from "../../src/app/voice-session";
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
  constructor() { acquired(this); }
  open = true; closes = 0; subscriptions = 0; unsubscribes = 0; commands: Command[] = []; trace: string[] = [];
  closed?: () => void;
  receive?: (e: unknown) => void; stale?: (e: unknown) => void; sequence = 0; response = "answer_A";
  cancelGate = deferred(); clearGate = deferred(); holdCancel = false; holdClear = false;
  subscribe(receive: (e: unknown) => void, closed: () => void) { this.closed = closed; this.receive = this.stale = receive; this.subscriptions++; transferred(this);
    return () => { this.receive = undefined; this.unsubscribes++; }; }
  disconnect() { this.open = false; this.closed?.(); }
  isOpen() { return this.open; }
  send(raw: string) { const e: Command = JSON.parse(raw); this.commands.push(e); this.trace.push(`send:${e.type}`);
    if (this.holdCancel && e.type === "response.cancel") return this.cancelGate.promise;
    if (this.holdClear && e.type === "output_audio_buffer.clear") return this.clearGate.promise;
  }
  close() { this.trace.push("close"); this.open = false; this.closes++; released(this); }
  emit(e: object) { this.trace.push(`receive:${Reflect.get(e, "type")}`); this.receive?.({ event_id: `fixture10c_${++this.sequence}`, ...e }); }
  config() { const c = this.commands.filter(c => c.session).at(-1); if (c) this.emit({ type: "session.updated", session: { ...c.session, object: "realtime.session", id: "session_10c", model: "offline-fixture-only" } }); }
  items(withhold = false) { for (const c of this.commands.filter(c => c.item).slice(withhold ? 1 : 0)) this.emit({ type: "conversation.item.done", previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: "completed" } }); }
  get ids() { return { response_id: this.response, item_id: `${this.response}_item`, output_index: 0, content_index: 0 }; }
  created(id = this.response, conversation = "conv_10c") { this.emit({ type: "response.created", response: { id, conversation_id: conversation, status: "in_progress", output: [] } }); }
  answer() {
    this.created();
    this.emit({ type: "input_audio_buffer.committed", item_id: `${this.response}_user`, previous_item_id: this.commands.filter(c => c.item).at(-1)!.item!.id });
    this.emit({ type: "conversation.item.input_audio_transcription.completed", item_id: `${this.response}_user`, content_index: 0, transcript: "FIXTURE10C synthetic spoken question." });
    this.emit({ type: "response.output_item.added", ...this.ids, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
    this.emit({ type: "conversation.item.added", previous_item_id: `${this.response}_user`, item: { id: this.ids.item_id, type: "message", role: "assistant", content: [] } });
  }
  partial(text = "FIXTURE10C generated speech text 雪. ") { this.emit({ type: "response.output_audio_transcript.delta", ...this.ids, delta: text }); }
  done(status = "completed", id = this.response, conversation = "conv_10c") { this.emit({ type: "response.done", response: { id, conversation_id: conversation, status, output: [] } }); }
  buffer(kind: string, id = this.response) { this.emit({ type: `output_audio_buffer.${kind}`, response_id: id }); }
  speech(kind: string) { this.emit({ type: `input_audio_buffer.speech_${kind}`, item_id: "speech_10c", [kind === "started" ? "audio_start_ms" : "audio_end_ms"]: kind === "started" ? 100 : 200 }); }
  late() {
    this.closed?.();
    const configuration = this.commands.filter(c => c.session).at(-1);
    if (configuration) this.stale?.({ type: "session.updated", event_id: "late_config", session: { ...configuration.session, object: "realtime.session", id: "late_session", model: "offline-fixture-only" } });
    for (const c of this.commands.filter(c => c.item)) this.stale?.({ type: "conversation.item.done", event_id: `late_${c.item!.id}`, previous_item_id: c.previous_item_id ?? null, item: { ...c.item, status: "completed" } });
    this.stale?.({ type: "response.created", event_id: "late_10c_created", response: { id: "late_10c", conversation_id: "conv_10c", status: "in_progress" } });
    this.stale?.({ type: "response.output_audio_transcript.delta", event_id: "late_10c_text", ...this.ids, delta: "STALE10C_MUST_NOT_APPEAR" });
    this.stale?.({ type: "output_audio_buffer.cleared", event_id: "late_10c_clear", response_id: this.response });
  }
}
function resources(mode: string) {
  const transport = new Transport(), tracks = [new Track(), new Track()], playGate = deferred();
  transport.holdCancel = mode === "hold-cancel"; transport.holdClear = mode === "hold-clear";
  const counts = { closes: 0, playbackReleases: 0, plays: 0, mediaReleases: 0, attaches: 0 };
  const connection: VoiceConnection = { transport, close() { counts.closes++; transport.close(); }, playback: {
    async play() { counts.plays++; if (mode === "blocked-playback" && counts.plays === 1) throw new Error("PRIVATE10C_ERROR");
      if (mode === "hold-playback") await playGate.promise; }, release() { counts.playbackReleases++; } } };
  const media: VoiceMedia = { tracks, attach() { if (tracks.some(t => t.enabled)) throw new Error("Attached enabled tracks"); counts.attaches++; }, release() { counts.mediaReleases++; } };
  return { transport, tracks, connection, media, counts, playGate, mediaReturned: false };
}
type RecordEntry = { clock: Clock; resources: ReturnType<typeof resources>[]; states: unknown[]; disposed: number; prepare: number; connects: number; media: number;
  prepareGate: ReturnType<typeof deferred>; connectGate: ReturnType<typeof deferred>; mediaGate: ReturnType<typeof deferred>; controller?: VoiceLifecycle };
export const records: RecordEntry[] = [];
let scenario = "success";
export const setScenario = (value: string) => { scenario = value; };
export const factory: VoiceControllerFactory = notify => {
  const mode = scenario;
  const r: RecordEntry = { clock: new Clock(), resources: [], states: [], disposed: 0, prepare: 0, connects: 0, media: 0,
    prepareGate: deferred(), connectGate: deferred(), mediaGate: deferred() };
  records.push(r); const owner = ownerCreated('voice');
  class Fixture10cPriming extends PrimingController {
    protected override admission(input: PrimingInput) { return input.preparedBudget.status === "offline_fit" && input.wireBudget.status === "offline_fit"
      && input.wireBudget.model === "offline-fixture-only" && input.wireBudget.verification === "synthetic" && input.wireBudget.unit === "synthetic-units"
      && input.wireBudget.representation === input.manifest.representation && input.wireBudget.measured === input.manifest.bytes ? "synthetic-test-only" as const : undefined; }
  }
  class Fixture10cVoice extends VoiceLifecycle {
    protected override createPriming(callback: (s: PrimingStatus) => void, ready: () => void) {
      return mode === "source-default" ? super.createPriming(callback, ready) : new Fixture10cPriming(r.clock, callback, ready, 1000);
    }
    override dispose() { r.disposed++; super.dispose(); ownerDisposed(owner); }
  }
  r.controller = new Fixture10cVoice(r.clock, {
    prepare: async identity => { r.prepare++; chronology.push({ event: "prepare", owner, source: identity.sourceId, run: identity.runId }); if (mode === "hold-preparation") await r.prepareGate.promise;
      const f = fixtures.find(f => f.id === identity.sourceId)!;
      const manifest = encodeManifest(f.variant, identity.runId, "voice", 2048);
      return { ...f.input, manifest, wireBudget: { ...f.input.wireBudget, representation: manifest.representation, measured: manifest.bytes } }; },
    connect: async () => { r.connects++; chronology.push({ event: "acquire-connection", owner }); const resource = resources(mode); r.resources.push(resource);
      if (mode === "hold-connection") await r.connectGate.promise; return resource.connection; },
    acquireMedia: async () => { r.media++; if (mode === "denied-microphone") throw new Error("PRIVATE10C_ERROR");
      const resource = r.resources.at(-1)!; if (mode === "hold-microphone") await r.mediaGate.promise;
      resource.mediaReturned = true; return resource.media; },
  }, s => { identityObserved(owner, s.identity); r.states.push({ phase: s.phase, microphone: s.microphone, playback: s.playback, muted: s.muted, response: s.response }); notify(s); });
  controllerCreated(r.controller); return r.controller;
};
export const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };
