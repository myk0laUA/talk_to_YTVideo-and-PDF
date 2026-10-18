"use client";
import { useEffect, useRef, useState } from "react";
import { TextProofController, initialTextState, QUESTION_LIMIT, type TextState } from "./text-controller";

export default function TextProof() {
  const [state, setState] = useState<TextState>(initialTextState);
  const [question, setQuestion] = useState("");
  const controller = useRef<TextProofController | null>(null);
  const start = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const previous = useRef(state.phase);
  useEffect(() => {
    if (state.phase === "ready" && previous.current !== "ready") input.current?.focus();
    if (["ended", "error"].includes(state.phase) && previous.current !== state.phase) start.current?.focus();
    previous.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    const instance = new TextProofController({ fetch: (...args) => fetch(...args), socket: (url, protocols) => new WebSocket(url, protocols) }, setState);
    controller.current = instance;
    const leave = () => instance.stop();
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); instance.dispose(); controller.current = null; };
  }, []);
  const active = ["connecting", "ready", "waiting"].includes(state.phase);
  return <div className="workspace">
    <section className="source-panel"><h2>Fixed synthetic source</h2>
      <p>{state.source?.text ?? "Start establishes your temporary lighthouse source. No microphone permission is requested."}</p>
      <p className="note">Each Start begins a fresh conversation. Navigating away ends this connection. Follow-up questions share the current session.</p>
      <p className="note">25 seconds to connect, 20 seconds per answer, and 60 seconds active. Browser timers are not spending caps.</p>
    </section>
    <section className="conversation-panel"><h2>Text connection</h2>
      <p role="status">{state.message}</p>
      <div className="proof-controls"><button ref={start} disabled={active} onClick={() => { setQuestion(""); void controller.current?.start(); }}>Start</button>
        <button disabled={!active} onClick={() => controller.current?.stop()}>Stop</button></div>
      <form onSubmit={e => { e.preventDefault(); if (controller.current?.send(question)) setQuestion(""); }}>
        <label htmlFor="question">Question about the lighthouse</label>
        <input ref={input} id="question" value={question} onChange={e => setQuestion(e.target.value)} disabled={state.phase !== "ready"} aria-describedby="question-limit question-error" aria-invalid={!!state.validation} />
        <p id="question-limit" className="note">1–{QUESTION_LIMIT} characters. Press Enter or Send.</p>
        <p id="question-error" role="alert">{state.validation}</p>
        <div className="proof-controls"><button type="submit" disabled={state.phase !== "ready"}>Send</button></div>
      </form>
      <h2>Received answers</h2>
      <ol className="proof-transcript" aria-label="Received answers">{state.lines.map(line => <li key={line.id}><strong>{line.status === "complete" ? "Assistant" : line.status === "streaming" ? "Assistant — arriving" : "Assistant — incomplete"}:</strong> {line.text}</li>)}</ol>
    </section>
  </div>;
}
