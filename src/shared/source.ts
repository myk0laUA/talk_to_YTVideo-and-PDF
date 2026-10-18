import type { PdfFailureCode, PdfSection } from "./pdf.ts";
import type { CaptionFailureCode, CaptionSegment, CaptionTranscript } from "./captions.ts";

export type PdfSourceMetadata = {
  id: string; kind: "PDF"; title: string; parser: "pdf-parse@2.4.5";
  pageCount: number; characterCount: number; wordCount: number; warnings: string[]; expiresAt: string;
};
export type PdfSourceContent = PdfSourceMetadata & { fullText: string; sections: PdfSection[] };
export type CaptionSection = CaptionSegment & { id: string };
export type YoutubeSourceMetadata = {
  id: string; kind: "YOUTUBE"; title: string; videoId: string; canonicalUrl: string; language: string;
  provider: CaptionTranscript["provider"]; trackType?: "automatic"; segmentCount: number;
  characterCount: number; wordCount: number; warnings: string[]; expiresAt: string;
};
export type YoutubeSourceContent = YoutubeSourceMetadata & { fullText: string; sections: CaptionSection[] };
export type SourceMetadata = PdfSourceMetadata | YoutubeSourceMetadata;
export type SourceContent = PdfSourceContent | YoutubeSourceContent;
export type PdfSourceFailureCode = PdfFailureCode | "unavailable" | "storage_unavailable" | "replacement_conflict";
export type SourceFailureCode = PdfSourceFailureCode | CaptionFailureCode;
export type SourceResult = { ok: true; source: SourceMetadata | SourceContent } | { ok: true }
  | { ok: false; error: { code: SourceFailureCode; message: string } };
