import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { cleanup, defaults, tables } from "../../src/server/cleanup/service.ts";
import { createPostgresCleanupStore, type CleanupConnection } from "../../src/server/cleanup/postgres.ts";
import { cleanupDatabaseUrl, parseCleanupArgs, runCleanupCli } from "../../scripts/lib/cleanup-cli.ts";
import { assertLivePreserved, fixture, SyntheticCleanupStore } from "../cleanup/synthetic.ts";

const options = { ...defaults, batchSize: 2, execute: true };
test("both tables: expiry/boundary/status-independent deletion; live ownership unchanged; idempotent rerun", async () => {
  const store = fixture();
  const result = await cleanup(store, options, undefined, () => 1000);
  assert.equal(result.status, "complete");
  for (const table of tables) assert.deepEqual(result.counts[table], { selected: 4, deleted: 4, unscanned: 0 });
  assertLivePreserved(store);
  assert.deepEqual(store.calls.slice(0, 3).map(r => r.cursor?.id), [undefined, "02", "04"]);
  const second = await cleanup(store, options, undefined, () => 1000);
  assert.equal(second.status, "complete");
  for (const table of tables) assert.equal(second.counts[table].deleted, 0);
});
test("dry-run is byte-identical and uses keyset traversal", async () => {
  const store = fixture(), before = JSON.stringify(store.rows);
  const result = await cleanup(store, { ...options, execute: false }, undefined, () => 1000);
  assert.equal(result.status, "complete"); assert.equal(JSON.stringify(store.rows), before);
  for (const table of tables) assert.deepEqual(result.counts[table], { selected: 4, deleted: 0, unscanned: 0 });
});
for (const [name, limits, selected, batches] of [
  ["row cap", { maxRows: 3 }, 3, 2], ["batch cap", { maxBatches: 1 }, 2, 1],
  ["exact cap is conservative", { maxRows: 4 }, 4, 2],
] as const) test(name, async () => {
  const result = await cleanup(fixture(), { ...options, ...limits }, undefined, () => 1000);
  assert.equal(result.status, "limit"); assert.equal(result.counts.Source.selected, selected);
  assert.equal(result.counts.TranscriptCache.selected, 0); assert.equal(result.counts.Source.unscanned, "unknown");
  assert.equal(result.batches, batches);
});
test("one captured cutoff excludes a row that expires later during the run", async () => {
  const store = fixture(); let clock = 1000;
  store.afterSelect = () => { clock = 1100; };
  const result = await cleanup(store, options, undefined, () => clock);
  assert.equal(result.cutoff, new Date(1000).toISOString()); assertLivePreserved(store);
});
test("cache refreshed after selection survives; selected differs from actual deleted", async () => {
  const store = fixture();
  store.afterSelect = (request, ids) => {
    if (request.table === "TranscriptCache" && ids.includes("03")) store.rows.TranscriptCache.find(row => row.id === "03")!.expiresAt = new Date(2000);
  };
  const result = await cleanup(store, options, undefined, () => 1000);
  assert.equal(result.counts.TranscriptCache.selected, 4); assert.equal(result.counts.TranscriptCache.deleted, 3);
  assert.ok(store.rows.TranscriptCache.some(row => row.id === "03"));
});
test("two simulated overlapping cleaners count only actual deletes", async () => {
  const store = fixture(); let arrivals = 0; let release: () => void = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  store.afterSelect = async request => { if (request.table === "Source" && !request.cursor) { if (++arrivals === 2) release(); await ready; } };
  const reports = await Promise.all([cleanup(store, options, undefined, () => 1000), cleanup(store, options, undefined, () => 1000)]);
  for (const table of tables) assert.equal(reports.reduce((sum, r) => sum + r.counts[table].deleted, 0), 4);
  assertLivePreserved(store);
});
test("simulated replacement between select/delete preserves new active source", async () => {
  const store = fixture(); let replaced = false;
  store.afterSelect = request => {
    if (request.table === "Source" && !replaced) {
      replaced = true; store.rows.Source = store.rows.Source.filter(row => row.id !== "01");
      store.rows.Source.push({ id: "replacement", expiresAt: new Date(2000), body: "new", owner: "oldest", activeOwner: "oldest" });
    }
  };
  const result = await cleanup(store, options, undefined, () => 1000);
  assert.equal(result.counts.Source.deleted, 3);
  assert.equal(store.rows.Source.filter(row => row.activeOwner === "oldest").length, 1);
});
for (const phase of ["before", "during", "between"] as const) test(`cancellation ${phase} batches rolls back active simulation`, async () => {
  const store = fixture(), controller = new AbortController();
  if (phase === "before") controller.abort();
  if (phase === "during") store.afterSelect = () => controller.abort();
  if (phase === "between") {
    const batch = store.batch;
    store.batch = async request => { const result = await batch(request); controller.abort(); return result; };
  }
  const result = await cleanup(store, options, controller.signal, () => 1000);
  assert.equal(result.status, "cancelled"); assert.equal(result.counts.Source.deleted, phase === "between" ? 2 : 0);
  assert.equal(store.calls.length, phase === "before" ? 0 : 1);
});
test("deadline during await stops commit and later batches", async () => {
  const store = fixture(); let now = 1000;
  store.afterSelect = () => { now = 31_000; };
  const result = await cleanup(store, options, undefined, () => now);
  assert.equal(result.status, "timeout"); assert.equal(result.batches, 0); assert.equal(store.rows.Source.length, 5);
});
test("failure after earlier committed batch reports partial progress and stops without retries", async () => {
  const store = fixture();
  store.beforeCommit = request => { if (request.cursor) throw new Error("secret SQL postgresql://secret"); };
  const result = await cleanup(store, options, undefined, () => 1000);
  assert.equal(result.status, "error"); assert.equal(result.counts.Source.deleted, 2); assert.equal(store.calls.length, 2);
  assert.doesNotMatch(JSON.stringify(result), /secret|SQL/);
});

for (const table of tables) for (const execute of [false, true]) test(`SQL contract ${table} ${execute ? "execute" : "dry-run"}`, async () => {
  const calls: { text: string; values?: unknown[] }[] = [];
  const connection: CleanupConnection = { async query(text, values) {
    calls.push({ text, values });
    return text.startsWith('SELECT "id"') ? { rows: [{ id: "id", expiresAt: new Date(999) }], rowCount: 1 }
      : { rows: [], rowCount: text.startsWith("DELETE") ? 0 : null };
  } };
  const cutoff = new Date(1000);
  const result = await createPostgresCleanupStore(connection).batch({ table, cutoff, limit: 2, execute, guard() {} });
  assert.equal(calls[0].text, execute ? "BEGIN ISOLATION LEVEL READ COMMITTED" : "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
  assert.match(calls[1].text, /lock_timeout.*500ms.*statement_timeout.*1500ms.*3000ms/);
  assert.match(calls[2].text, /ORDER BY "expiresAt", "id" LIMIT \$4/);
  assert.deepEqual(calls[2].values, [cutoff, null, null, 2]);
  assert.doesNotMatch(calls.map(c => c.text).join(" "), /fullText|sections|owner|title|TRUNCATE/);
  assert.equal(calls.at(-1)?.text, "COMMIT"); assert.equal(result.deleted, 0);
  if (execute) { assert.match(calls[3].text, /ANY\(\$1::uuid\[\]\).*"expiresAt" <= \$2/); assert.deepEqual(calls[3].values, [["id"], cutoff]); }
  else assert.ok(calls.every(c => !c.text.startsWith("DELETE")));
});
for (const phase of ["select", "delete", "cancel after delete", "commit"] as const) test(`SQL failure ${phase} rolls back; no retry`, async () => {
  const calls: string[] = []; let cancelled = false;
  const connection: CleanupConnection = { async query(text) {
    calls.push(text);
    if ((phase === "select" && text.startsWith('SELECT "id"')) || (phase === "delete" && text.startsWith("DELETE"))
      || (phase === "commit" && text === "COMMIT")) throw new Error("private database error");
    if (phase === "cancel after delete" && text.startsWith("DELETE")) cancelled = true;
    return { rows: text.startsWith('SELECT "id"') ? [{ id: "id", expiresAt: new Date(999) }] : [], rowCount: 1 };
  } };
  await assert.rejects(createPostgresCleanupStore(connection).batch({ table: "Source", cutoff: new Date(1000), execute: true, limit: 1,
    guard() { if (cancelled) throw new Error("cancelled"); } }));
  assert.equal(calls.at(-1), "ROLLBACK"); assert.equal(calls.filter(c => c.startsWith("BEGIN")).length, 1);
});

for (const args of [["--cutoff", "2099-01-01"], ["--sql", "DELETE"], ["--execute=true"], ["--execute", "--execute"],
  ["--batch-size", "0"], ["--batch-size", "501"], ["--max-rows", "5001"], ["--max-batches", "101"], ["--timeout-ms", "60001"],
  ["--batch-size"], ["--max-rows", "1.1"], ["--timeout-ms", "1e3"], ["--help", "--execute"]]) test(`reject CLI ${args.join(" ")}`, () => {
  assert.throws(() => parseCleanupArgs(args), /USAGE/);
});
test("explicit DB target: reject absence, implicit database, wrong protocol and startup SQL", () => {
  for (const value of [undefined, "", "postgresql://localhost", "file://test/db", "postgresql://localhost/db?options=-csearch_path=evil"]) {
    assert.throws(() => cleanupDatabaseUrl({ DATABASE_URL: value }), /CONFIGURATION/);
  }
});
test("actual CLI runner: default dry-run, explicit execute, no-op; ownership and teardown", async () => {
  const store = fixture(), before = JSON.stringify(store.rows); let closes = 0, opens = 0;
  // Real Date.now cutoff: move this fixture around the actual server clock.
  const offset = Date.now() - 1000;
  for (const table of tables) for (const row of store.rows[table]) row.expiresAt = new Date(+row.expiresAt + offset + (row.id === "05" ? 600_000 : -1000));
  const preserved = JSON.stringify(store.rows);
  const lines: string[] = [];
  const open = async () => { opens++; return { store, async close() { closes++; } }; };
  const env = { DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" };
  assert.equal(await runCleanupCli([], env, open, l => lines.push(l)), 0);
  assert.equal(JSON.stringify(store.rows), preserved);
  assert.equal(await runCleanupCli(["--execute"], env, open, l => lines.push(l)), 0);
  assert.equal(await runCleanupCli(["--execute"], env, open, l => lines.push(l)), 0);
  const reports = lines.map(l => JSON.parse(l));
  assert.equal(reports[0].mode, "dry-run");
  for (const table of tables) {
    assert.equal(reports[0].counts[table].selected, 4); assert.equal(reports[0].counts[table].deleted, 0);
    assert.equal(reports[1].counts[table].deleted, 4); assert.equal(reports[2].counts[table].deleted, 0);
    assert.equal(store.rows[table].length, 1); assert.equal(store.rows[table][0].activeOwner, "live");
  }
  assert.equal(opens, 3); assert.equal(closes, 3); assert.notEqual(before, preserved);
  console.log(JSON.stringify({ evidence: "synthetic CLI sequence", before: { Source: 5, TranscriptCache: 5 }, reports,
    after: { Source: 1, TranscriptCache: 1 }, byteIdenticalDryRun: true, liveOwnershipPreserved: true, opens, closes }));
});
test("CLI failures sanitize errors, disconnect once, reject args/config before opening", async () => {
  let closes = 0, opens = 0; const output: string[] = [];
  const open = async () => { opens++; return { store: { async batch() { throw new Error("secret"); } }, async close() { closes++; } }; };
  const env = { DATABASE_URL: "postgresql://localhost/synthetic" };
  assert.equal(await runCleanupCli(["--unknown"], env, open, l => output.push(l)), 1);
  assert.equal(await runCleanupCli([], {}, open, l => output.push(l)), 1); assert.equal(opens, 0);
  assert.equal(await runCleanupCli([], env, open, l => output.push(l)), 1); assert.equal(closes, 1);
  assert.doesNotMatch(output.join(""), /secret|postgres/);
});
test("CLI cap exit 2 and close failure exit 1 preserve completed counts", async () => {
  const store = fixture(); const output: string[] = [];
  const env = { DATABASE_URL: "postgresql://localhost/synthetic" };
  assert.equal(await runCleanupCli(["--max-rows", "1"], env, async () => ({ store, async close() {} }), l => output.push(l)), 2);
  assert.equal(await runCleanupCli([], env, async () => ({ store, async close() { throw new Error("secret"); } }), l => output.push(l)), 1);
  assert.equal(JSON.parse(output[1]).category, "CLOSE_FAILED");
});
for (const args of [["--help"], ["--unknown"], ["--cutoff", "2099-01-01"]]) test(`CLI subprocess ${args.join(" ")} terminates cleanly`, () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "scripts/cleanup-expired.ts", ...args],
    { encoding: "utf8", timeout: 5000, env: { ...process.env, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" } });
  assert.equal(result.error, undefined); assert.equal(result.status, args[0] === "--help" ? 0 : 1);
  assert.doesNotMatch(result.stdout + result.stderr, /postgresql:|synthetic|password/);
});
test("actual CLI connection failure is sanitized and exits without leaked sockets", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "scripts/cleanup-expired.ts"],
    { encoding: "utf8", timeout: 5000, env: { ...process.env, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" } });
  assert.equal(result.error, undefined); assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /postgresql:|synthetic|password|ECONN/);
});
for (const sameTarget of [false, true]) test(`PostgreSQL harness refuses ${sameTarget ? "ordinary database target" : "missing opt-in"} before connecting`, () => {
  const url = "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic";
  const result = spawnSync(process.execPath, ["--conditions=react-server", "scripts/verify-cleanup-postgres.ts"],
    { encoding: "utf8", timeout: 5000, env: { ...process.env, DATABASE_URL: url,
      TEST_CLEANUP_DATABASE_URL: url, CLEANUP_DISPOSABLE_ACK: sameTarget ? "I_CONFIRM_EMPTY_DISPOSABLE_DATABASE" : "" } });
  assert.equal(result.error, undefined); assert.equal(result.status, 1);
  const report = JSON.parse(result.stderr); assert.equal(report.stage, "configuration");
  assert.doesNotMatch(result.stdout + result.stderr, /postgresql:|synthetic|password|ECONN/);
});
test("zero eligible rows scans both tables", async () => {
  const result = await cleanup(new SyntheticCleanupStore(), options);
  assert.equal(result.status, "complete"); assert.equal(result.batches, 2);
});
test("failed COMMIT reports unknown batch outcome, never claims zero actual deletions", async () => {
  const connection: CleanupConnection = { async query(text) {
    if (text === "COMMIT") throw new Error("private network error");
    return { rows: text.startsWith('SELECT "id"') ? [{ id: "id", expiresAt: new Date(999) }] : [], rowCount: 1 };
  } };
  const result = await cleanup(createPostgresCleanupStore(connection), options, undefined, () => 1000);
  assert.equal(result.status, "error"); assert.equal(result.failedBatch, "unknown");
  assert.equal(result.batches, 0); assert.equal(result.counts.Source.deleted, 0); // confirmed committed batches only
});
test("failed DELETE with confirmed rollback reports rolled_back", async () => {
  const connection: CleanupConnection = { async query(text) {
    if (text.startsWith("DELETE")) throw new Error("lock timeout");
    return { rows: text.startsWith('SELECT "id"') ? [{ id: "id", expiresAt: new Date(999) }] : [], rowCount: 1 };
  } };
  const result = await cleanup(createPostgresCleanupStore(connection), options, undefined, () => 1000);
  assert.equal(result.status, "error"); assert.equal(result.failedBatch, "rolled_back");
  assert.equal(result.counts.Source.deleted, 0);
});
test("CLI cancellation before resource acquisition performs zero opens", async () => {
  const controller = new AbortController(); controller.abort(); let opens = 0; const output: string[] = [];
  const exit = await runCleanupCli([], { DATABASE_URL: "postgresql://localhost/synthetic" }, async () => {
    opens++; return { store: fixture(), async close() {} };
  }, line => output.push(line), controller.signal);
  assert.equal(exit, 1); assert.equal(opens, 0); assert.equal(JSON.parse(output[0]).category, "CANCELLED");
});
test("CLI opener failure is sanitized and does not claim a created resource", async () => {
  const output: string[] = [];
  const exit = await runCleanupCli([], { DATABASE_URL: "postgresql://localhost/synthetic" }, async () => {
    throw new Error("postgresql://private password source body");
  }, line => output.push(line));
  assert.equal(exit, 1);
  const report = JSON.parse(output[0]);
  assert.equal(report.status, "error"); assert.equal(report.failedBatch, "not_started");
  assert.equal(report.mode, "dry-run"); assert.equal(report.counts.Source.deleted, 0);
  assert.doesNotMatch(output[0], /private|postgresql|password|source body/);
});
test("CLI captures cutoff before connecting and cancellation during acquisition closes the resource", async () => {
  const controller = new AbortController(); let closes = 0; const output: string[] = [];
  const store = fixture();
  const exit = await runCleanupCli([], { DATABASE_URL: "postgresql://localhost/synthetic" }, async () => {
    controller.abort(); return { store, async close() { closes++; } };
  }, line => output.push(line), controller.signal);
  const report = JSON.parse(output[0]);
  assert.equal(exit, 1); assert.equal(report.status, "cancelled"); assert.ok(Number.isFinite(Date.parse(report.cutoff)));
  assert.equal(report.batches, 0); assert.equal(store.calls.length, 0); assert.equal(closes, 1);
});
test("public service rejects unbounded programmatic options", async () => {
  for (const limits of [{ batchSize: Infinity }, { maxRows: -1 }, { maxBatches: 0 }, { timeoutMs: NaN }]) {
    await assert.rejects(cleanup(fixture(), { ...options, ...limits }), /USAGE/);
  }
});
