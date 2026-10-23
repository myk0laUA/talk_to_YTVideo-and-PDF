"use client";

import { useEffect, useId, useRef, useState } from "react";
import { VoiceSession, type VoiceControllerFactory } from "./voice-session";
import { TextSession, type TextControllerFactory } from "./text-session";
import { VoiceRecovery } from "../shared/voice-recovery";

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
  const [voiceRecovery] = useState(() => new VoiceRecovery());
  const id = useId();
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const workspace = area.current?.closest<HTMLElement>(".has-source");
    if (!viewport || !workspace) return;
    const resize = () => {
      const constrained = viewport.height < 600 || parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24 || parseFloat(getComputedStyle(document.body).fontSize) >= 24;
      workspace.classList.toggle("viewport-constrained", constrained);
      // Only a viewport/keyboard change may reveal the focused input. Streaming
      // never invokes this and cannot steal the reading position or focus.
      const focused = document.activeElement;
      if (constrained && focused instanceof HTMLElement && focused.closest(".session-dock")) focused.scrollIntoView({ block: "end" });
    };
    resize(); viewport.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    return () => { observer.disconnect(); viewport.removeEventListener("resize", resize); workspace.classList.remove("viewport-constrained"); };
  }, [source?.id]);
  return <div ref={area} className="conversation-area">
    <p className="mode-policy" id={`${id}-policy`}>Switching modes ends the session and clears chat and draft.</p>
    <div className="source-actions conversation-modes" role="group" aria-label="Conversation mode" aria-describedby={`${id}-policy`}>
      <button type="button" aria-pressed={mode === "voice"} aria-controls={`${id}-panel`} onClick={() => setMode("voice")}>Voice mode</button>
      <button type="button" aria-pressed={mode === "text"} aria-controls={`${id}-panel`} onClick={() => setMode("text")}>Text mode</button>
    </div>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{mode === "voice" ? "Voice mode selected." : "Text mode selected. No microphone or speaker playback is needed."}</p>
    <section id={`${id}-panel`} aria-label={mode === "voice" ? "Voice conversation" : "Text conversation"}>
      {mode === "voice"
        ? <VoiceSession source={source} createController={createVoiceController} recovery={voiceRecovery} />
        : <TextSession source={source} createController={createTextController} />}
    </section>
  </div>;
}
