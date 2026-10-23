import "server-only";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";
import { cleanup, defaults, tables, type BatchRequest } from "../src/server/cleanup/service.ts";
import { createPostgresCleanupStore, type CleanupConnection } from "../src/server/cleanup/postgres.ts";
import { cleanupDatabaseUrl } from "./lib/cleanup-cli.ts";

// Operator-only. Never runs with the ordinary test suite. No database creation/migration here.
config({ quiet: true });
const pools: Pool[] = [], clients: PoolClient[] = [];
const ids = { Source: Array.from({ length: 5 }, () => randomUUID()), TranscriptCache: Array.from({ length: 5 }, () => randomUUID()) };
const owner = randomBytes(32).toString("hex"), marker = `cleanup-11a-${randomUUID()}`;
let database: PoolClient | undefined, fixturesAllowed = false;
const results: unknown[] = [];
let stage = "configuration", succeeded = false;
const watchdog = setTimeout(() => { process.stderr.write('{"status":"FAIL","category":"HARNESS_TIMEOUT","fixtureCleanup":"unconfirmed"}\n'); process.exit(1); }, 60_000);

async function connect(url: string) {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 1500,
    statement_timeout: 2000, lock_timeout: 500, idle_in_transaction_session_timeout: 3000, query_timeout: 5000 });
  pool.on("error", () => {}); pools.push(pool);
  const client = await pool.connect(); clients.push(client); return client;
}
async function removeFixtures() {
  if (!database || !fixturesAllowed) return;
  // Exact UUIDs AND per-run marker. Never delete other rows, truncate or reset.
  await database.query('DELETE FROM "public"."Source" WHERE "id" = ANY($1::uuid[]) AND "title" = $2 AND "ownerSessionHash" = $3', [ids.Source, marker, owner]);
  await database.query('DELETE FROM "public"."TranscriptCache" WHERE "id" = ANY($1::uuid[]) AND "title" = $2', [ids.TranscriptCache, marker]);
}
async function seed(scenario: string) {
  stage = `${scenario}:seed-teardown`;
  await removeFixtures();
  const cutoff = new Date();
  for (let index = 0; index < 5; index++) {
    // Two old rows, exact cutoff, another old row, one future row. No real content.
    const expires = new Date(+cutoff + (index === 4 ? 600_000 : index === 2 ? 0 : -10_000 + index));
    const active = index === 4;
    stage = `${scenario}:seed-source-${active ? "active" : "inactive"}`;
    await database!.query(`INSERT INTO "public"."Source" ("id", "ownerSessionHash", "uploadedPdfOwner", "kind", "title", "fullText", "sections", "extractionStatus", "provider", "updatedAt", "expiresAt")
      VALUES ($1,$2,$3,'PDF',$4,'synthetic cleanup fixture','[]',$5,$6,now(),$7)`,
    [ids.Source[index], owner, active ? owner : null, marker, active ? "READY" : index % 2 ? "PENDING" : "FAILED", active ? "pdf-parse@2.4.5" : null, expires]);
    stage = `${scenario}:seed-cache`;
    await database!.query(`INSERT INTO "public"."TranscriptCache" ("id", "videoId", "languagePreference", "provider", "title", "fullText", "sections", "characterCount", "wordCount", "updatedAt", "expiresAt")
      VALUES ($1,'abcdefghijk',$2,'synthetic',$3,'synthetic cleanup fixture','[]',25,3,now(),$4)`,
    [ids.TranscriptCache[index], `${marker}-${index}`, marker, expires]);
  }
  stage = `${scenario}:verification`;
  return cutoff;
}
async function snapshot() {
  const data: Record<string, string> = {};
  for (const table of tables) {
    const result = await database!.query(`SELECT coalesce(json_agg(t ORDER BY t."id"), '[]')::text AS snapshot FROM "public"."${table}" t WHERE "id" = ANY($1::uuid[])`, [ids[table]]);
    data[table] = result.rows[0].snapshot;
  }
  return data;
}
async function cli(args: string[], url: string) {
  return new Promise<Record<string, unknown>>(function (resolve, reject) {
    const child = spawn(process.execPath, ["--conditions=react-server", "scripts/cleanup-expired.ts", ...args],
      { windowsHide: true, env: { ...process.env, DATABASE_URL: url }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += String(chunk); });
    // Never echo stderr/driver payloads; the subprocess itself sanitizes them.
    child.stderr.resume(); child.on("error", () => reject(new Error("CLI_SPAWN")));
    child.on("close", code => {
      try { assert.equal(code, 0); resolve(JSON.parse(output)); } catch { reject(new Error("CLI_FAILED")); }
    });
  });
}
function wrap(client: PoolClient, afterSelect?: () => Promise<void>, failCommit = false): CleanupConnection {
  return { async query(text, values) {
    if (failCommit && text === "COMMIT") throw new Error("INJECTED_TRANSACTION_FAILURE");
    const result = await client.query(text, values);
    if (text.startsWith('SELECT "id"')) await afterSelect?.();
    return result;
  } };
}
try {
  if (process.argv.length !== 2 || process.env.CLEANUP_DISPOSABLE_ACK !== "I_CONFIRM_EMPTY_DISPOSABLE_DATABASE") throw new Error("OPT_IN_REQUIRED");
  const target = cleanupDatabaseUrl({ DATABASE_URL: process.env.TEST_CLEANUP_DATABASE_URL });
  const ordinary = cleanupDatabaseUrl(process.env);
  if (target === ordinary) throw new Error("DISTINCT_DATABASE_REQUIRED");
  // Verify actual database identities, not URL spelling. Conservatively require different DB names,
  // even if separate servers happen to use the same name. Ordinary DB receives only this SELECT.
  stage = "database-identity";
  const normalClient = await connect(ordinary);
  const identitySql = "SELECT current_database() AS name, (SELECT oid FROM pg_database WHERE datname=current_database())::text AS oid, inet_server_addr()::text AS address, inet_server_port() AS port";
  const normalIdentity = (await normalClient.query(identitySql)).rows[0];
  database = await connect(target);
  const testIdentity = (await database.query(identitySql)).rows[0];
  assert.notEqual(testIdentity.name, normalIdentity.name, "DISTINCT_DATABASE_REQUIRED");
  assert.notDeepEqual(testIdentity, normalIdentity, "DISTINCT_DATABASE_REQUIRED");
  // Require migrated, initially empty target tables. No provisioning/reset/install.
  stage = "empty-target-guard";
  for (const table of tables) assert.equal((await database.query(`SELECT count(*)::int AS n FROM "public"."${table}"`)).rows[0].n, 0, "EMPTY_DATABASE_REQUIRED");
  fixturesAllowed = true;
  const peer = await connect(target), peer2 = await connect(target);
  stage = "CLI-sequence";
  let cutoff = await seed(stage); const before = await snapshot();
  stage = "CLI-dry-run";
  const dry = await cli([], target); assert.deepEqual(await snapshot(), before);
  stage = "CLI-execute";
  const executed = await cli(["--execute", "--batch-size", "2"], target);
  stage = "CLI-no-op";
  const noop = await cli(["--execute"], target);
  stage = "CLI-assertions";
  for (const report of [dry, executed, noop]) assert.equal(report.status, "complete");
  const dryCounts = dry.counts as Record<string, { selected: number; deleted: number }>;
  const executeCounts = executed.counts as typeof dryCounts, noopCounts = noop.counts as typeof dryCounts;
  const after = await snapshot();
  for (const table of tables) {
    assert.equal(dryCounts[table].selected, 4); assert.equal(dryCounts[table].deleted, 0);
    assert.equal(executeCounts[table].deleted, 4); assert.equal(noopCounts[table].deleted, 0);
    const live = JSON.parse(before[table]).filter((row: { id: string }) => row.id === ids[table][4]);
    assert.deepEqual(JSON.parse(after[table]), live);
  }
  results.push({ scenario: "actual CLI dry-run/execute/no-op", before: { Source: 5, TranscriptCache: 5 }, dry, executed, noop,
    remaining: { Source: 1, TranscriptCache: 1 }, byteIdenticalDryRun: true, livePreserved: true });

  stage = "boundary"; cutoff = await seed(stage);
  const boundary = await cleanup(createPostgresCleanupStore(database), { ...defaults, execute: true }, undefined, () => +cutoff);
  for (const table of tables) assert.equal(boundary.counts[table].deleted, 4);
  results.push({ scenario: "exact boundary", report: boundary });

  stage = "refresh-before-selection"; cutoff = await seed(stage); let refreshed = false;
  const refresh = await cleanup(createPostgresCleanupStore(wrap(database, async () => {
    if (!refreshed) { refreshed = true; await peer.query('UPDATE "public"."TranscriptCache" SET "expiresAt" = $2 WHERE "id" = $1', [ids.TranscriptCache[0], new Date(+cutoff + 600_000)]); }
  })), { ...defaults, execute: true }, undefined, () => +cutoff);
  assert.equal(refresh.counts.TranscriptCache.deleted, 3);
  assert.equal((await database.query('SELECT count(*)::int AS n FROM "public"."TranscriptCache" WHERE "id" = $1', [ids.TranscriptCache[0]])).rows[0].n, 1);
  results.push({ scenario: "refresh before cache selection", report: refresh });

  // Refresh specifically AFTER candidate selection, before deletion.
  stage = "refresh-after-selection"; cutoff = await seed(stage); refreshed = false;
  const refreshConnection: CleanupConnection = { async query(text, values) {
    const result = await database!.query(text, values);
    if (!refreshed && text.startsWith('SELECT "id"') && text.includes('"TranscriptCache"')) {
      refreshed = true; await peer.query('UPDATE "public"."TranscriptCache" SET "expiresAt"=$2 WHERE "id"=$1', [ids.TranscriptCache[0], new Date(+cutoff + 600_000)]);
    }
    return result;
  } };
  const racedRefresh = await cleanup(createPostgresCleanupStore(refreshConnection), { ...defaults, execute: true }, undefined, () => +cutoff);
  assert.equal(racedRefresh.counts.TranscriptCache.selected, 4); assert.equal(racedRefresh.counts.TranscriptCache.deleted, 3);
  results.push({ scenario: "cache refresh after selection", report: racedRefresh });

  stage = "overlapping-cleaners"; cutoff = await seed(stage); let arrivals = 0; let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const overlap = () => { let first = true; return async () => { if (first) { first = false; if (++arrivals === 2) release(); await barrier; } }; };
  const cleaners = await Promise.all([database, peer].map(client => cleanup(createPostgresCleanupStore(wrap(client, overlap())),
    { ...defaults, execute: true }, undefined, () => +cutoff)));
  for (const table of tables) assert.equal(cleaners.reduce((n, r) => n + r.counts[table].deleted, 0), 4);
  assert.ok(cleaners.every(r => r.status === "complete")); results.push({ scenario: "overlapping cleaners", reports: cleaners });

  stage = "replacement"; cutoff = await seed(stage); let replaced = false;
  const replacement = await cleanup(createPostgresCleanupStore(wrap(database, async () => {
    if (!replaced) {
      replaced = true;
      await peer.query("BEGIN");
      try {
        await peer.query('DELETE FROM "public"."Source" WHERE "id"=ANY($1::uuid[]) AND "ownerSessionHash"=$2', [ids.Source, owner]);
        stage = "replacement:insert-active-source";
        await peer.query(`INSERT INTO "public"."Source" ("id", "ownerSessionHash", "uploadedPdfOwner", "kind", "title", "fullText", "sections", "extractionStatus", "provider", "updatedAt", "expiresAt")
          VALUES ($1,$2,$2,'PDF',$3,'synthetic replacement','[]','READY','pdf-parse@2.4.5',now(),$4)`, [ids.Source[4], owner, marker, new Date(+cutoff + 600_000)]);
        stage = "replacement:commit";
        await peer.query("COMMIT");
        stage = "replacement:verification";
      } catch (error) { await peer.query("ROLLBACK"); throw error; }
    }
  })), { ...defaults, execute: true }, undefined, () => +cutoff);
  assert.equal(replacement.counts.Source.deleted, 0);
  assert.equal((await database.query('SELECT count(*)::int AS n FROM "public"."Source" WHERE "uploadedPdfOwner"=$1', [owner])).rows[0].n, 1);
  results.push({ scenario: "simultaneous replacement transaction", report: replacement });

  stage = "rollback"; cutoff = await seed(stage); const rollbackBefore = await snapshot();
  const rollback = await cleanup(createPostgresCleanupStore(wrap(database, undefined, true)), { ...defaults, execute: true }, undefined, () => +cutoff);
  assert.equal(rollback.status, "error"); assert.deepEqual(await snapshot(), rollbackBefore);
  results.push({ scenario: "failure before commit rolls back", report: rollback });

  for (const cancel of [false, true]) {
    stage = cancel ? "cancel-lock-wait" : "lock-wait";
    cutoff = await seed(stage); const lockedBefore = await snapshot();
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    await peer2.query("BEGIN");
    try {
      await peer2.query('SELECT "id" FROM "public"."Source" WHERE "id"=ANY($1::uuid[]) FOR UPDATE', [ids.Source]);
      if (cancel) timer = setTimeout(() => controller.abort(), 50);
      const start = Date.now();
      const result = await cleanup(createPostgresCleanupStore(database), { ...defaults, execute: true }, controller.signal, () => Date.now());
      assert.equal(result.status, cancel ? "cancelled" : "error"); assert.ok(Date.now() - start < 5000);
      assert.deepEqual(await snapshot(), lockedBefore);
      results.push({ scenario: cancel ? "cancel during bounded row-lock wait" : "bounded row-lock wait", report: result });
    } finally { if (timer) clearTimeout(timer); await peer2.query("ROLLBACK"); }
  }
  for (const phase of ["before", "during", "between"] as const) {
    stage = `cancel-${phase}`;
    cutoff = await seed(stage); const controller = new AbortController();
    if (phase === "before") controller.abort();
    const store = createPostgresCleanupStore(wrap(database, phase === "during" ? async () => { controller.abort(); } : undefined));
    const batch = store.batch;
    store.batch = async (request: BatchRequest) => { const result = await batch(request); if (phase === "between") controller.abort(); return result; };
    const report = await cleanup(store, { ...defaults, execute: true, batchSize: 2 }, controller.signal, () => +cutoff);
    assert.equal(report.status, "cancelled"); assert.equal(report.counts.Source.deleted, phase === "between" ? 2 : 0);
    results.push({ scenario: `cancel ${phase}`, report });
  }
  stage = "fixture-teardown-verification";
  await removeFixtures();
  for (const table of tables) assert.equal((await database.query(`SELECT count(*)::int AS n FROM "public"."${table}" WHERE "id"=ANY($1::uuid[])`, [ids[table]])).rows[0].n, 0);
  succeeded = true;
} catch {
  // Assertion details can contain fixture payloads/SQL/connection info. Keep them private.
  process.stderr.write(JSON.stringify({ status: "FAIL", category: "DISPOSABLE_VALIDATION_OR_ASSERTION", stage }) + "\n");
  process.exitCode = 1;
} finally {
  try { await removeFixtures(); } catch { process.stderr.write('{"status":"FAIL","category":"FIXTURE_TEARDOWN_FAILED"}\n'); process.exitCode = 1; }
  for (const client of clients) client.release(true);
  const closed = await Promise.allSettled(pools.map(pool => pool.end()));
  if (closed.some(r => r.status === "rejected")) process.exitCode = 1;
  clearTimeout(watchdog);
}
if (succeeded && process.exitCode !== 1) process.stdout.write(JSON.stringify({ status: "PASS",
  environment: "explicit disposable PostgreSQL; synthetic fixtures", results, ownFixturesRemaining: 0,
  teardown: { clientsReleased: clients.length, poolsClosed: pools.length } }) + "\n");
