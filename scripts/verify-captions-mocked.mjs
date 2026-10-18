// Real local production HTTP, synthetic upstream only. Build first. No live-provider opt-in.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:3104";
const evidence = path.resolve("artifacts/local/03b");
await mkdir(evidence, { recursive: true });
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
  runtime: process.version, context: "local built Next HTTP; all external fetch intercepted by test preload; no real DB/provider", scenarios: [] };
const preloader = path.resolve("tests/captions/server-mocked.cjs");
const fetchLocal = (url, init = {}) => {
  assert.equal(new URL(url).origin, origin);
  return fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(20000), redirect: "error" });
};
try {
  await fetchLocal(origin, { signal: AbortSignal.timeout(500) });
  throw new Error("Port 3104 is occupied");
} catch (error) { if (error.message === "Port 3104 is occupied") throw error; }

for (const scenario of ["disabled", "missing-key", "invalid-provider", "sync", "async", "failed", "pending", "direct"]) {
  const item = { scenario, startedUtc: new Date().toISOString(), checks: [], upstream: [], teardown: null };
  report.scenarios.push(item);
  const child = spawn(process.execPath, ["--require", preloader, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3104"], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env,
      NODE_ENV: "production", NODE_OPTIONS: "", NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: origin,
      CAPTION_PROOF_ENABLED: scenario === "disabled" ? "false" : "true", CAPTION_PROOF_LOCAL_HTTP: "true",
      CAPTION_PROOF_PROVIDER: scenario === "direct" ? "direct" : scenario === "invalid-provider" ? "auto" : "supadata",
      CAPTION_MOCK_SCENARIO: scenario, SUPADATA_API_KEY: scenario === "missing-key" ? "" : "synthetic-03b-http-key",
      VISITOR_COOKIE_SECRET: randomBytes(32).toString("hex"), NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "", NEXT_PUBLIC_OPENAI_API_KEY: "", NEXT_PUBLIC_SUPADATA_API_KEY: "",
      PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", TEXT_PROOF_ENABLED: "false", OPENAI_API_KEY: "", SCRAPECREATORS_API_KEY: "",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1",
    },
  });
  let log = "";
  child.stdout.on("data", data => { log += data; }); child.stderr.on("data", data => { log += data; });
  child.on("message", message => { if (typeof message.captionMock === "string") item.upstream.push(message.captionMock); });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  const check = async (label, expectedStatus, expectedCode, { body = { video: "dQw4w9WgXcQ", language: "en" }, headers = {}, route = "/api/proof-captions" } = {}) => {
    const response = await fetchLocal(origin + route, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    const dto = await response.json();
    assert.equal(response.status, expectedStatus); assert.equal(response.headers.get("cache-control"), "no-store");
    if (expectedCode) assert.equal(dto.error?.code, expectedCode);
    assert.doesNotMatch(JSON.stringify(dto), /synthetic-03b-http-key|RAW_PRIVATE|evil\.invalid|supadataApiKey|cookieSecret/);
    item.checks.push({ label, httpStatus: response.status, code: dto.error?.code ?? null, noStore: true, status: "PASS" });
    return { dto, cookie: response.headers.get("set-cookie")?.split(";", 1)[0] };
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error("Mock production server exited during startup");
      try { ready = (await fetchLocal(origin)).ok; } catch {}
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, "production server ready");
    for (const route of ["/api/proof-source", "/api/realtime/client-secret"]) {
      const { dto } = await check("other proof gate off", 503, null, { route });
      assert.deepEqual(dto, { error: "Feature unavailable" });
    }
    if (["disabled", "missing-key", "invalid-provider"].includes(scenario)) {
      await check("caption gate/config fails closed", 503, "disabled"); assert.equal(item.upstream.length, 0);
    } else if (scenario === "sync") {
      await check("origin rejects before upstream", 403, "forbidden", { headers: { origin: "https://evil.invalid" } });
      await check("request provider rejected", 400, "invalid_request", { body: { video: "dQw4w9WgXcQ", provider: "direct" } });
      await check("invalid video rejected", 400, "invalid_input", { body: { video: "bad" } });
      assert.equal(item.upstream.length, 0);
      const { dto, cookie } = await check("managed success through built route", 200);
      assert.equal(dto.transcript.provider, "supadata"); assert.equal(dto.transcript.language, "fr");
      assert.equal(dto.transcript.segments[0].startSeconds, 1.2505);
      assert.equal(dto.transcript.segments[0].durationSeconds, 0.500125);
      assert.equal(dto.transcript.fullText, "FIRST synthetic marker\nMIDDLE synthetic marker\nLAST synthetic marker");
      assert.equal("trackType" in dto.transcript, false); assert.ok(cookie);
      await check("quota sanitized, no retry", 503, "quota_exhausted", { body: { video: "Ks-_Mh1QhMc", language: "en" }, headers: { cookie } });
      await check("admission released after quota", 200, null, { headers: { cookie } });
      await check("fourth admitted attempt", 200, null, { headers: { cookie } });
      await check("visitor quota rejects before upstream", 429, "limit_reached", { headers: { cookie } });
      assert.deepEqual(item.upstream, Array(4).fill("supadata-initial"));
    } else if (scenario === "direct") {
      const { dto } = await check("explicit direct built selection", 200);
      assert.equal(dto.transcript.provider, "youtube-transcript-plus@2.0.3");
      assert.deepEqual(item.upstream, ["direct-watch", "direct-player", "direct-transcript"]);
    } else {
      const started = performance.now();
      const { dto } = await check("bounded async built selection", scenario === "async" ? 200 : scenario === "failed" ? 502 : 504,
        scenario === "async" ? null : scenario === "failed" ? "upstream_failure" : "timeout");
      if (scenario === "async") { assert.equal(dto.transcript.provider, "supadata"); assert.equal(dto.transcript.segments.length, 3); }
      const polls = scenario === "async" ? 3 : scenario === "failed" ? 1 : 5;
      assert.deepEqual(item.upstream, ["supadata-initial", ...Array(polls).fill("supadata-poll")]);
      item.elapsedMs = Math.round(performance.now() - started);
      assert.ok(item.elapsedMs >= polls * 1000); assert.ok(item.elapsedMs < 18000);
    }
    assert.equal(item.upstream.includes("contract-rejected"), false);
    item.status = "PASS";
  } catch (error) {
    item.status = "FAIL"; item.failure = error.message; throw error;
  } finally {
    child.kill(); item.teardown = await exited; item.endedUtc = new Date().toISOString();
    await writeFile(path.join(evidence, `mock-${scenario}-server.log`), log);
    report.endedUtc = item.endedUtc;
    await writeFile(path.join(evidence, "mocked-http-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
}
console.log(JSON.stringify({ buildId: report.buildId, scenarios: report.scenarios.map(s => ({ scenario: s.scenario, status: s.status,
  checks: s.checks.length, upstreamCalls: s.upstream.length, teardown: s.teardown })) }, null, 2));
