// Explicit, bounded live experiment. Never invoked by tests/build/smoke.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { directCaptionEnvironment } from "./lib/caption-proof-env.ts";

if (process.argv.length !== 3 || process.argv[2] !== "--allow-public-youtube") {
  console.error("Opt in explicitly: npm run proof:captions:local -- --allow-public-youtube");
  process.exit(2);
}
const origin = "http://127.0.0.1:3103";
const evidence = path.resolve("artifacts/local/03a");
await mkdir(evidence, { recursive: true });
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
// Refuse to accidentally talk to a previously running app.
try {
  await fetch(origin, { signal: AbortSignal.timeout(1000) });
  throw new Error("Port 3103 is already occupied");
} catch (error) { if (error.message === "Port 3103 is already occupied") throw error; }

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3103"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: directCaptionEnvironment(process.env, origin, randomBytes(32).toString("hex")),
});
let startupLog = "";
child.stdout.on("data", data => { startupLog += data.toString(); });
child.stderr.on("data", data => { startupLog += data.toString(); });
const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
const report = { startedUtc: new Date().toISOString(), buildId, runtime: process.version,
  provider: "youtube-transcript-plus@2.0.3", context: "local production Next HTTP; real public YouTube; no cache/managed/DB/OpenAI",
  origin, fixtures: [], teardown: null };
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Production app exited during startup");
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error("Production app startup deadline exceeded");
  let cookie;
  for (const fixture of [
    { videoId: "Ks-_Mh1QhMc", label: "Amy Cuddy TED: Your Body Language May Shape Who You Are" },
    { videoId: "dQw4w9WgXcQ", label: "Rick Astley: Never Gonna Give You Up" },
  ]) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${fixture.videoId}`;
    const startedUtc = new Date().toISOString(); const started = performance.now();
    const response = await fetch(origin + "/api/proof-captions", { method: "POST",
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ video: canonicalUrl, language: "en" }), signal: AbortSignal.timeout(15000) });
    cookie = response.headers.get("set-cookie")?.split(";", 1)[0] ?? cookie;
    const dto = await response.json();
    const base = { ...fixture, canonicalUrl, requestedLanguage: "en", startedUtc, endedUtc: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started), httpStatus: response.status, noStore: response.headers.get("cache-control") === "no-store" };
    if (!dto.ok) report.fixtures.push({ ...base, status: "BLOCKED", error: dto.error,
      segmentCount: null, characterCount: null, earliestSeconds: null, latestEndSeconds: null, excerpts: null,
      captionType: "unknown", excerptVerification: "NOT_RUN: extraction failed" });
    else {
      const transcript = dto.transcript; const segments = transcript.segments;
      report.fixtures.push({ ...base, status: "RETRIEVED_REQUIRES_EXCERPT_REVIEW", language: transcript.language,
        captionType: transcript.trackType ?? "unknown", segmentCount: segments.length, characterCount: transcript.fullText.length,
        earliestSeconds: Math.min(...segments.map(s => s.startSeconds)),
        latestEndSeconds: Math.max(...segments.map(s => s.startSeconds + s.durationSeconds)),
        excerpts: [0, Math.floor(segments.length / 2), segments.length - 1].map(index => ({ index,
          startSeconds: segments[index].startSeconds, text: segments[index].text.slice(0, 100) })),
        excerptVerification: "NOT_RUN: compare with original captions before capability PASS" });
    }
  }
} finally {
  child.kill();
  report.teardown = await exited;
  report.endedUtc = new Date().toISOString();
  await writeFile(path.join(evidence, "live-results.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(path.join(evidence, "live-server.log"), startupLog);
}
console.log(JSON.stringify(report, null, 2));
// A negative completed experiment must never appear as a passing caption capability.
if (report.fixtures.some(fixture => fixture.status === "BLOCKED")) process.exitCode = 1;
