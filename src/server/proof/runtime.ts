import "server-only";
import { getDatabase } from "../db";
import { parseProofConfig } from "./config";
import { createProofHandlers } from "./handlers";
import { createMint } from "./provider";
import type { ProofStore } from "./source";

const select = { id: true, ownerSessionHash: true, title: true, fullText: true,
  provider: true, extractionStatus: true, expiresAt: true } as const;
const store: ProofStore = {
  get: id => getDatabase().source.findUnique({ where: { id }, select }),
  createOnce: record => getDatabase().source.upsert({
    where: { id: record.id }, update: {},
    create: { ...record, kind: "PDF", extractionStatus: "READY", characterCount: record.fullText.length,
      wordCount: record.fullText.split(/\s+/).length, warnings: ["Synthetic proof only; no PDF was imported."] }, select,
  }),
};

// Share admission across route bundles in this single Node process, never per request.
const processState = globalThis as unknown as { proofHandlers02a?: ReturnType<typeof createProofHandlers> };
export const proofHandlers = processState.proofHandlers02a ??= createProofHandlers({
  config: () => parseProofConfig(process.env), store, mint: createMint(),
});
