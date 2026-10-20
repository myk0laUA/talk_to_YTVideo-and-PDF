// Developer CLI. Default mode cannot import key reader or live network transport.
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { MATRIX, LIMITS, RATES, runFullSource, hash } from "./lib/full-source-text.ts";
import { scriptedFullSource } from "./lib/full-source-scripted.ts";

export function parseFullSourceArgs(args: string[]) {
  if (args.length === 0 || args.length === 1 && args[0] === "--offline") return { live: false };
  if (args.length === 2 && args[0] === "--live" && args[1] === "--allocation-07f-usd1") return { live: true };
  throw new Error("Invalid arguments");
}
export async function fullSourceMain(args: string[]) {
  const { live } = parseFullSourceArgs(args);
  if (live && (process.version !== "v24.22.0" || process.env.NODE_DEBUG || process.env.NODE_DEBUG_NATIVE || process.env.NODE_OPTIONS)) throw new Error("Unsafe runtime");
  const abort = new AbortController(), stop = () => abort.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    let factory: () => ReturnType<typeof scriptedFullSource>;
    const reports: Awaited<ReturnType<typeof runFullSource>>[] = [];
    const directory = new URL("../artifacts/local/07f/", import.meta.url);
    let ledger: Awaited<ReturnType<typeof open>> | undefined;
    try {
      if (live) {
        await mkdir(directory, { recursive: true });
        // Exclusive reservation prevents accidentally repeating this allocation after failure/crash.
        ledger = await open(new URL("live-allocation.lock", directory), "wx");
        await ledger.writeFile(JSON.stringify({ startedAt: new Date().toISOString(), limits: LIMITS, rates: RATES }));
        const { readProbeKey, openLiveProbe } = await import("./lib/realtime-probe-live.ts");
        const key = await readProbeKey();
        factory = () => openLiveProbe({ model: "gpt-realtime-2.1-mini", phase: "response", maxOutputTokens: 64, timeoutMs: 15_000, maxRequests: 5 }, key);
      }
      const git = (args: string[]) => { try { return execFileSync("git", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return "unavailable-isolated-copy"; } };
      const identity = { node: process.version, branch: git(["branch", "--show-current"]),
        head: git(["rev-parse", "HEAD"]),
        dirty: !!git(["status", "--porcelain"]),
        harnessSha256Utf16: hash(await readFile(new URL("lib/full-source-text.ts", import.meta.url), "utf8")), appBuild: "NOT_BUILT; developer harness only" };
      for (const [kind, variant] of MATRIX) {
        if (abort.signal.aborted) break;
        if (live) await ledger!.writeFile(JSON.stringify({ reservedSession: reports.length + 1, kind, variant, utc: new Date().toISOString() }) + "\n");
        const report = await runFullSource(kind, variant, { environment: live ? "live" : "offline-scripted",
          signal: abort.signal, open: live ? () => factory() : () => scriptedFullSource(kind) });
        reports.push(report);
        if (live) await writeFile(new URL("live-results.json", directory), JSON.stringify({ identity, rates: RATES, reports,
          totalSessions: reports.length, totalResponses: reports.reduce((n, r) => n + r.counts.responseRequests, 0),
          estimatedTextCostUsd: reports.reduce((n, r) => n + r.estimatedTextCostUsd, 0), allocationUsd: 1 }, null, 2));
        if (report.outcome !== "PASS" || reports.reduce((n, r) => n + r.estimatedTextCostUsd, 0) >= LIMITS.allocationUsd) break;
      }
      return { identity, environment: live ? "live" : "offline-scripted", outcome: reports.length === 4 && reports.every(r => r.outcome === "PASS") ? "PASS" : "FAIL", reports };
    } finally { await ledger?.close(); }
  } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await fullSourceMain(process.argv.slice(2)); process.stdout.write(JSON.stringify(result, null, 2) + "\n"); process.exitCode = result.outcome === "PASS" ? 0 : 1; }
  catch { process.stderr.write('{"version":"07f-v1","outcome":"BLOCKED","reason":"preflight_failed; inspect allocation reservation before any further live run"}\n'); process.exitCode = 2; }
}
