import type { PdfFailureCode } from "../../shared/pdf.ts";

export class PdfError extends Error {
  readonly code: PdfFailureCode;
  constructor(code: PdfFailureCode) { super(code); this.code = code; }
}
export const pdfErrors: Record<PdfFailureCode, [number, string]> = {
  disabled: [503, "Feature unavailable"], forbidden: [403, "Request forbidden"],
  visitor_required: [401, "Visitor cookie required; retry with the issued cookie before uploading"],
  invalid_request: [400, "Send exactly one multipart file field named file"],
  wrong_type: [415, "Upload a PDF with application/pdf media type and a .pdf filename"],
  too_large: [413, "PDF must be at most 25,000,000 bytes; multipart framing is separately bounded"],
  malformed: [422, "PDF is corrupt or unsupported; export a valid PDF and retry"],
  encrypted: [422, "Password-protected or encrypted PDFs are unsupported; upload an unencrypted copy"],
  no_text: [422, "PDF has no extractable text; upload a text PDF (OCR is unavailable)"],
  timeout: [504, "PDF upload or extraction deadline exceeded"], cancelled: [408, "PDF upload or extraction cancelled"],
  limit_reached: [429, "PDF service busy or request limit reached; try again later"],
  extraction_limit: [422, "PDF exceeds supported extraction resources (500 pages or 2,000,000 characters)"],
  internal: [500, "PDF extraction unavailable"],
};
