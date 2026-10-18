// Decimal MB, file bytes only. Multipart framing has a separate server allowance.
export const PDF_MAX_FILE_BYTES = 25_000_000;
export type PdfSection = { id: string; pageNumber: number; text: string };
export type PdfExtraction = {
  parser: "pdf-parse@2.4.5"; fileBytes: number; pageCount: number; characterCount: number;
  fullText: string; sections: PdfSection[]; warnings: string[];
};
export type PdfFailureCode = "disabled" | "forbidden" | "visitor_required" | "invalid_request"
  | "wrong_type" | "too_large" | "malformed" | "encrypted" | "no_text"
  | "timeout" | "cancelled" | "limit_reached" | "extraction_limit" | "internal";
export type PdfResult = { ok: true; extraction: PdfExtraction }
  | { ok: false; error: { code: PdfFailureCode; message: string } };
