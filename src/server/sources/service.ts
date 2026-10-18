import "server-only";
import { randomUUID } from "node:crypto";
import type { PdfExtraction, PdfSection } from "../../shared/pdf.ts";
import type { SourceContent, SourceFailureCode, SourceMetadata } from "../../shared/source.ts";
import type { Visitor } from "../proof/visitor.ts";

export class SourceError extends Error {
  readonly code: SourceFailureCode;
  constructor(code: SourceFailureCode) { super(code); this.code = code; }
}
export type UploadedSource = {
  id: string; ownerSessionHash: string; uploadedPdfOwner: string | null;
  kind: string; extractionStatus: string; canonicalOrigin: string | null; provider: string | null;
  title: string; fullText: string; sections: PdfSection[]; pageCount: number;
  characterCount: number; wordCount: number; warnings: string[]; expiresAt: Date;
};
export type SourceRepository = {
  replace(record: UploadedSource, guard: () => void): Promise<UploadedSource>;
  get(id: string, owner: string, at: Date): Promise<UploadedSource | null>;
  remove(id: string, owner: string, at: Date, guard: () => void): Promise<boolean>;
};
export const UPLOADED_PDF_PARSER = "pdf-parse@2.4.5";
export function requireLive(visitor: Visitor, signal: AbortSignal, now: number) {
  if (signal.aborted) throw new SourceError("cancelled");
  if (visitor.expiresAt * 1000 <= now) throw new SourceError("visitor_required");
}
export function requireOwned(record: UploadedSource | null, visitor: Visitor, now: number): asserts record is UploadedSource {
  if (!record || record.ownerSessionHash !== visitor.owner || record.uploadedPdfOwner !== visitor.owner
    || record.kind !== "PDF" || record.extractionStatus !== "READY" || record.canonicalOrigin !== null
    || record.provider !== UPLOADED_PDF_PARSER || record.expiresAt.getTime() <= now
    || record.expiresAt.getTime() > visitor.expiresAt * 1000) throw new SourceError("unavailable");
}
export function uploadedRecord(extraction: PdfExtraction, visitor: Visitor): UploadedSource {
  return { id: randomUUID(), ownerSessionHash: visitor.owner, uploadedPdfOwner: visitor.owner,
    kind: "PDF", extractionStatus: "READY", canonicalOrigin: null, provider: extraction.parser,
    title: "Uploaded PDF", fullText: extraction.fullText, sections: extraction.sections,
    pageCount: extraction.pageCount, characterCount: extraction.characterCount,
    wordCount: extraction.fullText.trim().split(/\s+/u).filter(Boolean).length,
    warnings: extraction.warnings, expiresAt: new Date(visitor.expiresAt * 1000) };
}
export function sourceDto(record: UploadedSource, content = false): SourceMetadata | SourceContent {
  const metadata: SourceMetadata = { id: record.id, kind: "PDF", title: record.title, parser: UPLOADED_PDF_PARSER,
    pageCount: record.pageCount, characterCount: record.characterCount, wordCount: record.wordCount,
    warnings: record.warnings, expiresAt: record.expiresAt.toISOString() };
  return content ? { ...metadata, fullText: record.fullText, sections: record.sections } : metadata;
}
