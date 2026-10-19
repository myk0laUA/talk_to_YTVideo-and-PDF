"use client";

import { Component } from "react";
import type { VoiceLifecycle, VoiceStatus } from "../shared/voice-lifecycle";
import { TranscriptView, type TranscriptViewSnapshot } from "./transcript-view";

type Source = { id: string; title: string };
// An ownership interface only. The coordinator still enforces source admission.
export type VoiceControllerFactory = (notify: (status: VoiceStatus) => void) => VoiceLifecycle;
type Props = { source: Source | null; createController?: VoiceControllerFactory };
type State = { status: VoiceStatus | null; transcript: TranscriptViewSnapshot | null; session: number };
const running = (s: VoiceStatus | null) => s?.phase === "connecting" || s?.phase === "priming" || s?.phase === "ready";

function setup(s: VoiceStatus | null, available: boolean) {
  if (!available) return "Voice conversation is unavailable in this build. You can still inspect your source.";
  if (!s || s.phase === "idle") return "Start a voice session for your selected source. Your microphone is requested only after source setup.";
  if (s.phase === "connecting") return "Preparing the connection. You can stop at any time.";
  if (s.phase === "priming") return "Loading your source into the conversation. The microphone has not been requested.";
  if (s.phase === "ended") return "Session ended. Received text stays below; starting again clears it.";
  if (s.phase === "failed") {
    if (s.failure === "budget_unavailable") return "This source cannot be used for a conversation in this build. No microphone or connection was opened.";
    if (s.failure === "microphone") return "Microphone access was denied, unavailable, or timed out. Check your browser microphone permission before starting again. Text mode is a separate next step and is not started here.";
    if (s.failure === "track_ended") return "The microphone ended. Check your microphone before starting again. Text mode is a separate next step and is not started here.";
    return "Voice setup or connection failed. Received text stays below. Start a fresh session to retry; nothing restarts automatically.";
  }
  return s.microphone === "pending" ? "Source setup complete. Waiting for microphone access. You can still stop." : "Voice session ready. Microphone and speaker playback have separate controls.";
}
function microphone(s: VoiceStatus | null) {
  if (s?.failure === "microphone") return "Access denied, unavailable, or timed out.";
  if (s?.failure === "track_ended") return "Ended.";
  if (s?.microphone === "pending") return "Waiting for access.";
  if (s?.microphone !== "available") return "Not in use.";
  if (s.response.issue === "capacity") return "Available, but microphone input is paused. Stop and start a fresh session.";
  return s.muted ? "Muted. Outgoing microphone audio is off." : "Available. Outgoing microphone audio is on.";
}
function playback(s: VoiceStatus | null) {
  if (s?.playback === "pending") return "Waiting for playback to start. Microphone access is separate.";
  if (s?.playback === "blocked") return "Playback could not start. Use Try speaker playback to retry.";
  if (s?.playback === "available") return "Playback enabled. This does not confirm what you heard.";
  return "Playback not enabled.";
}
function answer(s: VoiceStatus | null) {
  if (s?.phase === "ended" || s?.phase === "failed") return "No active answer. Any received text stays below.";
  const r = s?.response;
  if (!r) return "No answer yet.";
  const generation = { idle: "No answer yet.", generating: "Answer being generated.", completed: "Answer generation complete.", cancelled: "Answer generation cancelled.", failed: "Answer generation failed.", incomplete: "Answer generation incomplete." }[r.generation.state];
  const output = { idle: "", streaming: "Audio output is streaming; it may continue after generation completes.", stopped: "Audio output stopped.", cleared: "Audio output cleared.", unknown: "Audio output state is uncertain. Stop the session if you need to end playback." }[r.output.state];
  const interruption = { idle: "", pending: "Interruption pending. Waiting for confirmation.", confirmed: "Interruption confirmed. Words displayed may include speech you did not hear.", failed: "Interruption could not be confirmed. Stop the session to end it; no interruption is retried automatically." }[r.interruption.state];
  const input = r.input.state === "speaking" ? "Speech activity detected." : r.input.state === "stopped" ? "Speech activity ended." : "";
  const issue = r.issue ? "The answer encountered a problem. Received text may be incomplete; you can stop and start fresh." : "";
  return [generation, output, interruption, input, issue].filter(Boolean).join(" ");
}

/** Mount owns one controller. The source key discards old UI before paint; teardown
 * detaches its observer before disposing resources. No Start/play/retry in effects. */
class OwnedVoiceSession extends Component<Props, State> {
  state: State = { status: null, transcript: null, session: 0 };
  private controller?: VoiceLifecycle;
  private mounted = false;
  componentDidMount() {
    this.mounted = true;
    if (this.props.source) this.controller = this.props.createController?.(status => {
      if (!this.mounted || !this.controller) return;
      this.setState({ status, transcript: this.controller.transcript });
    });
  }
  componentWillUnmount() {
    this.mounted = false;
    const controller = this.controller; this.controller = undefined;
    controller?.dispose();
  }
  private start = () => {
    if (!this.props.source || !this.controller || running(this.controller.snapshot)) return;
    if (this.controller.start(this.props.source.id)) this.setState(previous => ({ session: previous.session + 1 }));
  };
  private mute = () => {
    const c = this.controller;
    if (!c || !running(c.snapshot) || c.snapshot.microphone !== "available") return;
    if (c.snapshot.muted) c.unmute(); else c.mute();
  };
  render() {
    const { source, createController } = this.props;
    const { status, transcript, session } = this.state;
    const available = !!source && !!createController;
    const active = running(status), ready = status?.phase === "ready";
    const response = status?.response;
    const outputBusy = response?.output.state === "streaming" || response?.output.state === "unknown";
    const canInterrupt = ready && status?.microphone === "available" && response?.issue !== "capacity" && response?.interruption.state !== "pending"
      && response?.interruption.state !== "failed" && (!outputBusy || response?.output.responseId === response?.generation.responseId)
      && (response?.generation.state === "generating" || response?.output.state === "streaming");
    return <div className="voice-session">
      {source ? <p className="text-source">Using source: {source.title}</p> : null}
      <p className="voice-session-status" role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{setup(status, available)}</p>
      <div className="source-actions voice-session-actions">
        <button type="button" disabled={!available || active} onClick={this.start}>{status?.phase === "ended" || status?.phase === "failed" ? "Start a fresh voice session" : "Start voice session"}</button>
        <button type="button" disabled={!available || !active} onClick={() => this.controller?.stop()}>Stop session</button>
        <button type="button" disabled={!available || !active || status?.microphone !== "available"} aria-pressed={status?.muted ?? false} onClick={this.mute}>{status?.muted ? "Unmute microphone" : "Mute microphone"}</button>
        <button type="button" disabled={!available || !canInterrupt} onClick={() => this.controller?.interruptCurrentResponse()}>Interrupt answer</button>
        <button type="button" disabled={!available || !ready || status?.playback === "pending" || status?.playback === "available"} onClick={() => { void this.controller?.playAudio(); }}>{status?.playback === "blocked" ? "Try speaker playback" : "Enable speaker playback"}</button>
      </div>
      <p className="note">Starting again clears this conversation. Stop keeps received text. Changing or removing the source clears it. Nothing restarts automatically.</p>
      <dl className="voice-device-status">
        <dt>Microphone</dt><dd>{microphone(status)}</dd>
        <dt>Speaker playback</dt><dd>{playback(status)}</dd>
      </dl>
      <p className="note voice-media-announcement" role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{answer(status)}</p>
      <p className="visually-hidden" role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{microphone(status)} {playback(status)}</p>
      <TranscriptView snapshot={transcript} viewKey={`${source?.id ?? "none"}:${session}`} />
    </div>;
  }
}

/** No default provider, media or positive admission adapter. Changing the factory
 * requires a new owner mount; keep it stable for the lifetime of a source. */
export function VoiceSession(props: Props) {
  return <OwnedVoiceSession key={props.source?.id ?? "no-source"} {...props} />;
}
