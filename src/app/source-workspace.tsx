"use client";

import { useEffect, useRef, useState } from "react";
import { usePdfSource } from "./use-pdf-source";

export function SourceWorkspace({ pdfAvailable }: { pdfAvailable: boolean }) {
  const { state, importFile, retryRead, remove, cancel, busy } = usePdfSource();
  const input = useRef<HTMLInputElement>(null);
  const inspect = useRef<HTMLButtonElement>(null);
  const readerHeading = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hasSource = state.known !== null;
  useEffect(() => { if (expanded) readerHeading.current?.focus(); }, [expanded]);
  return <>
    <nav className="workspace-nav" aria-label="Workspace views">
      <a href="#source-heading">Source</a><a href="#conversation-heading">Conversation</a>
    </nav>
    <div className="workspace source-workspace">
      <section className="source-panel" aria-labelledby="source-heading">
        <h2 id="source-heading" tabIndex={-1}>Your source</h2>
        <p className="empty-title">{hasSource ? state.filename || "Uploaded PDF" : "Start with a PDF"}</p>
        <p>One document at a time. Import a PDF, then inspect its full extracted text.</p>
        <p id="pdf-limit" className="note">Up to 25 MB (25,000,000 bytes). Text PDFs only; no OCR.</p>
        <input ref={input} hidden id="pdf-file" type="file" name="file" accept="application/pdf,.pdf"
          aria-label={hasSource ? "Choose replacement PDF" : "Choose PDF"} aria-describedby="pdf-limit"
          disabled={!pdfAvailable || busy} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) { setExpanded(false); setConfirmRemove(false); void importFile(file); }
          }} />
        <div className="source-options">
          <button type="button" className="primary" disabled={!pdfAvailable || busy} onClick={() => input.current?.click()}>{hasSource ? "Replace PDF" : "Upload a PDF"}</button>
          <button type="button" disabled>Add a YouTube video</button>
        </div>
        <p className="note">YouTube import is not available in this preview.</p>
        {!pdfAvailable ? <p className="source-status">PDF import is currently unavailable. Please try again later.</p> : null}
        <p role="status" aria-live="polite" aria-atomic="true" className={`source-status ${state.phase === "error" || state.phase === "uncertain" ? "source-problem" : ""}`}>{pdfAvailable ? state.message : "Import is disabled for this build."}</p>
        {state.phase === "importing" ? <button type="button" onClick={() => void cancel()}>Cancel import</button> : null}
        {hasSource ? <div className="active-source">
          <p className="source-summary">{state.known!.pageCount} {state.known!.pageCount === 1 ? "page" : "pages"} · Temporary source</p>
          <p className="note">Expires <time dateTime={state.known!.expiresAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(state.known!.expiresAt))}</time>. Access depends on this browser’s visitor cookie.</p>
          <div className="source-actions">
            {state.content ? <button ref={inspect} type="button" disabled={busy} aria-expanded={expanded} aria-controls="source-text" onClick={() => setExpanded(value => !value)}>{expanded ? "Close extracted text" : "Inspect extracted text"}</button> : null}
            <button type="button" disabled={busy} onClick={() => void retryRead()}>{state.content ? "Check source" : "Retry text"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove</button>
          </div>
          {confirmRemove ? <div className="remove-confirm">
            <p>Remove this temporary source? You can upload it again later.</p>
            <div className="source-actions"><button type="button" disabled={busy} onClick={() => { setConfirmRemove(false); setExpanded(false); void remove(); }}>Confirm remove</button><button type="button" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep source</button></div>
          </div> : null}
        </div> : null}
        <p className="note reload-policy">Reloading clears this view. To continue after a reload, choose your PDF again; it will replace any previous temporary upload.</p>
      </section>
      <section className="conversation-panel" aria-labelledby="conversation-heading">
        <h2 id="conversation-heading" tabIndex={-1}>Conversation</h2>
        <div className="conversation-empty">
          <p className="empty-title">Room for your questions.</p>
          <p>You can inspect your PDF here. Connecting its text to a conversation is still being built.</p>
          <p className="note">Voice and text conversations are not connected yet.</p>
          <div className="source-options"><button type="button" disabled>Start Voice Chat</button><button type="button" disabled>Ask with text</button></div>
        </div>
      </section>
    </div>
    {expanded && state.content ? <section id="source-text" className="source-reader" aria-labelledby="reader-heading">
      <div className="reader-header"><h2 id="reader-heading" ref={readerHeading} tabIndex={-1}>Extracted PDF text</h2><button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button></div>
      <p>All {state.content.pageCount} pages in document order. PDF reading order can vary with complex layouts.</p>
      {state.content.warnings.length ? <div className="source-warnings"><h3>Extraction notes</h3><ul>{state.content.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div> : null}
      {state.content.sections.map(section => <article className="source-page" key={section.id} aria-labelledby={`heading-${section.id}`}>
        <h3 id={`heading-${section.id}`}>Page {section.pageNumber}</h3><div className="page-text">{section.text || "No extractable text on this page."}</div>
      </article>)}
      <button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button>
    </section> : null}
  </>;
}
