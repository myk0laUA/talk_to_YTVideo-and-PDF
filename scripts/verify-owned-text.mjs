// Built Next HTTP + browser vertical slice. Provider and Prisma are injected by explicit preloads only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { createVisitor, visitorCookie } from "../src/server/proof/visitor.ts";
import { uploadedRecord, captionRecord, sourceDto } from "../src/server/sources/service.ts";
import { pdfFixture, captionFixture } from "../tests/context/fixtures.ts";

const directory = path.resolve(process.env.OWNED_TEXT_EVIDENCE_DIRECTORY ?? "artifacts/local/10d"); await mkdir(directory, { recursive: true });
const port = 3126, origin = `http://127.0.0.1:${port}`;
const report = { startedUtc: new Date().toISOString(), runtime: process.version, buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  environment: "local built Next routes/UI/HTTP proxy/server lifecycle/real WS adapter; injected fake ws and synthetic Prisma; no real keys/DB/provider/phone", checks: [], groups: [], forbiddenNetwork: 0 };
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push({ name, pass: true }); };
const available = () => new Promise((resolve, reject) => { const p = net.createServer(); p.once("error", reject); p.listen(port, "127.0.0.1", () => p.close(resolve)); });
const wait = async predicate => { for (let i = 0; i < 250; i++) { if (await predicate()) return; await delay(10); } assert.fail("condition deadline"); };
await available();
let browser;
try {
  browser = await chromium.launch();
  for (const group of ["flow", "denials", "cleanup", "browser-recovery", "obsolete-mini", "obsolete-invalid"]) {
    const config = { origin, secure: false, cookieSecret: randomBytes(32).toString("hex") };
    const env = { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: origin,
      VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic",
      OWNED_SOURCE_TEXT_ENABLED: "true", OPENAI_API_KEY: "sk-synthetic10d-no-live-contact", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "",
      // Obsolete settings must never affect the fixed production default.
      ...(group.startsWith("obsolete-") ? { OWNED_TEXT_MODEL_ROUTING_ENABLED: group === "obsolete-mini" ? "true" : "invalid",
        OWNED_TEXT_MODEL_ROUTING_CUTOFF: group === "obsolete-mini" ? "1000000" : "invalid" } : {}),
      PDF_INGESTION_ENABLED: "true", PDF_INGESTION_LOCAL_HTTP: "true", YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_LOCAL_HTTP: "true", YOUTUBE_INGESTION_PROVIDER: "direct",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", PDF_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "false" };
    if (!group.startsWith("obsolete-")) { delete env.OWNED_TEXT_MODEL_ROUTING_ENABLED; delete env.OWNED_TEXT_MODEL_ROUTING_CUTOFF; }
    const server = spawn(process.execPath, ["--require", path.resolve("tests/text-relay/network.cjs"), "--import", pathToFileURL(path.resolve("tests/text-relay/server.mjs")).href,
      "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let log = "", seq = 0;
    server.stdout.on("data", b => { log += b; }); server.stderr.on("data", b => { log += b; });
    server.on("message", m => { if (m.textTestForbidden) report.forbiddenNetwork++; });
    const exited = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));
    const ipc = (textTestCommand, data = {}) => new Promise((resolve, reject) => {
      const requestId = ++seq, timer = setTimeout(() => { server.off("message", listener); reject(new Error("IPC timeout")); }, 5000);
      const listener = m => { if (m.textTestReply === requestId) { clearTimeout(timer); server.off("message", listener); resolve(m.snapshot); } };
      server.on("message", listener); server.send({ textTestCommand, requestId, ...data });
    });
    const seed = async (kind = "PDF", expiry) => {
      const visitor = createVisitor(config, Date.now()), cookie = visitorCookie(visitor, config, Date.now()).split(";", 1)[0];
      const row = kind === "PDF" ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
      if (expiry) row.expiresAt = new Date(Date.now() + expiry);
      await ipc("seed", { row }); return { visitor, cookie, row, requestId: randomUUID() };
    };
    const post = async (route, f, body, expected = 201, overrides = {}) => {
      const r = await fetch(origin + "/api/text-sessions" + route, { method: "POST", headers: { origin, cookie: f?.cookie ?? "", "content-type": "application/json", ...overrides }, body: JSON.stringify(body), redirect: "error" });
      check(`${group} ${route || "start"} status ${expected}`, r.status, expected);
      check("no-store", r.headers.get("cache-control"), "no-store");
      const text = await r.text();
      check("no credentials/provider detail leakage", ![config.cookieSecret, env.OPENAI_API_KEY, "PRIVATE10D_PROVIDER_BODY", "ownerSessionHash"].some(v => text.includes(v)));
      return text ? JSON.parse(text) : {};
    };
    const start = async f => (await post("", f, { sourceId: f.row.id, requestId: f.requestId })).sessionId;
    const stop = f => post("/stop", f, { requestId: f.requestId }, 200);
    const stream = async (f, id) => {
      const abort = new AbortController();
      const r = await fetch(`${origin}/api/text-sessions/${id}/stream`, { headers: { cookie: f.cookie }, signal: abort.signal });
      check("owned stream status", r.status, 200); check("stream no-store", r.headers.get("cache-control"), "no-store");
      const reader = r.body.getReader(), snapshots = [];
      const done = (async () => { let pending = ""; const decoder = new TextDecoder();
        try { for (;;) { const { value, done } = await reader.read(); if (done) break; pending += decoder.decode(value); let n;
          while ((n = pending.indexOf("\n")) >= 0) { snapshots.push(JSON.parse(pending.slice(0, n))); pending = pending.slice(n + 1); } } }
        catch (e) { if (!abort.signal.aborted) throw e; }
        finally { reader.releaseLock(); }
      })();
      return { snapshots, done, abort };
    };
    try {
      await wait(async () => { try { return (await fetch(origin, { signal: AbortSignal.timeout(300) })).ok; } catch { return false; } });
      if (group === "flow" || group.startsWith("obsolete-")) {
        for (const kind of ["PDF", "YOUTUBE"]) {
          const f = await seed(kind), id = await start(f), s = await stream(f, id);
          await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
          check(`${kind} source loading excluded from visible transcript`, s.snapshots.at(-1).transcript.turns.length, 0);
          for (let n = 0; n < 2; n++) {
            await post("/question", f, { sessionId: id, questionId: randomUUID(), question: `Synthetic question ${n} 雪\nfollow-up` }, 202);
            await wait(() => s.snapshots.some(x => x.status.phase === "responding" && x.transcript.turns.length === (n + 1) * 2));
            await wait(() => s.snapshots.at(-1)?.status.phase === "ready" && s.snapshots.at(-1)?.transcript.turns.length === (n + 1) * 2);
          }
          await stop(f); await s.done;
          check(`${kind} Stop retains 2 user/2 assistant`, s.snapshots.at(-1).transcript.turns.length, 4);
          check(`${kind} stream ended`, s.snapshots.at(-1).status.phase, "ended");
        }
        if (group === "flow") for (const kind of ["PDF", "YOUTUBE"]) for (const width of [1440, 390]) {
          const f = await seed(kind), context = await browser.newContext({ viewport: { width, height: 900 } });
          await context.addCookies([{ name: "td-visitor", value: f.visitor.token, url: origin, httpOnly: true, sameSite: "Strict" }]);
          const page = await context.newPage(), pageErrors = [];
          page.on("pageerror", e => pageErrors.push(e.message));
          await page.addInitScript(() => {
            window.__media10d = 0;
            const blocked = () => { window.__media10d++; throw new Error("Media forbidden in text"); };
            Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: blocked } }); window.RTCPeerConnection = blocked; window.WebSocket = blocked; window.Audio = blocked;
          });
          await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          // Only acquisition UI is a seeded fixture; saved-ID reads + all new text HTTP routes are real.
          await page.route(`**/api/sources/${kind === "PDF" ? "pdf" : "youtube"}`, route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, source: sourceDto(f.row) }) }));
          await page.goto(origin);
          if (kind === "PDF") {
            const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "Upload a PDF", exact: true }).click();
            await (await chooser).setFiles({ name: "Synthetic10D.pdf", mimeType: "application/pdf", buffer: Buffer.from("seeded-source-acquisition") });
          } else { await page.getByLabel("YouTube URL", { exact: true }).fill("https://www.youtube.com/watch?v=Context07A1"); await page.getByRole("button", { name: "Import YouTube video", exact: true }).click(); }
          await page.getByRole("button", { name: "View source", exact: true }).waitFor();
          await page.getByRole("button", { name: "View source", exact: true }).click();
          check(`${kind}/${width} complete preview`, await page.locator(".source-reader .page-text").allTextContents(), (kind === "PDF" ? f.row.sections : f.row.sections.segments).map(s => s.text || "No extractable text on this page."));
          await page.getByRole("button", { name: "Close text and return", exact: true }).first().click();
          await page.getByRole("button", { name: "Start chat", exact: true }).click();
          await page.getByText("Ready for your question.", { exact: true }).waitFor();
          await ipc("scenario", { scenario: "success", answerDelay: 500 });
          for (let n = 0; n < 2; n++) {
            await page.getByLabel("Your question", { exact: true }).fill(`Browser synthetic question ${n} 雪`);
            await page.getByRole("button", { name: "Send question", exact: true }).click();
            await page.getByText(n === 0 ? "Synthetic10D answer begins" : "Synthetic10D follow-up end", { exact: false }).first().waitFor();
            check(`${kind}/${width}/${n} partial answer streamed`, await page.locator(".transcript-part > .transcript-text").last().textContent(), n === 0 ? "Synthetic10D answer begins" : "Synthetic10D follow-up end");
            await page.getByText("Ready for your question.", { exact: true }).waitFor();
          }
          await page.getByRole("button", { name: "Stop text session", exact: true }).click();
          check(`${kind}/${width} retained rendered answers`, (await page.locator(".transcript").textContent()).includes("Full history retained."));
          check(`${kind}/${width} literal locators retained`, (await page.locator(".transcript").textContent()).includes("[segment-355] [segment-unknown] <script>inert</script>"));
          check(`${kind}/${width} no citation notices`, !/Source references|Source excerpt|text is verified/.test(await page.locator(".transcript").textContent()));
          check(`${kind}/${width} no generated links or executable markup`, await page.locator(".transcript a, .transcript blockquote, .transcript script").count(), 0);
          check(`${kind}/${width} native media/socket APIs untouched`, await page.evaluate(() => window.__media10d), 0);
          check(`${kind}/${width} no page errors`, pageErrors, []);
          check(`${kind}/${width} viewport fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(directory, `${kind.toLowerCase()}-${width}.png`), fullPage: true });
          await page.getByRole("button", { name: "View source", exact: true }).click();
          check(`${kind}/${width} Stop retains full preview`, await page.locator(".source-reader .page-text").allTextContents(), (kind === "PDF" ? f.row.sections : f.row.sections.segments).map(s => s.text || "No extractable text on this page."));
          await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(directory, `${kind.toLowerCase()}-${width}-stopped-preview.png`), fullPage: false });
          await page.getByRole("button", { name: "Close text and return", exact: true }).first().click();
          await page.getByRole("button", { name: "Start a fresh text session", exact: true }).click();
          await page.getByText("Ready for your question.", { exact: true }).waitFor();
          await ipc("scenario", { scenario: "success", answerDelay: 500 });
          await page.getByLabel("Your question", { exact: true }).fill("Pending question before departure");
          await page.getByRole("button", { name: "Send question", exact: true }).click();
          await page.getByText("Answer arriving. You can stop and keep the text received so far.", { exact: true }).waitFor();
          if (width === 1440) {
            await page.getByRole("button", { name: "Voice mode", exact: true }).click();
            await page.getByRole("button", { name: "Text mode", exact: true }).click();
            check(`${kind} mode switch empties transcript`, await page.locator(".transcript-turn").count(), 0);
            check(`${kind} mode switch requires explicit fresh Start`, await page.getByRole("button", { name: "Start chat", exact: true }).isEnabled());
          } else await page.goto(origin); // Real pagehide/unmount, no synthetic event.
          await context.close(); await wait(async () => (await ipc("snapshot")).active === 0);
          await ipc("scenario", { scenario: "success", answerDelay: 100 });
        }
      }
      if (group === "denials") {
        const f = await seed(), other = await seed();
        const off = await ipc("gate", { enabled: false, key: true });
        await post("", f, { sourceId: f.row.id, requestId: randomUUID() }, 503);
        await ipc("gate", { enabled: true, key: false }); await post("", f, { sourceId: f.row.id, requestId: randomUUID() }, 503);
        check("off and missing-key no provider", (await ipc("snapshot")).opens, off.opens);
        await ipc("gate", { enabled: true, key: true });
        await post("", null, {}, 401);
        const expiredVisitor = { cookie: visitorCookie(createVisitor(config, Date.now() - 3600_000), config, Date.now()).split(";", 1)[0] };
        await post("", expiredVisitor, {}, 401);
        await post("", { cookie: "td-visitor=forged" }, {}, 401);
        await post("", f, {}, 403, { origin: "http://evil.example" });
        await post("", f, {}, 403, { "sec-fetch-site": "cross-site" });
        await post("", f, { sourceId: "invalid", requestId: randomUUID() }, 400);
        await post("", f, { sourceId: f.row.id, requestId: "invalid" }, 400);
        await post("", f, { sourceId: f.row.id, requestId: randomUUID(), extra: "x".repeat(9000) }, 400);
        for (const extra of [{ model: "other" }, { policy: {} }, { sourceText: "override" }, { providerEvent: {} }, { owner: other.visitor.owner },
          { inputSize: 1 }, { cutoff: 1000000 }, { calibration: "verified" }])
          await post("", f, { sourceId: f.row.id, requestId: randomUUID(), ...extra }, 400);
        await post("", other, { sourceId: f.row.id, requestId: randomUUID() }, 404);
        const id = await start(f), s = await stream(f, id); await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
        for (const [who, status] of [[other, 404], [null, 401]]) {
          const r = await fetch(`${origin}/api/text-sessions/${id}/stream`, { headers: { cookie: who?.cookie ?? "" } });
          check("stream ownership denial", r.status, status); await r.text();
        }
        const duplicateStream = await fetch(`${origin}/api/text-sessions/${id}/stream`, { headers: { cookie: f.cookie } });
        check("second owned stream refused", duplicateStream.status, 409); await duplicateStream.text();
        const streamOrigin = await fetch(`${origin}/api/text-sessions/${id}/stream`, { headers: { cookie: f.cookie, origin: "http://evil.example" } });
        check("stream origin mismatch denied", streamOrigin.status, 403); await streamOrigin.text();
        await post("/question", other, { sessionId: id, questionId: randomUUID(), question: "cross-owner" }, 404);
        await post("/stop", other, { requestId: f.requestId }, 200); check("foreign Stop cannot close", (await ipc("snapshot")).active, 1);
        await post("", f, { sourceId: f.row.id, requestId: f.requestId }, 409);
        await post("/question", f, { sessionId: id, questionId: randomUUID(), question: "x", model: "other" }, 400);
        await post("/question", f, { sessionId: id, questionId: randomUUID(), question: "x".repeat(1001) }, 400);
        await ipc("scenario", { scenario: "withheld-question" });
        const questionId = randomUUID(); await post("/question", f, { sessionId: id, questionId, question: "once only" }, 202);
        await post("/question", f, { sessionId: id, questionId, question: "replay" }, 409);
        await post("/question", f, { sessionId: id, questionId: randomUUID(), question: "overlap" }, 409);
        check("withheld receipt no generation", (await ipc("snapshot")).responses, 0);
        await ipc("release"); await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
        await post("/question", f, { sessionId: id, questionId, question: "replay after completion" }, 409);
        check("one response only", (await ipc("snapshot")).responses, 1);
        await stop(f); await s.done;
        await post("/question", f, { sessionId: id, questionId: randomUUID(), question: "stale" }, 404);
        await post("", f, { sourceId: f.row.id, requestId: f.requestId }, 409);
        const expired = await seed("PDF", 1); await delay(10); await post("", expired, { sourceId: expired.row.id, requestId: expired.requestId }, 404);
        const removed = await seed(); await ipc("delete", { id: removed.row.id });
        await post("", removed, { sourceId: removed.row.id, requestId: removed.requestId }, 404);
      }
      if (group === "cleanup") {
        for (const scenario of ["withheld-source", "late-acquisition", "disconnect", "removal", "context", "expiry", "explicit-stop"]) {
          const f = await seed("PDF", scenario === "expiry" ? 450 : undefined);
          await ipc("scenario", { scenario: ["withheld-source", "late-acquisition", "context"].includes(scenario) ? scenario : "success", answerDelay: 500 });
          const before = await ipc("snapshot"), id = await start(f), s = await stream(f, id);
          if (scenario === "withheld-source") {
            await wait(async () => (await ipc("snapshot")).sources > before.sources);
            check("withheld source no readiness", !s.snapshots.some(x => x.status.phase === "ready")); await stop(f);
          } else if (scenario === "late-acquisition") { await stop(f); }
          else {
            await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
            if (!["expiry", "explicit-stop"].includes(scenario)) {
              await post("/question", f, { sessionId: id, questionId: randomUUID(), question: "partial synthetic answer" }, 202);
              await wait(() => s.snapshots.at(-1)?.status.phase === "responding");
            }
            if (scenario === "disconnect") s.abort.abort();
            else if (scenario === "removal") { const r = await fetch(`${origin}/api/sources/${f.row.id}`, { method: "DELETE", headers: { origin, cookie: f.cookie } }); check("actual removal", r.status, 200); await r.text(); }
            else if (scenario === "explicit-stop") await stop(f);
          }
          await s.done; await wait(async () => (await ipc("snapshot")).active === 0);
          const after = await ipc("snapshot");
          check(`${scenario} registry emptied`, after.registry.sessions, 0); check(`${scenario} close once`, after.opens - before.opens, after.closes - before.closes);
          check(`${scenario} listeners released`, after.listeners, 0); check(`${scenario} timers released`, after.timers, 0);
          if (scenario === "context") { check("capacity rejection safe category", s.snapshots.at(-1).status.failure, "context_limit"); check("partial answer retained", s.snapshots.at(-1).transcript.turns.at(-1).parts[0].text.length > 0); }
        }
        // Invalidation while source preparation is still asynchronous: no stale session/provider.
        const f = await seed(); await ipc("delay-read", { ms: 100 });
        const before = await ipc("snapshot");
        const pending = fetch(origin + "/api/text-sessions", { method: "POST", headers: { origin, cookie: f.cookie, "content-type": "application/json" }, body: JSON.stringify({ sourceId: f.row.id, requestId: f.requestId }) });
        await delay(20); await post("/stop", f, { requestId: f.requestId }, 200);
        const r = await pending; check("Stop during initial read denies stale Start", r.status, 404); await r.text();
        await ipc("delay-read", { ms: 0 }); check("initial cancellation no acquisition", (await ipc("snapshot")).opens, before.opens);
        await ipc("drain");
        const preparing = await seed(), preparingId = await start(preparing);
        await ipc("delay-read", { ms: 100 });
        const beforePreparation = await ipc("snapshot"), preparingStream = await stream(preparing, preparingId);
        const removal = await fetch(`${origin}/api/sources/${preparing.row.id}`, { method: "DELETE", headers: { origin, cookie: preparing.cookie } });
        check("actual removal during asynchronous preparation", removal.status, 200); await removal.text();
        await preparingStream.done; await ipc("delay-read", { ms: 0 });
        check("removed preparation no provider acquisition", (await ipc("snapshot")).opens, beforePreparation.opens);
      }
      if (group === "browser-recovery") {
        for (const scenario of ["context", "withheld-source", "replacement"]) {
          const f = await seed(), context = await browser.newContext({ viewport: { width: 390, height: 844 } });
          await context.addCookies([{ name: "td-visitor", value: f.visitor.token, url: origin, httpOnly: true, sameSite: "Strict" }]);
          const page = await context.newPage();
          await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          let uploads = 0;
          await page.route("**/api/sources/pdf", async route => {
            uploads++;
            if (uploads > 1) {
              // HTTP remove is real; new source acquisition is injected with a fresh owned UUID.
              const response = await fetch(`${origin}/api/sources/${f.row.id}`, { method: "DELETE", headers: { origin, cookie: f.cookie } });
              check("replacement deletes actual prior source", response.status, 200); await response.text();
              f.row = uploadedRecord(pdfFixture, f.visitor); await ipc("seed", { row: f.row });
            }
            await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, source: sourceDto(f.row) }) });
          });
          const upload = async () => { const loaded = page.waitForResponse(r => /\/api\/sources\/[a-f0-9-]{36}$/.test(r.url()) && r.request().method() === "GET" && r.status() === 200);
            if (uploads && await page.locator("button[aria-haspopup=menu][aria-expanded=false]").count()) await page.getByText("Source actions", { exact: true }).click(); if (uploads && await page.locator(".source-menu button").count()) await page.getByRole("menuitem", { name: "Replace source", exact: true }).click();
            const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: uploads ? "Replace PDF" : "Upload a PDF", exact: true }).click();
            await (await chooser).setFiles({ name: "Synthetic10D.pdf", mimeType: "application/pdf", buffer: Buffer.from("synthetic acquisition") });
            await loaded; await page.getByRole("button", { name: "View source", exact: true }).waitFor(); };
          await ipc("scenario", { scenario: scenario === "replacement" ? "success" : scenario, answerDelay: 200 });
          await page.goto(origin); await upload(); await page.getByRole("button", { name: "Start chat", exact: true }).click();
          if (scenario === "withheld-source") {
            await page.getByText("Loading your source into the conversation. Wait before sending a question.", { exact: true }).waitFor();
            check("composer hidden before complete ACK", await page.locator(".text-composer").isHidden());
            check("composer blocked before complete ACK", await page.getByRole("button", { name: "Send question", exact: true, includeHidden: true }).isDisabled());
            await page.getByRole("button", { name: "Stop text session", exact: true }).click(); await ipc("release");
          } else {
            await page.getByText("Ready for your question.", { exact: true }).waitFor();
            await page.getByLabel("Your question", { exact: true }).fill("Synthetic source question"); await page.getByRole("button", { name: "Send question", exact: true }).click();
            if (scenario === "context") {
              await page.getByText(/The provider rejected this conversation because it exceeds its context limit/).waitFor();
              check("UI capacity error keeps received partial", (await page.locator(".transcript").textContent()).includes("Synthetic10D answer begins"));
              await page.getByRole("button", { name: "View source", exact: true }).click();
              check("UI capacity error complete preview retained", await page.locator(".source-reader .page-text").count(), pdfFixture.pageCount);
              await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(directory, "context-recovery-390.png"), fullPage: false });
            } else {
              await page.getByText("Answer arriving. You can stop and keep the text received so far.", { exact: true }).waitFor(); await upload();
              await wait(async () => await page.locator(".transcript-turn").count() === 0);
              check("replacement clears stale UI turns", await page.locator(".transcript-turn").count(), 0);
            }
          }
          await context.close(); await wait(async () => (await ipc("snapshot")).active === 0);
        }
      }
      await wait(async () => (await ipc("snapshot")).registry.sessions === 0);
      const resources = await ipc("snapshot"); check(`${group} no active providers`, resources.active, 0);
      const expectedModel = "gpt-realtime-2.1";
      check(`${group} selected URL model retained for every session`, resources.models.every(model => model === expectedModel));
      check(`${group} opens equal closes`, resources.opens, resources.closes); check(`${group} detached provider listeners`, resources.listeners, 0);
      report.groups.push({ group, resources });
      check(`${group} no sensitive app log`, ![config.cookieSecret, env.OPENAI_API_KEY, "PRIVATE10D_PROVIDER_BODY"].some(v => log.includes(v)));
    } finally { server.kill(); const exit = await exited; await available(); await writeFile(path.join(directory, `${group}-server.log`), log); report.groups.push({ group, exit, portReleased: true }); }
  }
  // Default shell is covered by smoke; emitted browser chunks must contain no WS/key/fixture code.
  let chunks = 0, traces = 0;
  async function audit(dir, client) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name); if (e.isDirectory()) await audit(p, client);
      else if (client && /\.js$/.test(e.name)) { chunks++; const s = await readFile(p, "utf8"); for (const marker of ["OpenAI-Safety-Identifier", "next/dist/compiled/ws", "OWNED_SOURCE_TEXT_ENABLED", "TextRegistry", "sk-synthetic10d", "Synthetic10D answer", "SyntheticSourceDatabase", "PRIVATE10D_PROVIDER_BODY", "ownerSessionHash"]) check(`client excludes ${marker}`, !s.includes(marker)); }
      else if (!client && e.name.endsWith(".nft.json")) { traces++; const files = JSON.parse(await readFile(p, "utf8")).files; check("production trace excludes tests/scripts/artifacts", files.every(f => !/(?:^|[/\\])(tests|scripts|artifacts)(?:[/\\])/.test(f))); }
    }
  }
  await audit(".next/static", true); await audit(".next/server", false);
  report.bundleAudit = { chunks, traces }; check("no external network", report.forbiddenNetwork, 0); report.passed = true;
} finally { await browser?.close(); report.finishedUtc = new Date().toISOString(); await writeFile(path.join(directory, "integrated-results.json"), JSON.stringify(report, null, 2) + "\n"); }
console.log(`10D integrated HTTP/browser: ${report.checks.length} checks PASS; no live calls`);
