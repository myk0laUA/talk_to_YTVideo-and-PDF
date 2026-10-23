// Task11D: real unchanged built app, authored fixtures, no private .env or external traffic.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, cp, symlink, access } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { createVisitor } from "../src/server/proof/visitor.ts";
import { captionRecord, sourceDto } from "../src/server/sources/service.ts";
import { captionFixture } from "../tests/context/fixtures.ts";
import { captureVisible, stopSession, removeSource } from "../tests/source-preview/evidence.mjs";

const root = process.cwd(), directory = path.resolve("artifacts/local/11d"), runtime = path.join(directory, "runtime");
const negative = process.argv.includes("--fail-delete"), label = negative ? "negative" : "positive";
const port = 3137, origin = `http://127.0.0.1:${port}`;
await mkdir(runtime, { recursive: true });
const report = { startedUtc: new Date().toISOString(), runtime: process.version, mode: label,
  buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), cases: [], forbiddenNetwork: 0, outcome: "RUNNING" };
assert.equal(process.version, "v24.22.0");
const baseline = JSON.parse(await readFile("artifacts/local/03h-continuation/baseline.json", "utf8"));
const mismatches = [];
for (const [file, hash] of Object.entries(baseline.productFiles)) {
  if (createHash("sha256").update(await readFile(file)).digest("hex") !== hash) mismatches.push(file);
}
assert.deepEqual(mismatches, [], "unchanged verified build inputs");
assert.equal(report.buildId, baseline.build);
report.verifiedProductInputs = Object.keys(baseline.productFiles).length;
// A .env-free runtime with the existing verified build; no rebuilding or copying private configuration.
let copiedBuild;
try { copiedBuild = (await readFile(path.join(runtime, ".next/BUILD_ID"), "utf8")).trim(); } catch {}
if (!copiedBuild) await cp(path.join(root, ".next"), path.join(runtime, ".next"), { recursive: true });
else assert.equal(copiedBuild, report.buildId, "isolated runtime build identity");
await cp(path.join(root, "package.json"), path.join(runtime, "package.json"));
try { await access(path.join(root, "public")); await cp(path.join(root, "public"), path.join(runtime, "public"), { recursive: true }); }
catch (error) { if (error.code !== "ENOENT") throw error; }
try { await access(path.join(runtime, "node_modules")); } catch { await symlink(path.join(root, "node_modules"), path.join(runtime, "node_modules"), "junction"); }
const available = () => new Promise((resolve, reject) => { const p = net.createServer(); p.once("error", reject); p.listen(port, "127.0.0.1", () => p.close(resolve)); });
await available();
const config = { origin, secure: false, cookieSecret: randomBytes(32).toString("hex") };
const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
  NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: origin, VISITOR_COOKIE_SECRET: config.cookieSecret,
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", OWNED_SOURCE_TEXT_ENABLED: "true",
  OPENAI_API_KEY: "sk-synthetic10d-no-live-contact", PDF_INGESTION_ENABLED: "true", PDF_INGESTION_LOCAL_HTTP: "true",
  YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_LOCAL_HTTP: "true", YOUTUBE_INGESTION_PROVIDER: "direct" };
const server = spawn(process.execPath, ["--require", path.resolve("tests/text-relay/network.cjs"), "--import",
  pathToFileURL(path.resolve("tests/source-preview/provider.mjs")).href, path.resolve("node_modules/next/dist/bin/next"),
  "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: runtime, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
let log = "", seq = 0, browser;
server.stdout.on("data", b => { log += b; }); server.stderr.on("data", b => { log += b; });
server.on("message", m => { if (m.textTestForbidden) report.forbiddenNetwork++; });
const exited = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));
const ipc = (textTestCommand, data = {}) => new Promise((resolve, reject) => {
  const requestId = ++seq, timer = setTimeout(() => { server.off("message", listener); reject(new Error("IPC timeout")); }, 5000);
  const listener = m => { if (m.textTestReply === requestId) { clearTimeout(timer); server.off("message", listener); resolve(m.snapshot); } };
  server.on("message", listener); server.send({ textTestCommand, requestId, ...data });
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { ready = (await fetch(origin)).ok; } catch {} if (ready) break; await delay(100); }
  assert.ok(ready, "server ready");
  browser = await chromium.launch();
  for (const width of negative ? [390] : [1440, 390]) {
    assert.equal((await ipc("snapshot")).active, 0, "previous case stopped before next");
    const visitor = createVisitor(config, Date.now());
    const segments = Array.from({ length: 428 }, (_, i) => ({ text: `Caption ${i + 1}: Kopshti ka lule të verdha. هذه جملة تجريبية واضحة في نهاية النص. Café 雪 🌱.`, startSeconds: i * 2.5, durationSeconds: 2.5 }));
    segments[427].text += " FINAL-428 — Fundi i tekstit. نهاية النص.";
    const fixture = { ...captionFixture, language: "sq", segments, fullText: segments.map(s => s.text).join("\n") };
    const row = captionRecord(fixture, visitor);
    await ipc("seed", { row });
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
    const result = { width, segmentCount: segments.length, characterCount: fixture.fullText.length, screenshots: {}, removal: {} };
    report.cases.push(result);
    try {
      await context.addCookies([{ name: "td-visitor", value: visitor.token, url: origin, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      await context.route("**/*", route => { if (new URL(route.request().url()).origin === origin) return route.continue(); report.forbiddenNetwork++; return route.abort(); });
      await page.route("**/api/sources/youtube", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, source: sourceDto(row) }) }));
      await page.goto(origin);
      await page.getByLabel("YouTube URL", { exact: true }).fill(fixture.canonicalUrl);
      await page.getByRole("button", { name: "Import YouTube video", exact: true }).click();
      await page.getByRole("button", { name: "Inspect extracted text", exact: true }).click();
      const texts = page.locator("#source-text .page-text");
      assert.deepEqual(await texts.allTextContents(), segments.map(s => s.text));
      result.domParity = true;
      // Replay original one-shot targeting first, before any corrective screenshot helper.
      await texts.last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(directory, `${label}-${width}-before-end.png`) });
      result.originalEndGeometry = await texts.last().boundingBox();
      await delay(150);
      result.settledEndGeometry = await texts.last().boundingBox();
      result.settledEndRendered = await texts.last().evaluate(e => e.checkVisibility({ contentVisibilityAuto: true }));
      await page.screenshot({ path: path.join(directory, `${label}-${width}-settled-end.png`) });
      await page.keyboard.press("Control+Home");
      for (const [name, index] of [["begin", 0], ["middle", 214], ["end", 427]]) {
        // Ordinary wheel scrolling, without forcing skipped descendants into layout.
        for (let step = 0; step < 220; step++) {
          const box = await texts.nth(index).boundingBox();
          if (box && box.y >= 0 && box.y + box.height < 850) break;
          await page.mouse.wheel(0, box?.y < 0 ? -600 : 600);
          await delay(25);
        }
        await expect(texts.nth(index)).toBeInViewport();
        assert.ok(await texts.nth(index).evaluate(e => e.checkVisibility({ contentVisibilityAuto: true })), "ordinary wheel target rendered before capture helper");
        result.screenshots[name] = await captureVisible(page, texts.nth(index), path.join(directory, `${label}-${width}-${name}.png`));
      }
      assert.deepEqual(await texts.allTextContents(), segments.map(s => s.text));
      await page.getByRole("button", { name: "Close text and return", exact: true }).last().click();
      await expect(page.getByRole("button", { name: "Inspect extracted text", exact: true })).toBeFocused();
      result.returnToConversation = true;
      await page.getByRole("button", { name: "Start text session", exact: true }).click();
      await page.getByText("Ready for your question.", { exact: true }).waitFor();
      await ipc("scenario", { scenario: "success", answerDelay: 2000 });
      result.answers = [];
      for (let n = 0; n < 2; n++) {
        await page.getByLabel("Your question", { exact: true }).fill(`Offline synthetic question ${n}`);
        await page.getByRole("button", { name: "Send question", exact: true }).click();
        const answers = page.locator(".transcript-turn").filter({ has: page.getByRole("heading", { name: "Assistant", exact: true }) });
        await expect(answers).toHaveCount(n + 1);
        const answer = answers.last(), text = answer.locator(".transcript-text");
        await expect(text).not.toBeEmpty();
        const partial = await captureVisible(page, text, path.join(directory, `${label}-${width}-answer-${n}-stream.png`));
        await page.getByText("Ready for your question.", { exact: true }).waitFor();
        await answer.getByText("Answer completion details", { exact: true }).click();
        await expect(answer.locator("details")).toHaveAttribute("open", "");
        const terminal = await answer.locator("details").innerText();
        assert.match(terminal, n === 0 ? /Output tokens: 12; audio: 0; text: 12/ : /Output tokens: unavailable/);
        await captureVisible(page, answer, path.join(directory, `${label}-${width}-answer-${n}-complete.png`));
        result.answers.push({ partial, terminal, text: await text.innerText(), usage: n === 0 ? "injected 12 output tokens" : "unknown" });
      }
      await ipc("scenario", { scenario: "success", answerDelay: 10000 });
      await page.getByLabel("Your question", { exact: true }).fill("Stop this synthetic partial answer");
      await page.getByRole("button", { name: "Send question", exact: true }).click();
      const lastAnswer = page.locator(".transcript-turn").filter({ has: page.getByRole("heading", { name: "Assistant", exact: true }) }).last();
      await expect(page.locator(".transcript-turn")).toHaveCount(6);
      await expect(lastAnswer.locator(".transcript-text")).not.toBeEmpty();
      result.partialBeforeStop = await captureVisible(page, lastAnswer, path.join(directory, `${label}-${width}-partial-before-stop.png`));
      result.stop = await stopSession(page, () => ipc("snapshot"));
      await expect(lastAnswer.getByText("Text unfinished when the conversation stopped.", { exact: true })).toBeVisible();
      assert.equal(result.stop.resources.timers, 0);
      assert.equal(result.stop.resources.listeners, 0);
      await captureVisible(page, page.locator(".transcript-turn").last(), path.join(directory, `${label}-${width}-retained.png`));
      if (negative) await page.route(`**/api/sources/${row.id}`, route => route.request().method() === "DELETE"
        ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "STORAGE_UNAVAILABLE", message: "Injected fixture delete failure" } }) }) : route.continue());
      await removeSource(page, row.id, result.removal);
      result.outcome = "PASS";
    } catch (error) { result.outcome = "FAIL"; result.error = error.message; throw error; }
    finally { await context.close(); result.contextClosed = true; result.finalResources = await ipc("snapshot"); }
  }
  assert.equal(report.forbiddenNetwork, 0);
  assert.equal((await ipc("snapshot")).sourceRows, 0);
  report.outcome = "PASS";
} catch (error) { report.outcome = "FAIL"; report.error = error.message; process.exitCode = 1; }
finally {
  try {
    if (browser) { await browser.close(); report.browserClosed = !browser.isConnected(); }
    report.finalResources = await ipc("snapshot");
    assert.equal(report.finalResources.active, 0);
    assert.equal(report.finalResources.timers, 0);
    assert.equal(report.finalResources.listeners, 0);
  } catch (error) { report.teardownError = error.message; report.outcome = "FAIL"; process.exitCode = 1; }
  finally {
    server.kill("SIGTERM"); report.serverExit = await exited;
    try { await available(); report.portReleased = true; }
    catch (error) { report.portError = error.message; report.outcome = "FAIL"; process.exitCode = 1; }
    report.endedUtc = new Date().toISOString();
    await writeFile(path.join(directory, `${label}-server.log`), log);
    await writeFile(path.join(directory, `${label}-report.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ outcome: report.outcome, error: report.error, cases: report.cases.length, build: report.buildId, forbiddenNetwork: report.forbiddenNetwork, portReleased: report.portReleased }));
  }
}
