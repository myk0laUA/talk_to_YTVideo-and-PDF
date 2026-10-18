import "server-only";
import { createHash } from "node:crypto";
import type { CaptionTranscript } from "../../shared/captions.ts";
import type { CaptionCacheKey } from "./cache.ts";
import type { CaptionConfig } from "./config.ts";
import { SourceError } from "../sources/service.ts";

export function captionJobKey(key: CaptionCacheKey, config: CaptionConfig): string {
  // Never keep a permanent adapter key in the registry identity. A key rotation is a new policy.
  const policy = createHash("sha256").update(JSON.stringify([config.provider, config.supadataApiKey ?? ""])).digest("hex");
  return JSON.stringify([key.videoId, key.languagePreference, key.mode, policy]);
}
type Job = { controller: AbortController; waiters: number; promise: Promise<CaptionTranscript> };

// One instance per production process. No coordination across processes/hosts.
// Admission separately bounds all requests (including body reads and Source commits).
export class CaptionCoordinator {
  private jobs = new Map<string, Job>();
  get size() { return this.jobs.size; }

  run(key: string, signal: AbortSignal, deadlineMs: number,
    work: (signal: AbortSignal) => Promise<CaptionTranscript>): Promise<CaptionTranscript> {
    if (signal.aborted) return Promise.reject(new SourceError("cancelled"));
    let job = this.jobs.get(key);
    if (!job) {
      if (this.jobs.size) return Promise.reject(new SourceError("limit_reached"));
      const controller = new AbortController();
      job = { controller, waiters: 0, promise: undefined! };
      const current = job;
      this.jobs.set(key, current);
      let timer: ReturnType<typeof setTimeout>;
      const stopped = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          if (this.jobs.get(key) === current) this.jobs.delete(key);
          reject(controller.signal.reason);
        }, { once: true });
        timer = setTimeout(() => controller.abort(new SourceError("timeout")), deadlineMs);
      });
      // A rejection handler is attached even if all callers detach before work settles.
      current.promise = Promise.race([Promise.resolve().then(() => {
        controller.signal.throwIfAborted(); return work(controller.signal);
      }), stopped]).finally(() => {
        clearTimeout(timer);
        if (this.jobs.get(key) === current) this.jobs.delete(key);
      });
    }
    if (job.waiters >= 8) return Promise.reject(new SourceError("limit_reached"));
    job.waiters++;
    const current = job;
    return new Promise((resolve, reject) => {
      let attached = true;
      const detach = () => {
        if (!attached) return false;
        attached = false; signal.removeEventListener("abort", cancel); current.waiters--;
        return true;
      };
      const cancel = () => {
        if (!detach()) return;
        if (!current.waiters) {
          // Remove synchronously: a racing join must never attach to an aborted job.
          if (this.jobs.get(key) === current) this.jobs.delete(key);
          current.controller.abort(new SourceError("cancelled"));
        }
        reject(new SourceError("cancelled"));
      };
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      current.promise.then(value => { if (detach()) resolve(value); }, error => { if (detach()) reject(error); });
    });
  }
}
