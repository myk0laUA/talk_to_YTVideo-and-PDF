import "server-only";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";
import type { CaptionTranscript } from "../../shared/captions.ts";
import { SourceError } from "../sources/service.ts";
import { normalizeVideo, validLanguage } from "./input.ts";
import { validatedTranscript } from "./validated.ts";

export const captionCacheTtlMs = 24 * 60 * 60 * 1000;
// Empty preference means the provider's default track; it is distinct from explicit "en".
// Language tags are case-insensitive keys. Keep the provider's selected tag separately.
export type CaptionCacheKey = { videoId: string; languagePreference: string; mode: "native" };
export function captionCacheKey(videoId: string, language?: string): CaptionCacheKey {
  if (normalizeVideo(videoId)?.videoId !== videoId || (language !== undefined && !validLanguage(language))) {
    throw new SourceError("malformed");
  }
  return { videoId, languagePreference: language?.toLowerCase() ?? "", mode: "native" };
}
export type CaptionCache = {
  get(key: CaptionCacheKey, at: Date): Promise<CaptionTranscript | null>;
  put(key: CaptionCacheKey, transcript: CaptionTranscript, at: Date): Promise<void>;
};
const select = { videoId: true, languagePreference: true, mode: true, selectedLanguage: true, provider: true,
  providerMetadata: true, title: true, fullText: true, sections: true, characterCount: true, wordCount: true, expiresAt: true } as const;
type Row = Prisma.TranscriptCacheGetPayload<{ select: typeof select }>;
const words = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;

// Validate BOTH cache identity and the original normalized transcript. Never salvage partial rows.
export function checkedCacheTranscript(row: Row, key: CaptionCacheKey, at: Date): CaptionTranscript | null {
  try {
    if (row.videoId !== key.videoId || row.languagePreference !== key.languagePreference || row.mode !== key.mode
      || key.mode !== "native" || !(row.expiresAt instanceof Date) || !Number.isFinite(row.expiresAt.getTime())
      || row.expiresAt.getTime() <= at.getTime() || row.title !== "YouTube captions"
      || typeof row.fullText !== "string" || row.characterCount !== row.fullText.length || row.wordCount !== words(row.fullText)
      || !row.providerMetadata || typeof row.providerMetadata !== "object" || Array.isArray(row.providerMetadata)
      || Object.keys(row.providerMetadata).some(k => k !== "version" && k !== "trackType")) return null;
    const metadata = row.providerMetadata as Record<string, unknown>;
    if (metadata.version !== 1 || !Array.isArray(row.sections)
      || !row.sections.every((s, i) => s && typeof s === "object" && !Array.isArray(s) && s.id === `segment-${i + 1}`)) return null;
    const transcript = validatedTranscript({ videoId: row.videoId, canonicalUrl: normalizeVideo(row.videoId)?.canonicalUrl,
      language: row.selectedLanguage, provider: row.provider, fullText: row.fullText, segments: row.sections,
      ...(metadata.trackType !== undefined ? { trackType: metadata.trackType } : {}) });
    if (key.languagePreference && transcript.language.toLowerCase() !== key.languagePreference) return null;
    return transcript;
  } catch { return null; }
}

export function createCaptionCache(database: () => PrismaClient, now: () => number = Date.now): CaptionCache {
  const transaction = async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
    try {
      return await database().$transaction(async tx => {
        await tx.$queryRaw`SELECT set_config('lock_timeout', '1500ms', true), set_config('statement_timeout', '3000ms', true)`;
        return work(tx);
      }, { maxWait: 2000, timeout: 5000, isolationLevel: "ReadCommitted" });
    } catch { throw new SourceError("storage_unavailable"); }
  };
  return {
    get: (key, at) => transaction(async tx => {
      const row = await tx.transcriptCache.findUnique({ where: { videoId_languagePreference_mode: key }, select });
      return row ? checkedCacheTranscript(row, key, new Date(Math.max(at.getTime(), now()))) : null;
    }),
    put: (key, value, at) => transaction(async tx => {
      const transcript = validatedTranscript(value);
      const data = { ...key, selectedLanguage: transcript.language, provider: transcript.provider,
        providerMetadata: { version: 1, ...(transcript.trackType ? { trackType: transcript.trackType } : {}) },
        title: "YouTube captions", fullText: transcript.fullText,
        sections: transcript.segments.map((s, i) => ({ id: `segment-${i + 1}`, ...s })),
        characterCount: transcript.fullText.length, wordCount: words(transcript.fullText), expiresAt: new Date(at.getTime() + captionCacheTtlMs) };
      if (!checkedCacheTranscript(data, key, at)) throw new SourceError("storage_unavailable");
      // Single database upsert on the existing unique key; no read-then-insert or retries.
      await tx.transcriptCache.upsert({ where: { videoId_languagePreference_mode: key }, create: data, update: data, select: { id: true } });
    }),
  };
}
