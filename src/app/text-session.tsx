"use client";

import { Component, createRef, useId } from "react";
import { TEXT_QUESTION_LIMIT, type TextLifecycle, type TextStatus } from "../shared/text-lifecycle";
import { TranscriptView, type TranscriptViewSnapshot } from "./transcript-view";

type Source = { id: string; title: string };
export type TextControllerFactory = (notify: (status: TextStatus) => void) => TextLifecycle;
type Props = { source: Source | null; createController?: TextControllerFactory; fieldId: string };
type State = { status: TextStatus | null; transcript: TranscriptViewSnapshot | null; draft: string; attempted: boolean; session: number; receipt: boolean };
const active = new Set<TextStatus["phase"]>(["connecting", "priming", "ready", "admitting", "sending", "awaiting-response", "responding"]);

function message(status: TextStatus | null, available: boolean) {
  if (!available) return "Text conversation is unavailable in this build. You can still inspect your source.";
  if (!status || status.phase === "idle") return "Start a text session to ask about your selected source. No microphone is needed.";
  switch (status.phase) {
    case "connecting": return "Connecting. You can stop while the connection is being prepared.";
    case "priming": return "Loading your source into the conversation. Wait before sending a question.";
    case "ready": return "Ready for your question.";
    case "admitting": return "Checking whether this question fits the conversation. It has not been sent.";
    case "sending": return "Sending your question. Receipt has not been confirmed.";
    case "awaiting-response": return "Question received. Waiting for an answer.";
    case "responding": return "Answer arriving. You can stop and keep the text received so far.";
    case "ended": return "Session ended. Any received text stays here. A question without confirmed receipt may not have arrived.";
    case "failed":
      if (status.failure === "budget_unavailable") return "This source cannot be used for a conversation in this build. No question was sent. You can inspect the source.";
      if (status.failure === "turn_budget_unavailable" || status.failure === "stale_admission") return "This question could not be checked for this conversation. It was not sent. Your draft stays below.";
      if (status.failure === "timeout") return "The session timed out. An unconfirmed question may have arrived. Nothing will be sent again automatically.";
      return "The text session failed. Any received text stays here. An unconfirmed question may have arrived. Nothing will be sent again automatically.";
  }
}

/** The source key clears UI before paint. Mount owns one controller; cleanup detaches
 * observers before dispose. Start is always a user action, including in StrictMode. */
class OwnedTextSession extends Component<Props, State> {
  state: State = { status: null, transcript: null, draft: "", attempted: false, session: 0, receipt: false };
  private controller?: TextLifecycle;
  private mounted = false;
  private composing = false;
  private pending?: { text: string; earlier: Set<string> };
  private question = createRef<HTMLTextAreaElement>();
  componentDidMount() {
    this.mounted = true;
    if (this.props.source) this.controller = this.props.createController?.(status => {
      if (!this.mounted || !this.controller) return;
      const transcript = this.controller.transcript;
      // 10A only projects a user item after the exact finalized receipt ACK.
      const pending = this.pending;
      const received = pending !== undefined && transcript.turns.some(t => !pending.earlier.has(t.itemId) && t.role === "user" && t.parts.some(p => p.text === pending.text && p.state === "final"));
      if (received) this.pending = undefined;
      this.setState(previous => ({ status, transcript, draft: received ? "" : previous.draft, receipt: received || previous.receipt }));
    });
  }
  componentWillUnmount() {
    this.mounted = false;
    const controller = this.controller; this.controller = undefined;
    this.pending = undefined;
    controller?.dispose();
  }
  private start = () => {
    if (!this.controller || !this.props.source) return;
    this.pending = undefined;
    this.setState(previous => ({ draft: "", attempted: false, transcript: null, receipt: false, session: previous.session + 1 }));
    this.controller.start(this.props.source.id);
  };
  private send = () => {
    if (this.composing || !this.controller?.canSubmit) return;
    const { draft } = this.state;
    if (!draft.trim() || draft.length > TEXT_QUESTION_LIMIT) {
      this.setState({ attempted: true }); this.question.current?.focus(); return;
    }
    this.pending = { text: draft, earlier: new Set(this.controller.transcript.turns.map(t => t.itemId)) };
    this.setState({ receipt: false });
    if (!this.controller.submit(draft)) this.pending = undefined;
  };
  render() {
    const { source, createController, fieldId } = this.props;
    const { status, transcript, draft, attempted, session } = this.state;
    const available = !!createController && !!source;
    const phase = status?.phase ?? "idle";
    const running = active.has(phase);
    const ready = available && phase === "ready";
    const invalid = draft.length > TEXT_QUESTION_LIMIT ? `Your question is too long (${draft.length}/${TEXT_QUESTION_LIMIT} text units). Shorten it before sending; nothing has been cut off.`
      : attempted && !draft.trim() ? "Type a question before sending. Spaces alone cannot be sent." : "";
    return <div className="text-session">
      {source ? <p className="text-source">Using source: {source.title}</p> : null}
      <p className="text-session-status" role={available ? "status" : undefined} aria-live={available ? "polite" : "off"} aria-atomic="true">{phase === "sending" && this.state.receipt ? "Question received. Finishing the send before requesting an answer." : message(status, available)}</p>
      <div className="source-actions text-session-actions">
        <button type="button" disabled={!available || running} onClick={this.start}>{phase === "ended" || phase === "failed" ? "Start a fresh text session" : "Start text session"}</button>
        <button type="button" disabled={!available || !running} onClick={() => this.controller?.stop()}>Stop text session</button>
      </div>
      <p className="note">Starting again clears this conversation and draft. Questions are never resent automatically. An internet connection is required.</p>
      <div className="text-composer">
        <label htmlFor={fieldId}>Your question</label>
        <p className="note" id={`${fieldId}-help`}>Enter and Shift+Enter add a new line. Use Send question to submit. Limit: 1,000 text units; some symbols use more than one.</p>
        <textarea ref={this.question} id={fieldId} name="question" autoComplete="off" rows={4} dir="auto"
          disabled={!available} readOnly={!ready} value={draft} aria-invalid={!!invalid}
          aria-describedby={`${fieldId}-help ${fieldId}-validation`}
          onCompositionStart={() => { this.composing = true; }} onCompositionEnd={() => { this.composing = false; }}
          onChange={event => { this.setState({ draft: event.target.value, attempted: false }); }} />
        <p className="note text-validation" id={`${fieldId}-validation`}><span aria-live="polite">{invalid}</span>{!invalid ? `${draft.length}/${TEXT_QUESTION_LIMIT} text units. Your draft clears only after receipt is confirmed.` : null}</p>
        <button type="button" className="primary" disabled={!ready || draft.length > TEXT_QUESTION_LIMIT} onClick={this.send}>Send question</button>
      </div>
      <TranscriptView snapshot={transcript} viewKey={`${source?.id ?? "none"}:${session}`} />
    </div>;
  }
}

/** Without an application-supplied controller this is an unavailable presentation.
 * No provider, positive admission, route or query switch is supplied by production. */
export function TextSession({ source, createController }: { source: Source | null; createController?: TextControllerFactory }) {
  const id = useId();
  return <OwnedTextSession key={source?.id ?? "no-source"} source={source} createController={createController} fieldId={`${id}-question`} />;
}
