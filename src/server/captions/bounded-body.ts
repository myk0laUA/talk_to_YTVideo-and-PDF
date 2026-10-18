import "server-only";
import { CaptionError } from "./errors.ts";

// Actively cancels the stream on abort/overflow; the fetch also receives the same signal.
export async function readBounded(body: ReadableStream<Uint8Array> | null, maxBytes: number, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (!body) return "";
  const reader = body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new CaptionError("too_large", "Response exceeds the proof byte limit");
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
