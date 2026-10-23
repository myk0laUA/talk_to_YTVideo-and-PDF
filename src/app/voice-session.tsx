"use client";

import { Component } from "react";
import type { VoiceLifecycle, VoiceStatus } from "../shared/voice-lifecycle";
import { TranscriptView, type TranscriptViewSnapshot } from "./transcript-view";
import { BrowserSession, browserSessionMessage, initialBrowserSession, type BrowserSessionState } from "./browser-session";
import { VoiceRecovery } from "../shared/voice-recovery";
import { SOURCE_SIZE_MESSAGE } from "../shared/priming-failure";

type Source = { id: string; title: string };
// An ownership interface only. The coordinator still enforces source admission.
export type VoiceControllerFactory = (notify: (status: VoiceStatus) => void) => VoiceLifecycle;
type Props = { source: Source | null; createController?: VoiceControllerFactory; recovery?: VoiceRecovery };
type State = { browser: BrowserSessionState; status: VoiceStatus | null; transcript: TranscriptViewSnapshot | null; session: number; cooldown: number;
  reconnect: "waiting" | "connecting" | "failed" | "restored" | null };
const running = (s: VoiceStatus | null) => s?.phase === "connecting" || s?.phase === "priming" || s?.phase === "ready";

function setup(s: VoiceStatus | null, available: boolean, emptyStart: boolean) {
  if (!available) return "Voice conversation is unavailable in this build. You can still inspect your source.";
  if (!s || s.phase === "idle") return "Start voice to talk about your source. Microphone access follows source setup.";
  if (s.phase === "connecting") return "Preparing the connection. You can stop at any time.";
  if (s.phase === "priming") return "Loading your source into the conversation. The microphone has not been requested.";
  if (s.phase === "ended") return emptyStart ? "Session ended. Select Start voice when you’re ready." : "Session ended. Received text stays below; starting again clears it.";
  if (s.phase === "failed") {
    if (s.failure === "history") return "Your chat is still here, but its context could not be restored. Retry the connection, or end voice to start fresh.";
    if (s.failure === "source_too_large") return SOURCE_SIZE_MESSAGE;
    if (s.failure === "context_limit") return "The provider rejected this conversation because it exceeds its context limit. You can still use View source. Choose a smaller source to continue.";
    if (s.failure === "provider") return "The provider rejected voice. Your source is still here. You can try a fresh session.";
    if (s.failure === "budget_unavailable") return "This source cannot be used for a conversation in this build. No microphone or connection was opened.";
    if (s.failure === "microphone") return "Microphone access was denied, unavailable, or timed out. Check browser permission, then retry or select Text mode.";
    if (s.failure === "track_ended") return "The microphone ended. Check your microphone before starting again. Text mode is a separate next step and is not started here.";
    if (s.failure === "connection") return emptyStart ? "The voice connection failed or closed. Select Retry voice to try again, or choose Text mode." : "The voice connection failed or closed. This does not establish network loss. Received text stays below. Start a fresh session to retry.";
    if (s.failure === "preparation") return "Voice source preparation failed before microphone access. Select Retry voice to try again, or choose Text mode.";
    if (s.failure === "priming") return "Voice source or settings acknowledgment failed before microphone access. Select Retry voice to try again, or choose Text mode.";
    return emptyStart ? "Voice setup or connection failed. Select Retry voice to try again, or choose Text mode. Nothing restarts automatically." : "Voice setup or connection failed. Received text stays below. Start a fresh session to retry; nothing restarts automatically.";
  }
  return s.microphone === "pending" ? "Source setup complete. Waiting for microphone access. You can still stop." : "Voice session ready.";
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
  if (s?.speakerMuted) return "Speaker off. Microphone is independent.";
  if (s?.playback === "pending") return "Waiting for playback to start. Microphone access is separate.";
  if (s?.playback === "blocked") return "Playback could not start. Tap to enable sound to retry.";
  if (s?.playback === "available") return "Playback enabled. This does not confirm what you heard.";
  return "Playback not enabled.";
}
function answer(s: VoiceStatus | null) {
  if (!s || s.phase !== "ready") return "";
  const r = s.response;
  if (r.generation.state === "failed" || r.generation.state === "incomplete") return "The answer stopped early. Try asking again.";
  if (r.interruption.state === "failed") return "Couldn’t interrupt. End voice to stop playback.";
  if (r.output.state === "unknown") return "Audio state is uncertain. End voice to stop playback.";
  if (r.interruption.state === "pending") return "Interrupting…";
  if (r.issue) return "Voice encountered a problem. End voice and try again.";
  return "";
}

/** Mount owns one controller. The source key discards old UI before paint; teardown
 * detaches its observer before disposing resources. Only network loss in an active
 * conversation arms bounded reconnection; explicit End or departure cancels it. */
class OwnedVoiceSession extends Component<Props, State> {
  private recovery = this.props.recovery ?? new VoiceRecovery();
  state: State = { browser: initialBrowserSession, status: null, transcript: null, session: 0, cooldown: this.recovery.seconds, reconnect: null };
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectedTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private resumeArmed = false;
  private browserState = initialBrowserSession;
  private end = () => {
    clearTimeout(this.reconnectedTimer);
    this.resumeArmed = false; this.reconnectAttempts = 0;
    clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined;
    this.controller?.stop();
    if (this.mounted) this.setState({ reconnect: null });
  };
  private scheduleReconnect = () => {
    clearTimeout(this.reconnectedTimer);
    if (!this.mounted || !this.resumeArmed || !this.controller?.canResume || this.reconnectTimer
      || this.browserState.offline || this.browserState.departed) return;
    if (this.reconnectAttempts >= 3) { this.setState({ reconnect: "failed" }); return; }
    this.setState({ reconnect: "waiting" });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.mounted || !this.resumeArmed || !this.browser?.allowsAction() || !this.controller?.canResume) return;
      this.reconnectAttempts++;
      this.setState({ reconnect: "connecting" });
      if (this.controller.resume()) this.browser.started();
    }, [1000, 3000, 7000][this.reconnectAttempts]);
  };
  private retryConnection = () => {
    if (!this.browser?.allowsAction() || !this.recovery.clearForRetry()) return;
    this.resumeArmed = true; this.reconnectAttempts = 0; this.scheduleReconnect();
  };
  private cooldownTimer?: ReturnType<typeof setInterval>;
  private watchCooldown = () => {
    clearInterval(this.cooldownTimer);
    this.setState({ cooldown: this.recovery.seconds });
    if (this.recovery.seconds) this.cooldownTimer = setInterval(() => {
      this.setState({ cooldown: this.recovery.seconds });
      if (!this.recovery.seconds) clearInterval(this.cooldownTimer);
    }, 1000);
  };
  private controller?: VoiceLifecycle;
  private browser?: BrowserSession;
  private mounted = false;
  componentDidMount() {
    this.mounted = true;
    this.watchCooldown();
    if (this.props.source) this.controller = this.props.createController?.(status => {
      if (!this.mounted || !this.controller) return;
      if (status.admission) { this.recovery.remember(status.admission); this.watchCooldown(); }
      this.setState({ status, transcript: this.controller.transcript });
      if (status.phase === "failed" || status.phase === "ended") {
        clearTimeout(this.reconnectedTimer); this.setState({ reconnect: null });
      }
      if (status.phase === "failed" && status.failure === "connection" && this.controller.canResume) {
        this.resumeArmed = true; this.scheduleReconnect();
      } else if (status.phase === "failed" && this.resumeArmed) {
        clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined;
        this.setState({ reconnect: "failed" });
      } else if (status.phase === "ready" && status.microphone === "available" && this.resumeArmed) {
        this.resumeArmed = false; this.reconnectAttempts = 0;
        this.setState({ reconnect: "restored" });
        this.reconnectedTimer = setTimeout(() => {
          if (this.mounted && this.state.reconnect === "restored") this.setState({ reconnect: null });
        }, 3000);
      }
    });
    this.browser = new BrowserSession(reason => {
      if (reason === "departure") { this.end(); return; }
      clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined;
      if (this.controller?.suspend()) { this.resumeArmed = true; this.setState({ reconnect: "waiting" }); }
    }, browser => {
      this.browserState = browser; this.setState({ browser });
      if (!browser.offline && !browser.departed) this.scheduleReconnect();
    });
  }
  componentWillUnmount() {
    this.mounted = false;
    this.resumeArmed = false; clearTimeout(this.reconnectTimer); clearTimeout(this.reconnectedTimer);
    clearInterval(this.cooldownTimer);
    this.browser?.dispose(); this.browser = undefined;
    const controller = this.controller; this.controller = undefined;
    controller?.dispose();
  }
  private start = () => {
    if (!this.browser?.allowsAction() || !this.props.source || !this.controller || running(this.controller.snapshot) || !this.recovery.clearForRetry()) return;
    clearTimeout(this.reconnectedTimer);
    this.resumeArmed = false; this.setState({ reconnect: null });
    if (this.controller.start(this.props.source.id)) { this.browser.started(); this.setState(previous => ({ session: previous.session + 1 })); }
  };
  private mute = () => {
    const c = this.controller;
    if (!this.browser?.allowsAction() || !c || !running(c.snapshot) || c.snapshot.microphone !== "available") return;
    if (c.snapshot.muted) c.unmute(); else c.mute();
  };
  render() {
    const { source, createController } = this.props;
    const { status, transcript, session } = this.state;
    const blocked = this.state.browser.offline || this.state.browser.departed;
    const reconnecting = this.state.reconnect === "waiting" || this.state.reconnect === "connecting";
    const canResume = !!this.controller?.canResume;
    const recovery = this.state.reconnect === "restored" ? "Reconnected"
      : this.state.reconnect === "failed" ? "Couldn’t reconnect. Your chat is still here. Retry the connection when ready."
      : reconnecting ? this.state.browser.offline ? "Connection lost. Your chat is kept; we’ll reconnect when you’re back online."
        : "Reconnecting and restoring your conversation…"
      : browserSessionMessage(this.state.browser);
    const available = !!source && !!createController;
    const active = running(status), ready = status?.phase === "ready";
    const response = status?.response;
    const outputBusy = response?.output.state === "streaming" || response?.output.state === "unknown";
    const canInterrupt = ready && status?.microphone === "available" && response?.issue !== "capacity" && response?.interruption.state !== "pending"
      && response?.interruption.state !== "failed" && (!outputBusy || response?.output.responseId === response?.generation.responseId)
      && (response?.generation.state === "generating" || response?.output.state === "streaming");
    // Empty setup/ended sessions share text mode's centered invitation. Ready
    // sessions and any received turns keep the conversation and active dock.
    const emptyStart = !ready && !transcript?.turns.length;
    const rejection = this.recovery.rejection;
    const admissionMessage = rejection?.reason === "window" ? this.state.cooldown
      ? "Voice start limit reached. You can use Text mode while you wait."
      : rejection.retryAfterSeconds ? "The wait is over. You can retry voice, or use Text mode." : "Voice start limit reached. The reset time is unavailable. Try again later, or use Text mode."
      : rejection?.reason === "busy" ? "Voice setup is busy. End any pending session, then retry. You can also use Text mode."
      : rejection?.reason === "capacity" ? "Voice capacity is full. Waiting or reloading may not help. Use Text mode, or contact the demo host." : undefined;
    return <div className="voice-session">
      {source ? <p className="text-source visually-hidden">Using source: {source.title}</p> : null}
      {!emptyStart ? <TranscriptView snapshot={transcript} viewKey={`${source?.id ?? "none"}:${session}`} empty={{title: "Ask about your source", detail: "Ask for a summary or a specific detail. Your conversation will appear here."}} /> : null}
      <div className={emptyStart ? "voice-start" : "session-dock voice-dock"} data-voice-state={status?.muted ? "muted" : response?.input.state === "speaking" ? "speaking" : ready ? "ready" : "idle"}>
      {emptyStart ? <div className="voice-start-invitation"><h3>{status?.phase === "failed" || rejection ? "Your source is still here" : active ? "Getting voice ready" : "Talk it through"}</h3>{!status || status.phase === "idle" ? <p>Start voice to explore your source out loud, or choose Text mode to type.</p> : null}</div> : null}
      <p id="voice-session-guidance" className={`voice-session-status ${available && !recovery && (admissionMessage || (!status || status.phase === "idle") || ready && status?.microphone === "available") ? "visually-hidden" : ""}`} role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{available && recovery ? recovery : admissionMessage ?? setup(status, available, emptyStart)}</p>
      {admissionMessage ? <div className="voice-recovery"><p>{admissionMessage}</p>{this.state.cooldown ? <p role="timer" aria-live="off">Retry in {Math.floor(this.state.cooldown / 60)}:{String(this.state.cooldown % 60).padStart(2, "0")}</p> : null}</div> : null}
      {ready ? <p className="voice-state" role="status" aria-live="polite">{status?.microphone !== "available" ? "Waiting for microphone…" : response?.issue === "capacity" ? "Microphone input paused" : response?.output.state === "unknown" ? "Audio output uncertain" : response?.generation.state === "generating" ? "Answering…" : response?.output.state === "streaming" ? "Sending audio…" : status?.muted ? "Microphone muted" : response?.input.state === "speaking" ? "Speech detected" : "Listening"}</p> : null}
      <div className="source-actions voice-session-actions" aria-describedby="voice-session-guidance">
        <button type="button" aria-describedby="voice-session-guidance" hidden={active || canResume || reconnecting || status?.failure === "source_too_large"} disabled={blocked || !available || active || status?.failure === "source_too_large" || this.state.cooldown > 0} onClick={this.start}>{status?.phase === "failed" || rejection ? "Retry voice" : "Start voice"}</button>
        <button type="button" hidden={!canResume || reconnecting} disabled={blocked || this.state.cooldown > 0} onClick={this.retryConnection}>Retry connection</button>
        <button type="button" aria-describedby="voice-session-guidance" hidden={!active && !canResume && !reconnecting} disabled={!available || !active && !canResume && !reconnecting} onClick={this.end}>End voice</button>
        <button className="microphone-control" type="button" aria-label={status?.muted ? "Unmute microphone" : "Mute microphone"} aria-describedby="voice-session-guidance" hidden={!active || status?.microphone !== "available"} disabled={blocked || !available || !active || status?.microphone !== "available"} aria-pressed={status?.muted ?? false} onClick={this.mute}><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>{status?.muted ? <path d="m3 3 18 18"/> : null}</svg><span>{status?.muted ? "Mic off" : "Mic on"}</span></button>
        <button type="button" aria-describedby="voice-session-guidance" hidden={!canInterrupt} disabled={blocked || !available || !canInterrupt} onClick={() => { if (this.browser?.allowsAction()) this.controller?.interruptCurrentResponse(); }}>Interrupt answer</button>
        <button className="speaker-control" type="button" hidden={!ready} disabled={blocked || !available || !ready} aria-label={status?.speakerMuted ? "Unmute speaker" : "Mute speaker"} aria-pressed={status?.speakerMuted ?? false} onClick={() => this.controller?.setSpeakerMuted(!status?.speakerMuted)}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4 5 9H2v6h3l6 5Z"/>{status?.speakerMuted ? <path d="m16 9 6 6m0-6-6 6"/> : <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>}</svg><span>{status?.speakerMuted ? "Sound off" : "Sound on"}</span></button>
        <button type="button" hidden={!ready || status?.playback !== "blocked"} disabled={blocked || !ready || status?.playback !== "blocked"} onClick={() => { if (this.browser?.allowsAction()) void this.controller?.playAudio(); }}>Tap to enable sound</button>
      </div>
      {!emptyStart ? <p className={active || reconnecting || canResume || !status || status.phase === "idle" ? "visually-hidden" : "note restart-warning"}>Ending voice keeps received text. Starting a new conversation clears it.</p> : null}
      <dl className="voice-device-status visually-hidden">
        <dt>Microphone</dt><dd>{microphone(status)}</dd>
        <dt>Speaker playback</dt><dd>{playback(status)}</dd>
      </dl>
      <p className="note voice-media-announcement" hidden={!answer(status)} role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{answer(status)}</p>
      <p className="visually-hidden" role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{microphone(status)} {playback(status)}</p>
      </div>
    </div>;
  }
}

/** Server availability selects the application adapter. Changing the factory
 * requires a new owner mount; keep it stable for the lifetime of a source. */
export function VoiceSession(props: Props) {
  return <OwnedVoiceSession key={props.source?.id ?? "no-source"} {...props} />;
}
