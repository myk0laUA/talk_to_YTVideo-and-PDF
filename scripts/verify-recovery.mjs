// Build an isolated test entry using existing Next-bundled webpack + TypeScript.
// No fixture route/flag/loader is added to Next or to the production application.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import net from "node:net";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const directory = path.resolve(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/11b`);
await mkdir(directory, { recursive: true });
// Refuse occupied ports; never mistake another server's readiness for ours.
for (const port of [3123, 3124]) await new Promise((resolve, reject) => {
  const probe = net.createServer(); probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
const prepared = spawn(process.execPath, ["--conditions=react-server", "tests/recovery/prepare.ts"], { windowsHide: true, stdio: "inherit" });
assert.equal(await new Promise(resolve => prepared.once("exit", resolve)), 0);
const report = { startUtc: new Date().toISOString(), endUtc: null, runtime: process.version,
  productionBuild: (await readFile(".next/BUILD_ID", "utf8")).trim(), fixtureBundleSha256: "", fixtureCssSha256: "",
  context: "Local Chromium actual08A/08B/10A/07B/09A/09B with deterministic test-only transport/admission; separate loopback bundle; production root default-disabled. No DB/keys/live audio.",
  productionExclusion: {}, forbiddenProviderCalls: 0, exit: null };
const require = createRequire(import.meta.url);
const { webpack } = require("next/dist/compiled/webpack/webpack");
const compiler = webpack({ mode: "development", devtool: false, target: "web", entry: path.resolve("tests/mode-switch/harness.tsx"),
  output: { path: path.join(directory, "harness"), filename: "fixture.js" },
  resolve: { extensions: [".tsx", ".ts", ".js"], extensionAlias: { ".ts": [".ts"], ".js": [".js", ".ts"] } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.resolve("tests/transcript-view/loader.mjs") }] },
});
await new Promise((resolve, reject) => compiler.run((error, stats) => {
  compiler.close(() => {});
  if (error || stats.hasErrors()) reject(error ?? new Error(stats.toString({ all: false, errors: true })));
  else resolve();
}));
const bundle = await readFile(path.join(directory, "harness/fixture.js"));
report.fixtureBundleSha256 = createHash("sha256").update(bundle).digest("hex");
const css = `${await readFile("src/app/globals.css", "utf8")}\n.app-shell > h1 { overflow-wrap: anywhere; } .workspace { grid-template-columns: minmax(0, 1fr); } pre { white-space: pre-wrap; overflow-wrap: anywhere; } details { margin-block: 1rem; } .source-reader { margin-block: 1rem; } .text-composer textarea { font-size: max(1em, 16px); }`;
report.fixtureCssSha256 = createHash("sha256").update(css).digest("hex");
const inputs = (await readFile(path.join(directory, "inputs.json"), "utf8")).replace(/</g, "\\u003c");
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Isolated 11B recovery fixture</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="application/json" id="inputs">' + inputs + '</script><script src="/fixture.js"></script></body></html>';
const harness = createServer((request, response) => {
  const routes = { "/": ["text/html", html], "/away": ["text/html", "<!doctype html><title>Away</title><p>Navigation observation</p>"], "/fixture.js": ["application/javascript", bundle], "/style.css": ["text/css", css] };
  const route = routes[request.url];
  response.writeHead(route ? 200 : 404, { "content-type": route?.[0] ?? "text/plain", "cache-control": "no-store", "content-security-policy": "default-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'" });
  response.end(route?.[1] ?? "Not found");
});
await new Promise((resolve, reject) => { harness.once("error", reject); harness.listen(3123, "127.0.0.1", resolve); });
const server = spawn(process.execPath, ["--require", path.resolve("tests/transcript-view/no-provider.cjs"), "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3124"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, NODE_OPTIONS: "", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", APP_ORIGIN: "http://127.0.0.1:3124",
    PROOF_ENABLED: "false", TEXT_PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", CAPTION_PROOF_ENABLED: "false", PDF_PROOF_ENABLED: "false",
    PDF_INGESTION_ENABLED: "false", YOUTUBE_INGESTION_ENABLED: "false", OPENAI_API_KEY: "", SUPADATA_API_KEY: "", SCRAPECREATORS_API_KEY: "" },
});
let log = "";
server.stdout.on("data", value => { log += value; }); server.stderr.on("data", value => { log += value; });
server.on("message", message => { if (message.forbiddenProviderCall) report.forbiddenProviderCalls++; });
const exited = new Promise(resolve => server.once("exit", resolve));
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch("http://127.0.0.1:3124", { signal: AbortSignal.timeout(500) })).ok; } catch {}
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "Isolated production server ready");
  let files = 0;
  async function audit(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await audit(file);
      else if (/\.(js|json)$/.test(item.name)) {
        const source = await readFile(file, "utf8"); files++;
        for (const marker of ["recoverySynchronousAudit", "FIXTURE10C", "PRIVATE10C_ERROR", "STALE10C_MUST_NOT_APPEAR", "tests/mode-switch", "Isolated voice controls fixture 10C", "Fixture10cPriming", "Fixture10cVoice", "FixtureText", "tests/mode-switch", "Isolated mode switching fixture", "FIXTURE10C", "STALE10C_MUST_NOT_APPEAR", "synthetic-test-only", "FixturePriming", "FIXTURE08C", "FIXTURE10B", "Complete synthetic answer."])
          assert.ok(!source.includes(marker), `Fixture excluded from ${file}`);
      }
    }
  }
  await audit(".next/static"); await audit(".next/server");
  const manifest = JSON.parse(await readFile(".next/server/app-paths-manifest.json", "utf8"));
  assert.ok(Object.keys(manifest).every(route => !/fixture|transcript|harness/.test(route)));
  report.productionExclusion = { checkedJsJsonFiles: files, routeManifest: Object.keys(manifest), fixtureMarkers: "absent" };
  const test = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.recovery.config.ts", ...process.argv.slice(2)], { windowsHide: true, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" } });
  const code = await new Promise(resolve => test.once("exit", resolve));
  assert.equal(code, 0, "Recovery browser checks"); assert.equal(report.forbiddenProviderCalls, 0);
  report.exit = 0;
} catch (error) { report.exit = 1; throw error; }
finally {
  server.kill(); await exited; await new Promise(resolve => harness.close(resolve));
  report.portsRebound = [];
  for (const port of [3123, 3124]) await new Promise((resolve, reject) => {
    const probe = net.createServer(); probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(() => { report.portsRebound.push(port); resolve(); }));
  });
  report.endUtc = new Date().toISOString();
  await writeFile(path.join(directory, "production-server.log"), log);
  await writeFile(path.join(directory, "identity-audit.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

