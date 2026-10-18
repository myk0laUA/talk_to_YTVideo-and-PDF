import "server-only";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";
import { SourceError, UPLOADED_PDF_PARSER, type SourceRepository, type UploadedSource } from "./service.ts";

const select = { id: true, ownerSessionHash: true, uploadedPdfOwner: true, kind: true, extractionStatus: true,
  canonicalOrigin: true, provider: true, title: true, fullText: true, sections: true, pageCount: true,
  characterCount: true, wordCount: true, warnings: true, expiresAt: true } as const;
const identity = (owner: string) => ({ ownerSessionHash: owner, uploadedPdfOwner: owner,
  kind: "PDF" as const, extractionStatus: "READY" as const, provider: UPLOADED_PDF_PARSER, canonicalOrigin: null });
const owned = (id: string, owner: string, at: Date) => ({ ...identity(owner), id, expiresAt: { gt: at } });
type Row = Prisma.SourceGetPayload<{ select: typeof select }>;
function record(row: Row): UploadedSource {
  // Stored JSON comes only from the parser on writes; validate its shape on reads too.
  if (!row.pageCount || !Array.isArray(row.sections) || !Array.isArray(row.warnings)
    || !row.warnings.every(w => typeof w === "string") || row.sections.length !== row.pageCount
    || !row.sections.every((s, i) => s && typeof s === "object" && !Array.isArray(s)
      && s.id === `page-${i + 1}` && s.pageNumber === i + 1 && typeof s.text === "string")
    || row.fullText !== row.sections.map(s => (s as { text: string }).text).join("\n\n")
    || row.characterCount !== row.fullText.length) throw new SourceError("storage_unavailable");
  // Copy explicit fields; never hand a Prisma object or arbitrary JSON properties to a DTO.
  return { ...row, pageCount: row.pageCount, warnings: row.warnings as string[],
    sections: row.sections.map(s => { const section = s as { id: string; pageNumber: number; text: string };
      return { id: section.id, pageNumber: section.pageNumber, text: section.text }; }) };
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
    replace: (value, guard) => transaction(async tx => {
      guard();
      // Unique uploadedPdfOwner is the cross-process invariant. Concurrent insert/delete
      // conflicts roll this whole transaction back; no automatic retry of a replacement.
      await tx.source.deleteMany({ where: identity(value.ownerSessionHash) });
      guard();
      const saved = await tx.source.create({ data: { ...value, kind: "PDF", extractionStatus: "READY" }, select });
      guard();
      const result = record(saved);
      if (result.expiresAt.getTime() <= Date.now()) throw new SourceError("visitor_required");
      return result;
    }),
    get: (id, owner, at) => transaction(async tx => {
      const row = await tx.source.findFirst({ where: owned(id, owner, at), select });
      return row ? record(row) : null;
    }),
    remove: (id, owner, at, guard) => transaction(async tx => {
      guard();
      const row = await tx.source.findFirst({ where: owned(id, owner, new Date(Math.max(at.getTime(), Date.now()))), select: { expiresAt: true } });
      guard();
      if (!row || row.expiresAt.getTime() <= Date.now()) return false;
      const result = await tx.source.deleteMany({ where: owned(id, owner, new Date()) });
      guard();
      if (row.expiresAt.getTime() <= Date.now()) throw new SourceError("unavailable");
      return result.count === 1;
    }),
  };
}
