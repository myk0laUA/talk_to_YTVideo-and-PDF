"use client";

import { useId, useState } from "react";
import { VoiceSession, type VoiceControllerFactory } from "./voice-session";
import { TextSession, type TextControllerFactory } from "./text-session";

type Props = {
  source: { id: string; title: string } | null;
  createVoiceController?: VoiceControllerFactory;
  createTextController?: TextControllerFactory;
};

/** Only the selected child owns a controller. React unmounts the previous child
 * (synchronous dispose) before mounting its replacement. Late adapter returns
 * remain the responsibility of that disposed lifecycle. Factories must remain
 * stable for each owner. Server availability selects the application text adapter. */
export function ConversationArea({ source, createVoiceController, createTextController }: Props) {
  const [mode, setMode] = useState<"voice" | "text">("text");
  const id = useId();
  return <div className="conversation-area">
    <p className="note" id={`${id}-policy`}>Switching modes ends the current session and clears its conversation and draft. Each mode starts empty with the same source. Select a mode; its controls below show availability.</p>
    <div className="source-actions conversation-modes" role="group" aria-label="Conversation mode" aria-describedby={`${id}-policy`}>
      <button type="button" aria-pressed={mode === "voice"} aria-controls={`${id}-panel`} onClick={() => setMode("voice")}>Voice mode</button>
      <button type="button" aria-pressed={mode === "text"} aria-controls={`${id}-panel`} onClick={() => setMode("text")}>Text mode</button>
    </div>
    <p className="note" role="status" aria-live="polite" aria-atomic="true">{mode === "voice" ? "Voice mode selected." : "Text mode selected. No microphone or speaker playback is needed."} Session controls below show availability.</p>
    <section id={`${id}-panel`} aria-label={mode === "voice" ? "Voice conversation" : "Text conversation"}>
      {mode === "voice"
        ? <VoiceSession source={source} createController={createVoiceController} />
        : <TextSession source={source} createController={createTextController} />}
    </section>
  </div>;
}
