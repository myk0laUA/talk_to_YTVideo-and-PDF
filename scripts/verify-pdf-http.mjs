// Built Next HTTP, real synthetic PDFs, no external services. Build/generate first.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3105";
const directory = path.resolve("artifacts/local/04a");
await mkdir(directory, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(directory, "fixtures/manifest.json"), "utf8"));
const fixtures = new Map();
for (const fixture of manifest.fixtures) {
  const bytes = await readFile(path.join(directory, `fixtures/${fixture.name}.pdf`));
  assert.equal(bytes.length, fixture.bytes); assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.sha256);
  fixtures.set(fixture.name, { ...fixture, data: bytes });
}
await new Promise((resolve, reject) => {
  const server = net.createServer(); server.once("error", reject);
  server.listen(3105, "127.0.0.1", () => server.close(resolve));
});
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  runtime: process.version, context: "local production Next HTTP, real parser except explicitly injected lifecycle scenarios; synthetic fixtures; no DB/providers",
  memoryMethod: "server preload samples process.memoryUsage().rss every 10ms, whole server process including worker threads, client excluded; observed peak, not OS hard limit", scenarios: [] };
const boundary = "td04a-http-boundary";
const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.pdf"\r\nContent-Type: application/pdf\r\n\r\n`);
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
const type = `multipart/form-data; boundary=${boundary}`;
const checkStatus = (response, status, code) => {
  assert.equal(response.status, status, JSON.stringify(response.dto)); assert.equal(response.headers["cache-control"], "no-store");
  if (code) assert.equal(response.dto.error?.code, code);
  assert.doesNotMatch(JSON.stringify(response.dto), /cookieSecret|owner|synthetic-password|PRIVATE DUMP/);
};

for (const scenario of ["disabled", "missing-config", "real", "invalid", "admission", "timeout", "disconnect", "upload-timeout", "upload-disconnect"]) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], workerEvents: [], peakRssBytes: 0, forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", path.resolve("tests/pdf/server-observer.cjs"), "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3105"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: "", NEXT_TELEMETRY_DISABLED: "1",
      PDF_INGESTION_ENABLED: "false", APP_ORIGIN: origin, PDF_PROOF_ENABLED: scenario === "disabled" ? "false" : "true", PDF_PROOF_LOCAL_HTTP: "true", PDF_HTTP_SCENARIO: scenario,
      VISITOR_COOKIE_SECRET: scenario === "missing-config" ? "" : randomBytes(32).toString("hex"), NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "",
      PROOF_ENABLED: "false", TEXT_PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", CAPTION_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1" },
  });
  let log = "";
  child.stdout.on("data", data => { log += data; }); child.stderr.on("data", data => { log += data; });
  child.on("message", message => {
    if (message.pdfWorker) item.workerEvents.push({ ...message, receivedMs: Math.round(performance.now()) });
    if (message.rssBytes) item.peakRssBytes = Math.max(item.peakRssBytes, message.rssBytes);
    if (message.forbiddenNetwork) item.forbiddenNetwork++;
  });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  const waitFor = async predicate => {
    for (let i = 0; i < 200; i++) { if (predicate()) return; if (child.exitCode !== null) throw new Error("Server exited"); await delay(20); }
    throw new Error("Lifecycle wait expired");
  };
  // Raw Node HTTP writes enforce chunked transfer when Content-Length is omitted.
  const send = async ({ data = Buffer.alloc(0), headers = {}, chunks = false, hold = false, signal } = {}) => {
    const start = performance.now();
    let req;
    const response = new Promise((resolve, reject) => {
      req = http.request(origin + "/api/proof-pdf", { method: "POST", headers: { origin, ...headers }, signal }, res => {
        const output = []; res.on("data", part => output.push(part)); res.on("end", () => {
          resolve({ status: res.statusCode, headers: res.headers, dto: JSON.parse(Buffer.concat(output).toString()), elapsedMs: Math.round(performance.now() - start) });
        }); res.on("error", reject);
      });
      req.on("error", reject);
    });
    const writing = (async () => {
      if (chunks) {
        for (let at = 0; at < data.length; at += 65536) {
          if (!req.write(data.subarray(at, at + 65536))) await once(req, "drain");
        }
        if (!hold) req.end();
      } else if (hold) req.write(data);
      else req.end(data);
    })();
    // Suppress delayed stream write errors after an intentionally early rejection/abort.
    writing.catch(() => {});
    try { return await response; } finally { req.destroy(); }
  };
  const record = (label, response, extra = {}) => { item.checks.push({ label, status: response.status, code: response.dto.error?.code ?? null,
    noStore: response.headers["cache-control"] === "no-store", elapsedMs: response.elapsedMs, ...extra }); };
  const visitor = async () => {
    const response = await send(); checkStatus(response, 401, "visitor_required");
    return response.headers["set-cookie"][0].split(";", 1)[0];
  };
  const upload = async (name, cookie, contentLength = false) => {
    const fixture = fixtures.get(name); const data = Buffer.concat([prefix, fixture.data, suffix]);
    return send({ data, chunks: !contentLength, headers: { cookie: cookie ?? await visitor(), "content-type": type,
      ...(contentLength ? { "content-length": String(data.length) } : {}) } });
  };
  try {
    let ready = false;
    for (let i = 0; i < 150; i++) {
      try { ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch {}
      if (ready) break; await delay(50);
    }
    assert.ok(ready); item.baselineRssBytes = item.peakRssBytes;
    if (["disabled", "missing-config"].includes(scenario)) {
      const response = await send(); checkStatus(response, 503, "disabled"); record("fails closed before worker", response);
    } else if (scenario === "real") {
      for (const [name, fixture] of fixtures) {
        const response = await upload(name);
        const error = fixture.expectedError;
        checkStatus(response, error === "too_large" ? 413 : error === "wrong_type" ? 415 : error ? 422 : 200, error);
        const extra = { fixture: name, fileBytes: fixture.bytes, sha256: fixture.sha256, transport: "HTTP chunked, no Content-Length" };
        if (!error) {
          const result = response.dto.extraction;
          assert.equal(result.parser, "pdf-parse@2.4.5"); assert.equal(result.fileBytes, fixture.bytes);
          assert.equal(result.pageCount, fixture.expectedPageCount); assert.equal(result.sections.length, result.pageCount);
          assert.equal(result.fullText, result.sections.map(section => section.text).join("\n\n"));
          assert.equal(result.characterCount, result.fullText.length);
          for (let p = 0; p < fixture.expectedPages.length; p++) {
            assert.equal(result.sections[p].pageNumber, p + 1); assert.equal(result.sections[p].id, `page-${p + 1}`);
            if (name === "layout-table") for (const line of fixture.expectedPages[p]) assert.ok(result.sections[p].text.includes(line));
            else assert.equal(result.sections[p].text, fixture.expectedPages[p].join("\n"));
          }
          Object.assign(extra, { pageCount: result.pageCount, characterCount: result.characterCount, fullCoverage: true, warnings: result.warnings });
          await writeFile(path.join(directory, `${name}-extraction.json`), JSON.stringify(result, null, 2) + "\n");
        }
        record(name, response, extra);
      }
      const exact = await upload("exact-25000000", undefined, true); checkStatus(exact, 200); record("exact boundary with correct Content-Length", exact, { fileBytes: 25_000_000 });
      const recovery = await upload("small"); checkStatus(recovery, 200); record("real recovery after unsupported fixtures", recovery);
      assert.equal(item.workerEvents.filter(e => e.pdfWorker === "created").length, fixtures.size);
    } else if (scenario === "invalid") {
      const invalid = [
        ["origin", Buffer.alloc(0), { origin: "https://evil.invalid" }, 403, "forbidden"],
        ["forged cookie", Buffer.alloc(0), { cookie: "td-visitor=forged" }, 401, "visitor_required"],
        ["missing", Buffer.from(`--${boundary}--\r\n`), {}, 400, "invalid_request"],
        ["wrong file media", Buffer.concat([Buffer.from(prefix.toString().replace("application/pdf", "text/plain")), fixtures.get("small").data, suffix]), {}, 415, "wrong_type"],
        ["wrong filename", Buffer.concat([Buffer.from(prefix.toString().replace("synthetic.pdf", "synthetic.txt")), fixtures.get("small").data, suffix]), {}, 415, "wrong_type"],
        ["duplicate file", Buffer.concat([prefix, fixtures.get("small").data, Buffer.from("\r\n"), prefix, fixtures.get("small").data, suffix]), {}, 400, "invalid_request"],
        ["unexpected field", Buffer.from(prefix.toString().replace('name="file"', 'name="other"') + "value" + suffix.toString()), {}, 400, "invalid_request"],
        ["malformed framing", Buffer.from("not multipart"), {}, 400, "invalid_request"],
        ["actual request overflow", Buffer.concat([prefix, Buffer.alloc(25_016_385, 80)]), {}, 413, "too_large"],
      ];
      for (const [label, data, headers, status, code] of invalid) {
        const response = await send({ data, chunks: true, headers: { cookie: await visitor(), "content-type": type, ...headers } });
        checkStatus(response, status, code); record(label, response);
      }
      assert.equal(item.workerEvents.length, 0);
    } else if (scenario === "admission") {
      const cookie = await visitor();
      for (let i = 0; i < 6; i++) { const response = await upload("small", cookie); checkStatus(response, 200); record(`visitor attempt ${i + 1}`, response); }
      const response = await upload("small", cookie); checkStatus(response, 429, "limit_reached"); record("seventh attempt before worker", response);
      assert.equal(item.workerEvents.filter(e => e.pdfWorker === "created").length, 6);
    } else if (["timeout", "disconnect"].includes(scenario)) {
      const cookie = await visitor(); const controller = new AbortController();
      const pending = send({ data: Buffer.concat([prefix, fixtures.get("small").data, suffix]), chunks: true,
        headers: { cookie, "content-type": type }, signal: controller.signal });
      pending.catch(() => {});
      await waitFor(() => item.workerEvents.some(e => e.id === 1 && e.pdfWorker === "online"));
      await delay(100); // worker is intentionally CPU bound
      const busy = await upload("small"); checkStatus(busy, 429, "limit_reached"); record("concurrent parse rejected", busy);
      if (scenario === "disconnect") {
        const cancelledAt = performance.now(); controller.abort(); await assert.rejects(pending);
        await waitFor(() => item.workerEvents.some(e => e.id === 1 && e.pdfWorker === "exit"));
        item.disconnectTerminationMs = Math.round(performance.now() - cancelledAt); assert.ok(item.disconnectTerminationMs < 3000);
      } else { const response = await pending; checkStatus(response, 504, "timeout"); record("injected CPU parse terminated at deadline", response); }
      assert.ok(item.workerEvents.some(e => e.id === 1 && e.pdfWorker === "exit"));
      const response = await upload("small", cookie); checkStatus(response, 200); record("real parse after terminated CPU worker", response);
    } else {
      const cookie = await visitor(); const controller = new AbortController();
      const pending = send({ data: prefix, hold: true, headers: { cookie, "content-type": type }, signal: controller.signal }); pending.catch(() => {});
      await delay(100);
      if (scenario === "upload-disconnect") { controller.abort(); await assert.rejects(pending); await delay(100); }
      else { const response = await pending; checkStatus(response, 504, "timeout"); record("30 second stalled upload timeout", response); }
      assert.equal(item.workerEvents.length, 0);
      const response = await upload("small", cookie); checkStatus(response, 200); record("recovery after stalled/disconnected upload", response);
    }
    await delay(30);
    const created = item.workerEvents.filter(e => e.pdfWorker === "created").length;
    const stopped = item.workerEvents.filter(e => e.pdfWorker === "exit").length;
    assert.equal(stopped, created, "every worker terminated"); assert.equal(item.forbiddenNetwork, 0);
    item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.message; throw error; }
  finally {
    child.kill(); item.teardown = await exited; item.endedUtc = new Date().toISOString();
    await writeFile(path.join(directory, `http-${scenario}-server.log`), log);
    report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, "http-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, status: item.status, checks: item.checks.length, peakRssMiB: +(item.peakRssBytes / 1048576).toFixed(1), teardown: item.teardown }));
}
await new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject); server.listen(3105, "127.0.0.1", () => server.close(resolve)); });
console.log(JSON.stringify({ buildId: report.buildId, status: "PASS", port3105Released: true }));
