import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnvironment } from "./env";
import { requireDatabaseUrl } from "./env-schema";

const globalForDatabase = globalThis as unknown as { database?: PrismaClient };

// Lazy construction keeps the shell/build independent of database availability.
// This low-level client does not authorize requests; future source services must.
export function getDatabase(): PrismaClient {
  if (!globalForDatabase.database) {
    const connectionString = requireDatabaseUrl(getServerEnvironment());
    globalForDatabase.database = new PrismaClient({
      adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000 }),
    });
  }
  return globalForDatabase.database;
}
