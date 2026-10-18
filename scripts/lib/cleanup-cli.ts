import "server-only";
import { cleanup, CleanupBatchFailure, defaults, validateOptions, type CleanupOptions, type CleanupStore } from "../../src/server/cleanup/service.ts";

export function parseCleanupArgs(args: string[]): CleanupOptions {
  const options = { ...defaults };
  const seen = new Set<string>();
  const flags = { "--batch-size": "batchSize", "--max-rows": "maxRows", "--max-batches": "maxBatches", "--timeout-ms": "timeoutMs" } as const;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error("USAGE");
    seen.add(flag);
    if (flag === "--execute") options.execute = true;
    else if (Object.hasOwn(flags, flag)) {
      const value = args[++i];
      if (!value || !/^[1-9]\d*$/u.test(value)) throw new Error("USAGE");
      options[flags[flag as keyof typeof flags]] = Number(value);
    } else throw new Error("USAGE");
  }
  validateOptions(options);
  return options;
}
export function cleanupDatabaseUrl(env: Record<string, string | undefined>): string {
  const value = env.DATABASE_URL;
  if (!value) throw new Error("CONFIGURATION");
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2
      || [...url.searchParams.keys()].some(key => !["sslmode", "sslcert", "sslkey", "sslrootcert", "sslpassword"].includes(key))) throw new Error();
  } catch { throw new Error("CONFIGURATION"); }
  return value;
}
export type OwnedCleanupStore = { store: CleanupStore; close(): Promise<void> };
export async function runCleanupCli(args: string[], env: Record<string, string | undefined>,
  open: (url: string) => Promise<OwnedCleanupStore>, write: (text: string) => void, signal?: AbortSignal) {
  let owned: OwnedCleanupStore | undefined;
  let report: Awaited<ReturnType<typeof cleanup>> | undefined;
  let error: string | undefined;
  try {
    const options = parseCleanupArgs(args);
    const url = cleanupDatabaseUrl(env);
    if (signal?.aborted) throw new Error("CANCELLED");
    // Capture the cutoff/deadline BEFORE acquiring the CLI-owned connection.
    report = await cleanup({ async batch(request) {
      if (!owned) {
        try { owned = await open(url); } catch (cause) { throw new CleanupBatchFailure("not_started", cause); }
      }
      request.guard();
      return owned.store.batch(request);
    } }, options, signal);
  } catch (cause) {
    error = cause instanceof Error && ["USAGE", "CONFIGURATION", "CANCELLED"].includes(cause.message) ? cause.message : "DATABASE";
  } finally {
    try { await owned?.close(); } catch { error = "CLOSE_FAILED"; }
  }
  write(JSON.stringify({ ...(report ?? { status: "error" }), ...(error ? { status: "error", category: error } : {}) }));
  return !error && report?.status === "complete" ? 0 : report?.status === "limit" && !error ? 2 : 1;
}
