import "server-only";
import { PDF_MAX_FILE_BYTES } from "../../shared/pdf.ts";
import { PdfError } from "./errors.ts";

export const PDF_FRAMING_BYTES = 16_384;
export const PDF_MAX_REQUEST_BYTES = PDF_MAX_FILE_BYTES + PDF_FRAMING_BYTES;
export const PDF_UPLOAD_MS = 30_000;
const MAX_HEADERS = 4096;

// Deliberately narrow multipart grammar: one ASCII-named PDF, no fields, preamble or epilogue.
// One preallocated backing store avoids chunk-concat and Blob/FormData copies.
export async function readPdfMultipart(request: Request, deadlineMs = PDF_UPLOAD_MS): Promise<Uint8Array<ArrayBuffer>> {
  const type = request.headers.get("content-type") ?? "";
  const match = /^multipart\/form-data;\s*boundary=(?:"([A-Za-z0-9'()+_,.\/:=? -]{1,70})"|([A-Za-z0-9'()+_,.\/:=?-]{1,70}))$/i.exec(type);
  if (!match || (match[1] ?? match[2]).endsWith(" ") || !request.body) throw new PdfError("invalid_request");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > PDF_MAX_REQUEST_BYTES)) {
    throw new PdfError("too_large");
  }
  const boundary = match[1] ?? match[2];
  const prefix = Buffer.from(`--${boundary}\r\n`);
  const delimiter = Buffer.from(`\r\n--${boundary}`);
  const store = new Uint8Array(new ArrayBuffer(PDF_MAX_REQUEST_BYTES));
  const buffer = Buffer.from(store.buffer);
  const reader = request.body.getReader();
  let used = 0, start = -1;
  let terminal: PdfError | undefined;
  let rejectStop: (error: PdfError) => void = () => {};
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  const stop = (code: "timeout" | "cancelled") => {
    terminal ??= new PdfError(code); rejectStop(terminal);
    void reader.cancel().catch(() => {});
  };
  const abort = () => stop("cancelled");
  const timer = setTimeout(() => stop("timeout"), deadlineMs);
  request.signal.addEventListener("abort", abort, { once: true });
  try {
    if (request.signal.aborted) throw new PdfError("cancelled");
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), stopped]);
      if (terminal) throw terminal;
      if (done) break;
      if (used + value.byteLength > store.length) throw new PdfError("too_large");
      store.set(value, used); used += value.byteLength;
      if (start < 0) {
        const end = buffer.subarray(0, Math.min(used, prefix.length + MAX_HEADERS + 4)).indexOf("\r\n\r\n");
        if (end < 0) {
          if (used > prefix.length + MAX_HEADERS + 4) throw new PdfError("invalid_request");
          continue;
        }
        if (!buffer.subarray(0, prefix.length).equals(prefix) || end - prefix.length > MAX_HEADERS) throw new PdfError("invalid_request");
        const lines = buffer.subarray(prefix.length, end).toString("latin1").split("\r\n");
        if (lines.length !== 2) throw new PdfError("invalid_request");
        const headers = new Map<string, string>();
        for (const line of lines) {
          const header = /^([A-Za-z-]+):[ \t]*([^\r\n]*)$/.exec(line);
          if (!header || headers.has(header[1].toLowerCase())) throw new PdfError("invalid_request");
          headers.set(header[1].toLowerCase(), header[2]);
        }
        const disposition = /^form-data;\s*name="file";\s*filename="([\x20-\x21\x23-\x7e]{1,200})"$/i.exec(headers.get("content-disposition") ?? "");
        if (!disposition) throw new PdfError("invalid_request");
        if (/[\\/]/.test(disposition[1]) || !/\.pdf$/i.test(disposition[1]) || headers.get("content-type")?.toLowerCase() !== "application/pdf") throw new PdfError("wrong_type");
        start = end + 4;
      }
    }
    if (start < 0) throw new PdfError("invalid_request");
    const end = buffer.subarray(0, used).indexOf(delimiter, start);
    if (end < 0) throw new PdfError("invalid_request");
    const suffix = buffer.subarray(end + delimiter.length, used).toString("latin1");
    if (suffix !== "--\r\n" && suffix !== "--") throw new PdfError("invalid_request");
    const fileBytes = end - start;
    if (fileBytes > PDF_MAX_FILE_BYTES) throw new PdfError("too_large");
    if (fileBytes < 8 || !/^%PDF-\d\.\d/.test(buffer.subarray(start, start + 8).toString("latin1"))) throw new PdfError("wrong_type");
    return new Uint8Array(store.buffer, start, fileBytes);
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw terminal ?? (error instanceof PdfError ? error : new PdfError(request.signal.aborted ? "cancelled" : "invalid_request"));
  } finally {
    clearTimeout(timer); request.signal.removeEventListener("abort", abort); reader.releaseLock();
  }
}
