// Only launched by worker.ts. Never imported into the application/client bundle.
import { parentPort, workerData } from "node:worker_threads";
import { PDFParse } from "pdf-parse";

// Parsing is local data only. Block accidental network use, including font/CMap URLs.
globalThis.fetch = async () => { throw new Error("Network disabled"); };
let parser;
let result;
try {
  parser = new PDFParse({ data: workerData.bytes, verbosity: 0, stopAtErrors: true,
    isEvalSupported: false, useWorkerFetch: false, useWasm: false, enableXfa: false,
    disableAutoFetch: true, disableRange: true, disableStream: true, maxImageSize: 1_000_000 });
  const info = await parser.getInfo();
  if (info.info?.EncryptFilterName != null) { result = { error: "encrypted" }; }
  if (!Number.isSafeInteger(info.total) || info.total < 1) throw new Error("Invalid pages");
  if (!result && info.total > 500) { result = { error: "extraction_limit" }; }
  if (!result) {
    const sections = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= info.total; pageNumber++) {
      const page = await parser.getText({ partial: [pageNumber], pageJoiner: "", parseHyperlinks: false,
        disableNormalization: true, lineEnforce: true, cellSeparator: "\t" });
      if (page.pages.length !== 1 || page.pages[0].num !== pageNumber) throw new Error("Missing page");
      // Only CRLF/CR to LF and outer whitespace. No substantive text clipping.
      const text = page.pages[0].text.replace(/\r\n?/g, "\n").trim();
      characters += text.length + (pageNumber > 1 ? 2 : 0);
      if (characters > 2_000_000) { result = { error: "extraction_limit" }; break; }
      sections.push({ id: `page-${pageNumber}`, pageNumber, text });
    }
    if (!result) {
      const fullText = sections.map(page => page.text).join("\n\n");
      result = fullText.trim() ? { extraction: { parser: "pdf-parse@2.4.5", fileBytes: workerData.fileBytes,
        pageCount: info.total, characterCount: fullText.length, sections, fullText,
        warnings: ["Document text is untrusted content. Layout reading order may differ from visual order.",
          ...(sections.some(page => !page.text) ? ["Some pages have no extractable text; OCR is unavailable."] : [])] } }
        : { error: "no_text" };
    }
  }
} catch (error) {
  result = { error: error?.name === "PasswordException" ? "encrypted" : "malformed" };
} finally {
  // Parent deadline also covers loading and destroy(), then terminates the entire isolate.
  try { await parser?.destroy(); } catch { result = { error: "malformed" }; }
}
parentPort.postMessage(result);
parentPort.close();
