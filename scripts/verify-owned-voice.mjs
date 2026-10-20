// Dedicated isolated production-route harness. Fake provider + synthetic Prisma, no real keys/SQL/media.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { createVisitor, visitorCookie } from "../src/server/proof/visitor.ts";
import { uploadedRecord, captionRecord, sourceDto } from "../src/server/sources/service.ts";
import { pdfFixture, captionFixture } from "../tests/context/fixtures.ts";

const directory = path.resolve("artifacts/local/02d"); await mkdir(directory, { recursive: true });
const port = 3128, origin = `http://127.0.0.1:${port}`;
const report = { startedUtc: new Date().toISOString(), runtime: process.version, buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  context: "local production Next routes/Chromium; synthetic Prisma/fake client-secret transport via preload; no live provider, database, RTC, media or phone",
  checks: [], groups: [], forbiddenNetwork: 0 };
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push({ name, pass: true }); };
const available = () => new Promise((resolve, reject) => { const p = net.createServer(); p.once("error", reject); p.listen(port, "127.0.0.1", () => p.close(resolve)); });
const wait = async (fn, timeoutMs = 5000) => { const end = Date.now() + timeoutMs; while (Date.now() < end) { if (await fn()) return; await delay(10); } assert.fail("condition deadline"); };
await available(); let browser;
try {
  browser = await chromium.launch();
  for (const group of ["flow", "denials", "races", "limits"]) {
    const config = { origin, secure: false, cookieSecret: randomBytes(32).toString("hex") };
    const env = { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: origin,
      VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic",
      OWNED_SOURCE_VOICE_ENABLED: "true", OWNED_SOURCE_TEXT_ENABLED: "false", OPENAI_API_KEY: "sk-synthetic02d-no-live-contact",
      SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "", PDF_INGESTION_ENABLED: "true", PDF_INGESTION_LOCAL_HTTP: "true",
      YOUTUBE_INGESTION_ENABLED: "false", PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false",
      PDF_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "false" };
    const server = spawn(process.execPath, ["--require", path.resolve("tests/text-relay/network.cjs"), "--import", pathToFileURL(path.resolve("tests/owned-voice/server.mjs")).href,
      "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let log = "", sequence = 0; server.stdout.on("data", b => { log += b; }); server.stderr.on("data", b => { log += b; });
    server.on("message", m => { if (m.textTestForbidden) report.forbiddenNetwork++; });
    const exited = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));
    const ipc = (voiceTestCommand, data = {}) => new Promise((resolve, reject) => {
      const requestId = ++sequence, timer = setTimeout(() => { server.off("message", listener); reject(new Error("IPC deadline")); }, 5000);
      const listener = m => { if (m.voiceTestReply === requestId) { clearTimeout(timer); server.off("message", listener); resolve(m.snapshot); } };
      server.on("message", listener); server.send({ voiceTestCommand, requestId, ...data });
    });
    const seed = async (kind = "PDF", expiry) => {
      const visitor = createVisitor(config, Date.now()), row = kind === "PDF" ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
      if (expiry) row.expiresAt = new Date(Date.now() + expiry);
      await ipc("seed", { row }); return { visitor, row, requestId: randomUUID(), cookie: visitorCookie(visitor, config, Date.now()).split(";", 1)[0] };
    };
    const post = async (route, f, input, status, overrides = {}) => {
      const response = await fetch(origin + "/api/voice-preparations" + route, { method: "POST", headers: { origin, cookie: f?.cookie ?? "", "content-type": "application/json", ...overrides }, body: JSON.stringify(input) });
      check(`${group} ${route || "prepare"} ${status}`, response.status, status); check("no-store", response.headers.get("cache-control"), "no-store");
      const raw = await response.text();
      check("safe response projection", ![config.cookieSecret, env.OPENAI_API_KEY, f?.visitor?.owner ?? "impossible-marker", "ownerSessionHash", "activeSourceOwner", "PRIVATE02D_UPSTREAM_BODY"].some(s => raw.includes(s)));
      if (status >= 400) check("errors contain no credential", !raw.includes("ek_"));
      return JSON.parse(raw);
    };
    const prepare = (f, status = 201) => post("", f, { sourceId: f.row.id, requestId: f.requestId }, status);
    const credential = (f, p, status = 200) => post("/credential", f, { sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId }, status);
    try {
      await wait(async () => { try { return (await fetch(origin, { signal: AbortSignal.timeout(300) })).ok; } catch { return false; } });
      if (group === "flow") {
        for (const kind of ["PDF", "YOUTUBE"]) {
          const f = await seed(kind), p = await prepare(f), before = await ipc("snapshot");
          check(`${kind} no acquisition during preparation`, before.calls, kind === "PDF" ? 0 : 1);
          check(`${kind} structuredB`, p.input.variant.id, "B");
          check(`${kind} full source reconstruction`, p.input.variant.source.sections.map(s => s.text).join(p.input.variant.source.separator), f.row.fullText);
          check("preparation not conversation readiness", p.conversationReady, false);
          const result = await credential(f, p); check("minimal credential DTO", Object.keys(result).sort(), ["clientSecret", "expiresAt", "preparationId"]);
          await credential(f, p, 404); check("exactly one acquisition", (await ipc("snapshot")).calls, before.calls + 1);
        }
        const f = await seed(), other = await seed(), before = await ipc("snapshot");
        await post("", other, { sourceId: f.row.id, requestId: other.requestId }, 404);
        check("foreign source does not acquire provider", (await ipc("snapshot")).calls, before.calls);
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        try {
          await context.addCookies([{ name: "td-visitor", value: f.visitor.token, url: origin, httpOnly: true, sameSite: "Strict" }]);
          const page = await context.newPage(); let external = 0;
          await page.route("**/*", route => { if (new URL(route.request().url()).origin === origin) return route.continue(); external++; return route.abort(); });
          await page.addInitScript(() => { window.__media02d = 0; const block = () => { window.__media02d++; throw new Error("Media forbidden"); };
            Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: block } }); window.RTCPeerConnection = block; window.WebSocket = block; window.Audio = block; });
          await page.route("**/api/sources/pdf", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, source: sourceDto(f.row) }) }));
          await page.goto(origin);
          const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "Upload a PDF", exact: true }).click();
          await (await chooser).setFiles({ name: "Synthetic02D.pdf", mimeType: "application/pdf", buffer: Buffer.from("seeded-source-only") });
          await page.getByRole("button", { name: "Inspect extracted text", exact: true }).waitFor();
          await page.getByRole("button", { name: "Voice mode", exact: true }).click();
          const disabled = await page.getByRole("button", { name: /Start/ }).isDisabled(); check("ordinary Voice Start remains unavailable with source and new gate on", disabled);
          check("ordinary Voice native media calls", await page.evaluate(() => window.__media02d), 0); check("browser external requests", external, 0);
          await page.screenshot({ path: path.join(directory, "ordinary-voice-disabled.png"), fullPage: true });
          // Dedicated harness uses same-origin browser fetches; no adapter or browser credential storage is installed.
          const result = await page.evaluate(async ({ sourceId, requestId }) => {
            const send = async (suffix, body) => { const r = await fetch("/api/voice-preparations" + suffix, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
              return { status: r.status, cache: r.headers.get("cache-control"), data: await r.json() }; };
            const p = await send("", { sourceId, requestId }); const c = await send("/credential", { sourceId, requestId, preparationId: p.data.preparationId });
            return { prepareStatus: p.status, credentialStatus: c.status, cache: c.cache, credentialShape: Object.keys(c.data).sort() };
          }, { sourceId: f.row.id, requestId: randomUUID() });
          check("dedicated browser harness owned route success", result, { prepareStatus: 201, credentialStatus: 200, cache: "no-store", credentialShape: ["clientSecret", "expiresAt", "preparationId"] });
          const denied = await page.evaluate(async sourceId => { const r = await fetch("/api/voice-preparations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId, requestId: crypto.randomUUID() }) }); return r.status; }, other.row.id);
          check("dedicated browser harness foreign denial", denied, 404); check("browser success plus denial acquisition count", (await ipc("snapshot")).calls, before.calls + 1);
        } finally { await context.close(); }
      }
      if (group === "denials") {
        for (const route of ["", "/credential"]) for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
          const r = await fetch(origin + "/api/voice-preparations" + route, { method });
          check(`${route} ${method} method denial`, r.status, 405); check("method denial no-store", r.headers.get("cache-control"), "no-store"); await r.body?.cancel();
        }
        for (const [field, value] of [["OWNED_SOURCE_VOICE_ENABLED", "false"], ["OPENAI_API_KEY", ""], ["VISITOR_COOKIE_SECRET", ""], ["DATABASE_URL", ""], ["PDF_INGESTION_ENABLED", "false"]]) {
          const f = await seed(); await ipc("gate", { field, value }); await prepare(f, 503); await ipc("gate", { field, value: env[field] });
        }
        const f = await seed();
        await post("", null, {}, 401); await post("", { cookie: "td-visitor=forged" }, {}, 401);
        await post("", f, {}, 403, { origin: "http://foreign.example" }); await post("", f, {}, 403, { "sec-fetch-site": "cross-site" });
        for (const input of [{}, { sourceId: f.row.id, requestId: "bad" }, { sourceId: f.row.id, requestId: f.requestId, model: "other" }, { x: "x".repeat(513) }]) await post("", f, input, 400);
        check("all prerequisite/invalid requests provider count", (await ipc("snapshot")).calls, 0);
        const p = await prepare(f), other = await seed();
        await post("/credential", other, { sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId }, 404);
        await post("/credential", f, { sourceId: randomUUID(), requestId: f.requestId, preparationId: p.preparationId }, 404);
        await credential(f, p); await prepare(f, 409);
        for (const scenario of ["error", "malformed", "unsafe", "expired"]) {
          const f = await seed(); await ipc("scenario", { scenario }); const p = await prepare(f); const before = await ipc("snapshot");
          await credential(f, p, 404); await credential(f, p, 404); check(`${scenario} no retries`, (await ipc("snapshot")).calls, before.calls + 1);
        }
      }
      if (group === "races") {
        for (const kind of ["delete", "content", "expiry", "normal-remove", "cancel", "deadline"]) {
          await ipc("scenario", { scenario: "hold" }); const f = await seed(), p = await prepare(f), before = await ipc("snapshot");
          const abort = new AbortController();
          const pending = fetch(origin + "/api/voice-preparations/credential", { method: "POST", headers: { origin, cookie: f.cookie, "content-type": "application/json" }, signal: abort.signal,
            body: JSON.stringify({ sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId }) }).catch(() => null);
          await wait(async () => (await ipc("snapshot")).calls === before.calls + 1);
          if (["delete", "content", "expiry"].includes(kind)) await ipc("change", { id: f.row.id, kind });
          if (kind === "normal-remove") { const r = await fetch(origin + "/api/sources/" + f.row.id, { method: "DELETE", headers: { origin, cookie: f.cookie } }); check("actual DELETE invalidates ticket", r.status, 200); }
          if (kind === "cancel") abort.abort();
          if (kind === "deadline") await wait(async () => (await ipc("snapshot")).aborts > before.aborts, 10_000); // Actual provider's fixed8s deadline.
          await ipc("release"); const r = await pending;
          if (kind === "cancel") check("caller cancellation has no credential response", r, null);
          else { check(`${kind} stale credential suppressed`, r.status, 404); check("race failure no-store", r.headers.get("cache-control"), "no-store"); check("race failure has no secret", !(await r.text()).includes("ek_")); }
          await wait(async () => (await ipc("snapshot")).registry.pendingMints === 0);
          check(`${kind} entries/timers cleaned`, (await ipc("snapshot")).registry.entries, 0);
          await credential(f, p, 404);
        }
        check("unabortable late body cancelled", (await ipc("snapshot")).lateBodiesCancelled >= 1);
      }
      if (group === "limits") {
        await ipc("scenario", { scenario: "hold" }); const fixtures = [];
        for (let i = 0; i < 3; i++) { const f = await seed(); fixtures.push({ f, p: await prepare(f) }); }
        const pending = fixtures.slice(0, 2).map(({ f, p }) => credential(f, p));
        await wait(async () => (await ipc("snapshot")).calls === 2);
        await credential(fixtures[2].f, fixtures[2].p, 429); check("concurrent provider acquisition bound2", (await ipc("snapshot")).calls, 2);
        await ipc("release"); await Promise.all(pending); await ipc("scenario", { scenario: "success" });
        // Same visitor can mint at most3 times/window; previous count1, so exactly2 more.
        const f = fixtures[0].f;
        for (let i = 0; i < 2; i++) { f.requestId = randomUUID(); await credential(f, await prepare(f)); }
        f.requestId = randomUUID(); await credential(f, await prepare(f), 429);
        check("visitor issuance exhausted without extra upstream", (await ipc("snapshot")).calls, 4);
      }
      await wait(async () => (await ipc("snapshot")).registry.pendingMints === 0);
      const final = await ipc("snapshot");
      check(`${group} all entries released`, final.registry.entries, 0); check(`${group} all timers released`, final.registry.timers, 0);
      report.groups.push({ group, ...final });
    } finally {
      server.kill(); await exited; await available();
      for (const secret of [env.OPENAI_API_KEY, config.cookieSecret, "ek_fake02d", "PRIVATE02D_UPSTREAM_BODY"]) assert.equal(log.includes(secret), false, "server log secret scan");
      await writeFile(path.join(directory, `${group}-server.log`), log);
    }
  }
  const scan = async directory => { for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name); if (entry.isDirectory()) await scan(file);
    else if (file.endsWith(".js")) { const raw = await readFile(file, "utf8");
      for (const marker of ["sk-synthetic02d", "ek_fake02d", "ownedVoiceRegistry02d", "owned-voice-safety-v1", "PRIVATE02D_UPSTREAM_BODY"]) check("client bundle server/key marker absent", !raw.includes(marker)); }
  } }; await scan(".next/static");
  check("external network attempts", report.forbiddenNetwork, 0); report.finishedUtc = new Date().toISOString();
} finally {
  await browser?.close(); await available(); await writeFile(path.join(directory, "built-http.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ checks: report.checks.length, groups: report.groups.length, buildId: report.buildId, forbiddenNetwork: report.forbiddenNetwork, report: path.join(directory, "built-http.json") }));
