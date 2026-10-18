import "server-only";
import { Worker, type WorkerOptions } from "node:worker_threads";
import path from "node:path";
import type { PdfExtraction } from "../../shared/pdf.ts";
import { PdfError } from "./errors.ts";

export const PDF_PARSE_MS = 15_000;
export type PdfParser = (bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal) => Promise<PdfExtraction>;

// Options exist for unit lifecycle injection only; runtime never reads a test env/request hook.
export async function parsePdf(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal,
  options: { createWorker?: (options: WorkerOptions) => Worker; deadlineMs?: number; onExit?: (code: number) => void } = {}): Promise<PdfExtraction> {
  if (signal.aborted) throw new PdfError("cancelled");
  // canvas 0.1.80 (parser's pinned dependency) exits the process on Windows when
  // first loaded/unloaded solely in a worker. Keep its native library in the parent.
  // Lazy import preserves default-disabled startup. The parser still runs only in the worker.
  await import("@napi-rs/canvas");
  if (signal.aborted) throw new PdfError("cancelled");
  const settings: WorkerOptions = {
    workerData: { bytes, fileBytes: bytes.byteLength }, transferList: [bytes.buffer],
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
    // No environment/secrets, loader hooks, or parser diagnostic output cross this boundary.
    env: {}, execArgv: [], stdout: true, stderr: true,
  };
  const worker = options.createWorker?.(settings) ?? new Worker(path.join(process.cwd(), "src/server/pdf/parse-worker.mjs"), settings);
  worker.stdout.resume(); worker.stderr.resume();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  const exited = new Promise<number>(resolve => worker.once("exit", code => { options.onExit?.(code); resolve(code); }));
  try {
    return await new Promise<PdfExtraction>((resolve, reject) => {
      abort = () => reject(new PdfError("cancelled"));
      signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => reject(new PdfError("timeout")), options.deadlineMs ?? PDF_PARSE_MS);
      worker.once("error", error => reject(new PdfError(error.message.includes("memory limit") ? "extraction_limit" : "internal")));
      worker.once("exit", () => reject(new PdfError("internal")));
      worker.once("message", (message: { extraction?: PdfExtraction; error?: string }) => {
        if (message.error && ["encrypted", "malformed", "no_text", "extraction_limit"].includes(message.error)) {
          reject(new PdfError(message.error as "encrypted" | "malformed" | "no_text" | "extraction_limit"));
        } else if (message.extraction?.parser === "pdf-parse@2.4.5") resolve(message.extraction);
        else reject(new PdfError("internal"));
      });
      if (signal.aborted) abort();
    });
  } finally {
    clearTimeout(timer); signal.removeEventListener("abort", abort);
    await worker.terminate(); await exited;
  }
}
