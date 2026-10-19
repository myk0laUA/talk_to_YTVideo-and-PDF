"use client";

import { Component, createRef, useId } from "react";
import type { TranscriptSnapshot } from "../shared/transcript";

type Turn = TranscriptSnapshot["turns"][number];
/** Display facts only. No identity, event envelope, counts, transport or commands. */
export type TranscriptViewSnapshot = Pick<TranscriptSnapshot, "phase" | "incomplete" | "ordering"> & {
  turns: readonly (Pick<Turn, "itemId" | "role" | "ordering" | "generation" | "interrupted" | "playback" | "parts">)[];
};
type Props = { snapshot: TranscriptViewSnapshot | null; headingId: string; helpId: string };
type Anchor = { element?: Element; top: number; follow: boolean; scrollY: number };

function status(snapshot: TranscriptViewSnapshot | null) {
  if (!snapshot) return "Voice and text conversations are not connected yet.";
  if (snapshot.phase === "limited") return "Transcript limit reached. This transcript is incomplete; new text is no longer being added.";
  if (snapshot.phase === "stopped") return "Conversation stopped. Text stays here until the source changes, a new session starts, or you reload.";
  if (snapshot.phase === "idle" || snapshot.phase === "disposed") return "No conversation text. A new session starts with an empty transcript.";
  return !snapshot.turns.length ? "Waiting for the first turn." : snapshot.turns.some(t => !t.parts.length || t.parts.some(p => p.state === "draft")) ? "Conversation text is updating here." : "Text received in this session.";
}

function announcement(snapshot: TranscriptViewSnapshot | null) {
  if (!snapshot) return "";
  if (snapshot.phase !== "active") return status(snapshot);
  const failures = snapshot.turns.filter(t => t.parts.some(p => p.state === "transcription_failed")).length;
  const interrupted = snapshot.turns.filter(t => t.interrupted).length;
  const drafts = snapshot.turns.filter(t => !t.parts.length || t.parts.some(p => p.state === "draft")).length;
  const finals = snapshot.turns.filter(t => t.parts.length && t.parts.every(p => p.state === "final")).length;
  // Text deltas do not change this summary. The list itself is deliberately not live.
  return `${snapshot.turns.length} turns. ${drafts} updating. ${finals} finalized. ${failures} transcription failures. ${interrupted} interrupted. ${snapshot.ordering === "established" ? "" : "Turn order uncertain."}`;
}

/** getSnapshotBeforeUpdate captures the actual reading anchor before React mutates text.
 * One passive page listener, no token timers or focus changes on incoming content. */
class TranscriptPresentation extends Component<Props, { unread: boolean }, Anchor | null> {
  state = { unread: false };
  private root = createRef<HTMLElement>();
  private surface = createRef<HTMLDivElement>();
  private end = createRef<HTMLParagraphElement>();
  private latest = createRef<HTMLParagraphElement>();
  private nearEnd = () => {
    const top = this.end.current?.getBoundingClientRect().top;
    return top !== undefined && top >= 0 && top <= window.innerHeight + 48;
  };
  private onScroll = () => { if (this.state.unread && this.nearEnd()) this.setState({ unread: false }); };
  componentDidMount() {
    window.addEventListener("scroll", this.onScroll, { passive: true });
    // A keyed source/session replacement starts at its own beginning if the
    // visitor was deep in the preceding transcript. Never moves keyboard focus.
    if ((this.root.current?.getBoundingClientRect().top ?? 0) < 0) this.root.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  componentWillUnmount() { window.removeEventListener("scroll", this.onScroll); }
  getSnapshotBeforeUpdate(previous: Props, previousState: { unread: boolean }): Anchor | null {
    if (previous.snapshot === this.props.snapshot && previousState.unread === this.state.unread) return null;
    const element = [...(this.surface.current?.querySelectorAll("[data-reading-anchor]") ?? [])]
      .find(node => { const box = node.getBoundingClientRect(); return box.bottom > 0 && box.top < window.innerHeight; });
    return { element, top: element?.getBoundingClientRect().top ?? 0, follow: this.nearEnd(), scrollY: window.scrollY };
  }
  componentDidUpdate(_previous: Props, _state: { unread: boolean }, anchor: Anchor | null) {
    if (!anchor) return;
    if (anchor.follow) {
      const bottom = this.end.current?.getBoundingClientRect().bottom ?? 0;
      if (bottom > window.innerHeight) window.scrollBy({ top: bottom - window.innerHeight + 16, behavior: "instant" });
    } else {
      if (anchor.element?.isConnected) window.scrollTo({ top: anchor.scrollY + anchor.element.getBoundingClientRect().top - anchor.top, behavior: "instant" });
      if (this.props.snapshot?.turns.length && !this.state.unread) this.setState({ unread: true });
    }
  }
  private jump = () => {
    this.end.current?.scrollIntoView({ block: "end", behavior: "instant" });
    // An explicit keyboard/click action may move focus; subsequent updates never do.
    this.latest.current?.focus({ preventScroll: true });
    this.setState({ unread: false });
  };
  render() {
    const { snapshot, headingId, helpId } = this.props;
    const turns = snapshot?.turns ?? [];
    return <section ref={this.root} className="transcript" aria-labelledby={headingId}>
      <h3 id={headingId}>Transcript</h3>
      <p className="note transcript-summary">{status(snapshot)}</p>
      <p className="visually-hidden" role={snapshot ? "status" : undefined} aria-live="polite" aria-atomic="true">{announcement(snapshot)}{this.state.unread ? " Updates below. Jump to latest to follow." : ""}</p>
      {!turns.length ? <div className="conversation-empty">
        <p className="empty-title">{snapshot ? "No turns yet." : "Room for your questions."}</p>
        <p>{snapshot ? "Earlier sessions are not carried into this view." : "You can inspect your source here. Connecting its text to a conversation is still being built."}</p>
      </div> : <>
        <div className="transcript-navigation">
          <p className="note" id={helpId}>Scroll the page to read earlier turns or return to your source. {this.state.unread ? "Updates below." : "At the end, new text stays in view."}</p>
          <button type="button" onClick={this.jump}>Jump to latest</button>
        </div>
        {snapshot?.ordering !== "established" ? <p className="note transcript-notice">{snapshot?.ordering === "conflict" ? "Turn order could not be confirmed. Read this sequence with care." : "Turn order is provisional while earlier turns arrive."}</p> : null}
        <div ref={this.surface}>
          <ol className="transcript-turns" aria-label="Conversation turns" aria-live="off">
            {turns.map(turn => <li key={turn.itemId} className="transcript-turn">
              <h4 data-reading-anchor="role">{turn.role === "user" ? "You" : "Assistant"}</h4>
              {turn.interrupted ? <p className="note transcript-notice">Interrupted. Words shown may include speech you did not hear.</p> : null}
              {turn.playback === "unconfirmed" && !turn.interrupted ? <p className="note">Generated speech text; playback is unconfirmed.</p> : null}
              {turn.generation === "failed" || turn.generation === "incomplete" || turn.generation === "cancelled" ? <p className="note transcript-notice">{turn.generation === "failed" ? "Answer failed." : turn.generation === "cancelled" ? "Answer cancelled." : "Answer incomplete."} Any text received stays below.</p> : null}
              {!turn.parts.length ? <p className="note">{snapshot?.phase === "active" ? "Waiting for text…" : "No text was received for this turn."}</p> : null}
              {turn.parts.map(part => <div key={`${part.index}:${part.kind}`} className="transcript-part" data-reading-anchor="part">
                <p className="transcript-text" dir="auto">{part.text}</p>
                {part.state === "draft" ? <p className="note">{snapshot?.phase === "limited" ? "Text incomplete at transcript limit." : "Text updating…"}</p> : null}
                {part.state === "unfinished" ? <p className="note">Text unfinished when the conversation stopped.</p> : null}
                {part.state === "transcription_failed" ? <p className="note transcript-notice">Speech could not be transcribed. Any earlier words above may be incomplete.</p> : null}
              </div>)}
            </li>)}
          </ol>
        </div>
        <p ref={this.latest} tabIndex={-1} className="note transcript-latest">Latest received text. New sessions start empty.</p>
      </>}
      <p ref={this.end} className="transcript-end" aria-hidden="true" />
    </section>;
  }
}

/** Caller must change viewKey for every source or session. Keyed reset clears all
 * presentation state before paint, even when the next session already has turns. */
export function TranscriptView({ snapshot, viewKey }: { snapshot: TranscriptViewSnapshot | null; viewKey: string }) {
  const id = useId();
  const phaseKey = !snapshot || snapshot.phase === "idle" || snapshot.phase === "disposed" ? "empty" : "session";
  return <TranscriptPresentation key={`${viewKey}:${phaseKey}`} snapshot={snapshot} headingId={`${id}-transcript`} helpId={`${id}-scroll-help`} />;
}
