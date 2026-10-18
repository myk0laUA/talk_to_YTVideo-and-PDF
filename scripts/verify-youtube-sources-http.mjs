// Actual built Next HTTP/handlers/adapters + actual PDF parser. Synthetic upstream and Prisma only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3108", directory = path.resolve("artifacts/local/03c");
await mkdir(directory, { recursive: true });
const available = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once("error", reject); server.listen(3108, "127.0.0.1", () => server.close(resolve));
});
await available();
const report = { startedUtc: new Date().toISOString(), runtime: process.version, buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  context: "local built Next HTTP, actual adapters and PDF parser; explicitly synthetic external upstream and Prisma repository; no real provider/database", scenarios: [] };
const pdf = await readFile("artifacts/local/04a/fixtures/small.pdf");
const fullText = " FIRST synthetic marker \nMIDDLE synthetic marker\nLAST synthetic marker";
const id = "dQw4w9WgXcQ";
for (const scenario of ["disabled", "invalid-provider", "missing-key", "direct", "supadata", "youtube-only", "pdf-only", "security", "shared-admission"]) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], upstream: [], workers: [], forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", path.resolve("tests/pdf/server-observer.cjs"),
    "--require", path.resolve("tests/sources/youtube-upstream.cjs"), "--import", pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href,
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3108"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: origin, VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"),
      NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
      YOUTUBE_INGESTION_ENABLED: ["disabled", "pdf-only"].includes(scenario) ? "false" : "true", YOUTUBE_INGESTION_LOCAL_HTTP: "true",
      YOUTUBE_CAPTION_CACHE_BYPASS: "true", // Existing forced-provider regression remains explicitly uncached.
      YOUTUBE_INGESTION_PROVIDER: scenario === "invalid-provider" ? "unknown-provider" : ["supadata", "missing-key"].includes(scenario) ? "supadata" : "direct",
      PDF_INGESTION_ENABLED: ["direct", "supadata", "pdf-only", "shared-admission"].includes(scenario) ? "true" : "false", PDF_INGESTION_LOCAL_HTTP: "true", PDF_PROOF_ENABLED: "false", PDF_HTTP_SCENARIO: "real",
      CAPTION_PROOF_ENABLED: scenario === "shared-admission" ? "true" : "false", CAPTION_PROOF_LOCAL_HTTP: "true", CAPTION_PROOF_PROVIDER: "direct",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SCRAPECREATORS_API_KEY: "",
      SUPADATA_API_KEY: scenario === "missing-key" ? "" : "synthetic-03c-key" },
  });
  let log = "", nextRequest = 0;
  child.stdout.on("data", data => { log += data; }); child.stderr.on("data", data => { log += data; });
  child.on("message", message => { if (message.captionUpstream) item.upstream.push(message.captionUpstream);
    if (message.pdfWorker) item.workers.push(message); if (message.forbiddenNetwork) item.forbiddenNetwork++; });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  const ipc = (field, command, data = {}) => new Promise((resolve, reject) => {
    const requestId = ++nextRequest, reply = field === "sourceTestCommand" ? "sourceTestReply" : "captionTestReply";
    const timer = setTimeout(() => { child.off("message", listener); reject(new Error("IPC deadline")); }, 5000);
    const listener = message => { if (message[reply] === requestId) { clearTimeout(timer); child.off("message", listener); resolve(message.snapshot); } };
    child.on("message", listener); child.send({ [field]: command, requestId, ...data });
  });
  const state = () => ipc("sourceTestCommand", "snapshot");
  const mode = command => ipc("captionTestCommand", command);
  const send = async (route, { method = "GET", token = "", body, headers = {}, signal } = {}) => {
    const response = await fetch(origin + route, { method, body, signal: signal ?? AbortSignal.timeout(20000), redirect: "error",
      headers: { origin, ...(token ? { cookie: token } : {}), ...headers } });
    return { response, value: await response.json() };
  };
  const check = (label, { response, value }, status, code) => {
    assert.equal(response.status, status, `${label}: ${JSON.stringify(value)}`); assert.equal(response.headers.get("cache-control"), "no-store");
    if (code) assert.equal(value.error?.code, code);
    assert.doesNotMatch(JSON.stringify(value), /PRIVATE|owner|cookieSecret|supadataApiKey|synthetic-03c-key|postgresql|extractionStatus|providerJobId/);
    item.checks.push({ label, status, code: code ?? null, noStore: true }); return value.source;
  };
  const yt = (token, body = { video: id, language: "en" }, route = "/api/sources/youtube", extra = {}) => send(route, {
    method: "POST", token, body: JSON.stringify(body), headers: { "content-type": "application/json", ...(extra.headers ?? {}) }, ...extra,
  });
  const bootstrap = async () => {
    const handshake = await yt(""); check("401 visitor before extraction", handshake, 401, "visitor_required");
    const token = handshake.response.headers.get("set-cookie").split(";", 1)[0];
    assert.match(handshake.response.headers.get("set-cookie"), /HttpOnly.*SameSite=Strict/); return token;
  };
  const get = (source, token) => send(`/api/sources/${source}`, { token });
  const remove = (source, token) => send(`/api/sources/${source}`, { method: "DELETE", token });
  const upload = token => { const form = new FormData(); form.append("file", new Blob([pdf], { type: "application/pdf" }), "synthetic.pdf"); return send("/api/sources/pdf", { method: "POST", token, body: form }); };
  const seed = async (token, youtube) => {
    const bearer = token.slice(token.indexOf("=") + 1), owner = createHash("sha256").update(`source-owner-v1:${bearer}`).digest("hex");
    const row = { id: randomUUID(), ownerSessionHash: owner, activeSourceOwner: owner, kind: youtube ? "YOUTUBE" : "PDF", extractionStatus: "READY",
      canonicalOrigin: youtube ? `https://www.youtube.com/watch?v=${id}` : null, provider: youtube ? "supadata" : "pdf-parse@2.4.5",
      title: youtube ? "YouTube captions" : "Uploaded PDF", language: youtube ? "en" : null, fullText: youtube ? fullText : "SAFE PDF",
      sections: youtube ? { videoId: id, segments: [{ id: "segment-1", text: fullText, startSeconds: 1.2505, durationSeconds: 0.500125 }] }
        : [{ id: "page-1", pageNumber: 1, text: "SAFE PDF" }], pageCount: youtube ? null : 1,
      characterCount: youtube ? fullText.length : 8, wordCount: youtube ? fullText.trim().split(/\s+/u).length : 2,
      warnings: [], expiresAt: new Date(Number(bearer.split(".")[1]) * 1000).toISOString() };
    await ipc("sourceTestCommand", "seed", { row }); return row.id;
  };
  try {
    let ready = false;
    for (let i = 0; i < 160; i++) { if (child.exitCode !== null) throw new Error("Server startup failed");
      try { ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch {} if (ready) break; await delay(50); }
    assert.ok(ready);
    for (const route of ["/api/proof-source", "/api/realtime/client-secret"]) {
      const r = await send(route, { method: "POST", body: "{}" }); assert.equal(r.response.status, 503); assert.deepEqual(r.value, { error: "Feature unavailable" });
    }
    if (["disabled", "invalid-provider", "missing-key"].includes(scenario)) {
      check("YouTube gate/config closed", await yt(""), 503, "disabled");
      check("both read paths closed", await get(randomUUID(), ""), 503, "disabled");
      check("both delete paths closed", await remove(randomUUID(), ""), 503, "disabled");
      assert.equal((await state()).transactions, 0); assert.equal(item.upstream.length, 0);
    } else if (scenario === "direct") {
      const a = await bootstrap(), b = await bootstrap(); assert.equal(item.upstream.length, 0);
      const prior = check("PDF prior source", await upload(a), 201);
      const caption = check("PDF to YouTube commit", await yt(a), 201);
      const content = check("complete owned caption GET", await get(caption.id, a), 200);
      assert.equal(content.fullText, fullText); assert.equal(content.segmentCount, 3); assert.equal(content.trackType, "automatic");
      assert.equal(content.sections[0].startSeconds, 1.2505); assert.equal(content.sections[0].durationSeconds, 0.500125);
      assert.equal(content.sections[2].text, "LAST synthetic marker"); assert.equal(content.sections[2].id, "segment-3");
      assert.equal(content.provider, "youtube-transcript-plus@2.0.3"); assert.equal(content.expiresAt, prior.expiresAt);
      check("PDF old ID gone", await get(prior.id, a), 404, "unavailable");
      check("foreign GET", await get(caption.id, b), 404, "unavailable"); check("foreign DELETE", await remove(caption.id, b), 404, "unavailable");
      const other = check("second visitor independent source", await yt(b), 201);
      const pdfAgain = check("YouTube to PDF commit", await upload(a), 201);
      check("old YouTube ID gone", await get(caption.id, a), 404, "unavailable");
      await mode("blocked"); const calls = item.upstream.length;
      check("forced provider failure authored", await yt(a), 502, "blocked"); assert.equal(item.upstream.length, calls + 1, "no retry/fallback");
      check("failed captions preserve PDF", await get(pdfAgain.id, a), 200);
      await mode("success"); await ipc("sourceTestCommand", "fail-create");
      check("transaction failure rolls back", await yt(a), 503, "storage_unavailable"); check("rollback preserves PDF", await get(pdfAgain.id, a), 200);
      const last = check("recovery commit", await yt(a), 201); check("owned DELETE", await remove(last.id, a), 200);
      check("deleted ID unavailable", await get(last.id, a), 404, "unavailable"); check("second visitor preserved", await get(other.id, b), 200);
      assert.equal((await state()).uploaded, 1);
    } else if (scenario === "supadata") {
      const a = await bootstrap(), source = check("managed adapter owned import", await yt(a), 201);
      const content = check("managed full seconds DTO", await get(source.id, a), 200);
      assert.equal(content.fullText, fullText); assert.equal(content.provider, "supadata"); assert.equal(content.language, "en");
      assert.equal(content.sections[0].startSeconds, 1.2505); assert.equal(content.sections[0].durationSeconds, 0.500125); assert.equal(content.trackType, undefined);
      check("managed DELETE", await remove(source.id, a), 200); assert.deepEqual(item.upstream, ["supadata"]);
    } else if (scenario === "youtube-only") {
      const a = await bootstrap(), source = check("YouTube works with PDF off", await yt(a), 201);
      check("YouTube read with PDF off", await get(source.id, a), 200); check("YouTube delete with PDF off", await remove(source.id, a), 200);
      const pdfSource = await seed(a, false); check("stored PDF readable under YouTube config", await get(pdfSource, a), 200);
      check("stored PDF removable under YouTube config", await remove(pdfSource, a), 200); check("PDF import remains off", await upload(a), 503, "disabled");
    } else if (scenario === "pdf-only") {
      const handshake = await upload(""); check("PDF visitor handshake", handshake, 401, "visitor_required");
      const a = handshake.response.headers.get("set-cookie").split(";", 1)[0], source = await seed(a, true);
      check("stored YouTube readable under PDF config", await get(source, a), 200); check("stored YouTube removable under PDF config", await remove(source, a), 200);
      check("YouTube import remains off", await yt(a), 503, "disabled"); assert.equal(item.upstream.length, 0);
    } else if (scenario === "security") {
      const a = await bootstrap();
      check("origin before provider", await yt(a, { video: id }, undefined, { headers: { origin: "https://foreign.invalid", "content-type": "application/json" } }), 403, "forbidden");
      check("fetch metadata", await yt(a, { video: id }, undefined, { headers: { "sec-fetch-site": "cross-site", "content-type": "application/json" } }), 403, "forbidden");
      check("provider override rejected", await yt(a, { video: id, provider: "supadata" }), 400, "invalid_request");
      check("arbitrary URL rejected", await yt(a, { video: "https://evil.invalid" }), 400, "invalid_input");
      check("body bound", await send("/api/sources/youtube", { method: "POST", token: a, body: "x".repeat(513), headers: { "content-type": "application/json" } }), 400, "invalid_request");
      await mode("malformed"); check("empty captions refused", await yt(a), 422, "no_captions"); assert.equal((await state()).transactions, 0);
    } else {
      const a = await bootstrap(), b = await bootstrap();
      for (const firstProof of [true, false]) {
        await mode("hold"); const count = item.upstream.length;
        const first = firstProof ? "/api/proof-captions" : "/api/sources/youtube", second = firstProof ? "/api/sources/youtube" : "/api/proof-captions";
        const pending = yt(a, undefined, first);
        for (let i = 0; i < 100 && item.upstream.length === count; i++) await delay(20);
        assert.equal(item.upstream.length, count + 1);
        check("shared concurrency across real bundled routes", await yt(b, undefined, second), 429, "limit_reached");
        await mode("success"); check("pending route resumes", await pending, firstProof ? 200 : 201);
      }
      check("shared visitor budget 3", await yt(a, undefined, "/api/proof-captions"), 200);
      check("shared visitor budget 4", await yt(a), 201);
      const count = item.upstream.length; check("combined proof plus import quota", await yt(a), 429, "limit_reached"); assert.equal(item.upstream.length, count);
    }
    await delay(50); assert.equal(item.forbiddenNetwork, 0);
    assert.equal(item.workers.filter(e => e.pdfWorker === "created").length, item.workers.filter(e => e.pdfWorker === "exit").length);
    item.repository = await state(); item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.message; throw error; }
  finally {
    child.kill(); item.teardown = await exited; await available(); item.portReleased = true;
    item.endedUtc = new Date().toISOString(); report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, `http-${scenario}-server.log`), log);
    await writeFile(path.join(directory, "youtube-http-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, checks: item.checks.length, status: item.status, portReleased: item.portReleased }));
}
console.log(JSON.stringify({ buildId: report.buildId, scenarios: report.scenarios.length, checks: report.scenarios.reduce((n, s) => n + s.checks.length, 0), status: "PASS" }));
