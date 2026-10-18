import type { PdfFailureCode, PdfSection } from "./pdf.ts";

export type SourceMetadata = {
  id: string; kind: "PDF"; title: string; parser: "pdf-parse@2.4.5";
  pageCount: number; characterCount: number; wordCount: number; warnings: string[]; expiresAt: string;
};
export type SourceContent = SourceMetadata & { fullText: string; sections: PdfSection[] };
export type SourceFailureCode = PdfFailureCode | "unavailable" | "storage_unavailable" | "replacement_conflict";
export type SourceResult = { ok: true; source: SourceMetadata | SourceContent } | { ok: true }
  | { ok: false; error: { code: SourceFailureCode; message: string } };
