"use client";

import { useEffect, useRef, useState } from "react";
import { PDF_MAX_FILE_BYTES } from "@/shared/pdf";
import type { SourceContent, SourceFailureCode, SourceMetadata, SourceResult } from "@/shared/source";

type Phase = "idle" | "importing" | "loading" | "loaded" | "removing" | "checking" | "error" | "uncertain";
type State = { phase: Phase; known: SourceMetadata | null; content: SourceContent | null; filename: string; message: string };
const initial: State = { phase: "idle", known: null, content: null, filename: "", message: "Choose a source to inspect its text. Conversation is not connected yet." };
const recovery: Record<SourceFailureCode, string> = {
  too_large: "This PDF is too large. Choose a file of 25 MB (25,000,000 bytes) or less.",
  wrong_type: "Choose a PDF file. Export your document as a PDF and try again.",
  malformed: "This PDF could not be read. Export a fresh PDF and choose that copy.",
  encrypted: "This PDF is password protected. Choose an unencrypted copy you can share.",
  no_text: "No readable text was found. Choose a PDF with selectable text; scanned images need OCR elsewhere.",
  extraction_limit: "This PDF exceeds the extraction limit. Choose a copy with fewer pages or less text.",
  timeout: "The request took too long. Its outcome is uncertain. Wait, then submit a source to try again.",
  cancelled: "The request was cancelled. Its outcome is uncertain. Check the source, or submit a source again.",
  limit_reached: "PDF import is busy or its request limit was reached. Wait before choosing a file again.",
  visitor_required: "Your visitor session expired or cookies are unavailable. Allow same-site cookies, then import your source again.",
  unavailable: "This source expired or is no longer available. Import your source again.",
  storage_unavailable: "Source storage is temporarily unavailable. The outcome is uncertain. Wait and try again.",
  replacement_conflict: "Another upload may have replaced your source. The current source cannot be identified here. Choose a PDF again to replace it deliberately.",
  disabled: "PDF import is currently unavailable. Try again later.",
  forbidden: "This request could not be accepted. Reload this page and choose your PDF again.",
  invalid_request: "The file could not be sent. Choose one PDF and try again.",
  internal: "PDF import could not finish. Its outcome is uncertain. Wait and choose your PDF again.",
  invalid_input: "Enter a valid HTTPS YouTube video URL and try again.",
  no_captions: "No captions are available for this video. Choose a captioned video or a PDF.",
  blocked: "Caption access was blocked. Try another video or a PDF; this video may still be inaccessible.",
  rate_limited: "Caption retrieval is rate limited. Wait before submitting again.",
  quota_exhausted: "The caption service has no quota remaining. Site operator action is needed. You can use a PDF meanwhile.",
  provider_limited: "The caption service cannot process this request within its limits. Site operator review is needed. Try a PDF.",
  upstream_failure: "The caption service could not finish retrieval. Try again later, or choose a PDF.",
};
const youtubeRecovery: Partial<Record<SourceFailureCode, string>> = {
  too_large: "These captions exceed the supported size. Choose a shorter video or a PDF.",
  malformed: "The caption service returned invalid or incomplete captions. Try again later, or choose another video.",
  unavailable: "This video is unavailable for caption retrieval. Choose another video or a PDF.",
  timeout: "Caption retrieval took too long. Its outcome is uncertain. Check the source before submitting again.",
  cancelled: "Caption import was cancelled. Its outcome is uncertain. Check the source before submitting again.",
  limit_reached: "Caption import is busy or its request limit was reached. Wait before submitting again.",
  visitor_required: "Your visitor session expired or cookies are unavailable. Allow same-site cookies, then submit the URL again.",
  replacement_conflict: "Another import may have replaced your source. The current source cannot be identified here. Submit a source again to replace it deliberately.",
  disabled: "YouTube import is currently unavailable. Try a PDF, or try again later.",
  forbidden: "This request could not be accepted. Reload this page and submit your source again.",
  invalid_request: "The video URL could not be sent. Enter one YouTube video URL and try again.",
  internal: "YouTube import could not finish. Its outcome is uncertain. Check the source before submitting again.",
};
class ApiError extends Error {
  constructor(readonly code: SourceFailureCode, readonly status: number) { super(code); }
}
async function request(url: string, signal: AbortSignal, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal, credentials: "same-origin", cache: "no-store" });
  const value: SourceResult = await response.json();
  if (!value.ok) {
    if (!(value.error.code in recovery)) throw new Error("Unexpected source error");
    throw new ApiError(value.error.code as SourceFailureCode, response.status);
  }
  if (!response.ok) throw new Error("Unexpected response");
  return { value, status: response.status };
}
async function read(id: string, signal: AbortSignal): Promise<SourceContent> {
  const { value } = await request(`/api/sources/${encodeURIComponent(id)}`, signal);
  if (!("source" in value) || !["PDF", "YOUTUBE"].includes(value.source.kind) || !("sections" in value.source) || value.source.id !== id) throw new Error("Missing source content");
  return value.source;
}
const uncertain = (error: unknown) => !(error instanceof ApiError)
  || ["storage_unavailable", "replacement_conflict", "timeout", "cancelled", "internal"].includes(error.code);
const message = (error: unknown, kind?: SourceMetadata["kind"]) => error instanceof ApiError
  ? kind === "YOUTUBE" ? youtubeRecovery[error.code] ?? recovery[error.code] : recovery[error.code]
  : "The connection was lost or the request timed out. It may have completed. Check the source, or submit a source again to replace it deliberately.";
const ready = (content: SourceContent) => content.kind === "PDF" ? "PDF text ready" : "YouTube captions ready";

export function useSource() {
  const [state, setState] = useState<State>(initial);
  const operation = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; operation.current?.controller.abort(); if (operation.current) clearTimeout(operation.current.timer); }, []);
  function begin() {
    if (operation.current) return null;
    const controller = new AbortController();
    const token = ++generation.current;
    operation.current = { controller, timer: setTimeout(() => controller.abort(), 55_000) };
    return { signal: controller.signal, current: () => generation.current === token, token };
  }
  function finish(token: number) {
    if (generation.current !== token) return;
    if (operation.current) clearTimeout(operation.current.timer);
    operation.current = null;
  }
  // One bounded read helps recovery; it cannot discover an unknown committed ID.
  async function reconcile(prior: SourceMetadata | null, text: string, work: { current: () => boolean }) {
    const { current } = work;
    if (!current()) return;
    setState(s => ({ ...s, phase: "checking", message: `${text} Checking the last known source…` }));
    if (prior) {
      try {
        // A timed-out import signal is already aborted. Give recovery its own bounded,
        // owned controller so it can read, and unmount still cancels that read.
        if (operation.current) { clearTimeout(operation.current.timer); operation.current.controller.abort(); }
        const controller = new AbortController();
        operation.current = { controller, timer: setTimeout(() => controller.abort(), 10_000) };
        const content = await read(prior.id, controller.signal);
        if (current()) setState(s => ({ ...s, known: content, content, phase: "uncertain", message: `${text} The previous source is readable now, but pending server work may still replace it. Check again before relying on it.` }));
        return;
      } catch (error) {
        if (!current()) return;
        if (error instanceof ApiError && ["unavailable", "visitor_required"].includes(error.code)) {
          setState(s => ({ ...s, known: null, content: null, filename: "", phase: "uncertain", message: `${text} The previous source is no longer accessible. Submit a source again.` }));
          return;
        }
      }
    }
    if (current()) setState(s => ({ ...s, phase: "uncertain", message: `${text} No current source has been confirmed. Submit a source again when ready.` }));
  }
  async function importFile(file: File) {
    if (operation.current) return;
    if (file.size > PDF_MAX_FILE_BYTES || !/\.pdf$/iu.test(file.name)) {
      setState(s => ({ ...s, phase: "error", message: recovery[file.size > PDF_MAX_FILE_BYTES ? "too_large" : "wrong_type"] })); return;
    }
    await importSource("PDF", file.name, () => {
      const body = new FormData();
      // Local filenames can be Unicode; the narrow server multipart contract is ASCII.
      body.append("file", file, "document.pdf");
      return { method: "POST", body };
    });
  }
  async function importYoutube(video: string) {
    await importSource("YOUTUBE", "", () => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ video }) }));
  }
  async function importSource(kind: SourceMetadata["kind"], filename: string, init: () => RequestInit) {
    const work = begin(); if (!work) return;
    const prior = state.known;
    let created = false;
    const label = kind === "PDF" ? "PDF" : "YouTube";
    setState(s => ({ ...s, phase: "importing", message: kind === "PDF" ? "Importing PDF… Uploading and extracting its text." : "Importing YouTube captions… Retrieving available caption text." }));
    try {
      const upload = () => request(`/api/sources/${kind === "PDF" ? "pdf" : "youtube"}`, work.signal, init());
      let result;
      try { result = await upload(); }
      catch (error) {
        if (!(error instanceof ApiError && error.status === 401) || !work.current() || work.signal.aborted) throw error;
        result = await upload(); // Exactly one cookie-establishment retry, no general retry.
      }
      if (!work.current()) return;
      if (result.status !== 201 || !("source" in result.value) || result.value.source.kind !== kind
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.value.source.id)) throw new Error("Missing source ID");
      const known = result.value.source;
      created = true;
      setState({ phase: "loading", known, content: null, filename, message: `${label} stored. Fetching its full text…` });
      const content = await read(known.id, work.signal);
      if (work.current()) setState({ phase: "loaded", known: content, content, filename, message: `${ready(content)}. Open the extracted text to inspect the complete source.` });
    } catch (error) {
      if (!work.current()) return;
      if (created) setState(s => ({ ...s, phase: "error", message: `${label} stored, but its text could not be fetched. ${message(error)} Use Retry text to fetch the saved ID without importing again.` }));
      else if (uncertain(error) || error instanceof ApiError && error.status === 401) await reconcile(prior, message(error, kind), work);
      else setState(s => ({ ...s, phase: "error", message: message(error, kind) }));
    } finally { finish(work.token); }
  }
  async function retryRead() {
    if (!state.known) return;
    const work = begin(); if (!work) return;
    setState(s => ({ ...s, phase: "loading", message: "Checking saved source text…" }));
    try {
      const content = await read(state.known.id, work.signal);
      if (work.current()) setState(s => ({ ...s, known: content, content, phase: "loaded", message: `${ready(content)}. This source is readable now.` }));
    } catch (error) {
      if (!work.current()) return;
      const gone = error instanceof ApiError && ["unavailable", "visitor_required"].includes(error.code);
      setState(s => ({ ...s, ...(gone ? { known: null, content: null, filename: "" } : {}), phase: "error", message: message(error) }));
    } finally { finish(work.token); }
  }
  async function remove() {
    if (!state.known) return;
    const work = begin(); if (!work) return;
    const prior = state.known;
    setState(s => ({ ...s, phase: "removing", message: "Removing source…" }));
    try {
      try { await request(`/api/sources/${encodeURIComponent(prior.id)}`, work.signal, { method: "DELETE" }); }
      catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
      if (work.current()) setState({ ...initial, message: "Source removed or already unavailable. Choose a source to begin again." });
    } catch (error) {
      if (work.current()) await reconcile(prior, `Removal is not confirmed. ${message(error)}`, work);
    } finally { finish(work.token); }
  }
  async function cancel() {
    if (!operation.current) return;
    operation.current.controller.abort(); clearTimeout(operation.current.timer);
    operation.current = null;
    const work = begin(); if (!work) return;
    try { await reconcile(state.known, "Import cancelled locally. It may already have completed on the server.", work); }
    finally { finish(work.token); }
  }
  return { state, importFile, importYoutube, retryRead, remove, cancel, busy: ["importing", "loading", "removing", "checking"].includes(state.phase) };
}
