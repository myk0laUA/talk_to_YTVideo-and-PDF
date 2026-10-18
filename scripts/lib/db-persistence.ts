// Operator-only logic. No environment access, generated client or app imports.
import { randomBytes, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { parseServerEnvironment, requireDatabaseUrl } from "../../src/server/env-schema.ts";

export const TTL_MS = 2 * 60 * 60 * 1000;
export type Mode = "write" | "verify" | "cleanup";
export type Category = "USAGE" | "CONFIGURATION" | "MANIFEST" | "DATABASE" | "TIMEOUT" | "MISSING" | "EXPIRED" | "ALTERED" | "IDENTITY_MISMATCH";
export class ProbeError extends Error {
  readonly category: Category;
  constructor(category: Category) {
    super(category);
    this.category = category;
  }
}

export interface Manifest {
  version: 1;
  id: string;
  runId: string;
  ownerSessionHash: string;
  createdAt: string;
  expiresAt: string;
}

export function createManifest(now = new Date()): Manifest {
  return {
    version: 1, id: randomUUID(), runId: randomUUID(),
    ownerSessionHash: randomBytes(32).toString("hex"),
    createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
  };
}

export function parseManifest(value: unknown): Manifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProbeError("MANIFEST");
  const m = value as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const iso = (v: unknown): v is string => typeof v === "string"
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
  if (Object.keys(m).sort().join() !== "createdAt,expiresAt,id,ownerSessionHash,runId,version"
    || m.version !== 1 || typeof m.id !== "string" || !uuid.test(m.id)
    || typeof m.runId !== "string" || !uuid.test(m.runId)
    || typeof m.ownerSessionHash !== "string" || !/^[0-9a-f]{64}$/.test(m.ownerSessionHash)
    || !iso(m.createdAt) || !iso(m.expiresAt)
    || Date.parse(m.expiresAt) - Date.parse(m.createdAt) !== TTL_MS) throw new ProbeError("MANIFEST");
  return m as unknown as Manifest;
}

export function databaseUrl(input: Record<string, string | undefined>): string {
  try {
    const value = requireDatabaseUrl(parseServerEnvironment(input));
    const url = new URL(value);
    // Never override provider TLS settings with a permissive SSL object.
    if (input.NODE_TLS_REJECT_UNAUTHORIZED === "0"
      || url.searchParams.get("sslmode") === "no-verify"
      || url.searchParams.get("uselibpqcompat") === "true") throw new Error();
    return value;
  } catch {
    throw new ProbeError("CONFIGURATION");
  }
}

export function fixture(m: Manifest) {
  const sections = [
    { page: 1, text: `DB-PROBE ${m.runId} BEGIN. Synthetic amber marker.` },
    { page: 2, text: `DB-PROBE ${m.runId} END. Synthetic violet marker.` },
  ];
  const fullText = sections.map((section) => section.text).join("\n\n");
  return {
    id: m.id, ownerSessionHash: m.ownerSessionHash, kind: "PDF" as const,
    canonicalOrigin: `urn:talk-to-document:db-probe:v1:${m.runId}`,
    title: `Database persistence fixture ${m.runId}`, fullText, sections,
    language: "en", provider: "operator-db-probe-v1", extractionStatus: "READY" as const,
    providerJobId: null, characterCount: fullText.length, wordCount: fullText.split(/\s+/u).length,
    pageCount: 2, warnings: [], createdAt: new Date(m.createdAt), updatedAt: new Date(m.createdAt),
    expiresAt: new Date(m.expiresAt),
  };
}
export type Fixture = ReturnType<typeof fixture>;
export function identity(m: Manifest) {
  const f = fixture(m);
  return {
    id: f.id, ownerSessionHash: f.ownerSessionHash, canonicalOrigin: f.canonicalOrigin,
    provider: f.provider, title: f.title, kind: f.kind, createdAt: f.createdAt, expiresAt: f.expiresAt,
  };
}
export type Identity = ReturnType<typeof identity>;
export interface ProbeDatabase {
  create(data: Fixture): Promise<void>;
  find(id: string): Promise<Record<string, unknown> | null>;
  // Must be one atomic conditional delete of ALL identity fields; no ID-only deletion.
  deleteFixture(where: Identity): Promise<number>;
  close(): Promise<void>;
}

export async function perform(mode: Mode, m: Manifest, db: ProbeDatabase, now = () => new Date(), signal?: AbortSignal) {
  if (signal?.aborted) throw new ProbeError("TIMEOUT");
  if (mode !== "cleanup" && Date.parse(m.expiresAt) <= now().getTime()) throw new ProbeError("EXPIRED");
  if (mode === "write") {
    await db.create(fixture(m));
    return "WRITTEN";
  }
  const row = await db.find(m.id);
  if (signal?.aborted) throw new ProbeError("TIMEOUT");
  if (!row) {
    if (mode === "cleanup") return "ALREADY_ABSENT";
    throw new ProbeError("MISSING");
  }
  if (mode === "verify") {
    if (!isDeepStrictEqual(row, fixture(m))) throw new ProbeError("ALTERED");
    if (Date.parse(m.expiresAt) <= now().getTime()) throw new ProbeError("EXPIRED");
    return "VERIFIED";
  }
  const expected = identity(m);
  if (!Object.entries(expected).every(([key, value]) => isDeepStrictEqual(row[key], value))) {
    throw new ProbeError("IDENTITY_MISMATCH");
  }
  if (await db.deleteFixture(expected) !== 1) throw new ProbeError("IDENTITY_MISMATCH");
  return "REMOVED";
}

async function bounded<T>(work: Promise<T>, ms: number, onTimeout = () => {}) : Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { onTimeout(); reject(new ProbeError("TIMEOUT")); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}

export async function runProbe(
  mode: Mode, manifest: Manifest, open: () => ProbeDatabase,
  limits = { operationMs: 12_000, closeMs: 3_000 },
) {
  let db: ProbeDatabase | undefined;
  let result: string | undefined;
  let failure: unknown;
  const controller = new AbortController();
  try {
    db = open();
    result = await bounded(perform(mode, manifest, db, () => new Date(), controller.signal),
      limits.operationMs, () => controller.abort());
  } catch (error) { failure = error; }
  finally {
    controller.abort();
    if (db) {
      try { await bounded(db.close(), limits.closeMs); }
      catch (error) { failure ??= error; }
    }
  }
  if (failure) throw failure instanceof ProbeError ? failure : new ProbeError("DATABASE");
  return result;
}
