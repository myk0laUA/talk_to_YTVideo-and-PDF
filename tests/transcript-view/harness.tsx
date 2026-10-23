// Never imported by src/. Served only by scripts/verify-transcript-view.mjs on loopback.
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { TranscriptStore, type TranscriptIdentity, type TranscriptLimits } from "../../src/shared/transcript";
import { emptyResponse } from "../../src/shared/voice-response";
import { TranscriptView } from "../../src/app/transcript-view";

const exact = '  Café e\u0301 👩🏽‍🚀 日本語 مرحبا\n<script>window.INERT_SENTINEL = true</script>\n<img src="https://external.invalid/pixel" onerror="alert(1)"> & **plain**\t  ';
const line = "A long generated answer is still arriving. This sentence belongs to a synthetic browser fixture.\n";
function Harness() {
  const store = useRef(new TranscriptStore());
  const sequence = useRef(0);
  const identity = useRef<TranscriptIdentity>({ sourceId: "source_A", runId: "run_A", connectionId: "connection_A" });
  const [snapshot, setSnapshot] = useState(() => new TranscriptStore().snapshot);
  const [available, setAvailable] = useState(false);
  const [source, setSource] = useState("A");
  const [preview, setPreview] = useState(true);
  const [viewKey, setViewKey] = useState("empty");
  const [revision, setRevision] = useState(0);
  const event = (type: string, fields: object = {}) => store.current.receive(identity.current, { type, event_id: `fixture_${++sequence.current}`, ...fields });
  const output = (kind: string, value: string, at = 0, audio = true) => event(`response.${audio ? "output_audio_transcript" : "output_text"}.${kind}`, {
    response_id: "response_A", item_id: "assistant_A", output_index: 0, content_index: at,
    ...(kind === "delta" ? { delta: value } : audio ? { transcript: value } : { text: value }),
  });
  function start(limits: Partial<TranscriptLimits> = {}) {
    store.current = new TranscriptStore(limits);
    identity.current = { sourceId: `source_${source}`, runId: `run_${++sequence.current}`, connectionId: "connection_A" };
    store.current.start(identity.current, ["priming_A"]);
    setAvailable(true); setViewKey(`${identity.current.sourceId}:${identity.current.runId}`);
    event("conversation.item.added", { previous_item_id: null, item: { id: "priming_A", type: "message", role: "user", content: [{ type: "input_text", text: "PRIMING_MUST_STAY_PRIVATE_09B" }] } });
  }
  function exchange() {
    event("input_audio_buffer.committed", { item_id: "user_A", previous_item_id: "priming_A" });
    event("response.created", { response: { id: "response_A", conversation_id: "conversation_fixture", status: "in_progress" } });
    event("response.output_item.added", { response_id: "response_A", output_index: 0, item: { id: "assistant_A", type: "message", role: "assistant", content: [] } });
    event("conversation.item.added", { previous_item_id: "user_A", item: { id: "assistant_A", type: "message", role: "assistant", content: [] } });
  }
  function action(name: string) {
    if (name === "Begin draft") { start(); exchange(); output("delta", "Draft answer"); }
    if (name === "Append words") output("delta", " — more words 🌍\n");
    if (name === "Finalize") {
      output("done", exact); output("delta", "IGNORED_LATE_DELTA"); output("done", "IGNORED_DUPLICATE_FINAL");
      event("response.done", { response: { id: "response_A", status: "completed", output: [] } });
    }
    if (name === "Late question") event("conversation.item.input_audio_transcription.completed", { item_id: "user_A", content_index: 0, transcript: "A delayed spoken question." });
    if (name === "Long answer") { start(); exchange(); output("delta", line.repeat(72)); }
    if (name === "Append long") output("delta", line.repeat(4));
    if (name === "Long final") output("done", line.repeat(77));
    if (name === "Next turn") event("conversation.item.added", { previous_item_id: "assistant_A", item: { id: `user_${sequence.current}`, type: "message", role: "user", content: [{ type: "input_text", text: "A new follow-up question." }] } });
    if (name === "Second part") output("delta", "A separate text part.\nhttps://example.invalid/" + "longtoken".repeat(90), 1, false);
    if (name === "Interrupt") {
      store.current.observe(identity.current, { ...emptyResponse(), interruption: { state: "confirmed", responseId: "response_A", origin: "manual" } });
      event("response.done", { response: { id: "response_A", status: "cancelled", output: [] } });
    }
    if (name === "Stop") store.current.stop();
    if (name === "Transcription failure") event("conversation.item.input_audio_transcription.failed", { item_id: "user_A", content_index: 0, error: { message: "PRIVATE_PROVIDER_ERROR_09B" } });
    if (name === "Limit") { start({ partCharacters: 180 }); exchange(); output("delta", "Words retained before the transcript limit."); output("delta", line.repeat(3)); }
    if (name === "Provisional order") { start(); event("conversation.item.added", { previous_item_id: "unknown", item: { id: "user_A", type: "message", role: "user", content: [{ type: "input_text", text: "Earlier turn has not arrived." }] } }); }
    if (name === "Conflicted order") event("conversation.item.added", { previous_item_id: "different_predecessor", item: { id: "user_A", type: "message", role: "user", content: [] } });
    if (name === "Failed answer") event("response.done", { response: { id: "response_A", status: "failed", output: [] } });
    if (name === "Output limit") event("response.done", { response: { id: "response_A", status: "incomplete", status_details: { reason: "max_output_tokens", error: { message: "PRIVATE_08K" } }, usage: { output_tokens: 512, output_token_details: { audio_tokens: 420, text_tokens: 92 } }, output: [] } });
    if (name === "New session") start();
    if (name === "Replace source") {
      store.current.reset(); setSource(s => s === "A" ? "B" : "A"); setViewKey(`reset_${++sequence.current}`);
    }
    if (name === "Unavailable") { store.current.reset(); setAvailable(false); setViewKey(`unavailable_${++sequence.current}`); }
    if (name === "Citation-looking prose") {
      start(); exchange(); output("delta", "Scoped display fixture", 0, false);
      const value = store.current.snapshot;
      setSnapshot({ ...value, turns: value.turns.map(t => t.role !== "assistant" ? t : { ...t, parts: t.parts.map(p => ({ ...p,
        text: 'An attributed claim. [segment-355]\nOrdinary words retained. <script>inert</script> https://evil.invalid',
      })) }) });
    } else setSnapshot(store.current.snapshot);
    setRevision(r => r + 1);
  }
  const actions = ["Begin draft", "Append words", "Finalize", "Late question", "Long answer", "Append long", "Long final", "Next turn", "Second part", "Interrupt", "Stop", "Transcription failure", "Limit", "Provisional order", "Conflicted order", "Failed answer", "Output limit", "Citation-looking prose", "New session", "Replace source", "Unavailable"];
  return <div className="app-shell">
    <header className="fixture-heading"><h1>Isolated transcript presentation fixture</h1><p>Loopback only. Synthetic events; no microphone, transport or provider.</p></header>
    <details><summary>Scripted fixture controls</summary><div className="proof-controls">{actions.map(name => <button key={name} onClick={() => action(name)}>{name}</button>)}</div></details>
    <output aria-label="Fixture revision">{revision}</output>
    <main className="workspace source-workspace">
      <section className="source-panel" aria-labelledby="source-heading"><h2 id="source-heading">Fixture source {source}</h2><button onClick={() => setPreview(p => !p)}>Inspect fixture source</button>{preview ? <p className="page-text">Source preview remains independently readable.</p> : null}</section>
      <section className="conversation-panel" aria-labelledby="conversation-heading"><h2 id="conversation-heading">Conversation</h2><TranscriptView snapshot={available ? snapshot : null} viewKey={viewKey} /></section>
    </main>
    <footer>End of isolated fixture.</footer>
  </div>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
