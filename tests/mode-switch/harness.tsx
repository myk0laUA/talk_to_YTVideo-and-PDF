// Independent loopback fixture: actual components/controllers, simulated adapters.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConversationArea } from "../../src/app/conversation-area";
import * as voice from "./voice";
import * as text from "./text";
import { ownership } from "./ownership";

const fixtures = JSON.parse(document.getElementById("inputs")!.textContent!) as { id: string; variant: { source: { sections: { text: string }[] } } }[];
const flush = voice.flush;
// Read actual ownership synchronously inside a dispatched pagehide, before React paints.
Reflect.set(window, "recoverySynchronousAudit", () => ({ ownership: ownership(),
  voice: voice.records.map(r => ({ phase: r.controller?.snapshot.phase, timers: r.clock.timers.size, resources: r.resources.map(x => ({ ...x.counts, stops: x.tracks.map(t => t.stops) })) })),
  text: text.records.map(r => ({ phase: r.controller?.snapshot.phase, timers: r.clock.timers.size, closes: r.transports.map(t => t.closes) })) }));
function Harness() {
  const [source, setSource] = useState(0), [mounted, setMounted] = useState(true), [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState(false);
  const v = () => voice.records.at(-1)?.resources.at(-1), t = () => text.records.at(-1)?.transports.at(-1);
  const act = (f: () => void) => async () => { f(); await flush(); setRevision(n => n + 1); };
  const audit = {
    ownership: ownership(),
    voice: voice.records.map(r => ({ states: r.states, disposed: r.disposed, turns: r.controller?.transcript.turns.length ?? 0, prepare: r.prepare, connects: r.connects, media: r.media, timers: r.clock.timers.size,
      resources: r.resources.map(x => ({ ...x.counts, mediaReturned: x.mediaReturned,
        tracks: x.tracks.map(t => ({ enabled: t.enabled, changes: t.changes, stops: t.stops, subscriptions: t.subscriptions, removals: t.removals, listeners: t.listeners.size })),
        transport: { closes: x.transport.closes, subscriptions: x.transport.subscriptions, unsubscribes: x.transport.unsubscribes, listening: !!x.transport.receive,
          commands: x.transport.commands.map(c => ({ type: c.type, event_id: c.event_id, response_id: c.response_id, item_id: c.item?.id })), trace: x.transport.trace } })) })),
    text: text.records.map(r => ({ states: r.states, disposed: r.disposed, turns: r.controller?.transcript.turns.length ?? 0, prepare: r.prepare, connects: r.connects, timers: r.clock.timers.size,
      transports: r.transports.map(t => ({ questions: t.questions.length, responses: t.responses.length, exact: t.questions.map(c => c.item!.content[0].text),
        commands: t.commands.map(c => ({ type: c.type, event_id: c.event_id, item_id: c.item?.id })),
        closes: t.closes, subscriptions: t.subscriptions, unsubscribes: t.unsubscribes, listening: !!t.receive, trace: t.trace })) })),
  };
  return <main className="app-shell"><h1>Isolated mode switching fixture 10C</h1>
    <p>Simulated transport, microphone and playback; authored synthetic answers. No provider or sound.</p>
    <details><summary>Fixture controls</summary><div className="source-actions">
      <label>Voice scenario <select aria-label="Voice scenario" onChange={e => voice.setScenario(e.target.value)}>{["success", "source-default", "denied-microphone", "hold-preparation", "hold-connection", "hold-microphone", "blocked-playback", "hold-playback", "hold-cancel", "hold-clear"].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Text scenario <select aria-label="Text scenario" onChange={e => text.setScenario(e.target.value)}>{["success", "source-default", "turn-default", "hold-preparation", "hold-connection", "hold-admission", "hold-write"].map(s => <option key={s}>{s}</option>)}</select></label>
      <button onClick={() => { setMounted(true); setRevision(n => n + 1); }}>Mount session</button>
      <button onClick={() => { setSource(n => n === 0 ? 1 : 0); setRevision(n => n + 1); }}>Replace source</button>
      <button onClick={() => { setSource(-1); setRevision(n => n + 1); }}>Remove source</button>
      <button onClick={() => { setMounted(false); setRevision(n => n + 1); }}>Unmount session</button>
      {[
        ["Refresh audit", () => {}],
        ["Voice ACK initial", () => v()?.transport.config()], ["Voice ACK source", () => v()?.transport.items()], ["Voice ACK final", () => v()?.transport.config()],
        ["Text ACK initial", () => t()?.config()], ["Text ACK source", () => t()?.items()], ["Text ACK final", () => t()?.config()],
        ["Text ACK added", () => t()?.question(false)], ["Text ACK receipt", () => t()?.question(true)],
        ["Voice answer", () => { v()?.transport.answer(); v()?.transport.partial(); v()?.transport.buffer("started"); }],
        ["Text answer", () => { t()?.answer(); t()?.partial(); }], ["Text finish", () => t()?.finish()],
        ["Text long", () => t()?.partial("Long synthetic line 日本語. ".repeat(180))],
        ["Voice long", () => v()?.transport.partial("Long synthetic voice line 日本語. ".repeat(180))],
        ["End microphone", () => v()?.tracks[0].end()],
        ["Close voice transport", () => v()?.transport.disconnect()], ["Close text transport", () => t()?.disconnect()],
        ["Fail text", () => t()?.emit({ type: "error", error: { message: "PRIVATE10C_ERROR" } })],
        ["Expire timers", () => { voice.records.forEach(r => r.clock.tick()); text.records.forEach(r => r.clock.tick()); }],
        ["Release all", () => {
          voice.records.forEach(r => { r.prepareGate.resolve(); r.connectGate.resolve(); r.mediaGate.resolve(); r.resources.forEach(x => { x.playGate.resolve(); x.transport.cancelGate.resolve(); x.transport.clearGate.resolve(); }); });
          text.records.forEach(r => { r.prepareGate.resolve(); r.connectGate.resolve(); r.admitGate.resolve(); r.transports.forEach(t => t.writeGate.resolve()); });
        }],
        ["Deliver stale events", () => {
          voice.records.forEach(r => r.resources.forEach(x => { if (!x.transport.receive) { x.transport.late(); x.tracks.forEach(t => t.stale?.()); } }));
          text.records.forEach(r => r.transports.forEach(t => { if (!t.receive) t.late(); }));
        }],
      ].map(([label, fn]) => <button key={label as string} onClick={act(fn as () => void)}>{label as string}</button>)}
    </div></details>
    <section className="source-reader"><h2>Source preview</h2><button onClick={() => setPreview(p => !p)} aria-expanded={preview}>Inspect source</button>
      {preview ? <p className="page-text">{source < 0 ? "No source selected." : fixtures[source].variant.source.sections.map(s => s.text).join("\n")}</p> : null}</section>
    <section className="workspace source-workspace"><div className="conversation-panel"><h2>Conversation</h2>
      {mounted ? <ConversationArea source={source < 0 ? null : { id: fixtures[source].id, title: source === 0 ? "Synthetic source A — Alder station" : "Synthetic source B — Juniper workshop" }} createVoiceController={voice.factory} createTextController={text.factory} /> : <p>Session unmounted.</p>}
    </div></section>
    <output aria-label="Fixture revision">{revision}</output><pre aria-label="Fixture audit">{JSON.stringify(audit)}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
