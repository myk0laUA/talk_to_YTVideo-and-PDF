import "server-only";
import { SourceError } from "../sources/service.ts";

// Stop waiting promptly even when a read-only repository/measurer ignores the signal.
// The attached handlers still consume a late rejection; no late work can publish a result.
export async function guardedAwait<T>(work: () => Promise<T>, signal: AbortSignal, guard: () => void): Promise<T> {
  guard();
  let abort: () => void = () => {};
  try {
    const result = await new Promise<T>((resolve, reject) => {
      abort = () => reject(new SourceError("cancelled"));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) { abort(); return; }
      try { work().then(resolve, reject); } catch (error) { reject(error); }
    });
    guard();
    return result;
  } finally { signal.removeEventListener("abort", abort); }
}
