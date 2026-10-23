"use client";

import { Component, createRef, useId } from "react";
import { TEXT_QUESTION_LIMIT, type TextStatus } from "../shared/text-lifecycle";
import { SOURCE_SIZE_MESSAGE } from "../shared/priming-failure";
import type { TextController } from "../shared/text-relay";
import { TranscriptView, type TranscriptViewSnapshot } from "./transcript-view";
import { BrowserSession, browserSessionMessage, initialBrowserSession, type BrowserSessionState } from "./browser-session";
import type { ConversationMemory } from "../shared/conversation-memory";
import type { TranscriptSnapshot } from "../shared/transcript";
import { completedHistory } from "../shared/conversation-history";
import { joinedTranscript } from "../shared/conversation-restore";

type Source = { id: string; title: string };
export type TextControllerFactory = (notify: (status: TextStatus) => void) => TextController;
type Props = { source: Source | null; createController?: TextControllerFactory; fieldId: string; memory?: ConversationMemory };
type State = { browser: BrowserSessionState; status: TextStatus | null; transcript: TranscriptViewSnapshot | null; draft: string; attempted: boolean; session: number; receipt: boolean; hasBeenReady: boolean };
const active = new Set<TextStatus["phase"]>(["connecting", "priming", "ready", "admitting", "sending", "awaiting-response", "responding"]);

function message(status: TextStatus | null, available: boolean, firstStart: boolean) {
  if (!available) return "Text conversation is unavailable in this build. You can still inspect your source.";
  if (!status || status.phase === "idle") return "Start a session, then ask about your source.";
  switch (status.phase) {
    case "connecting": return "Connecting. You can stop while the connection is being prepared.";
    case "priming": return "Loading your source into the conversation. Wait before sending a question.";
    case "ready": return "Ready for your question.";
    case "admitting": return status.basis === "provider_enforced"
      ? "Preparing your question. The provider checks conversation capacity when answering."
      : "Checking whether this question fits the conversation. It has not been sent.";
    case "sending": return "Sending your question. Receipt has not been confirmed.";
    case "awaiting-response": return "Question received. Waiting for an answer.";
    case "responding": return "Answer arriving. You can stop and keep the text received so far.";
    case "ended": return firstStart ? "Chat setup stopped. Select Start chat when you’re ready." : "Session ended. Any received text stays here. A question without confirmed receipt may not have arrived.";
    case "failed":
      if (status.failure === "source_too_large") return SOURCE_SIZE_MESSAGE;
      if (status.failure === "context_limit" && firstStart) return "The provider rejected this source because it exceeds its context limit. You can still use View source. Choose a smaller source to continue.";
      if (firstStart) {
        if (status.failure === "budget_unavailable" || status.failure === "context_limit") return "This source could not be loaded into chat within its limits. You can still inspect it with View source.";
        if (status.failure === "connection") return "The text connection failed or closed. Select Start chat to try again, or choose Voice mode.";
        if (status.failure === "timeout") return "Chat setup timed out. Select Start chat to try again.";
        return "Chat setup failed. Your source is still here. Select Start chat to try again.";
      }
      if (status.failure === "context_limit") return "The provider rejected this conversation because it exceeds its context limit. Your full source preview and received text stay here. Start a fresh session explicitly to recover; nothing is shortened or resent automatically.";
      if (status.failure === "budget_unavailable") return "This source cannot be used for a conversation in this build. No question was sent. You can inspect the source.";
      if (status.failure === "turn_budget_unavailable" || status.failure === "stale_admission") return "This question could not be checked for this conversation. It was not sent. Your draft stays below.";
      if (status.failure === "connection") return "The text connection failed or closed. Received text and an unconfirmed draft stay here. Start a fresh session to retry; nothing is resent automatically.";
      if (status.failure === "timeout") return "The session timed out. An unconfirmed question may have arrived. Nothing will be sent again automatically.";
      return "The text session failed. Any received text stays here. An unconfirmed question may have arrived. Nothing will be sent again automatically.";
  }
}

/** The source key clears UI before paint. Mount owns one controller; cleanup detaches
 * observers before dispose. A mode switch restores acknowledged history; fresh Start remains explicit. */
class OwnedTextSession extends Component<Props, State> {
  state: State = { browser: initialBrowserSession, status: null, transcript: null, draft: "", attempted: false, session: 0, receipt: false, hasBeenReady: false };
  private controller?: TextController;
  private browser?: BrowserSession;
  private mounted = false;
  private composing = false;
  private pending?: { text: string; earlier: Set<string> };
  private question = createRef<HTMLTextAreaElement>();
  private focusAfterStart = false;
  private startControl: Element | null = null;
  private carried?: TranscriptSnapshot;
  private continuing = false;
  private draft = "";
  componentDidMount() {
    this.mounted = true;
    this.carried = this.props.memory?.snapshot; this.continuing = !!this.carried || !!this.props.memory?.started;
    this.draft = this.props.memory?.draft ?? "";
    this.setState({ transcript: this.carried ?? null, draft: this.draft });
    if (this.props.source) this.controller = this.props.createController?.(status => {
      if (!this.mounted || !this.controller) return;
      const transcript = joinedTranscript(this.carried, this.controller.transcript);
      this.props.memory?.save(transcript);
      if (status.phase === "ready") this.continuing = false;
      // 10A only projects a user item after the exact finalized receipt ACK.
      const pending = this.pending;
      const received = pending !== undefined && transcript.turns.some(t => !pending.earlier.has(t.itemId) && t.role === "user" && t.parts.some(p => p.text === pending.text && p.state === "final"));
      if (received) { this.pending = undefined; this.draft = ""; }
      this.setState(previous => ({ status, transcript, draft: received ? "" : previous.draft, receipt: received || previous.receipt, hasBeenReady: previous.hasBeenReady || status.phase === "ready" }));
    });
    this.browser = new BrowserSession(() => this.controller?.stop(), browser => this.setState({ browser }));
    const controller = this.controller;
    queueMicrotask(() => {
      if (this.mounted && this.controller === controller && this.props.memory?.resume) {
        this.props.memory.resume = false;
        this.start();
      }
    });
  }
  componentDidUpdate() {
    if (!this.focusAfterStart) return;
    if (this.state.status?.phase === "failed" || this.state.status?.phase === "ended") this.focusAfterStart = false;
    if (this.state.status?.phase !== "ready") return;
    this.focusAfterStart = false;
    // Explicit Start may focus the newly available field, unless the visitor
    // moved elsewhere while connecting. Answer updates never move focus.
    if (document.activeElement === this.startControl || document.activeElement === document.body) this.question.current?.focus({ preventScroll: true });
  }
  componentWillUnmount() {
    this.mounted = false;
    this.browser?.dispose(); this.browser = undefined;
    const controller = this.controller; this.controller = undefined;
    controller?.stop();
    if (this.props.memory) {
      const transcript = controller ? joinedTranscript(this.carried, controller.transcript) : this.carried;
      this.props.memory.save(transcript);
      const received = this.pending && transcript?.turns.some(t => !this.pending!.earlier.has(t.itemId) && t.role === "user" && t.parts.some(p => p.text === this.pending!.text && p.state === "final"));
      this.props.memory.draft = received ? "" : this.draft;
    }
    this.pending = undefined;
    controller?.dispose();
  }
  private start = () => {
    if (!this.browser?.allowsAction() || !this.controller || !this.props.source || active.has(this.controller.snapshot.phase)) return;
    this.startControl = document.activeElement;
    this.focusAfterStart = true;
    let history;
    if (this.continuing && this.carried) {
      try { history = completedHistory(this.carried, this.props.source.id).history; }
      catch { this.setState({ status: { phase: "failed", failure: "limit", protocolReady: false, productionReady: false, revision: 0 } }); this.focusAfterStart = false; return; }
    } else { this.carried = undefined; this.props.memory?.clear(); }
    if (this.controller.start(this.props.source.id, history)) {
      if (this.props.memory) this.props.memory.started = true;
      this.browser.started(); this.pending = undefined;
      this.setState(previous => ({ attempted: false, transcript: this.carried ?? null, receipt: false, session: previous.session + 1 }));
    } else this.focusAfterStart = false;
  };
  private send = () => {
    if (!this.browser?.allowsAction() || this.composing || !this.controller?.canSubmit) return;
    const { draft } = this.state;
    if (!draft.trim() || draft.length > TEXT_QUESTION_LIMIT) {
      this.setState({ attempted: true }); this.question.current?.focus(); return;
    }
    this.pending = { text: draft, earlier: new Set(joinedTranscript(this.carried, this.controller.transcript).turns.map(t => t.itemId)) };
    this.setState({ receipt: false });
    if (!this.controller.submit(draft)) this.pending = undefined;
  };
  render() {
    const { source, createController, fieldId } = this.props;
    const { status, transcript, draft, attempted, session } = this.state;
    const blocked = this.state.browser.offline || this.state.browser.departed;
    const recovery = browserSessionMessage(this.state.browser);
    const available = !!createController && !!source;
    const phase = status?.phase ?? "idle";
    const running = active.has(phase);
    const ready = !blocked && available && phase === "ready";
    const firstStart = !this.state.hasBeenReady && !transcript?.turns.length && !draft;
    const invalid = draft.length > TEXT_QUESTION_LIMIT ? `Your question is too long (${draft.length}/${TEXT_QUESTION_LIMIT} text units). Shorten it before sending; nothing has been cut off.`
      : attempted && !draft.trim() ? "Type a question before sending. Spaces alone cannot be sent." : "";
    return <div className="text-session">
      {source ? <p className="text-source visually-hidden">Using source: {source.title}</p> : null}
      {!firstStart ? <TranscriptView snapshot={transcript} viewKey={`${source?.id ?? "none"}:${session}`} empty={{ title: phase === "failed" ? "Your source is still here" : phase === "ended" ? "Ready when you are" : "What would you like to know?", detail: phase === "ready" ? "Ask for a summary, or dig into a detail from your source." : "Start a fresh session to continue. Your unsent draft stays below." }} /> : null}
      <div className={firstStart ? "text-start" : "session-dock"}>
      {firstStart ? <div className="text-start-invitation"><h3>{phase === "failed" ? "Your source is still here" : running ? "Getting your chat ready" : "What would you like to know?"}</h3>{phase === "idle" ? <p>Start a chat to explore a summary or a specific detail. Prefer to talk? Choose Voice mode.</p> : null}</div> : null}
      <p id="text-session-guidance" className={`text-session-status ${!recovery && ["idle", "ready"].includes(phase) && available ? "visually-hidden" : ""}`} role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{available && recovery ? recovery : phase === "sending" && this.state.receipt ? "Question received. Finishing the send before requesting an answer." : this.continuing && phase === "failed" ? "Couldn’t continue chat. Your messages are kept. Retry, or start a new chat." : message(status, available, firstStart)}</p>
      <div className="source-actions text-session-actions" aria-describedby="text-session-guidance">
        <button type="button" className={firstStart ? "primary start-chat" : undefined} aria-describedby="text-session-guidance" hidden={running || status?.failure === "source_too_large"} disabled={blocked || !available || running || status?.failure === "source_too_large"} onClick={this.start}>{this.continuing ? "Continue chat" : firstStart ? "Start chat" : phase === "ended" || phase === "failed" ? "Start a fresh text session" : "Start text session"}</button>
        <button type="button" hidden={!this.continuing || phase !== "failed"} disabled={blocked || !available} onClick={() => { this.continuing = false; this.start(); }}>Start new chat</button>
        <button type="button" aria-describedby="text-session-guidance" hidden={!running} disabled={blocked || !available || !running} onClick={() => this.controller?.stop()}>Stop text session</button>
      </div>
      {!firstStart ? <p className={this.continuing || running || phase === "idle" ? "visually-hidden" : "note restart-warning"}>Restarting clears the conversation. Your unsent draft stays; nothing resends automatically.</p> : null}
      <div className="text-composer" hidden={firstStart}>
        <label className="visually-hidden" htmlFor={fieldId}>Your question</label>
        <p className="visually-hidden" id={`${fieldId}-help`}>Enter adds a new line. Send submits. Limit: 1,000 text units.</p>
        <textarea ref={this.question} id={fieldId} name="question" autoComplete="off" placeholder="Ask about your source…" rows={2} dir="auto"
          disabled={!available} readOnly={!ready} value={draft} aria-invalid={!!invalid}
          aria-describedby={`${fieldId}-help ${fieldId}-validation text-session-guidance`}
          onCompositionStart={() => { this.composing = true; }} onCompositionEnd={() => { this.composing = false; }}
          onChange={event => { this.draft = event.target.value; this.setState({ draft: this.draft, attempted: false }); }} />
        <p className={invalid ? "note text-validation" : "visually-hidden"} id={`${fieldId}-validation`}><span aria-live="polite">{invalid}</span>{!invalid ? `${draft.length}/${TEXT_QUESTION_LIMIT} text units. Your draft clears only after receipt is confirmed.` : null}</p>
        <button type="button" className="primary" aria-describedby="text-session-guidance" disabled={!ready || draft.length > TEXT_QUESTION_LIMIT} onClick={this.send}>Send question</button>
      </div>
      </div>
    </div>;
  }
}

/** Without a safely available application controller this is an unavailable presentation. */
export function TextSession({ source, createController, memory }: { source: Source | null; createController?: TextControllerFactory; memory?: ConversationMemory }) {
  const id = useId();
  return <OwnedTextSession key={source?.id ?? "no-source"} source={source} createController={createController} memory={memory} fieldId={`${id}-question`} />;
}
