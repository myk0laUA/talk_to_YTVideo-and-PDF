// Actual production HTTP routes/adapters/repositories; explicit synthetic upstream and Prisma only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const port = 3111, origin = `http://127.0.0.1:${port}`, directory = path.resolve(process.env.VERIFICATION_ROOT ?? "artifacts/local/caption-coalescing"), videoId = "Cache06b001";
const texts = [" FIRST synthetic marker ", "MIDDLE synthetic marker", "LAST synthetic marker"];
const segments = texts.map((text, i) => ({ id: `segment-${i + 1}`, text,
  startSeconds: [1.2505, 25, 50.125][i], durationSeconds: [0.500125, 0, 3.75][i] }));
await mkdir(directory, { recursive: true });
const available = () => new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject);
  server.listen(port, "127.0.0.1", () => server.close(resolve)); });
await available();
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runtime: process.version,
  context: "Local production HTTP/Chromium390px; synthetic upstream/Prisma, no SQL/live provider/physical phone", scenarios: [] };
const scenarios = ["browser-overlap", "cancel-leader", "cancel-follower", "cancel-all", "blocked", "timeout", "cache-write", "cache-read", "source-write", "expiry", "incompatible", "quotas", "proof-bypass"];
for (const scenario of scenarios) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], upstream: [], aborted: [], forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", path.resolve("tests/sources/youtube-upstream.cjs"),
    "--import", pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href,
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: "", NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: origin, VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"),
      NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
      YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_PROVIDER: "direct", YOUTUBE_INGESTION_LOCAL_HTTP: "true", YOUTUBE_CAPTION_CACHE_BYPASS: "false",
      PDF_INGESTION_ENABLED: "false", PDF_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "true", CAPTION_PROOF_LOCAL_HTTP: "true", CAPTION_PROOF_PROVIDER: "direct",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "" },
  });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  let log = "", sequence = 0, browser;
  child.stdout.on("data", value => { log += value; }); child.stderr.on("data", value => { log += value; });
  child.on("message", message => { if (message.captionUpstream) item.upstream.push(message.captionUpstream);
    if (message.captionAbort) item.aborted.push(message.captionAbort); if (message.forbiddenNetwork) item.forbiddenNetwork++; });
  const ipc = (kind, command, data = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => { child.off("message", listener); reject(new Error("IPC deadline")); }, 5000);
    const listener = message => { if (message[`${kind}TestReply`] === id) { clearTimeout(timer); child.off("message", listener); resolve(message.snapshot); } };
    child.on("message", listener); child.send({ [`${kind}TestCommand`]: command, requestId: id, ...data });
  });
  const mode = command => ipc("caption", command), store = (command = "snapshot", data) => ipc("source", command, data);
  const check = (label, condition) => { assert.ok(condition, label); item.checks.push(label); };
  const until = async (predicate, label) => { for (let i = 0; i < 200; i++) { if (await predicate()) return; await delay(10); } throw new Error(label); };
  const request = async (token, { route = "/api/sources/youtube", body = { video: videoId, language: "en" }, method = "POST", signal } = {}) => {
    const r = await fetch(origin + route, { method, signal: signal ?? AbortSignal.timeout(20000), headers: { origin, cookie: token, "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    const value = await r.json(); assert.equal(r.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(JSON.stringify(value), /PRIVATE|owner|postgresql|providerMetadata|cacheBypass|supadataApiKey/);
    return { status: r.status, value, cookie: r.headers.get("set-cookie")?.split(";", 1)[0] };
  };
  const send = (...args) => {
    const pending = request(...args);
    // Held requests can reject during failure teardown. Keep their rejection observable
    // to the assertion that awaits them without masking the original test failure.
    pending.catch(() => {});
    return pending;
  };
  const bootstrap = async () => { const r = await send(""); assert.equal(r.status, 401); return r.cookie; };
  const good = async pending => { const r = await pending; assert.equal(r.status, 201, JSON.stringify(r.value)); return r.value.source; };
  const bad = async (pending, code) => { const r = await pending; assert.equal(r.value.error?.code, code, JSON.stringify(r)); return r; };
  const full = async (token, source) => { const r = await send(token, { route: `/api/sources/${source.id}`, method: "GET" }); assert.equal(r.status, 200);
    assert.equal(r.value.source.fullText, texts.join("\n")); assert.deepEqual(r.value.source.sections, segments); };
  const holdPair = async (a, b) => {
    await mode("hold"); const count = item.upstream.length, pa = send(a); await until(() => item.upstream.length > count, "leader upstream");
    const pb = send(b); await until(async () => (await store()).captionAdmission.participants === 2, "follower admission");
    await delay(40); check("one held extraction, one cache read, two admitted participants", item.upstream.length === count + 1 && (await store()).coordinatorJobs === 1);
    return [pa, pb];
  };
  try {
    await until(async () => { try { return (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch { return false; } }, "server ready");
    if (scenario === "browser-overlap") {
      browser = await chromium.launch({ headless: true });
      const contexts = await Promise.all([browser.newContext({ viewport: { width: 390, height: 844 } }), browser.newContext({ viewport: { width: 390, height: 844 } })]);
      const pages = await Promise.all(contexts.map(c => c.newPage())), errors = []; let external = 0;
      for (const context of contexts) await context.route("**/*", route => { if (new URL(route.request().url()).origin === origin) return route.continue(); external++; return route.abort(); });
      for (const page of pages) { page.on("pageerror", error => errors.push(error.message)); await page.goto(origin); }
      // Bootstrap separately so visitor expiries differ, without spending any import quota.
      for (const context of contexts) { assert.equal((await context.request.post(origin + "/api/sources/youtube", { headers: { origin }, data: { video: videoId } })).status(), 401); await delay(1100); }
      await mode("hold"); const responses = pages.map(page => page.waitForResponse(r => r.url().endsWith("/api/sources/youtube") && r.status() === 201));
      for (const page of pages) { await page.getByRole("textbox", { name: "YouTube URL" }).fill(`https://youtu.be/${videoId}`);
        await page.getByRole("button", { name: "Import YouTube video", exact: true }).click(); }
      await until(async () => (await store()).captionAdmission.participants === 2, "both browser participants");
      await delay(80); check("both browsers overlap one held upstream, no premature Source/cache write", item.upstream.length === 1 && (await store()).creates === 0 && (await store()).cacheWrites === 0);
      await mode("success"); const sources = await Promise.all(responses.map(async r => (await (await r).json()).source));
      assert.notEqual(sources[0].id, sources[1].id); assert.notEqual(sources[0].expiresAt, sources[1].expiresAt);
      for (let i = 0; i < 2; i++) {
        const source = sources[i], page = pages[i]; assert.match(source.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
        const cookie = (await contexts[i].cookies()).find(c => c.name === "td-visitor");
        assert.equal(source.expiresAt, new Date(Number(cookie.value.split(".")[1]) * 1000).toISOString());
        await expect(page.locator(".source-panel > [role=status]")).toContainText("YouTube captions ready");
        await page.getByRole("button", { name: "View source" }).click(); assert.deepEqual(await page.locator(".page-text").allTextContents(), texts);
        await page.screenshot({ path: path.join(directory, `overlap-${i}.png`), fullPage: true });
        const content = await contexts[i].request.get(`${origin}/api/sources/${source.id}`); assert.deepEqual((await content.json()).source.sections, segments);
        check(`browser${i} complete ordered fractional captions/visitor expiry/no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        for (const method of ["get", "delete"]) assert.equal((await contexts[i].request[method](`${origin}/api/sources/${sources[1 - i].id}`, { headers: { origin } })).status(), 404);
      }
      const before = await store(); assert.equal(before.cacheWrites, 1); assert.equal(before.creates, 2); assert.equal(item.upstream.length, 3);
      const replacement = await contexts[0].request.post(origin + "/api/sources/youtube", { headers: { origin }, data: { video: videoId } });
      assert.equal(replacement.status(), 201); const third = (await replacement.json()).source;
      assert.notEqual(third.id, sources[0].id); assert.equal((await contexts[0].request.get(`${origin}/api/sources/${sources[0].id}`)).status(), 404);
      assert.equal((await contexts[1].request.get(`${origin}/api/sources/${sources[1].id}`)).status(), 200);
      await pages[1].getByRole("button", { name: "Close text and return" }).first().click(); await pages[1].getByRole("button", { name: "Source actions", exact: true }).click(); await pages[1].getByRole("menuitem", { name: "Remove source", exact: true }).click();
      await pages[1].getByRole("button", { name: "Confirm remove" }).click(); await expect(pages[1].locator(".source-panel > [role=status]")).toContainText("Source removed or already unavailable");
      assert.equal((await contexts[0].request.get(`${origin}/api/sources/${third.id}`)).status(), 200);
      await contexts[0].request.delete(`${origin}/api/sources/${third.id}`, { headers: { origin } }); const after = await store();
      check("fresh UUID/foreign404/replacement/removal isolation, warm import zero extraction and unchanged TTL", after.uploaded === 0 && after.cacheWrites === 1
        && JSON.stringify(before.cacheExpiries) === JSON.stringify(after.cacheExpiries) && item.upstream.length === 3);
      check("no JS errors/external browser requests/source persistence", errors.length === 0 && external === 0
        && (await Promise.all(pages.map(p => p.evaluate(() => localStorage.length + sessionStorage.length)))).every(n => n === 0));
    } else if (scenario.startsWith("cancel-")) {
      const a = await bootstrap(), b = await bootstrap(), ca = new AbortController(), cb = new AbortController();
      await mode("hold"); const pa = send(a, { signal: ca.signal }).catch(() => ({ disconnected: true }));
      await until(() => item.upstream.length === 1, "held leader"); const pb = send(b, { signal: cb.signal }).catch(() => ({ disconnected: true }));
      await until(async () => (await store()).captionAdmission.participants === 2, "joined follower"); await delay(40);
      if (scenario !== "cancel-follower") ca.abort(); if (scenario !== "cancel-leader") cb.abort();
      const all = scenario === "cancel-all";
      await until(async () => (await store()).captionAdmission.participants === (all ? 0 : 1), "cancel detached");
      check("cancelled callers write no Source", (await store()).creates === 0);
      if (all) {
        await Promise.all([pa, pb]); await until(() => item.aborted.length === 1, "upstream aborted");
        check("all cancel promptly aborts underlying signal and empties map", (await store()).coordinatorJobs === 0);
        await mode("success"); await good(send(a)); check("later permitted retry extracts fresh", item.upstream.length === 4 && (await store()).creates === 1 && (await store()).cacheWrites === 1);
      } else {
        check("surviving caller keeps upstream alive", item.aborted.length === 0 && item.upstream.length === 1);
        await mode("success"); const results = await Promise.all([pa, pb]);
        assert.equal(results[scenario === "cancel-leader" ? 1 : 0].status, 201);
        check("survivor succeeds with one provider/cache write/Source write", item.upstream.length === 3 && (await store()).creates === 1 && (await store()).cacheWrites === 1);
      }
    } else if (["blocked", "timeout", "cache-write", "cache-read", "source-write", "expiry"].includes(scenario)) {
      const a = await bootstrap(), b = await bootstrap();
      const prior = [await good(send(a)), await good(send(b))]; await store("expire-cache"); const baseline = await store(), count = item.upstream.length;
      if (scenario === "cache-read") {
        await store("delay-cache-read", { ms: 250 }); await store("fail-cache-read");
        const pa = send(a), pb = send(b);
        await until(async () => (await store()).captionAdmission.participants === 2, "shared cache read participants");
        await Promise.all([bad(pa, "storage_unavailable"), bad(pb, "storage_unavailable")]); await store("delay-cache-read", { ms: 0 });
        const after = await store();
        check("shared read failure starts zero provider/one cache read and preserves both Sources", item.upstream.length === count
          && after.cacheReads === baseline.cacheReads + 1 && after.creates === baseline.creates && JSON.stringify(after.ids) === JSON.stringify(baseline.ids));
        await full(a, prior[0]); await full(b, prior[1]);
      } else {
        const [pa, pb] = await holdPair(a, b);
        if (scenario === "cache-write") await store("fail-cache-write");
        if (scenario === "source-write") await store("fail-create");
        if (scenario === "expiry") await store("advance-clock", { ms: 3601000 });
        if (scenario !== "timeout") await mode(scenario === "blocked" ? "blocked" : "success");
        if (scenario === "source-write") {
          const results = await Promise.all([pa, pb]); assert.deepEqual(results.map(r => r.status).sort(), [201, 503]);
          const failed = results.findIndex(r => r.status === 503); await full([a, b][failed], prior[failed]);
          check("one Source failure isolated after shared extraction; no provider retry", (await store()).creates === baseline.creates + 2 && item.upstream.length === count + 3);
        } else {
          const code = scenario === "cache-write" ? "storage_unavailable" : scenario === "expiry" ? "visitor_required" : scenario;
          await Promise.all([bad(pa, code), bad(pb, code)]);
          const after = await store(); check("both prior Sources preserved, zero new Source attempts", JSON.stringify(after.ids) === JSON.stringify(baseline.ids) && after.creates === baseline.creates);
          if (scenario !== "expiry") { await full(a, prior[0]); await full(b, prior[1]); }
          check("one failed extraction with no fallback/retry", item.upstream.length === count + (scenario === "blocked" || scenario === "timeout" ? 1 : 3));
        }
      }
      check("failed/settled job removed", (await store()).coordinatorJobs === 0);
      if (scenario !== "expiry") { await mode("success"); const before = item.upstream.length; await good(send(await bootstrap()));
        check("deliberate retry succeeds, Source failure reuses populated cache", item.upstream.length === before + (scenario === "source-write" ? 0 : 3)); }
    } else if (scenario === "incompatible") {
      const a = await bootstrap(), b = await bootstrap(); await mode("hold"); const pending = send(a);
      await until(() => item.upstream.length === 1, "incompatible leader");
      const admission = (await store()).captionAdmission;
      const nonEnglish = await bad(send(b, { body: { video: videoId, language: "fr" } }), "invalid_input");
      assert.equal(nonEnglish.status, 400);
      const rejected = (await store()).captionAdmission;
      assert.equal(rejected.total, admission.total + 1, "Invalid input still consumes a request attempt");
      assert.equal(rejected.participants, admission.participants, "Wrong language cannot join extraction");
      for (const body of [{ video: videoId, language: "en-US" }, { video: "Cache06b002", language: "en" }]) await bad(send(b, { body }), "limit_reached");
      await store("configure-cache", { bypass: true }); await bad(send(b), "limit_reached"); await store("configure-cache", { bypass: false });
      check("different English region/video/bypass busy before cache or upstream; rejected binds charged", (await store()).cacheReads === 1 && item.upstream.length === 1
        && (await store()).captionAdmission.visitorCounts.includes(4));
      await store("configure-cache", { provider: "supadata", key: "synthetic-03c-key" }); await bad(send(await bootstrap()), "limit_reached");
      check("incompatible configured provider policy is busy before IO", (await store()).cacheReads === 1 && item.upstream.length === 1);
      await store("configure-cache", { provider: "direct", key: "" });
      const defaultEnglish = send(await bootstrap(), { body: { video: videoId } });
      await until(async () => (await store()).captionAdmission.participants === 2, "default English joins explicit English");
      check("default and explicit English share one cache read and extraction", (await store()).cacheReads === 1 && item.upstream.length === 1);
      await mode("success"); await Promise.all([good(pending), good(defaultEnglish)]);
    } else if (scenario === "quotas") {
      const tokens = await Promise.all(Array.from({ length: 9 }, bootstrap)); await mode("hold");
      const pending = [send(tokens[0])]; await until(() => item.upstream.length === 1, "quota leader");
      await bad(send(tokens[0]), "limit_reached");
      for (let i = 1; i < 8; i++) pending.push(send(tokens[i]));
      await until(async () => (await store()).captionAdmission.participants === 8, "eight compatible participants");
      await bad(send(tokens[8]), "limit_reached"); await bad(send(tokens[8], { route: "/api/proof-captions" }), "limit_reached");
      const held = await store(); check("each waiter charged, duplicate/proof/budget rejects no cache/provider work", held.captionAdmission.total === 8 && held.captionAdmission.lifetime === 8
        && held.captionAdmission.active === 8 && held.captionAdmission.ipCounts[0] === 8 && held.cacheReads === 1 && item.upstream.length === 1);
      await mode("success"); await Promise.all(pending.map(good)); await bad(send(tokens[7]), "limit_reached");
      await store("advance-clock", { ms: 3601000 });
      // New signed visitors after window change; attempts remain charged in each hourly window.
      for (let i = 0; i < 8; i++) await good(send(await bootstrap()));
      await store("advance-clock", { ms: 3601000 }); await good(send(await bootstrap()));
      const done = await store(); check("hour resets recover beyond former lifetime16 ceiling using the warm cache", done.captionAdmission.lifetime === 17 && done.cacheReads === 10 && item.upstream.length === 3);
    } else {
      // Load proof first: separately bundled route must share admission without instanceof assumptions.
      const a = await bootstrap(), b = await bootstrap(); await mode("hold"); const proof = send(a, { route: "/api/proof-captions" });
      await until(() => item.upstream.length === 1, "proof held"); await bad(send(b), "limit_reached");
      check("proof exclusively occupies same extraction slot without cache/coordinator", (await store()).cacheReads === 0 && (await store()).coordinatorJobs === 0);
      await mode("success"); assert.equal((await proof).status, 200);
      await store("configure-cache", { bypass: true }); await mode("hold"); const bypass = send(a);
      await until(() => item.upstream.length === 4, "bypass held"); await bad(send(b), "limit_reached");
      await bad(send(b, { route: "/api/proof-captions" }), "limit_reached"); await store("configure-cache", { bypass: false }); await bad(send(b), "limit_reached");
      check("bypass never coalesces or touches cache and ordinary/proof cannot join", (await store()).cacheReads === 0 && (await store()).coordinatorJobs === 0);
      await mode("success"); await good(bypass);
      await store("configure-cache", { bypass: true }); await good(send(a));
      check("each deliberate bypass extracts exactly once", item.upstream.length === 9 && (await store()).cacheWrites === 0);
      await good(send(a));
      await bad(send(a), "limit_reached"); check("per-visitor4 enforced across proof/bypass/waiter attempts", (await store()).captionAdmission.visitorCounts.includes(4));
    }
    await until(async () => (await store()).captionAdmission.participants === 0 && (await store()).coordinatorJobs === 0, "bounded teardown");
    check("zero forbidden server fetch, map/participants/active empty", item.forbiddenNetwork === 0 && (await store()).captionAdmission.active === 0);
    item.repository = await store(); item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.stack; throw error; }
  finally {
    await browser?.close(); child.kill("SIGTERM"); item.teardown = await exited; await available(); item.portReleased = true;
    item.endedUtc = new Date().toISOString(); report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, `${scenario}-server.log`), log);
    await writeFile(path.join(directory, "coalescing-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, checks: item.checks.length, upstream: item.upstream, aborted: item.aborted, status: item.status }));
}
console.log(JSON.stringify({ buildId: report.buildId, scenarios: report.scenarios.length, checks: report.scenarios.reduce((n, s) => n + s.checks.length, 0), status: "PASS" }));
