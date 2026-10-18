// Test-only Prisma repository boundary. This models atomic transactions/uniqueness;
// it cannot prove PostgreSQL lock scheduling, constraints, durability or rollback.
import assert from "node:assert/strict";
import type { PrismaClient } from "../../src/generated/prisma/client.ts";
import type { UploadedSource } from "../../src/server/sources/service.ts";
import type { Prisma } from "../../src/generated/prisma/client.ts";

type Where = Record<string, unknown>;
export class SyntheticSourceDatabase {
  rows = new Map<string, UploadedSource>();
  cacheRows = new Map<string, Prisma.TranscriptCacheGetPayload<object>>();
  cacheReads = 0;
  cacheWrites = 0;
  failCacheRead = false;
  delayCacheReadMs = 0;
  failCacheWrite = false;
  transactions = 0;
  deletes = 0;
  creates = 0;
  reads = 0;
  failCreate = false;
  delayCreateMs = 0;
  delayReadMs = 0;
  afterCreate?: () => void;
  private queue: Promise<unknown> = Promise.resolve();
  private matches(row: UploadedSource, where: Where): boolean {
    return Object.entries(where).every(([key, value]) => key === "OR" ? (value as Where[]).some(w => this.matches(row, w)) : key === "expiresAt"
      ? row.expiresAt.getTime() > (value as { gt: Date }).gt.getTime()
      : value && typeof value === "object" && "in" in value ? (value.in as unknown[]).includes(row[key as keyof UploadedSource])
      : value && typeof value === "object" && "not" in value ? row[key as keyof UploadedSource] !== value.not
      : row[key as keyof UploadedSource] === value);
  }
  asClient(): PrismaClient { return this as unknown as PrismaClient; }
  $transaction<T>(callback: (tx: unknown) => Promise<T>, options: unknown): Promise<T> {
    assert.deepEqual(options, { maxWait: 2000, timeout: 5000, isolationLevel: "ReadCommitted" });
    const work = this.queue.then(async () => {
      this.transactions++;
      const staged = structuredClone(this.rows);
      const cache = structuredClone(this.cacheRows);
      const tx = {
        $queryRaw: async (sql: TemplateStringsArray) => {
          assert.match(sql.join(""), /lock_timeout.*1500ms.*statement_timeout.*3000ms/); return [];
        },
        source: {
          deleteMany: async ({ where }: { where: Where }) => {
            this.deletes++;
            assert.equal(where.ownerSessionHash, where.activeSourceOwner);
            assert.equal(where.extractionStatus, "READY"); assert.equal((where.OR as unknown[]).length, 2);
            let count = 0;
            for (const [id, row] of staged) if (this.matches(row, where)) { staged.delete(id); count++; }
            return { count };
          },
          create: async ({ data }: { data: UploadedSource }) => {
            this.creates++;
            if (this.delayCreateMs) await new Promise(resolve => setTimeout(resolve, this.delayCreateMs));
            if (this.failCreate) { this.failCreate = false; throw new Error("PRIVATE SQL postgresql://hidden"); }
            if ([...staged.values()].some(row => row.activeSourceOwner === data.activeSourceOwner)) {
              throw Object.assign(new Error("PRIVATE UNIQUE"), { code: "P2002" });
            }
            staged.set(data.id, structuredClone(data)); this.afterCreate?.();
            return structuredClone(data);
          },
          findFirst: async ({ where }: { where: Where }) => {
            this.reads++;
            assert.ok(where.id); assert.ok(where.expiresAt);
            assert.equal(where.ownerSessionHash, where.activeSourceOwner);
            assert.equal(where.extractionStatus, "READY"); assert.equal((where.OR as unknown[]).length, 2);
            const row = [...staged.values()].find(row => this.matches(row, where));
            if (this.delayReadMs) await new Promise(resolve => setTimeout(resolve, this.delayReadMs));
            return row ? structuredClone(row) : null;
          },
        },
        transcriptCache: {
          findUnique: async ({ where }: { where: { videoId_languagePreference_mode: unknown } }) => {
            this.cacheReads++;
            if (this.delayCacheReadMs) await new Promise(resolve => setTimeout(resolve, this.delayCacheReadMs));
            if (this.failCacheRead) { this.failCacheRead = false; throw new Error("PRIVATE cache read"); }
            return structuredClone(cache.get(JSON.stringify(where.videoId_languagePreference_mode)) ?? null);
          },
          upsert: async ({ where, create, update }: { where: { videoId_languagePreference_mode: unknown };
            create: Prisma.TranscriptCacheGetPayload<object>; update: Prisma.TranscriptCacheGetPayload<object> }) => {
            this.cacheWrites++;
            if (this.failCacheWrite) { this.failCacheWrite = false; throw new Error("PRIVATE cache write"); }
            const key = JSON.stringify(where.videoId_languagePreference_mode);
            assert.deepEqual(create, update);
            cache.set(key, structuredClone(create));
            return { id: "synthetic-cache-id" };
          },
        },
      };
      const result = await callback(tx);
      this.rows = staged;
      this.cacheRows = cache;
      return result;
    });
    this.queue = work.catch(() => {});
    return work;
  }
}
