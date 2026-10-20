import "server-only";
import { sourceChanged } from "./invalidation.ts";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";
import { checkedSource, SourceError, UPLOADED_PDF_PARSER, type SourceRepository, type UploadedSource } from "./service.ts";

const select = { id: true, ownerSessionHash: true, activeSourceOwner: true, kind: true, extractionStatus: true, language: true,
  canonicalOrigin: true, provider: true, title: true, fullText: true, sections: true, pageCount: true,
  characterCount: true, wordCount: true, warnings: true, expiresAt: true } as const;
const identity = (owner: string) => ({ ownerSessionHash: owner, activeSourceOwner: owner, extractionStatus: "READY" as const,
  OR: [{ kind: "PDF" as const, provider: UPLOADED_PDF_PARSER, canonicalOrigin: null },
    { kind: "YOUTUBE" as const, provider: { in: ["youtube-transcript-plus@2.0.3", "supadata"] }, canonicalOrigin: { not: null } }] });
const owned = (id: string, owner: string, at: Date) => ({ ...identity(owner), id, expiresAt: { gt: at } });
type Row = Prisma.SourceGetPayload<{ select: typeof select }>;
function record(row: Row): UploadedSource {
  return checkedSource(row);
}
function storageError(error: unknown): never {
  if (error instanceof SourceError) throw error;
  if (error && typeof error === "object" && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
    throw new SourceError("replacement_conflict");
  }
  throw new SourceError("storage_unavailable");
}
export function createSourceRepository(database: () => PrismaClient): SourceRepository {
  const transaction = async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
    try { return await database().$transaction(async tx => {
      // Bound PostgreSQL row-lock/statement waits as well as Prisma's transaction lifecycle.
      await tx.$queryRaw`SELECT set_config('lock_timeout', '1500ms', true), set_config('statement_timeout', '3000ms', true)`;
      return work(tx);
    }, { maxWait: 2000, timeout: 5000, isolationLevel: "ReadCommitted" }); }
    catch (error) { return storageError(error); }
  };
  return {
    replace: async (value, guard) => {
      const saved = await transaction(async tx => {
        guard();
        const candidate = checkedSource(value);
        if (candidate.activeSourceOwner !== candidate.ownerSessionHash) throw new SourceError("storage_unavailable");
        // Unique activeSourceOwner (legacy SQL column) is the cross-process invariant. Concurrent insert/delete
        // conflicts roll this whole transaction back; no automatic retry of a replacement.
        await tx.source.deleteMany({ where: identity(value.ownerSessionHash) });
        guard();
        const saved = await tx.source.create({ data: { ...candidate, kind: candidate.kind as "PDF" | "YOUTUBE", extractionStatus: "READY" }, select });
        guard();
        const result = record(saved);
        if (result.expiresAt.getTime() <= Date.now()) throw new SourceError("visitor_required");
        return result;
      });
      sourceChanged(value.ownerSessionHash);
      return saved;
    },
    get: (id, owner, at) => transaction(async tx => {
      const row = await tx.source.findFirst({ where: owned(id, owner, at), select });
      return row ? record(row) : null;
    }),
    remove: async (id, owner, at, guard) => {
      const removed = await transaction(async tx => {
        guard();
        const row = await tx.source.findFirst({ where: owned(id, owner, new Date(Math.max(at.getTime(), Date.now()))), select: { expiresAt: true } });
        guard();
        if (!row || row.expiresAt.getTime() <= Date.now()) return false;
        const result = await tx.source.deleteMany({ where: owned(id, owner, new Date()) });
        guard();
        if (row.expiresAt.getTime() <= Date.now()) throw new SourceError("unavailable");
        return result.count === 1;
      });
      if (removed) sourceChanged(owner);
      return removed;
    },
  };
}
