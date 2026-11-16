import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { Pool } from "pg";
import { observe } from "./observability.ts";

export function createDatabaseClient(connectionString: string) {
  // Set per-connection PostgreSQL deadlines at startup, including reads outside a transaction.
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000,
    statement_timeout: 3000, lock_timeout: 1500, idle_in_transaction_session_timeout: 5000 });
  // Prevent an idle-connection outage from becoming an unhandled EventEmitter error.
  pool.on("error", () => observe("db.query", 0, true));
  const database = new PrismaClient({ adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    log: process.env.OPERATIONAL_METRICS === "true" ? [{ emit: "event", level: "query" }] : [] });
  database.$on("query", event => observe("db.query", event.duration));
  return { database, pool };
}
