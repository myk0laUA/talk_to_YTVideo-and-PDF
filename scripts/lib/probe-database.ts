import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { Pool } from "pg";
import type { ProbeDatabase } from "./db-persistence.ts";

// Separate operator lifetime: the application's lazy singleton remains unchanged.
export function openProbeDatabase(connectionString: string): ProbeDatabase {
  const pool = new Pool({
    connectionString, max: 1, connectionTimeoutMillis: 5_000,
    statement_timeout: 5_000, query_timeout: 7_000, idleTimeoutMillis: 1_000,
    application_name: "talk-to-document-db-probe-v1",
  });
  // pg idle errors must not become uncaught exceptions containing connection data.
  pool.on("error", () => {});
  const client = new PrismaClient({
    adapter: new PrismaPg(pool, { onPoolError: () => {}, onConnectionError: () => {} }), log: [],
  });
  return {
    async create(data) { await client.source.create({ data, select: { id: true } }); },
    async find(id) { return client.source.findUnique({ where: { id } }); },
    async deleteFixture(where) { return (await client.source.deleteMany({ where })).count; },
    async close() {
      const outcomes = await Promise.allSettled([client.$disconnect(), pool.end()]);
      if (outcomes.some((outcome) => outcome.status === "rejected")) throw new Error("CLOSE_FAILED");
    },
  };
}
