// Real built handlers/adapters/DTOs + actual PDF workers; synthetic upstream and Prisma.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const directory = path.resolve("artifacts/local/12e/regression/05b");
await mkdir(directory, { recursive: true });
const available = () => new Promise((resolve, reject) => {
  const probe = net.createServer(); probe.once("error", reject);
  probe.listen(3109, "127.0.0.1", () => probe.close(resolve));
});
await available();
const report = { startedUtc: new Date().toISOString(), runtime: process.version, buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  context: "Local production Chromium; mocked browser error/order cases; integrated actual routes/direct adapter/DTO/PDF parser, synthetic upstream and Prisma. No PostgreSQL/provider access.",
  upstream: [], workers: [], forbiddenNetwork: 0, exit: null };
const server = spawn(process.execPath, ["--require", path.resolve("tests/pdf/server-observer.cjs"),
  "--require", path.resolve("tests/sources/youtube-upstream.cjs"),
  "--import", pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href,
  "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3109"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: "http://127.0.0.1:3109",
    VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"), NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
    YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_LOCAL_HTTP: "true", YOUTUBE_INGESTION_PROVIDER: "direct",
    YOUTUBE_CAPTION_CACHE_BYPASS: "true", // Keep forced direct-adapter/error journeys uncached.
    PDF_INGESTION_ENABLED: "true", PDF_INGESTION_LOCAL_HTTP: "true", PDF_HTTP_SCENARIO: "real", PDF_PROOF_ENABLED: "false",
    PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "false",
    OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "" },
});
let log = "";
server.stdout.on("data", value => { log += value; }); server.stderr.on("data", value => { log += value; });
server.on("message", value => {
  if (value.pdfWorker) report.workers.push(value);
  if (value.captionUpstream) report.upstream.push(value.captionUpstream);
  if (value.forbiddenNetwork) report.forbiddenNetwork++;
});
const serverExit = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));
try {
  let ready = false;
  for (let i = 0; i < 180; i++) {
    try { ready = (await fetch("http://127.0.0.1:3109", { signal: AbortSignal.timeout(500) })).ok; } catch {}
    if (ready) break; await delay(50);
  }
  assert.ok(ready, "production server ready");
  const browser = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--max-failures=3", "--config", "playwright.youtube-ui.config.ts"], {
    windowsHide: true, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" },
  });
  report.exit = await new Promise(resolve => browser.once("exit", resolve));
  assert.equal(report.exit, 0, "browser suite passed");
  assert.equal(report.forbiddenNetwork, 0, "zero external server fetch attempts");
  for (const stage of ["watch", "youtubei/v1/player", "api/timedtext"]) assert.equal(report.upstream.filter(s => s === stage).length, 6, `exactly six synthetic ${stage} calls; no duplicate extraction/fallback`);
  assert.equal(report.workers.filter(w => w.pdfWorker === "created").length, 3);
  assert.equal(report.workers.filter(w => w.pdfWorker === "exit").length, 3);
} finally {
  server.kill("SIGTERM"); report.serverExit = await serverExit;
  await available(); report.portReleased = true; report.endedUtc = new Date().toISOString();
  await writeFile(path.join(directory, "server.log"), log);
  await writeFile(path.join(directory, "integration-boundaries.json"), JSON.stringify(report, null, 2));
}
