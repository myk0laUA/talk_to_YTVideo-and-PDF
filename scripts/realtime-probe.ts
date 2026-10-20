// Developer CLI only. No --env-file, dotenv/config, app, database or browser entry points.
import { pathToFileURL } from "node:url";
import { DEFAULT_LIMITS, validateProbeOptions, runProbe, type ProbeOptions, type ProbeModel } from "./lib/realtime-probe.ts";
import { scriptedProbe } from "./lib/realtime-probe-scripted.ts";

export function parseProbeArguments(args: string[]) {
  let live = false, offline = false;
  const values = new Map<string, string>();
  const allowed = ["--model", "--phase", "--max-output-tokens", "--timeout-ms", "--max-requests"];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--live" && !live) { live = true; continue; }
    if (flag === "--offline" && !offline) { offline = true; continue; }
    if (!allowed.includes(flag) || values.has(flag) || !args[i + 1] || args[i + 1].startsWith("--")) {
      throw new Error("Invalid probe arguments. No connection attempted.");
    }
    values.set(flag, args[++i]);
  }
  if (live && (offline || !values.has("--model") || !values.has("--phase"))) {
    throw new Error("Live probe requires an exact model and explicit phase. No connection attempted.");
  }
  const options: ProbeOptions = { model: (values.get("--model") ?? "gpt-realtime-2.1-mini") as ProbeModel,
    phase: (values.get("--phase") ?? "response") as ProbeOptions["phase"],
    maxOutputTokens: Number(values.get("--max-output-tokens") ?? DEFAULT_LIMITS.maxOutputTokens),
    timeoutMs: Number(values.get("--timeout-ms") ?? DEFAULT_LIMITS.timeoutMs),
    maxRequests: Number(values.get("--max-requests") ?? DEFAULT_LIMITS.maxRequests) };
  validateProbeOptions(options); return { live, options };
}

export async function probeMain(args: string[]) {
  const { live, options } = parseProbeArguments(args);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    if (!live) return await runProbe(options, { environment: "mocked", signal: controller.signal, open: () => scriptedProbe(options) });
    if (process.env.NODE_DEBUG || process.env.NODE_DEBUG_NATIVE) throw new Error("Disable runtime debug logging before live execution.");
    // No key read, ws module load or socket creation is reachable without the explicit validated --live branch.
    const { readProbeKey, openLiveProbe } = await import("./lib/realtime-probe-live.ts");
    const key = await readProbeKey();
    return await runProbe(options, { environment: "live", signal: controller.signal, open: () => openLiveProbe(options, key) });
  } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await probeMain(process.argv.slice(2));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = report.outcome === "PASS" ? 0 : 1;
  } catch {
    // Validation/import/key failures may contain arbitrary input; never print the raw error/stack.
    process.stderr.write('{"version":"07d-v1","outcome":"BLOCKED","reason":"preflight_failed","connections":0,"liveResult":"NOT_RUN"}\n');
    process.exitCode = 2;
  }
}
