import "server-only";
import { createHash } from "node:crypto";
import type { Visitor } from "./visitor.ts";
import type { ProofSourceDto } from "../../shared/proof.ts";

export const PROOF_TITLE = "Synthetic voice proof";
export const PROOF_TEXT = "This is a synthetic test source, not an uploaded document. The imaginary blue lighthouse has seven windows. Its keeper is named Rowan.";
export const PROOF_PROVIDER = "synthetic-proof-02a-v1";
export type ProofRecord = {
  id: string; ownerSessionHash: string; title: string; fullText: string;
  provider: string | null; extractionStatus: string; expiresAt: Date;
};
export type ProofStore = {
  get(id: string): Promise<ProofRecord | null>;
  createOnce(record: ProofRecord): Promise<ProofRecord>;
};

export function proofId(owner: string): string {
  const h = createHash("sha256").update(`proof-id-v1:${owner}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function isOwnedReady(record: ProofRecord | null, visitor: Visitor, now: number): record is ProofRecord {
  return Boolean(record && visitor.expiresAt * 1000 > now && record.ownerSessionHash === visitor.owner
    && record.id === proofId(visitor.owner) && record.expiresAt.getTime() > now
    && record.extractionStatus === "READY" && record.provider === PROOF_PROVIDER
    && record.fullText === PROOF_TEXT && record.title === PROOF_TITLE);
}

export async function establishProof(store: ProofStore, visitor: Visitor, now: () => number): Promise<ProofSourceDto> {
  const record = await store.createOnce({ id: proofId(visitor.owner), ownerSessionHash: visitor.owner,
    title: PROOF_TITLE, fullText: PROOF_TEXT, provider: PROOF_PROVIDER, extractionStatus: "READY",
    expiresAt: new Date(visitor.expiresAt * 1000) });
  if (!isOwnedReady(record, visitor, now())) throw new Error("Source unavailable");
  return { id: record.id, title: PROOF_TITLE, text: PROOF_TEXT, expiresAt: record.expiresAt.toISOString() };
}
