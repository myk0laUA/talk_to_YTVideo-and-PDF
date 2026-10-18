"use client";

import { useEffect, useRef, useState } from "react";
import { useSource } from "./use-source";

// Helpful URL checks only; the existing server remains authoritative.
function isYoutubeUrl(value: string) {
  if (value.length > 400 || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1)
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
        ? url.pathname === "/watch" && url.searchParams.getAll("v").length === 1 ? url.searchParams.get("v")
          : /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1] : null;
    return typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
  } catch { return false; }
}

// Retain the supplied precision, including fractional starts and zero durations.
function timestamp(seconds: number) {
  if (String(seconds).includes("e")) return `${seconds} s`;
  const [whole, fraction] = String(seconds).split(".");
  const total = Number(whole);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}${fraction ? `.${fraction}` : ""}`;
}

export function SourceWorkspace({ pdfAvailable, youtubeAvailable }: { pdfAvailable: boolean; youtubeAvailable: boolean }) {
  const { state, importFile, importYoutube, retryRead, remove, cancel, busy } = useSource();
  const input = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const inspect = useRef<HTMLButtonElement>(null);
  const readerHeading = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [urlError, setUrlError] = useState("");
  const hasSource = state.known !== null;
  const known = state.known;
  useEffect(() => { if (expanded) readerHeading.current?.focus(); }, [expanded]);
  return <>
    <nav className="workspace-nav" aria-label="Workspace views">
      <a href="#source-heading">Source</a><a href="#conversation-heading">Conversation</a>
    </nav>
    <div className="workspace source-workspace">
      <section className="source-panel" aria-labelledby="source-heading">
        <h2 id="source-heading" tabIndex={-1}>Your source</h2>
        <p className="empty-title">{known ? state.filename || known.title : "Start with a source"}</p>
        <p>One source at a time. Import a PDF or captioned YouTube video, then inspect its complete text.</p>
        <p id="pdf-limit" className="note">Up to 25 MB (25,000,000 bytes). Text PDFs only; no OCR.</p>
        <input ref={input} hidden id="pdf-file" type="file" name="file" accept="application/pdf,.pdf"
          aria-label={hasSource ? "Choose replacement PDF" : "Choose PDF"} aria-describedby="pdf-limit"
          disabled={!pdfAvailable || busy} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) { setExpanded(false); setConfirmRemove(false); void importFile(file); }
          }} />
        <div className="source-options">
          <button type="button" className="primary" disabled={!pdfAvailable || busy} onClick={() => input.current?.click()}>{hasSource ? "Replace PDF" : "Upload a PDF"}</button>
          {!youtubeAvailable ? <button type="button" disabled>Add a YouTube video</button> : null}
        </div>
        {youtubeAvailable ? <form className="youtube-form" noValidate onSubmit={event => {
          event.preventDefault();
          if (busy) return;
          const video = videoInput.current?.value.trim() ?? "";
          if (!isYoutubeUrl(video)) {
            setUrlError("Enter an HTTPS YouTube video URL, such as https://www.youtube.com/watch?v=dQw4w9WgXcQ (up to 400 characters).");
            videoInput.current?.focus(); return;
          }
          setUrlError(""); setExpanded(false); setConfirmRemove(false); void importYoutube(video);
        }}>
          <label htmlFor="youtube-url">YouTube URL</label>
          <p className="note" id="youtube-help">Paste a link to one public captioned video. Importing replaces your current source only after it succeeds.</p>
          <input ref={videoInput} id="youtube-url" name="video" type="url" inputMode="url" autoComplete="off" spellCheck={false}
            placeholder="https://www.youtube.com/watch?v=…" disabled={busy} aria-invalid={!!urlError}
            aria-describedby={`youtube-help${urlError ? " youtube-error" : ""}`} onChange={() => { if (urlError) setUrlError(""); }} />
          {urlError ? <p id="youtube-error" className="note source-problem" role="alert">{urlError}</p> : null}
          <button type="submit" disabled={busy}>{hasSource ? "Replace with YouTube video" : "Import YouTube video"}</button>
        </form> : <p className="note">YouTube import is currently unavailable. Try a PDF, or check again later.</p>}
        {!pdfAvailable ? <p className="source-status">PDF import is currently unavailable. Please try again later.</p> : null}
        <p role="status" aria-live="polite" aria-atomic="true" className={`source-status ${state.phase === "error" || state.phase === "uncertain" ? "source-problem" : ""}`}>{pdfAvailable || youtubeAvailable ? state.message : "Import is disabled for this build."}</p>
        {state.phase === "importing" ? <button type="button" onClick={() => void cancel()}>Cancel import</button> : null}
        {known ? <div className="active-source">
          <p className="source-summary">{known.kind === "PDF" ? `${known.pageCount} ${known.pageCount === 1 ? "page" : "pages"}` : `${known.segmentCount} caption segments`} · Temporary source</p>
          {known.kind === "YOUTUBE" ? <p className="note">Selected caption language: <span translate="no">{known.language}</span>{known.trackType === "automatic" ? " · Automatic captions" : ""}. Video title is not retrieved; this is a generic source label.</p> : null}
          <p className="note">Expires <time dateTime={known.expiresAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(known.expiresAt))}</time>. Access depends on this browser’s visitor cookie.</p>
          <div className="source-actions">
            {state.content ? <button ref={inspect} type="button" disabled={busy} aria-expanded={expanded} aria-controls="source-text" onClick={() => setExpanded(value => !value)}>{expanded ? "Close extracted text" : "Inspect extracted text"}</button> : null}
            <button type="button" disabled={busy} onClick={() => void retryRead()}>{state.content ? "Check source" : "Retry text"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove</button>
          </div>
          {confirmRemove ? <div className="remove-confirm">
            <p>Remove this temporary source? You can import it again later.</p>
            <div className="source-actions"><button type="button" disabled={busy} onClick={() => { setConfirmRemove(false); setExpanded(false); void remove(); }}>Confirm remove</button><button type="button" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep source</button></div>
          </div> : null}
        </div> : null}
        <p className="note reload-policy">Reloading clears this view. To continue after a reload, import your source again; it will replace any previous temporary source. Source text and IDs are not saved in browser storage.</p>
      </section>
      <section className="conversation-panel" aria-labelledby="conversation-heading">
        <h2 id="conversation-heading" tabIndex={-1}>Conversation</h2>
        <div className="conversation-empty">
          <p className="empty-title">Room for your questions.</p>
          <p>You can inspect your source here. Connecting its text to a conversation is still being built.</p>
          <p className="note">Voice and text conversations are not connected yet.</p>
          <div className="source-options"><button type="button" disabled>Start Voice Chat</button><button type="button" disabled>Ask with text</button></div>
        </div>
      </section>
    </div>
    {expanded && state.content ? <section id="source-text" className="source-reader" aria-labelledby="reader-heading">
      <div className="reader-header"><h2 id="reader-heading" ref={readerHeading} tabIndex={-1}>{state.content.kind === "PDF" ? "Extracted PDF text" : "YouTube caption text"}</h2><button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button></div>
      <p>{state.content.kind === "PDF" ? `All ${state.content.pageCount} pages in document order. PDF reading order can vary with complex layouts.` : `All ${state.content.segmentCount} caption segments in their supplied order. Timestamps and durations are in seconds; captions may overlap.`}</p>
      {state.content.warnings.length ? <div className="source-warnings"><h3>Extraction notes</h3><ul>{state.content.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div> : null}
      {state.content.kind === "PDF" ? state.content.sections.map(section => <article className="source-page" key={section.id} aria-labelledby={`heading-${section.id}`}>
        <h3 id={`heading-${section.id}`}>Page {section.pageNumber}</h3><div className="page-text">{section.text || "No extractable text on this page."}</div>
      </article>) : state.content.sections.map(section => <article id={`source-${section.id}`} className="source-page caption-segment" key={section.id} aria-labelledby={`heading-${section.id}`}>
        <h3 id={`heading-${section.id}`}><span className="caption-time">{timestamp(section.startSeconds)}</span> <span className="note">· duration {section.durationSeconds} s</span></h3>
        <div className="page-text">{section.text}</div>
      </article>)}
      <button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button>
    </section> : null}
  </>;
}
