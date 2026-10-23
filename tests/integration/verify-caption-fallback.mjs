// Built HTTP and real adapters; explicit synthetic Prisma/fetch process preloads only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const port = 3112, origin = `http://127.0.0.1:${port}`, directory = path.resolve(process.env.VERIFICATION_ROOT ?? "artifacts/local/caption-fallback"), video = "Cache06c001";
const texts = [" FIRST synthetic marker ", "MIDDLE synthetic marker", "LAST synthetic marker"];
const sections = texts.map((text, i) => ({ id: `segment-${i + 1}`, text, startSeconds: [1.2505, 25, 50.125][i], durationSeconds: [0.500125, 0, 3.75][i] }));
await mkdir(directory, { recursive: true });
const available = () => new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject);
  server.listen(port, "127.0.0.1", () => server.close(resolve)); });
await available();
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), runtime: process.version,
  context: "Local built HTTP/Chromium390px; synthetic upstream and Prisma; no live provider, SQL or physical device", scenarios: [] };
const scenarios = ["browser-overlap", "direct-success", "optout", "no-captions", "unavailable", "malformed", "large", "polls", "pending",
  "remaining-deadline", "rate-cooldown", "quota", "limited", "auth", "managed-malformed", "missing-key", "default-off",
  "cancel-one", "cancel-all", "source-failure", "proof-bypass"];
for (const scenario of scenarios) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], upstream: [], aborted: [], forbiddenNetwork: 0 };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", path.resolve("tests/captions/automatic-upstream.cjs"), "--import",
    pathToFileURL(path.resolve("tests/sources/server-repository.mjs")).href, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: "", NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: origin, VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"),
      NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_DATABASE_URL: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "", NEXT_PUBLIC_SCRAPECREATORS_API_KEY: "",
      YOUTUBE_INGESTION_ENABLED: scenario === "default-off" ? "false" : "true", YOUTUBE_INGESTION_PROVIDER: "auto", YOUTUBE_INGESTION_LOCAL_HTTP: "true",
      YOUTUBE_AUTO_DIRECT_FIRST: scenario === "optout" ? "false" : "true", YOUTUBE_CAPTION_CACHE_BYPASS: "false",
      PDF_INGESTION_ENABLED: "false", PDF_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "true", CAPTION_PROOF_LOCAL_HTTP: "true", CAPTION_PROOF_PROVIDER: "direct",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SUPADATA_API_KEY: scenario === "missing-key" ? "" : "synthetic-03c-key", SCRAPECREATORS_API_KEY: "" },
  });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  let log = "", sequence = 0, browser;
  child.stdout.on("data", v => { log += v; }); child.stderr.on("data", v => { log += v; });
  child.on("message", m => { if (m.captionUpstream) item.upstream.push(m.captionUpstream); if (m.captionAbort) item.aborted.push(m.captionAbort); if (m.forbiddenNetwork) item.forbiddenNetwork++; });
  const ipc = (kind, command, data = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => { child.off("message", listener); reject(new Error("IPC timeout")); }, 5000);
    const listener = m => { if (m[`${kind}TestReply`] === id) { clearTimeout(timer); child.off("message", listener); resolve(m.snapshot); } };
    child.on("message", listener); child.send({ [`${kind}TestCommand`]: command, requestId: id, ...data });
  });
  const mode = data => ipc("caption", "configure", data), store = (command = "snapshot", data) => ipc("source", command, data);
  const until = async (predicate, label) => { for (let i = 0; i < 400; i++) { if (await predicate()) return; await delay(10); } throw new Error(label); };
  const check = (label, condition) => { assert.ok(condition, label); item.checks.push(label); };
  const send = async (cookie, { route = "/api/sources/youtube", body = { video, language: "en" }, method = "POST", signal } = {}) => {
    const r = await fetch(origin + route, { method, signal: signal ?? AbortSignal.timeout(20000), headers: { origin, cookie, "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    const value = await r.json(); assert.equal(r.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(JSON.stringify(value), /PRIVATE|owner|postgresql|providerMetadata|cacheBypass|supadataApiKey|synthetic-03c-key/);
    return { status: r.status, value, cookie: r.headers.get("set-cookie")?.split(";", 1)[0] };
  };
  const bootstrap = async () => { const r = await send(""); assert.equal(r.status, 401); return r.cookie; };
  const good = async p => { const r = await p; assert.equal(r.status, 201, JSON.stringify(r)); return r.value.source; };
  const bad = async (p, category) => { const r = await p; assert.equal(r.value.error?.code, category, JSON.stringify(r)); return r; };
  const full = async (cookie, source) => { const r = await send(cookie, { route: `/api/sources/${source.id}`, method: "GET" }); assert.equal(r.status, 200);
    assert.equal(r.value.source.fullText, texts.join("\n")); assert.deepEqual(r.value.source.sections, sections); assert.equal(r.value.source.provider, source.provider); };
  const counts = (watch, player, timedtext, submit, poll, writes, commits) => {
    const expected = { watch, "youtubei/v1/player": player, "api/timedtext": timedtext, submit, poll };
    for (const [key, n] of Object.entries(expected)) assert.equal(item.upstream.filter(s => s === key).length, n, key);
    return store().then(snapshot => { assert.equal(snapshot.cacheWrites, writes, "cache writes"); assert.equal(snapshot.creates, commits, "Source attempts");
      assert.equal(snapshot.ids.length, scenario === "source-failure" ? 2 : ["browser-overlap", "rate-cooldown"].includes(scenario) ? 1 : commits, "surviving commits");
      item.counts = { ...expected, cacheWrites: snapshot.cacheWrites, sourceAttempts: snapshot.creates, survivingSources: snapshot.ids.length };
      item.checks.push("exact watch/player/timedtext/submit/poll/cache/Source counters"); });
  };
  try {
    await until(async () => { try { return (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch { return false; } }, "server ready");
    if (["missing-key", "default-off"].includes(scenario)) {
      await bad(send(""), "disabled"); check("fails closed before admission/cache/provider", item.upstream.length === 0 && (await store()).cacheReads === 0);
      await counts(0, 0, 0, 0, 0, 0, 0);
    } else if (scenario === "browser-overlap") {
      await mode({ managed: "hold" }); browser = await chromium.launch({ headless: true });
      const contexts = await Promise.all([browser.newContext({ viewport: { width: 390, height: 844 } }), browser.newContext({ viewport: { width: 390, height: 844 } })]);
      const pages = await Promise.all(contexts.map(c => c.newPage())), errors = []; let external = 0;
      for (const page of pages) page.setDefaultTimeout(10000);
      for (const context of contexts) await context.route("**/*", route => { if (new URL(route.request().url()).origin === origin) return route.continue(); external++; return route.abort(); });
      for (const page of pages) { page.on("pageerror", e => errors.push(e.message)); await page.goto(origin); }
      for (const context of contexts) { assert.equal((await context.request.post(origin + "/api/sources/youtube", { headers: { origin }, data: { video } })).status(), 401); await delay(1100); }
      const responses = pages.map(page => page.waitForResponse(r => r.url().endsWith("/api/sources/youtube") && r.status() === 201));
      for (const page of pages) { await page.getByRole("textbox", { name: "YouTube URL" }).fill(`https://youtu.be/${video}`);
        await page.getByRole("button", { name: "Import YouTube video", exact: true }).click(); }
      await until(async () => (await store()).captionAdmission.participants === 2, "two waiters");
      check("two visitors share one blocked-direct and held-managed chain", item.upstream.join() === "watch,submit" && (await store()).creates === 0);
      await mode({ managed: "success" }); const sources = await Promise.all(responses.map(async r => (await (await r).json()).source));
      assert.notEqual(sources[0].id, sources[1].id); assert.notEqual(sources[0].expiresAt, sources[1].expiresAt);
      for (let i = 0; i < 2; i++) {
        const page = pages[i]; assert.equal(sources[i].provider, "supadata"); assert.match(sources[i].id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
        const cookie = (await contexts[i].cookies()).find(c => c.name === "td-visitor");
        assert.equal(sources[i].expiresAt, new Date(Number(cookie.value.split(".")[1]) * 1000).toISOString());
        await page.getByRole("button", { name: "View source", exact: true }).click();
        for (const text of texts) await expect(page.locator("#source-text").getByText(text.trim(), { exact: true })).toBeVisible();
        assert.deepEqual(await page.locator(".page-text").allTextContents(), texts);
        check(`visitor ${i} complete ordered preview, provider, expiry and width`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(directory, `fallback-preview-${i}.png`), fullPage: true });
        await page.getByRole("button", { name: "Close text and return", exact: true }).first().click();
      }
      const cookies = await Promise.all(contexts.map(async c => (await c.cookies()).map(v => `${v.name}=${v.value}`).join("; ")));
      for (let i = 0; i < 2; i++) { await full(cookies[i], sources[i]);
        for (const method of ["GET", "DELETE"]) assert.equal((await send(cookies[1 - i], { route: `/api/sources/${sources[i].id}`, method })).status, 404); }
      const expiry = (await store()).cacheExpiries; const warm = await good(send(cookies[0], { body: { video } })); await full(cookies[0], warm);
      check("warm same-language-policy hit preserves provenance/TTL and extracts zero", warm.provider === "supadata" && item.upstream.length === 2
        && JSON.stringify(expiry) === JSON.stringify((await store()).cacheExpiries));
      assert.equal((await send(cookies[0], { route: `/api/sources/${warm.id}`, method: "DELETE" })).status, 200);
      await full(cookies[1], sources[1]); check("visitor-specific replacement/removal; no JS errors", errors.length === 0);
      check("zero external browser calls and no source persistence", external === 0
        && (await Promise.all(pages.map(page => page.evaluate(() => localStorage.length + sessionStorage.length)))).every(n => n === 0));
      await counts(1, 0, 0, 1, 0, 1, 3);
    } else if (["cancel-one", "cancel-all", "source-failure", "proof-bypass"].includes(scenario)) {
      const a = await bootstrap(), b = await bootstrap(); let prior;
      if (scenario === "source-failure") {
        prior = [await good(send(a)), await good(send(b))]; await store("expire-cache"); await store("fail-create");
      }
      await mode({ managed: "hold" }); const ca = new AbortController(), cb = new AbortController();
      const pa = send(a, { signal: ca.signal }).catch(e => ({ aborted: e.name }));
      await until(() => item.upstream.at(-1) === "submit", "managed pending");
      if (scenario === "proof-bypass") {
        await bad(send(b, { route: "/api/proof-captions" }), "limit_reached"); await mode({ managed: "success" }); await good(pa);
        const reads = (await store()).cacheReads; await bad(send(b, { route: "/api/proof-captions" }), "blocked");
        await store("configure-cache", { provider: "direct", bypass: true }); await bad(send(b), "blocked");
        await store("configure-cache", { provider: "supadata", key: "synthetic-03c-key", bypass: true }); await good(send(b));
        check("proof and forced bypass actually call adapter despite cooldown and never cache/join", (await store()).cacheReads === reads);
        await counts(3, 0, 0, 2, 0, 1, 2);
      } else {
        const pb = send(b, { signal: cb.signal }).catch(e => ({ aborted: e.name }));
        await until(async () => (await store()).captionAdmission.participants === 2, "overlap fallback");
        if (scenario !== "source-failure") { ca.abort(); assert.ok((await pa).aborted); }
        if (scenario === "cancel-all") {
          cb.abort(); assert.ok((await pb).aborted); await until(() => item.aborted.includes("submit"), "active submit aborted");
          check("all cancelled create zero Sources/cache writes", (await store()).creates === 0 && (await store()).cacheWrites === 0);
          await mode({ managed: "success" }); await good(send(a)); check("deliberate retry obeys direct cooldown", item.upstream.join() === "watch,submit,submit");
          await counts(1, 0, 0, 2, 0, 1, 1);
        } else {
          await mode({ managed: "success" });
          if (scenario === "source-failure") {
            await bad(pa, "storage_unavailable"); await good(pb); await full(a, prior[0]);
            await good(send(a)); check("independent rollback preserves prior and later hit does not repeat chain", item.upstream.join() === "watch,submit,submit");
            await counts(1, 0, 0, 2, 0, 2, 5);
          } else { await good(pb); check("cancelled caller never commits; survivor continues", item.aborted.length === 0); await counts(1, 0, 0, 1, 0, 1, 1); }
        }
      }
    } else {
      const token = await bootstrap();
      const directModes = { "direct-success": "success", "no-captions": "no-captions", unavailable: "unavailable", malformed: "malformed", large: "large", "remaining-deadline": "hold" };
      await mode({ direct: directModes[scenario] ?? "blocked", managed: scenario === "managed-malformed" ? "malformed"
        : scenario === "rate-cooldown" ? "rate" : ["quota", "limited", "auth", "polls", "pending"].includes(scenario) ? scenario : scenario === "remaining-deadline" ? "hold" : "success" });
      if (scenario === "remaining-deadline") await store("delay-cache-read", { ms: 3000 });
      const started = performance.now(), pending = send(token);
      const expected = { "no-captions": "no_captions", unavailable: "unavailable", malformed: "malformed", large: "too_large", pending: "timeout",
        "remaining-deadline": "timeout", "rate-cooldown": "rate_limited", quota: "quota_exhausted", limited: "provider_limited", auth: "blocked", "managed-malformed": "malformed" }[scenario];
      if (expected) await bad(pending, expected); else { const source = await good(pending); await full(token, source); assert.equal(source.provider, scenario === "direct-success" ? "youtube-transcript-plus@2.0.3" : "supadata"); }
      item.elapsedMs = performance.now() - started;
      if (scenario === "remaining-deadline") {
        check("cache3s + direct9s + managed remaining3s measured under one15s job", item.elapsedMs >= 14800 && item.elapsedMs < 16500 && item.aborted.join() === "watch,submit");
        await counts(1, 0, 0, 1, 0, 0, 0);
      } else if (scenario === "rate-cooldown") {
        await bad(send(token, { body: { video: "Cache06c002", language: "en" } }), "rate_limited");
        check("managed rate cooldown skips both providers on future automatic miss", item.upstream.join() === "watch,submit");
        await mode({ managed: "success" }); await store("configure-cache", { provider: "supadata", key: "synthetic-03c-key" }); await good(send(token));
        await store("configure-cache", { provider: "auto", key: "synthetic-03c-key" }); const warm = await good(send(token));
        check("cached success usable during cooldown with managed provenance", warm.provider === "supadata"); await counts(1, 0, 0, 2, 0, 1, 2);
      } else if (scenario === "direct-success") await counts(1, 1, 1, 0, 0, 1, 1);
      else if (scenario === "optout") await counts(0, 0, 0, 1, 0, 1, 1);
      else if (scenario === "no-captions") await counts(1, 1, 0, 0, 0, 0, 0);
      else if (scenario === "malformed") await counts(1, 1, 1, 0, 0, 0, 0);
      else if (["unavailable", "large"].includes(scenario)) await counts(1, 0, 0, 0, 0, 0, 0);
      else await counts(1, 0, 0, 1, scenario === "polls" ? 2 : scenario === "pending" ? 5 : 0, expected ? 0 : 1, expected ? 0 : 1);
    }
    await until(async () => (await store()).coordinatorJobs === 0 && ((await store()).captionAdmission?.participants ?? 0) === 0, "job teardown");
    check("zero nonfixture fetch, no active jobs/waiters", item.forbiddenNetwork === 0 && ((await store()).captionAdmission?.active ?? 0) === 0);
    item.repository = await store(); item.status = "PASS";
  } catch (error) { item.status = "FAIL"; item.failure = error.stack; throw error; }
  finally {
    await browser?.close(); child.kill("SIGTERM"); item.teardown = await exited; await available(); item.portReleased = true;
    item.endedUtc = new Date().toISOString(); report.endedUtc = item.endedUtc;
    await writeFile(path.join(directory, `${scenario}-server.log`), log);
    await writeFile(path.join(directory, "fallback-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify({ scenario, checks: item.checks.length, counts: item.counts, elapsedMs: item.elapsedMs, status: item.status }));
}
console.log(JSON.stringify({ buildId: report.buildId, scenarios: report.scenarios.length, checks: report.scenarios.reduce((n, s) => n + s.checks.length, 0), status: "PASS" }));
