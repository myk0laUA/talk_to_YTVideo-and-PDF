import "server-only";
import { config } from "dotenv";
import { Pool } from "pg";
import { createPostgresCleanupStore } from "../src/server/cleanup/postgres.ts";
import { runCleanupCli } from "./lib/cleanup-cli.ts";

if (process.argv.slice(2).length === 1 && process.argv[2] === "--help") {
  process.stdout.write("npm run db:cleanup -- [--execute] [--batch-size 1..500] [--max-rows 1..5000] [--max-batches 1..100] [--timeout-ms 1..60000]\nDefault: dry-run, batch 100, total 1000, 20 batches, 30000ms. Explicit DATABASE_URL required. Exit 0 complete scan, 2 capped, 1 error/cancel/timeout. Read README.md#expired-data-cleanup.\n");
} else {
  config({ quiet: true });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  // Final backstop for a broken driver/network during shutdown; never a success report.
  const watchdog = setTimeout(() => {
    process.stderr.write('{"status":"error","category":"PROCESS_TIMEOUT","progress":"unknown; inspect prior report"}\n');
    process.exit(1);
  }, 70_000);
  try {
    process.exitCode = await runCleanupCli(process.argv.slice(2), process.env, async connectionString => {
      const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 1500, idleTimeoutMillis: 1000,
        statement_timeout: 1500, lock_timeout: 500, idle_in_transaction_session_timeout: 3000,
        query_timeout: 5000, application_name: "talk-to-document-cleanup-11a" });
      pool.on("error", () => {});
      try {
        const client = await pool.connect();
        return { store: createPostgresCleanupStore(client), close: async () => { client.release(true); await pool.end(); } };
      } catch (error) { await pool.end(); throw error; }
    }, line => process.stdout.write(line + "\n"), controller.signal);
  } finally {
    clearTimeout(watchdog); process.off("SIGINT", stop); process.off("SIGTERM", stop);
  }
}
