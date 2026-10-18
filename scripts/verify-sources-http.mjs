// Real built Next routes + real PDF workers; test-only Prisma repository/transactions.
// No database/provider network or application mock selectors. Build/generate fixtures first.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3106";
const directory = path.resolve("artifacts/local/04b");
await mkdir(directory, { recursive: true });
const fixtureDir = path.resolve("artifacts/local/04a/fixtures");
const manifest = JSON.parse(await readFile(path.join(fixtureDir, "manifest.json"), "utf8"));
const fixtures = new Map();
for (const fixture of manifest.fixtures) {
  const bytes = await readFile(path.join(fixtureDir, `${fixture.name}.pdf`));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.sha256);
  fixtures.set(fixture.name, { ...fixture, data: bytes });
}
const report = { startedUtc: new Date().toISOString(), runtime: process.version,
  buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  context: "local built Next HTTP; actual PDF parsing; mocked Prisma repository/atomic transactions, NOT PostgreSQL; no providers", scenarios: [] };
const available = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once("error", reject); server.listen(3106, "127.0.0.1", () => server.close(resolve));
});
await available();
const boundary = "td04b-http";
const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.pdf"\r\nContent-Type: application/pdf\r\n\r\n`);
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
const contentType = `multipart/form-data; boundary=${boundary}`;
const fixtureBody = name => Buffer.concat([prefix, fixtures.get(name).data, suffix]);

for (const scenario of ["disabled", "missing-config", "real", "failures", "expiry", "shared-admission"]) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], workerEvents: [], forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const secret = randomBytes(32).toString("hex");
  const child = spawn(process.execPath, ["--require", path.resolve("tests/pdf/server-observer.cjs"),
    "--import", pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href,
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3106"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: origin,
      VISITOR_COOKIE_SECRET: scenario === "missing-config" ? "" : secret, NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
      YOUTUBE_INGESTION_ENABLED: "false", PDF_INGESTION_ENABLED: scenario === "disabled" ? "false" : "true", PDF_INGESTION_LOCAL_HTTP: "true",
      PDF_PROOF_ENABLED: scenario === "shared-admission" ? "true" : "false", PDF_PROOF_LOCAL_HTTP: "true", PDF_HTTP_SCENARIO: "real",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "false",
      OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "" },
  });
  let log = "", nextId = 0;
  child.stdout.on("data", data => { log += data; }); child.stderr.on("data", data => { log += data; });
  child.on("message", message => { if (message.pdfWorker) item.workerEvents.push(message); if (message.forbiddenNetwork) item.forbiddenNetwork++; });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  const command = (sourceTestCommand, data = {}) => new Promise((resolve, reject) => {
    const requestId = ++nextId;
    const timer = setTimeout(() => { child.off("message", listener); reject(new Error("Test IPC deadline")); }, 5000);
    const listener = message => { if (message.sourceTestReply === requestId) { clearTimeout(timer); child.off("message", listener); resolve(message.snapshot); } };
    child.on("message", listener); child.send({ sourceTestCommand, requestId, ...data });
  });
  const signedVisitor = (seconds = Math.floor(Date.now() / 1000) + 3600) => {
    const payload = `${randomBytes(32).toString("base64url")}.${seconds}`;
    const signature = createHmac("sha256", Buffer.from(secret, "hex")).update(`visitor-v1:${payload}`).digest("base64url");
    const token = `${payload}.${signature}`;
    return { cookie: `td-visitor=${token}`, owner: createHash("sha256").update(`source-owner-v1:${token}`).digest("hex"), expiresAt: seconds * 1000 };
  };
  const send = async (pathname, { method = "GET", cookie, data, headers = {}, hold = false, signal } = {}) => {
    let req; const start = performance.now();
    const response = new Promise((resolve, reject) => {
      req = http.request(origin + pathname, { method, signal, headers: { origin, ...(cookie ? { cookie } : {}), ...headers } }, res => {
        const chunks = []; res.on("data", part => chunks.push(part)); res.on("error", reject);
        res.on("end", () => { try { resolve({ status: res.statusCode, headers: res.headers, dto: JSON.parse(Buffer.concat(chunks).toString()), elapsedMs: Math.round(performance.now() - start) }); } catch (error) { reject(error); } });
      });
      req.on("error", reject);
    });
    if (hold) req.write(data); else req.end(data);
    try { return await response; } finally { req.destroy(); }
  };
  const check = (label, response, status, code) => {
    assert.equal(response.status, status, `${label}: ${JSON.stringify(response.dto)}`);
    assert.equal(response.headers["cache-control"], "no-store");
    if (code) assert.equal(response.dto.error?.code, code);
    assert.doesNotMatch(JSON.stringify(response.dto), /owner|cookieSecret|extractionStatus|providerJobId|PRIVATE|postgresql:/);
    item.checks.push({ label, status: response.status, code: code ?? null, elapsedMs: response.elapsedMs, noStore: true });
    return response.dto.source;
  };
  const upload = (name, visitor, headers = {}) => send("/api/sources/pdf", { method: "POST", cookie: visitor.cookie, data: fixtureBody(name),
    headers: { "content-type": contentType, ...(!headers["content-length"] ? { "transfer-encoding": "chunked" } : {}), ...headers } });
  const get = (id, visitor) => send(`/api/sources/${id}`, { cookie: visitor.cookie });
  const remove = (id, visitor) => send(`/api/sources/${id}`, { method: "DELETE", cookie: visitor.cookie });
  const seed = async (visitor, overrides = {}) => {
    const row = { id: randomUUID(), ownerSessionHash: visitor.owner, activeSourceOwner: visitor.owner, kind: "PDF", extractionStatus: "READY", canonicalOrigin: null,
      provider: "pdf-parse@2.4.5", title: "Uploaded PDF", fullText: "SYNTHETIC SEED", sections: [{ id: "page-1", pageNumber: 1, text: "SYNTHETIC SEED" }],
      pageCount: 1, characterCount: 14, wordCount: 2, warnings: [], expiresAt: new Date(visitor.expiresAt).toISOString(), ...overrides };
    await command("seed", { row }); return row.id;
  };
  try {
    let ready = false;
    for (let i = 0; i < 180; i++) { try { ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch {} if (ready) break; await delay(50); }
    assert.ok(ready);
    if (["disabled", "missing-config"].includes(scenario)) {
      for (const [pathname, method] of [["/api/sources/pdf", "POST"], [`/api/sources/${randomUUID()}`, "GET"], [`/api/sources/${randomUUID()}`, "DELETE"]]) {
        check(`${method} closed before parser/DB`, await send(pathname, { method }), 503, "disabled");
      }
      assert.equal((await command("snapshot")).transactions, 0); assert.equal(item.workerEvents.length, 0);
    } else if (scenario === "real") {
      const handshake = await send("/api/sources/pdf", { method: "POST" }); check("visitor before body", handshake, 401, "visitor_required");
      const a = signedVisitor(), b = signedVisitor();
      const proofId = await seed(a, { activeSourceOwner: null, provider: "synthetic-proof-02a-v1" });
      const first = check("upload A committed metadata", await upload("small", a), 201);
      assert.equal(first.fullText, undefined); assert.ok((await command("snapshot")).ids.includes(first.id));
      const other = check("upload B", await upload("small", b), 201);
      const read = check("owned complete GET", await get(first.id, a), 200);
      assert.equal(read.expiresAt, first.expiresAt); assert.equal(Date.parse(read.expiresAt), a.expiresAt);
      assert.equal(read.fullText, read.sections.map(s => s.text).join("\n\n"));
      for (const id of [first.id, randomUUID(), proofId, "invalid-id"]) {
        check("foreign/unknown/synthetic/invalid GET", await get(id, b), 404, "unavailable");
        check("foreign/unknown/synthetic/invalid DELETE", await remove(id, b), 404, "unavailable");
      }
      const replacement = check("A replacement", await upload("multi", a), 201);
      const content = check("multi-page complete GET", await get(replacement.id, a), 200);
      const fixture = fixtures.get("multi"); let lines = 0;
      for (let p = 0; p < fixture.expectedPages.length; p++) {
        assert.equal(content.sections[p].text, fixture.expectedPages[p].join("\n")); lines += fixture.expectedPages[p].length;
      }
      assert.equal(lines, 384); item.multiPageLines = lines; assert.equal(content.pageCount, 12);
      check("old ID unavailable", await get(first.id, a), 404, "unavailable");
      const snapshot = await command("snapshot"); assert.ok(snapshot.ids.includes(proofId)); assert.ok(snapshot.ids.includes(other.id)); assert.equal(snapshot.uploaded, 2);
      check("authorized delete", await remove(replacement.id, a), 200);
      check("repeat delete", await remove(replacement.id, a), 404, "unavailable");
      for (const fixed of [false, true]) {
        const v = signedVisitor(); const body = fixtureBody("exact-25000000");
        const metadata = check(`exact 25MB ${fixed ? "fixed-length" : "chunked"}`, await upload("exact-25000000", v, fixed ? { "content-length": String(body.length) } : {}), 201);
        const complete = check("exact boundary stored text", await get(metadata.id, v), 200);
        assert.equal(complete.sections[0].text, fixtures.get("exact-25000000").expectedPages[0].join("\n"));
        check("exact boundary delete", await remove(metadata.id, v), 200);
      }
    } else if (scenario === "failures") {
      const a = signedVisitor(); const old = check("prior source", await upload("small", a), 201);
      const before = await command("snapshot");
      for (const [label, options, status, code] of [
        ["bad origin", { method: "POST", headers: { origin: "https://evil.invalid" } }, 403, "forbidden"],
        ["forged visitor", { method: "POST", cookie: "td-visitor=forged" }, 401, "visitor_required"],
        ["expired visitor", { method: "POST", cookie: signedVisitor(Math.floor(Date.now() / 1000) - 1).cookie }, 401, "visitor_required"],
      ]) check(label, await send("/api/sources/pdf", options), status, code);
      check("bad DELETE origin", await send(`/api/sources/${old.id}`, { method: "DELETE", cookie: a.cookie, headers: { origin: "https://evil.invalid" } }), 403, "forbidden");
      assert.equal((await command("snapshot")).transactions, before.transactions);
      assert.equal(item.workerEvents.filter(e => e.pdfWorker === "created").length, 1);
      for (const [fixture, status, code] of [["corrupt", 422, "malformed"], ["over-25000001", 413, "too_large"], ["encrypted", 422, "encrypted"], ["image-only", 422, "no_text"]]) {
        check(fixture, await upload(fixture, a), status, code); check("prior survives failed extraction", await get(old.id, a), 200);
      }
      await command("fail-create"); check("DB failure rollback redacted", await upload("small", a), 503, "storage_unavailable");
      check("prior survives failed transaction", await get(old.id, a), 200);
      const expiredVisitor = signedVisitor();
      const expired = await seed(expiredVisitor, { expiresAt: new Date(0).toISOString() });
      check("owned expired source unavailable", await get(expired, expiredVisitor), 404, "unavailable");
      check("recovery after DB failure", await upload("small", signedVisitor()), 201);
    } else if (scenario === "expiry") {
      const a = signedVisitor(Math.floor(Date.now() / 1000) + 3); const old = await seed(a);
      await command("delay-create", { ms: 3100 });
      check("expiry during store rolls back", await upload("small", a), 401, "visitor_required");
      assert.ok((await command("snapshot")).ids.includes(old));
      await command("delay-create", { ms: 0 });
      const b = signedVisitor(Math.floor(Date.now() / 1000) + 2); const id = await seed(b);
      await command("delay-read", { ms: 2100 });
      check("expiry during GET never leaks content", await get(id, b), 401, "visitor_required");
    } else {
      for (const firstPath of ["/api/proof-pdf", "/api/sources/pdf"]) {
        const a = signedVisitor(); const controller = new AbortController();
        const pending = send(firstPath, { method: "POST", cookie: a.cookie, data: prefix, hold: true,
          headers: { "content-type": contentType }, signal: controller.signal }); pending.catch(() => {});
        await delay(150);
        const secondPath = firstPath === "/api/proof-pdf" ? "/api/sources/pdf" : "/api/proof-pdf";
        check("shared admission in both directions", await send(secondPath, { method: "POST", cookie: signedVisitor().cookie,
          data: fixtureBody("small"), headers: { "content-type": contentType } }), 429, "limit_reached");
        controller.abort(); await assert.rejects(pending); await delay(150);
      }
      check("admission released after disconnect", await upload("small", signedVisitor()), 201);
    }
    await delay(50);
    assert.equal(item.forbiddenNetwork, 0);
    assert.equal(item.workerEvents.filter(e => e.pdfWorker === "created").length, item.workerEvents.filter(e => e.pdfWorker === "exit").length);
    item.repository = await command("snapshot"); item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.message; throw error; }
  finally {
    child.kill(); item.teardown = await exited; item.endedUtc = new Date().toISOString(); report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, `http-${scenario}-server.log`), log);
    await writeFile(path.join(directory, "http-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, status: item.status, checks: item.checks.length, teardown: item.teardown }));
}
await available(); report.port3106Released = true;
await writeFile(path.join(directory, "http-results.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ buildId: report.buildId, status: "PASS", port3106Released: true }));
