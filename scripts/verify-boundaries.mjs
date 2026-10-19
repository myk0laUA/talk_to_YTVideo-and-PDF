// Built HTTP routing + existing synthetic repository preload. No real DB/provider.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const directory = path.resolve("artifacts/local/11c");
await mkdir(directory, { recursive: true });
const env = { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "",
  NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_SUPADATA_API_KEY: "",
  NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "", PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false",
  CAPTION_PROOF_ENABLED: "false", PDF_PROOF_ENABLED: "false", YOUTUBE_INGESTION_ENABLED: "false", PDF_INGESTION_ENABLED: "true",
  PDF_INGESTION_LOCAL_HTTP: "true", APP_ORIGIN: "http://127.0.0.1:3125", VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex") };
if (!process.argv.includes("--http-only")) {
  const unit = spawn(process.execPath, ["--conditions=react-server", "--test", "tests/unit/boundaries.test.ts", "tests/unit/proof.test.ts",
    "tests/unit/sources.test.ts", "tests/unit/youtube-sources.test.ts", "tests/unit/context.test.ts"], { env, windowsHide: true, stdio: "inherit" });
  assert.equal(await new Promise(resolve => unit.once("exit", resolve)), 0, "focused boundary units");
}
const available = () => new Promise((resolve, reject) => {
  const probe = net.createServer(); probe.once("error", reject); probe.listen(3125, "127.0.0.1", () => probe.close(resolve));
});
await available();
const report = { startedUtc: new Date().toISOString(), runtime: process.version, buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  context: "local built Next routes, synthetic Prisma only; no provider or real SQL", checks: [], forbiddenNetwork: 0, pdfWorkers: 0 };
const server = spawn(process.execPath, ["--require", path.resolve("tests/pdf/server-observer.cjs"), "--import",
  pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3125"],
{ env, windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
let log = "", sequence = 0;
server.stdout.on("data", data => { log += data; }); server.stderr.on("data", data => { log += data; });
server.on("message", message => { if (message.forbiddenNetwork) report.forbiddenNetwork++; if (message.pdfWorker === "created") report.pdfWorkers++; });
const exited = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));
const ipc = (sourceTestCommand, data = {}) => new Promise((resolve, reject) => {
  const requestId = ++sequence;
  const timer = setTimeout(() => { server.off("message", listener); reject(new Error("IPC deadline")); }, 5000);
  const listener = message => { if (message.sourceTestReply === requestId) { clearTimeout(timer); server.off("message", listener); resolve(message.snapshot); } };
  server.on("message", listener); server.send({ sourceTestCommand, requestId, ...data });
});
const visitor = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const payload = `${randomBytes(32).toString("base64url")}.${expiresAt}`;
  const token = `${payload}.${createHmac("sha256", Buffer.from(env.VISITOR_COOKIE_SECRET, "hex")).update(`visitor-v1:${payload}`).digest("base64url")}`;
  return { cookie: `td-visitor=${token}`, owner: createHash("sha256").update(`source-owner-v1:${token}`).digest("hex"), expiresAt };
};
const send = async (label, route, method, status, headers = {}) => {
  const response = await fetch(env.APP_ORIGIN + route, { method, headers, redirect: "error", signal: AbortSignal.timeout(5000) });
  const body = await response.text();
  const row = { label, route: route.replace(/[a-f0-9-]{36}/g, ":id"), method, status: response.status,
    noStore: response.headers.get("cache-control") === "no-store", allow: response.headers.get("allow"), bytes: Buffer.byteLength(body) };
  report.checks.push(row);
  assert.equal(response.status, status, `${label}: status`);
  assert.ok(row.noStore, `${label}: no-store`);
  assert.doesNotMatch(body, /ownerSessionHash|activeSourceOwner|cookieSecret|postgresql:|extractionStatus|clientSecret|ek_/);
  if (method === "HEAD" || method === "OPTIONS") assert.equal(body, "");
  return body ? JSON.parse(body) : null;
};
try {
  let ready = false;
  for (let i = 0; i < 160; i++) {
    if (server.exitCode !== null) throw new Error("Boundary server exited before ready");
    try { ready = (await fetch(env.APP_ORIGIN, { signal: AbortSignal.timeout(500) })).ok; } catch {}
    if (ready) break; await delay(50);
  }
  assert.ok(ready, "boundary server ready");
  const a = visitor(), b = visitor(), id = randomUUID();
  await ipc("seed", { row: { id, ownerSessionHash: a.owner, activeSourceOwner: a.owner, kind: "PDF", extractionStatus: "READY",
    canonicalOrigin: null, provider: "pdf-parse@2.4.5", title: "Uploaded PDF", fullText: "AUTHORED FIXTURE", sections: [{ id: "page-1", pageNumber: 1, text: "AUTHORED FIXTURE" }],
    pageCount: 1, language: null, characterCount: 16, wordCount: 2, warnings: [], expiresAt: new Date(a.expiresAt * 1000).toISOString() } });
  for (const route of ["/api/proof-source", "/api/realtime/client-secret", "/api/proof-pdf", "/api/proof-captions", "/api/sources/pdf", "/api/sources/youtube", `/api/sources/${id}`]) {
    const resource = route.endsWith(id);
    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const status = method === "OPTIONS" ? 204 : resource && method === "GET" ? 200 : resource && method === "DELETE" ? 403
        : !resource && method === "POST" ? route === "/api/sources/pdf" ? 403 : 503 : 405;
      await send("route method policy", route, method, status, resource ? { cookie: a.cookie } : {});
      if (method === "OPTIONS") assert.deepEqual(new Set(report.checks.at(-1).allow.split(/,\s*/)), new Set(resource ? ["GET", "HEAD", "DELETE", "OPTIONS"] : ["POST", "OPTIONS"]));
    }
  }
  const own = await send("owner allowed absent read Origin", `/api/sources/${id}`, "GET", 200, { cookie: a.cookie });
  assert.ok(own.source.fullText === "AUTHORED FIXTURE"); assert.equal(Date.parse(own.source.expiresAt), a.expiresAt * 1000);
  for (const method of ["GET", "DELETE"]) await send("foreign owner denied", `/api/sources/${id}`, method, 404, { origin: env.APP_ORIGIN, cookie: b.cookie });
  for (const origin of ["https://foreign.invalid", "null", "malformed", env.APP_ORIGIN + "/"]) {
    await send("foreign/null/malformed read Origin", `/api/sources/${id}`, "GET", 403, { origin, cookie: a.cookie });
  }
  await send("hostile read metadata", `/api/sources/${id}`, "GET", 403, { cookie: a.cookie, "sec-fetch-site": "cross-site" });
  await send("owner allowed removal", `/api/sources/${id}`, "DELETE", 200, { origin: env.APP_ORIGIN, cookie: a.cookie });
  await send("stale removed ID denied", `/api/sources/${id}`, "GET", 404, { cookie: a.cookie });
  const snapshot = await ipc("snapshot");
  report.sideEffects = { transactions: snapshot.transactions, creates: snapshot.creates, reads: snapshot.reads, deletes: snapshot.deletes,
    remainingSources: snapshot.uploaded, cacheReads: snapshot.cacheReads, cacheWrites: snapshot.cacheWrites };
  assert.deepEqual(report.sideEffects, { transactions: 6, creates: 0, reads: 6, deletes: 1, remainingSources: 0, cacheReads: 0, cacheWrites: 0 });
  assert.equal(report.pdfWorkers, 0); assert.equal(report.forbiddenNetwork, 0);
  report.passed = true;
} finally {
  server.kill(); report.serverExit = await exited; await available(); report.portRebound = true; report.finishedUtc = new Date().toISOString();
  // No requests/bodies/headers/cookies are logged by the server observer.
  assert.ok(!log.includes(env.VISITOR_COOKIE_SECRET), "server log must omit signing material");
  await writeFile(path.join(directory, "http-boundaries.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(`Boundary HTTP: ${report.checks.length} checks PASS; forbidden network ${report.forbiddenNetwork}; port released`);
