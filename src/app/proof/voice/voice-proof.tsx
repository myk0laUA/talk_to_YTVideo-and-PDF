"use client";

import { useEffect, useRef, useState } from "react";
import { VoiceProofController, initialVoiceState, type VoiceState } from "./voice-controller";

export default function VoiceProof() {
  const [state, setState] = useState<VoiceState>(initialVoiceState);
  const controller = useRef<VoiceProofController | null>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !state.active) startButton.current?.focus();
    wasActive.current = state.active;
  }, [state.active]);
  useEffect(() => {
    const instance = new VoiceProofController({
      fetch: (...args) => fetch(...args), media: () => navigator.mediaDevices.getUserMedia({ audio: true }),
      peer: () => new RTCPeerConnection(), audio: () => new Audio(), stream: () => new MediaStream(),
    }, setState);
    controller.current = instance;
    const leave = () => instance.stop();
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); instance.dispose(); controller.current = null; };
  }, []);
  return <div className="workspace">
    <section className="source-panel" aria-labelledby="proof-source"><h2 id="proof-source">Fixed synthetic source</h2>
      <p>{state.source?.text ?? "Start establishes your temporary lighthouse source before asking for microphone permission."}</p>
      <p className="note">One attempt per Start. Stops automatically after 60 seconds ready; connecting is limited to 25 seconds. These browser timers are not a provider spending cap.</p>
    </section>
    <section className="conversation-panel" aria-labelledby="proof-status"><h2 id="proof-status">Voice connection</h2>
      <p role="status">{state.message}</p>
      <div className="proof-controls">
        <button ref={startButton} disabled={state.active} onClick={() => void controller.current?.start()}>{state.active ? "Start unavailable while active" : "Start"}</button>
        <button disabled={!state.active} onClick={() => controller.current?.stop()}>Stop</button>
        {state.playback === "blocked" && <button onClick={() => void controller.current?.playAudio()}>Enable audio playback</button>}
      </div>
      <p className="note">{state.playback === "blocked" ? "Audio playback needs your permission. Tap Enable audio playback." : state.playback === "enabled" ? "Audio playback enabled; audible output depends on the device." : "No audio playback confirmed."}</p>
      <h2>Proof transcript</h2>
      <p className="note">Only received events appear here. Input transcription may differ from what the model heard. Text entry is not part of this proof.</p>
      <ol className="proof-transcript" aria-label="Proof transcript">{state.lines.map(line => <li key={line.id}><strong>{line.role === "user" ? "You" : "Assistant"}:</strong> {line.text}</li>)}</ol>
    </section>
  </div>;
}
