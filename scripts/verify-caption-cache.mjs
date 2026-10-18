// Built production routes + real cache/source adapters. ONLY upstream and Prisma are synthetic.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const origin = "http://127.0.0.1:3110", directory = path.resolve("artifacts/local/06a"), videoId = "Cache06a001";
const texts = [" FIRST synthetic marker ", "MIDDLE synthetic marker", "LAST synthetic marker"];
const segments = texts.map((text, i) => ({ id: `segment-${i + 1}`, text,
  startSeconds: [1.2505, 25, 50.125][i], durationSeconds: [0.500125, 0, 3.75][i] }));
await mkdir(directory, { recursive: true });
const available = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once("error", reject); server.listen(3110, "127.0.0.1", () => server.close(resolve));
});
await available();
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runtime: process.version,
  context: "Local built HTTP and Chromium390px; actual route/cache/source/adapters, synthetic upstream/Prisma; no real SQL/provider/device", scenarios: [] };
for (const scenario of ["browser-ownership", "cache-io", "source-io-expiry", "provenance-bypass"]) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], upstream: [], forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", path.resolve("tests/sources/youtube-upstream.cjs"),
    "--import", pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href,
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3110"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: "", NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: origin, VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"),
      NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
      YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_PROVIDER: scenario === "provenance-bypass" ? "supadata" : "direct",
      YOUTUBE_INGESTION_LOCAL_HTTP: "true", YOUTUBE_CAPTION_CACHE_BYPASS: "false", PDF_INGESTION_ENABLED: "false", PDF_PROOF_ENABLED: "false",
      CAPTION_PROOF_ENABLED: "true", CAPTION_PROOF_LOCAL_HTTP: "true", CAPTION_PROOF_PROVIDER: "direct",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SCRAPECREATORS_API_KEY: "",
      SUPADATA_API_KEY: scenario === "provenance-bypass" ? "synthetic-03c-key" : "" },
  });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  let log = "", requestId = 0, browser;
  child.stdout.on("data", value => { log += value; }); child.stderr.on("data", value => { log += value; });
  child.on("message", message => { if (message.captionUpstream) item.upstream.push(message.captionUpstream); if (message.forbiddenNetwork) item.forbiddenNetwork++; });
  const ipc = (command, data = {}) => new Promise((resolve, reject) => {
    const id = ++requestId, timer = setTimeout(() => { child.off("message", listener); reject(new Error("IPC deadline")); }, 5000);
    const listener = message => { if (message.sourceTestReply === id) { clearTimeout(timer); child.off("message", listener); resolve(message.snapshot); } };
    child.on("message", listener); child.send({ sourceTestCommand: command, requestId: id, ...data });
  });
  const check = (label, condition) => { assert.ok(condition, label); item.checks.push(label); };
  const send = async (token, route = "/api/sources/youtube", body = { video: videoId, language: "en" }, method = "POST") => {
    const r = await fetch(origin + route, { method, signal: AbortSignal.timeout(20000), headers: { origin, cookie: token, "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    const value = await r.json(); assert.equal(r.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(JSON.stringify(value), /PRIVATE|owner|postgresql|providerMetadata|cacheBypass|synthetic-03c-key/);
    return { status: r.status, value, cookie: r.headers.get("set-cookie")?.split(";", 1)[0] };
  };
  const bootstrap = async () => { const r = await send(""); check("401 bootstrap before IO", r.status === 401); return r.cookie; };
  const get = (token, id) => send(token, `/api/sources/${id}`, undefined, "GET");
  const imported = async token => { const r = await send(token); assert.equal(r.status, 201, JSON.stringify(r.value)); return r.value.source; };
  const failed = async token => { const r = await send(token); check("authored storage failure", r.status === 503 && r.value.error.code === "storage_unavailable"); };
  const complete = async (token, source) => { const r = await get(token, source.id); assert.equal(r.status, 200);
    assert.equal(r.value.source.fullText, texts.join("\n")); assert.deepEqual(r.value.source.sections, segments);
    assert.equal(r.value.source.expiresAt, source.expiresAt); check("complete text/all ordered fractional segments/expiry", true); };
  try {
    let ready = false;
    for (let i = 0; i < 160; i++) { try { ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch {}
      if (ready) break; if (child.exitCode !== null) throw new Error("Server exited"); await delay(50); }
    assert.ok(ready);
    if (scenario === "browser-ownership") {
      browser = await chromium.launch({ headless: true });
      const contexts = await Promise.all([browser.newContext({ viewport: { width: 390, height: 844 } }), browser.newContext({ viewport: { width: 390, height: 844 } })]);
      const errors = [], pages = await Promise.all(contexts.map(context => context.newPage()));
      let browserExternal = 0;
      for (const context of contexts) await context.route("**/*", route => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        browserExternal++; return route.abort();
      });
      const ui = async (page, label) => {
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(origin);
        const created = page.waitForResponse(r => r.url().endsWith("/api/sources/youtube") && r.status() === 201);
        await page.getByRole("textbox", { name: "YouTube URL" }).fill(`https://youtu.be/${videoId}`);
        await page.getByRole("button", { name: "Import YouTube video", exact: true }).click();
        const source = (await (await created).json()).source;
        await expect(page.getByRole("status")).toContainText("YouTube captions ready");
        await page.getByRole("button", { name: "Inspect extracted text" }).click();
        assert.deepEqual(await page.locator(".page-text").allTextContents(), texts);
        for (let i = 0; i < 3; i++) await expect(page.locator(`#source-segment-${i + 1}`)).toBeVisible();
        await page.screenshot({ path: path.join(directory, `${label}.png`), fullPage: true });
        await page.locator("#source-segment-3").scrollIntoViewIfNeeded();
        await expect(page.locator("#source-segment-3 .page-text")).toBeInViewport();
        await expect.poll(() => page.locator("#source-segment-3 .page-text").evaluate(el => el.checkVisibility({ contentVisibilityAuto: true }))).toBe(true);
        await page.screenshot({ path: path.join(directory, `${label}-final.png`) });
        check(`${label} complete browser preview/no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        return source;
      };
      const first = await ui(pages[0], "visitor-a"); await delay(1100);
      const before = await ipc("snapshot"), second = await ui(pages[1], "visitor-b-cache-hit"), after = await ipc("snapshot");
      for (const [context, source] of [[contexts[0], first], [contexts[1], second]]) {
        assert.match(source.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
        const cookie = (await context.cookies()).find(cookie => cookie.name === "td-visitor");
        assert.equal(source.expiresAt, new Date(Number(cookie.value.split(".")[1]) * 1000).toISOString());
      }
      check("fresh UUID and requesting visitor expiry", first.id !== second.id && first.expiresAt !== second.expiresAt);
      check("one extraction across two browsers", item.upstream.length === 3);
      check("hit does not renew cache expiry/write", after.cacheWrites === 1 && JSON.stringify(before.cacheExpiries) === JSON.stringify(after.cacheExpiries));
      for (const [from, target] of [[contexts[0], second], [contexts[1], first]]) {
        check("foreign GET denied", (await from.request.get(`${origin}/api/sources/${target.id}`)).status() === 404);
        check("foreign DELETE denied", (await from.request.delete(`${origin}/api/sources/${target.id}`, { headers: { origin } })).status() === 404);
      }
      const replacement = await contexts[0].request.post(origin + "/api/sources/youtube", { headers: { origin }, data: { video: videoId } });
      assert.equal(replacement.status(), 201); const third = (await replacement.json()).source;
      check("replacement UUID distinct", third.id !== first.id && third.id !== second.id);
      check("replacement removes only owned previous ID", (await contexts[0].request.get(`${origin}/api/sources/${first.id}`)).status() === 404);
      check("other visitor source survives replacement", (await contexts[1].request.get(`${origin}/api/sources/${second.id}`)).status() === 200);
      await pages[1].getByRole("button", { name: "Close text and return" }).first().click();
      await pages[1].getByRole("button", { name: "Remove", exact: true }).click();
      await pages[1].getByRole("button", { name: "Confirm remove" }).click();
      await expect(pages[1].getByRole("status")).toContainText("Source removed or already unavailable");
      check("removed source unavailable", (await contexts[1].request.get(`${origin}/api/sources/${second.id}`)).status() === 404);
      check("other visitor/cache survive removal", (await contexts[0].request.get(`${origin}/api/sources/${third.id}`)).status() === 200 && (await ipc("snapshot")).cacheRows === 1);
      await contexts[0].request.delete(`${origin}/api/sources/${third.id}`, { headers: { origin } });
      check("all owned sources removed, cache retained", (await ipc("snapshot")).uploaded === 0 && (await ipc("snapshot")).cacheRows === 1);
      const reads = (await ipc("snapshot")).cacheReads;
      for (let i = 0; i < 2; i++) {
        const r = await contexts[0].request.post(origin + "/api/proof-captions", { headers: { origin }, data: { video: videoId } }); assert.equal(r.status(), 200);
      }
      check("proof remains uncached", item.upstream.length === 9 && (await ipc("snapshot")).cacheReads === reads);
      // Four combined admissions for A: initial import, replacement, two proofs. A hit cannot bypass quota.
      const limited = await contexts[0].request.post(origin + "/api/sources/youtube", { headers: { origin }, data: { video: videoId } });
      check("cached import obeys shared proof/import quota", limited.status() === 429 && item.upstream.length === 9 && (await ipc("snapshot")).cacheReads === reads);
      check("no browser JS errors", errors.length === 0);
      check("zero external browser requests", browserExternal === 0);
    } else if (scenario === "cache-io") {
      const a = await bootstrap(), prior = await imported(a); await ipc("expire-cache");
      await ipc("fail-cache-read"); const count = item.upstream.length; await failed(a);
      check("read error causes zero extra extraction", item.upstream.length === count); await complete(a, prior);
      await ipc("fail-cache-write"); await failed(a);
      check("write error has exactly one extraction/no fallback", item.upstream.length === count + 3); await complete(a, prior);
      const b = await bootstrap(), fresh = await imported(b); await complete(b, fresh);
      await ipc("fail-create"); const calls = item.upstream.length; await failed(a); await complete(a, prior);
      check("hit Source failure does not extract/retry", item.upstream.length === calls);
    } else if (scenario === "source-io-expiry") {
      const a = await bootstrap(); await ipc("fail-create"); await failed(a);
      check("miss Source failure populates only public cache", (await ipc("snapshot")).cacheRows === 1 && (await ipc("snapshot")).uploaded === 0 && item.upstream.length === 3);
      const source = await imported(a); await complete(a, source); check("next request uses saved public cache", item.upstream.length === 3);
      await ipc("expire-cache"); const again = await imported(a); await complete(a, again);
      check("expired row extracts exactly once", item.upstream.length === 6);
      check("replacement/source expiry independent of TTL", source.id !== again.id && source.expiresAt === again.expiresAt);
    } else {
      const a = await bootstrap(), first = await imported(a); await complete(a, first);
      check("managed origin recorded", first.provider === "supadata" && JSON.stringify(item.upstream) === '["supadata"]');
      await ipc("configure-cache", { provider: "direct" });
      const b = await bootstrap(), second = await imported(b); await complete(b, second);
      check("cache preserves managed provenance under configured direct", second.provider === "supadata" && item.upstream.length === 1);
      const state = await ipc("snapshot"); await ipc("configure-cache", { bypass: true });
      for (let i = 0; i < 2; i++) { const source = await imported(b); check("forced bypass runs direct", source.provider === "youtube-transcript-plus@2.0.3"); }
      const after = await ipc("snapshot");
      check("bypass reads/writes absent", after.cacheReads === state.cacheReads && after.cacheWrites === state.cacheWrites);
      check("exact forced extraction count, zero fallback", JSON.stringify(item.upstream) === JSON.stringify(["supadata", "watch", "youtubei/v1/player", "api/timedtext", "watch", "youtubei/v1/player", "api/timedtext"]));
    }
    check("zero external server fetch attempts", item.forbiddenNetwork === 0);
    item.repository = await ipc("snapshot"); item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.message; throw error; }
  finally {
    await browser?.close(); child.kill("SIGTERM"); item.teardown = await exited; await available(); item.portReleased = true;
    item.endedUtc = new Date().toISOString(); report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, `${scenario}-server.log`), log);
    await writeFile(path.join(directory, "cache-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, checks: item.checks.length, upstream: item.upstream, status: item.status }));
}
console.log(JSON.stringify({ buildId: report.buildId, scenarios: report.scenarios.length, checks: report.scenarios.reduce((n, s) => n + s.checks.length, 0), status: "PASS" }));
