import "server-only";
import { randomUUID } from "node:crypto";
import type { PdfExtraction, PdfSection } from "../../shared/pdf.ts";
import type { SourceContent, SourceFailureCode, SourceMetadata } from "../../shared/source.ts";
import type { CaptionTranscript } from "../../shared/captions.ts";
import type { CaptionSection } from "../../shared/source.ts";
import { validatedTranscript } from "../captions/validated.ts";
import type { Visitor } from "../proof/visitor.ts";

export class SourceError extends Error {
  readonly code: SourceFailureCode;
  constructor(code: SourceFailureCode) { super(code); this.code = code; }
}
export type UploadedSource = {
  id: string; ownerSessionHash: string; activeSourceOwner: string | null;
  kind: string; extractionStatus: string; canonicalOrigin: string | null; provider: string | null;
  title: string; fullText: string; sections: PdfSection[] | CaptionDocument; pageCount: number | null; language: string | null;
  characterCount: number; wordCount: number; warnings: string[]; expiresAt: Date;
};
type CaptionDocument = { videoId: string; segments: CaptionSection[]; trackType?: "automatic" };
export type SourceRepository = {
  replace(record: UploadedSource, guard: () => void): Promise<UploadedSource>;
  get(id: string, owner: string, at: Date): Promise<UploadedSource | null>;
  remove(id: string, owner: string, at: Date, guard: () => void): Promise<boolean>;
};
export const UPLOADED_PDF_PARSER = "pdf-parse@2.4.5" as const;
export function requireLive(visitor: Visitor, signal: AbortSignal, now: number) {
  if (signal.aborted) throw new SourceError("cancelled");
  if (visitor.expiresAt * 1000 <= now) throw new SourceError("visitor_required");
}
export function requireOwned(record: UploadedSource | null, visitor: Visitor, now: number): asserts record is UploadedSource {
  if (!record || record.ownerSessionHash !== visitor.owner || record.activeSourceOwner !== visitor.owner
    || !genuineIdentity(record) || record.expiresAt.getTime() <= now
    || record.expiresAt.getTime() > visitor.expiresAt * 1000) throw new SourceError("unavailable");
}
export function uploadedRecord(extraction: PdfExtraction, visitor: Visitor): UploadedSource {
  return { id: randomUUID(), ownerSessionHash: visitor.owner, activeSourceOwner: visitor.owner,
    kind: "PDF", extractionStatus: "READY", canonicalOrigin: null, provider: extraction.parser,
    title: "Uploaded PDF", fullText: extraction.fullText, sections: extraction.sections, language: null,
    pageCount: extraction.pageCount, characterCount: extraction.characterCount,
    wordCount: extraction.fullText.trim().split(/\s+/u).filter(Boolean).length,
    warnings: extraction.warnings, expiresAt: new Date(visitor.expiresAt * 1000) };
}
export function captionRecord(transcript: CaptionTranscript, visitor: Visitor): UploadedSource {
  const checked = validatedTranscript(transcript);
  return { id: randomUUID(), ownerSessionHash: visitor.owner, activeSourceOwner: visitor.owner,
    kind: "YOUTUBE", extractionStatus: "READY", canonicalOrigin: checked.canonicalUrl, provider: checked.provider,
    title: "YouTube captions", fullText: checked.fullText, language: checked.language,
    sections: { videoId: checked.videoId, segments: checked.segments.map((s, i) => ({ id: `segment-${i + 1}`, ...s })),
      ...(checked.trackType ? { trackType: checked.trackType } : {}) }, pageCount: null,
    characterCount: checked.fullText.length, wordCount: checked.fullText.trim().split(/\s+/u).filter(Boolean).length,
    warnings: [], expiresAt: new Date(visitor.expiresAt * 1000) };
}

export function genuineIdentity(record: Pick<UploadedSource, "kind" | "extractionStatus" | "provider" | "canonicalOrigin">) {
  return record.extractionStatus === "READY" && (record.kind === "PDF"
    ? record.provider === UPLOADED_PDF_PARSER && record.canonicalOrigin === null
    : record.kind === "YOUTUBE" && ["youtube-transcript-plus@2.0.3", "supadata"].includes(record.provider ?? "")
      && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(record.canonicalOrigin ?? ""));
}

// Validate stored JSON independently of adapter success. Explicit DTOs copy only checked properties.
export function checkedSource(row: Omit<UploadedSource, "sections" | "warnings"> & { sections: unknown; warnings: unknown }): UploadedSource {
  const invalid = (): never => { throw new SourceError("storage_unavailable"); };
  if (!genuineIdentity(row) || !Array.isArray(row.warnings) || !row.warnings.every(w => typeof w === "string")
    || row.characterCount !== row.fullText.length || !row.fullText.trim()
    || row.wordCount !== row.fullText.trim().split(/\s+/u).filter(Boolean).length) return invalid();
  if (row.kind === "PDF") {
    if (!row.pageCount || !Array.isArray(row.sections) || row.sections.length !== row.pageCount
      || !row.sections.every((s, i) => s && typeof s === "object" && !Array.isArray(s)
        && s.id === `page-${i + 1}` && s.pageNumber === i + 1 && typeof s.text === "string")
      || row.fullText !== row.sections.map(s => s.text).join("\n\n")) return invalid();
    return { ...row, warnings: [...row.warnings], sections: row.sections.map(s => ({ id: s.id, pageNumber: s.pageNumber, text: s.text })) };
  }
  if (row.pageCount !== null || !row.sections || typeof row.sections !== "object" || Array.isArray(row.sections)) return invalid();
  const document = row.sections as Record<string, unknown>;
  try {
    const checked = validatedTranscript({ ...document, canonicalUrl: row.canonicalOrigin, provider: row.provider,
      language: row.language, fullText: row.fullText });
    if (!Array.isArray(document.segments) || !document.segments.every((s, i) => s.id === `segment-${i + 1}`)) return invalid();
    return { ...row, warnings: [...row.warnings], sections: { videoId: checked.videoId,
      segments: checked.segments.map((s, i) => ({ id: `segment-${i + 1}`, ...s })),
      ...(checked.trackType ? { trackType: checked.trackType } : {}) } };
  } catch { return invalid(); }
}
export function sourceDto(record: UploadedSource, content = false): SourceMetadata | SourceContent {
  record = checkedSource(record);
  const common = { id: record.id, title: record.title, characterCount: record.characterCount, wordCount: record.wordCount,
    warnings: record.warnings, expiresAt: record.expiresAt.toISOString() };
  if (Array.isArray(record.sections)) {
    const metadata = { ...common, kind: "PDF" as const, parser: UPLOADED_PDF_PARSER, pageCount: record.pageCount! };
    return content ? { ...metadata, fullText: record.fullText, sections: record.sections } : metadata;
  }
  const metadata = { ...common, kind: "YOUTUBE" as const, videoId: record.sections.videoId,
    canonicalUrl: record.canonicalOrigin!, provider: record.provider as CaptionTranscript["provider"], language: record.language!,
    segmentCount: record.sections.segments.length, ...(record.sections.trackType ? { trackType: record.sections.trackType } : {}) };
  return content ? { ...metadata, fullText: record.fullText, sections: record.sections.segments } : metadata;
}
