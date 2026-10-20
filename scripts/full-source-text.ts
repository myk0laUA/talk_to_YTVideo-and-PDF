// Developer CLI. Default mode cannot import key reader or live network transport.
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { MATRIX, LIMITS, RATES, ORIGINAL_ATTEMPT, runFullSource, hash } from "./lib/full-source-text.ts";
import { scriptedFullSource } from "./lib/full-source-scripted.ts";

export function parseFullSourceArgs(args: string[]) {
  if (args.length === 0 || args.length === 1 && args[0] === "--offline") return { live: false };
  if (args.length === 2 && args[0] === "--live" && args[1] === "--correction-07f-1") return { live: true };
  throw new Error("Invalid arguments");
}
export function validateOriginalAttempt(value: unknown) {
  const r = value as { totalSessions?: unknown; totalResponses?: unknown; estimatedTextCostUsd?: unknown } | null;
  if (!r || r.totalSessions !== ORIGINAL_ATTEMPT.sessions || r.totalResponses !== ORIGINAL_ATTEMPT.responses
    || r.estimatedTextCostUsd !== ORIGINAL_ATTEMPT.estimatedTextCostUsd) throw new Error("Original allocation mismatch");
}
export function validateManualReview(value: unknown, runId: string, evidenceHash: string) {
  const r = value as Record<string, unknown> | null;
  if (!r || r.runId !== runId || r.evidenceSha256Utf16 !== evidenceHash || r.reviewedBy !== "worker"
    || !["PASS", "FAIL", "REVIEW_REQUIRED"].includes(String(r.classification))
    || r.rationaleCode !== "synthetic_fixture_comparison"
    || typeof r.coverageAndFollowUp !== "boolean" || typeof r.labelValueUnits !== "boolean"
    || typeof r.stopRetention !== "boolean"
    || r.classification === "PASS" && !(r.coverageAndFollowUp && r.labelValueUnits && r.stopRetention)) throw new Error("Invalid manual review");
  return { classification: r.classification as "PASS" | "FAIL" | "REVIEW_REQUIRED", reviewedBy: "worker",
    evidenceSha256Utf16: evidenceHash, rationaleCode: "synthetic_fixture_comparison", coverageAndFollowUp: r.coverageAndFollowUp,
    labelValueUnits: r.labelValueUnits, stopRetention: r.stopRetention };
}
export async function fullSourceMain(args: string[]) {
  const { live } = parseFullSourceArgs(args);
  if (live && (process.version !== "v24.22.0" || process.env.NODE_DEBUG || process.env.NODE_DEBUG_NATIVE || process.env.NODE_OPTIONS)) throw new Error("Unsafe runtime");
  const abort = new AbortController(), stop = () => abort.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    let factory: () => ReturnType<typeof scriptedFullSource>;
    const reports: Awaited<ReturnType<typeof runFullSource>>[] = [];
    const originalDirectory = new URL("../artifacts/local/07f/", import.meta.url);
    const directory = new URL("correction-1/", originalDirectory);
    const runId = randomUUID();
    const manualReviews: ReturnType<typeof validateManualReview>[] = [];
    let ledger: Awaited<ReturnType<typeof open>> | undefined;
    try {
      if (live) {
        validateOriginalAttempt(JSON.parse(await readFile(new URL("live-results.json", originalDirectory), "utf8")));
        await readFile(new URL("live-allocation.lock", originalDirectory));
        await mkdir(directory, { recursive: true });
        // Exclusive reservation prevents accidentally repeating this allocation after failure/crash.
        ledger = await open(new URL("live-allocation.lock", directory), "wx");
        await ledger.writeFile(JSON.stringify({ runId, startedAt: new Date().toISOString(), limits: LIMITS, rates: RATES,
          original: ORIGINAL_ATTEMPT, remainingUsd: 1 - ORIGINAL_ATTEMPT.estimatedTextCostUsd, cumulativeSessions: 5, cumulativeResponses: 10 }) + "\n");
        const { readProbeKey, openLiveProbe } = await import("./lib/realtime-probe-live.ts");
        const key = await readProbeKey();
        factory = () => openLiveProbe({ model: "gpt-realtime-2.1-mini", phase: "response", maxOutputTokens: 64, timeoutMs: 15_000, maxRequests: 5 }, key);
      }
      const git = (args: string[]) => { try { return execFileSync("git", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return "unavailable-isolated-copy"; } };
      const identity = { node: process.version, branch: git(["branch", "--show-current"]),
        head: git(["rev-parse", "HEAD"]),
        dirty: !!git(["status", "--porcelain"]),
        harnessSha256Utf16: hash(await readFile(new URL("lib/full-source-text.ts", import.meta.url), "utf8")),
        evaluatorSha256Utf16: hash(await readFile(new URL("lib/full-source-facts.ts", import.meta.url), "utf8")),
        cliSha256Utf16: hash(await readFile(new URL("full-source-text.ts", import.meta.url), "utf8")),
        fixtureModuleSha256Utf16: hash(await readFile(new URL("../tests/context/fixtures.ts", import.meta.url), "utf8")),
        appBuild: "NOT_BUILT; developer harness only" };
      const persist = async () => {
        const cost = reports.reduce((n, r) => n + r.estimatedTextCostUsd, 0);
        await writeFile(new URL("live-results.json", directory), JSON.stringify({ runId, identity, rates: RATES, reports, manualReviews,
          totalSessions: reports.length, totalResponses: reports.reduce((n, r) => n + r.counts.responseRequests, 0),
          estimatedTextCostUsd: cost, original: ORIGINAL_ATTEMPT, cumulativeEstimatedTextCostUsd: cost + ORIGINAL_ATTEMPT.estimatedTextCostUsd,
          cumulativeSessions: reports.length + ORIGINAL_ATTEMPT.sessions,
          cumulativeResponses: reports.reduce((n, r) => n + r.counts.responseRequests, 0) + ORIGINAL_ATTEMPT.responses,
          allocationUsd: 1 }, null, 2));
      };
      for (const [kind, variant] of MATRIX) {
        if (abort.signal.aborted) break;
        if (live) {
          if (reports.length >= 4 || reports.reduce((n, r) => n + r.counts.responseRequests, 0) >= 8
            || reports.reduce<number>((n, r) => n + r.estimatedTextCostUsd, ORIGINAL_ATTEMPT.estimatedTextCostUsd) >= 1) break;
          await ledger!.writeFile(JSON.stringify({ reservedSession: reports.length + 1, kind, variant, utc: new Date().toISOString() }) + "\n");
        }
        let evidenceHash = "";
        const report = await runFullSource(kind, variant, { environment: live ? "live" : "offline-scripted",
          signal: abort.signal, open: live ? () => factory() : () => scriptedFullSource(kind),
          ...(live ? { retainSyntheticEvidence: async (evidence: import("./lib/full-source-text.ts").SyntheticEvidence) => {
            const serialized = JSON.stringify({ runId, identity, ...evidence }, null, 2);
            evidenceHash = hash(serialized);
            await writeFile(new URL(`synthetic-${kind}-${variant}.json`, directory), serialized, { flag: "wx" });
          } } : {}) });
        reports.push(report);
        if (live) {
          await persist();
          // Stop/close has already happened. No provider session is held during manual review.
          // An ambiguous evaluator cannot authorize a new generation on its own.
          if (report.outcome === "FAIL") break;
          if (!report.transcript.sampled || report.transcript.userTurns !== 2 || report.transcript.assistantTurns !== 2
            || !report.transcript.retainedAfterStop || report.transcript.incomplete
            || report.counts.closes !== 1 || report.counts.unsubscribes !== 1) break;
          const deadline = Date.now() + 15 * 60_000;
          let review: ReturnType<typeof validateManualReview> | undefined;
          while (!abort.signal.aborted && Date.now() < deadline) {
            let text: string;
            try { text = await readFile(new URL(`manual-${kind}-${variant}.json`, directory), "utf8"); }
            catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; await new Promise(r => setTimeout(r, 250)); continue; }
            review = validateManualReview(JSON.parse(text), runId, evidenceHash); break;
          }
          if (review) manualReviews.push(review);
          await persist();
          if (!review || review.classification !== "PASS") break;
          // Keep the automatic REVIEW_REQUIRED observation; explicit manual adjudication is separate.
        }
        if (report.outcome === "FAIL" || !live && report.outcome !== "PASS"
          || reports.reduce((n, r) => n + r.estimatedTextCostUsd, 0) >= LIMITS.allocationUsd) break;
      }
      return { runId, identity, environment: live ? "live" : "offline-scripted",
        outcome: reports.length === 4 && reports.every(r => live ? r.outcome !== "FAIL" : r.outcome === "PASS")
          && (!live || manualReviews.length === 4 && manualReviews.every(r => r.classification === "PASS")) ? "PASS" : "FAIL", reports, manualReviews };
    } finally { await ledger?.close(); }
  } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await fullSourceMain(process.argv.slice(2)); process.stdout.write(JSON.stringify(result, null, 2) + "\n"); process.exitCode = result.outcome === "PASS" ? 0 : 1; }
  catch { process.stderr.write('{"version":"07f-correction-1","outcome":"BLOCKED","reason":"preflight_failed; inspect allocation reservation before any further live run"}\n'); process.exitCode = 2; }
}
