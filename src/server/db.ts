import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { createDatabaseClient } from "./database-client";
import { startOperationalLogging } from "./observability";
import { getServerEnvironment } from "./env";
import { requireDatabaseUrl } from "./env-schema";

const globalForDatabase = globalThis as unknown as { database?: PrismaClient };

// Lazy construction keeps the shell/build independent of database availability.
// This low-level client does not authorize requests; future source services must.
export function getDatabase(): PrismaClient {
  if (!globalForDatabase.database) {
    const connectionString = requireDatabaseUrl(getServerEnvironment());
    const { database, pool } = createDatabaseClient(connectionString);
    globalForDatabase.database = database;
    startOperationalLogging(() => ({ total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }));
  }
  return globalForDatabase.database;
}
