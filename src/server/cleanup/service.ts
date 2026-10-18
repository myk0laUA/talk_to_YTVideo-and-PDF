import "server-only";

export const tables = ["Source", "TranscriptCache"] as const;
export type CleanupTable = typeof tables[number];
export type Cursor = { id: string; expiresAt: Date };
export type CleanupOptions = { execute: boolean; batchSize: number; maxRows: number; maxBatches: number; timeoutMs: number };
export const defaults: CleanupOptions = { execute: false, batchSize: 100, maxRows: 1000, maxBatches: 20, timeoutMs: 30_000 };
export function validateOptions(options: CleanupOptions) {
  if (typeof options.execute !== "boolean") throw new Error("USAGE");
  for (const [key, max] of Object.entries({ batchSize: 500, maxRows: 5000, maxBatches: 100, timeoutMs: 60_000 })) {
    const n = options[key as keyof CleanupOptions];
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1 || n > max) throw new Error("USAGE");
  }
}
export type BatchRequest = { table: CleanupTable; cutoff: Date; cursor?: Cursor; limit: number; execute: boolean; guard(): void };
export type BatchResult = { selected: number; deleted: number; cursor?: Cursor };
export type CleanupStore = { batch(request: BatchRequest): Promise<BatchResult> };
export class CleanupStop extends Error {
  category: "cancelled" | "timeout";
  constructor(category: "cancelled" | "timeout") { super(category); this.category = category; }
}
export class CleanupBatchFailure extends Error {
  outcome: "not_started" | "rolled_back" | "unknown";
  stop?: "cancelled" | "timeout";
  constructor(outcome: "not_started" | "rolled_back" | "unknown", error: unknown) {
    super("BATCH_FAILED"); this.outcome = outcome;
    this.stop = error instanceof CleanupStop ? error.category : undefined;
  }
}
export async function cleanup(store: CleanupStore, options: CleanupOptions = defaults,
  signal?: AbortSignal, clock: () => number = Date.now) {
  validateOptions(options);
  // Only this server clock supplies the cutoff; there is no caller/CLI cutoff option.
  const start = clock();
  const cutoff = new Date(start);
  const counts = { Source: { selected: 0, deleted: 0, unscanned: "unknown" as "unknown" | 0 },
    TranscriptCache: { selected: 0, deleted: 0, unscanned: "unknown" as "unknown" | 0 } };
  let batches = 0, selected = 0;
  let status: "complete" | "limit" | "cancelled" | "timeout" | "error" = "complete";
  let failedBatch: "none" | "not_started" | "rolled_back" | "unknown" = "none";
  const guard = () => {
    if (signal?.aborted) throw new CleanupStop("cancelled");
    if (clock() - start >= options.timeoutMs) throw new CleanupStop("timeout");
  };
  try {
    for (const table of tables) {
      let cursor: Cursor | undefined;
      for (;;) {
        guard();
        if (selected >= options.maxRows || batches >= options.maxBatches) { status = "limit"; break; }
        const limit = Math.min(options.batchSize, options.maxRows - selected);
        const result = await store.batch({ table, cutoff, cursor, limit, execute: options.execute, guard });
        // A resolved batch is committed. Account it even if Stop arrived during COMMIT.
        batches++; selected += result.selected;
        counts[table].selected += result.selected; counts[table].deleted += result.deleted;
        cursor = result.cursor;
        guard();
        if (result.selected < limit) { counts[table].unscanned = 0; break; }
      }
      if (status === "limit") break;
    }
  } catch (error) {
    failedBatch = error instanceof CleanupBatchFailure ? error.outcome : error instanceof CleanupStop ? "none" : "unknown";
    status = signal?.aborted ? "cancelled" : clock() - start >= options.timeoutMs ? "timeout"
      : error instanceof CleanupStop ? error.category : error instanceof CleanupBatchFailure && error.stop ? error.stop : "error";
  }
  return { mode: options.execute ? "execute" : "dry-run", cutoff: cutoff.toISOString(), elapsedMs: Math.max(0, clock() - start),
    status, batches, counts, countsBasis: "completed_batches_only", failedBatch };
}
