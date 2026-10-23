"use client";
import { createHttpTextController } from "./text-http-controller";

import { useEffect, useRef, useState } from "react";
import { useSource } from "./use-source";
import { ConversationArea } from "./conversation-area";
import { createBrowserVoiceController } from "./voice-browser-adapters";
import { SourceActions } from "./source-actions";
import { containDialogFocus } from "./dialog-focus";

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

export function SourceWorkspace({ pdfAvailable, youtubeAvailable, textAvailable = false, voiceAvailable = false }: { pdfAvailable: boolean; youtubeAvailable: boolean; textAvailable?: boolean; voiceAvailable?: boolean }) {
  const { state, importFile, importYoutube, retryRead, remove, cancel, busy } = useSource();
  const input = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const inspect = useRef<HTMLButtonElement>(null);
  const removal = useRef<HTMLDialogElement>(null);
  const keepSource = useRef<HTMLButtonElement>(null);
  const readerHeading = useRef<HTMLHeadingElement>(null);
  const reader = useRef<HTMLDialogElement>(null);
  const replacement = useRef<HTMLDialogElement>(null);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const hasSource = state.known !== null;
  const known = state.known;
  useEffect(() => {
    if (!confirmRemove) return;
    removal.current?.showModal(); keepSource.current?.focus();
    const trigger = replaceButton.current;
    return () => { trigger?.focus(); };
  }, [confirmRemove]);
  useEffect(() => {
    if (!expanded) return;
    reader.current?.showModal();
    readerHeading.current?.focus();
    const trigger = inspect.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; trigger?.focus(); };
  }, [expanded]);
  useEffect(() => {
    if (!replacing) return;
    replacement.current?.showModal();
    const trigger = replaceButton.current;
    return () => { trigger?.focus(); };
  }, [replacing]);
  // Successful replacement closes the sheet; failed attempts keep the draft and recovery visible.
  const priorPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === "loaded" && priorPhase.current !== "loaded") replacement.current?.close();
    priorPhase.current = state.phase;
  }, [state.phase]);
  // Announce only a committed source transition, never an import attempt or theme render.
  const priorSource = useRef<string | null>(null);
  const focusSource = useRef(false);
  useEffect(() => {
    const id = known?.id ?? null;
    if (id !== priorSource.current) { focusSource.current = true; priorSource.current = id; }
    if (focusSource.current && !replacing) {
      sourceHeading.current?.focus();
      focusSource.current = false;
    }
  }, [known?.id, replacing]);
  const importPanel = (
        <div className="source-import">
        <div className="import-choice pdf-choice">
        <h2 className="import-heading"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 3H5v18h14V8Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/></svg>PDF document</h2>
        <p className="import-description">Choose a document with selectable text.</p>
        <p id="pdf-limit" className="note">Up to 25 MB. Text PDFs only.</p>
        <input ref={input} hidden id="pdf-file" type="file" name="file" accept="application/pdf,.pdf"
          aria-label={hasSource ? "Choose replacement PDF" : "Choose PDF"} aria-describedby="pdf-limit"
          disabled={!pdfAvailable || busy} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) { setExpanded(false); setConfirmRemove(false); void importFile(file); }
          }} />
        <div className="source-options">
          <button type="button" className="primary" disabled={!pdfAvailable || busy} onClick={() => input.current?.click()}>{hasSource ? "Replace PDF" : "Upload a PDF"}</button>
        </div>
        {!pdfAvailable ? <p className="source-status">PDF import is currently unavailable. Please try again later.</p> : null}
        </div>
        <div className="import-choice video-choice">
        <h2 className="import-heading"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></svg>YouTube video</h2>
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
          <p className="note" id="youtube-help">A public video with captions.</p>
          <input ref={videoInput} value={urlDraft} id="youtube-url" name="video" type="url" inputMode="url" autoComplete="off" spellCheck={false}
            placeholder="https://www.youtube.com/watch?v=…" disabled={busy} aria-invalid={!!urlError}
            aria-describedby={`youtube-help${urlError ? " youtube-error" : ""}`} onChange={event => { setUrlDraft(event.target.value); if (urlError) setUrlError(""); }} />
          {urlError ? <p id="youtube-error" className="note source-problem" role="alert">{urlError}</p> : null}
          <button type="submit" disabled={busy}>{hasSource ? "Replace with YouTube video" : "Import YouTube video"}</button>
        </form> : <><p className="note">YouTube import is currently unavailable.{pdfAvailable ? " Start with a PDF instead." : " Please check again later."}</p><button type="button" disabled>Add a YouTube video</button></>}
        </div>
        </div>
  );
  return <>
    <div className={`workspace source-workspace ${known ? "has-source" : "awaiting-source"}`}>
      <section className="source-panel" aria-labelledby="source-heading">
        <h1 id="source-heading" ref={sourceHeading} tabIndex={-1}>{known ? `${known.kind === "PDF" ? "PDF" : "YouTube"} source` : <>Bring a source.<br />Start a chat.</>}</h1>
        {known ? <p className="source-title" title={state.filename || known.title}>{state.filename || known.title}</p> : <p className="welcome-description">{pdfAvailable && youtubeAvailable ? "Upload a PDF or paste a YouTube link, then ask questions by voice or text." : pdfAvailable ? "Upload a PDF, then explore its ideas with questions by voice or text." : youtubeAvailable ? "Paste a public, captioned YouTube link, then ask questions by voice or text." : "Source import is unavailable right now. Please check again later."}</p>}
        {!known && !replacing ? importPanel : null}
        <p role="status" aria-live="polite" aria-atomic="true" className={`source-status ${state.phase === "loaded" || state.phase === "idle" ? "visually-hidden" : ""} ${state.phase === "error" || state.phase === "uncertain" ? "source-problem" : ""}`}>{pdfAvailable || youtubeAvailable ? state.message : "Import is disabled for this build."}</p>
        {!replacing && state.phase === "importing" ? <button type="button" onClick={() => void cancel()}>Cancel import</button> : null}
        {known ? <div className="active-source">
          <p className="source-summary visually-hidden">{known.kind === "PDF" ? `${known.pageCount} ${known.pageCount === 1 ? "page" : "pages"}` : `${known.segmentCount} caption segments`} · Temporary source</p>
          <div className="source-actions">
            {state.content ? <button ref={inspect} type="button" disabled={busy} aria-expanded={expanded} aria-controls="source-text" onClick={() => setExpanded(value => !value)}>View source</button> : null}
            <SourceActions disabled={busy} trigger={replaceButton} onReplace={() => { setConfirmRemove(false); setReplacing(true); }} onRemove={() => setConfirmRemove(true)} />
            {!replacing && (!state.content || state.phase === "error" || state.phase === "uncertain") ? <button type="button" disabled={busy} onClick={() => void retryRead()}>Retry text</button> : null}
          </div>
        </div> : null}
        {!known ? <details className="reload-policy"><summary>About this temporary workspace</summary><p className="note">Reloading clears this view. To continue after a reload, import your source again; it will replace any previous temporary source. Source text and IDs are not saved in browser storage.</p></details> : null}
      </section>
      <section className="conversation-panel" aria-labelledby="conversation-heading">
        <h2 id="conversation-heading" tabIndex={-1}>Conversation</h2>
        <ConversationArea source={known ? { id: known.id, title: known.title } : null} createTextController={textAvailable ? createHttpTextController : undefined} createVoiceController={voiceAvailable ? createBrowserVoiceController : undefined} />
      </section>
    </div>
    {confirmRemove ? <dialog ref={removal} className="replacement-dialog remove-confirm" aria-labelledby="remove-heading" onKeyDown={containDialogFocus} onCancel={() => setConfirmRemove(false)}>
      <h2 id="remove-heading">Remove this source?</h2><p>This ends the conversation and removes your temporary source. You can import it again later.</p>
      <div className="source-actions"><button ref={keepSource} type="button" onClick={() => setConfirmRemove(false)}>Keep source</button><button type="button" className="destructive" disabled={busy} onClick={() => { setConfirmRemove(false); setExpanded(false); void remove(); }}>Confirm remove</button></div>
    </dialog> : null}
    {replacing ? <dialog ref={replacement} className="replacement-dialog" aria-labelledby="replace-heading" onKeyDown={containDialogFocus} onCancel={() => setReplacing(false)} onClose={() => setReplacing(false)}>
      <div className="reader-header"><h2 id="replace-heading">Replace source</h2><button type="button" aria-label="Back to conversation" onClick={() => setReplacing(false)}>Back</button></div>
      <p>Your current source stays until a replacement succeeds.</p>
      {importPanel}
      {known && (!state.content || state.phase === "error" || state.phase === "uncertain") ? <button type="button" disabled={busy} onClick={() => void retryRead()}>Retry text</button> : null}
      {state.phase !== "loaded" ? <p role="status" className="source-problem">{state.message}</p> : null}
      {state.phase === "importing" ? <button type="button" onClick={() => void cancel()}>Cancel import</button> : null}
    </dialog> : null}
    {expanded && state.content ? <dialog ref={reader} id="source-text" className="source-reader" aria-labelledby="reader-heading" onCancel={() => setExpanded(false)} onKeyDown={containDialogFocus}>
      <div className="reader-header"><h2 id="reader-heading" ref={readerHeading} tabIndex={-1}>{state.content.kind === "PDF" ? "Extracted PDF text" : "YouTube caption text"}</h2><button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button></div>
      {state.content.kind === "YOUTUBE" ? <p>All {state.content.segmentCount} caption segments in their supplied order. Timestamps and durations are in seconds; captions may overlap.</p> : null}
      <p className="reader-source-title">{state.filename || state.content.title}</p>
      {state.content.kind === "YOUTUBE" ? <p className="note">Caption language: <span translate="no">{state.content.language}</span>{state.content.trackType === "automatic" ? " · Automatic captions" : ""}. Video title is not retrieved; this is a generic source label.</p> : null}
      {state.content.kind === "YOUTUBE" && state.content.warnings.length ? <details className="source-warnings"><summary>Extraction notes</summary><ul>{state.content.warnings.map((warning, index) => <li key={index}>{warning.replace("Document text is untrusted content. ", "")}</li>)}</ul></details> : null}
      {state.content.kind === "PDF" ? state.content.sections.map(section => <article className="source-page" key={section.id} aria-labelledby={`heading-${section.id}`}>
        <h3 id={`heading-${section.id}`}>Page {section.pageNumber}</h3><div className="page-text">{section.text || "No extractable text on this page."}</div>
      </article>) : state.content.sections.map(section => <article id={`source-${section.id}`} className="source-page caption-segment" key={section.id} aria-labelledby={`heading-${section.id}`}>
        <h3 id={`heading-${section.id}`}><span className="caption-time">{timestamp(section.startSeconds)}</span> <span className="note">· duration {section.durationSeconds} s</span></h3>
        <div className="page-text">{section.text}</div>
      </article>)}
      <button type="button" onClick={() => { setExpanded(false); inspect.current?.focus(); }}>Close text and return</button>
    </dialog> : null}
  </>;
}
