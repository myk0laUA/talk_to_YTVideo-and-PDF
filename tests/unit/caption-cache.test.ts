import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { captionCacheKey, captionCacheTtlMs, createCaptionCache } from "../../src/server/captions/cache.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { parseYoutubeSourceConfig } from "../../src/server/sources/config.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord } from "../../src/server/sources/service.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { Admission } from "../../src/server/proof/admission.ts";
import { captionLimits } from "../../src/server/captions/admission.ts";
import type { CaptionResult, CaptionTranscript } from "../../src/shared/captions.ts";
import type { YoutubeSourceConfig } from "../../src/server/sources/config.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config: YoutubeSourceConfig = { origin: "https://cache.invalid", secure: true, cookieSecret: "ab".repeat(32), provider: "direct" };
const videoId = "Cache06a001", key = captionCacheKey(videoId, "en"), at = new Date();
const transcript: CaptionTranscript = { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`, language: "en",
  provider: "youtube-transcript-plus@2.0.3", trackType: "automatic", fullText: " FIRST \nLAST",
  segments: [{ text: " FIRST ", startSeconds: 1.2505, durationSeconds: 0.500125 }, { text: "LAST", startSeconds: 0, durationSeconds: 0 }] };
function setup() {
  const db = new SyntheticSourceDatabase(), cache = createCaptionCache(() => db.asClient());
  const visitor = createVisitor(config, Date.now()), token = visitorCookie(visitor, config, Date.now()).split(";", 1)[0];
  let calls = 0, providerResult: CaptionResult = { ok: true, transcript };
  const current = { ...config };
  const handler = createYoutubeSourceHandler({ config: () => current, cache, repository: createSourceRepository(() => db.asClient()),
    provider: async () => { calls++; return providerResult; } });
  const request = (body: unknown = { video: videoId, language: "en" }, headers: Record<string, string> = {}) => new Request(config.origin, {
    method: "POST", headers: { origin: config.origin, cookie: token, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return { db, cache, handler, request, current, visitor, calls: () => calls, result: (value: CaptionResult) => { providerResult = value; } };
}
async function status(response: Response, expected: number, code?: string) {
  const body = await response.json(); assert.equal(response.status, expected, JSON.stringify(body));
  if (code) assert.equal(body.error.code, code);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|owner|postgresql|providerMetadata|cacheBypass/);
  return body;
}

test("cache miss extracts once, writes all ordered segments, repeat hit has fresh UUID and fixed visitor expiry", async () => {
  const s = setup(); const first = (await status(await s.handler(s.request()), 201)).source;
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheReads, 1); assert.equal(s.db.cacheWrites, 1);
  const row = [...s.db.cacheRows.values()][0], expiry = row.expiresAt.getTime();
  assert.ok(expiry >= at.getTime() + captionCacheTtlMs);
  assert.equal(first.expiresAt, new Date(s.visitor.expiresAt * 1000).toISOString());
  const second = (await status(await s.handler(s.request({ video: `https://youtu.be/${videoId}`, language: "EN" })), 201)).source;
  assert.notEqual(first.id, second.id); assert.equal(second.expiresAt, first.expiresAt);
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheReads, 2); assert.equal(s.db.cacheWrites, 1);
  assert.equal([...s.db.cacheRows.values()][0].expiresAt.getTime(), expiry);
  assert.deepEqual(await s.cache.get(key, at), transcript);
  assert.deepEqual([...s.db.rows.values()][0].sections, { videoId, trackType: "automatic",
    segments: transcript.segments.map((v, i) => ({ id: `segment-${i + 1}`, ...v })) });
  assert.equal(s.db.rows.has(first.id), false);
  assert.deepEqual(Object.keys(row).sort(), ["videoId", "languagePreference", "mode", "selectedLanguage", "provider", "providerMetadata", "title",
    "fullText", "sections", "characterCount", "wordCount", "expiresAt"].sort());
});

const badRows: Record<string, unknown>[] = [
  { expiresAt: new Date(0) }, { expiresAt: new Date(NaN) }, { fullText: "" }, { sections: [] }, { sections: null },
  { videoId: "Cache06a002" }, { languagePreference: "fr" }, { mode: "auto" }, { provider: "unknown" },
  { selectedLanguage: "fr" }, { selectedLanguage: null }, { fullText: "partial" }, { characterCount: 1 }, { wordCount: 999 },
  { title: "unexpected" }, { providerMetadata: { version: 3 } }, { providerMetadata: { version: 2, trackType: "manual" } },
  { providerMetadata: { version: 1, jobId: "pending" } },
  { sections: [{ id: "wrong", text: " FIRST ", startSeconds: 1, durationSeconds: 1 }] },
  ...[NaN, Infinity, -1, "1", null].map(startSeconds => ({ sections: [{ id: "segment-1", text: " FIRST ", startSeconds, durationSeconds: 1 }] })),
  { sections: [{ id: "segment-1", text: " FIRST ", startSeconds: 1, durationSeconds: -1 }] },
  { sections: [{ id: "segment-1", text: " FIRST ", startSeconds: Number.MAX_VALUE, durationSeconds: Number.MAX_VALUE }] },
];
for (const [index, patch] of badRows.entries()) test(`invalid cache row ${index + 1} is a complete miss and never served`, async () => {
  const s = setup(); await s.cache.put(key, transcript, at);
  const stored = s.db.cacheRows.get(JSON.stringify(key))!;
  Object.assign(stored, patch);
  assert.equal(await s.cache.get(key, at), null);
  s.result({ ok: false, error: { code: "blocked", message: "synthetic" } });
  await status(await s.handler(s.request()), 502, "blocked");
  assert.equal(s.db.rows.size, 0); assert.equal(s.calls(), 1); assert.equal(s.db.cacheWrites, 1);
});

test("cache language/default and native mode keys stay separate; selected language/provenance retained", async () => {
  const s = setup();
  assert.deepEqual(captionCacheKey(videoId, "EN-us"), { videoId, languagePreference: "en-us", mode: "native" });
  assert.notDeepEqual(captionCacheKey(videoId), key);
  for (const value of ["", "../", " en"]) assert.throws(() => captionCacheKey(videoId, value));
  const managed = { ...transcript, provider: "supadata" as const };
  await s.cache.put(key, managed, at);
  assert.equal(await s.cache.get(captionCacheKey(videoId), at), null);
  assert.equal(await s.cache.get(captionCacheKey(videoId, "fr"), at), null);
  assert.equal(await s.cache.get({ ...key, mode: "auto" as "native" }, at), null);
  const source = (await status(await s.handler(s.request()), 201)).source;
  assert.equal(source.provider, "supadata"); assert.equal(s.calls(), 0);
  assert.equal(s.db.cacheWrites, 1);
});

test("expiry is rechecked after DB await; cache reads never renew TTL", async () => {
  const s = setup(); await s.cache.put(key, transcript, at);
  const cache = createCaptionCache(() => s.db.asClient(), () => at.getTime() + captionCacheTtlMs);
  assert.equal(await cache.get(key, at), null);
  assert.equal([...s.db.cacheRows.values()][0].expiresAt.getTime(), at.getTime() + captionCacheTtlMs);
});

test("server-only bypass skips both cache operations while preserving validation/admission", async () => {
  const s = setup(); s.current.cacheBypass = true;
  await s.cache.put(key, { ...transcript, provider: "supadata" }, at);
  for (let i = 0; i < captionLimits.visitor; i++) await status(await s.handler(s.request()), 201);
  await status(await s.handler(s.request()), 429, "limit_reached");
  assert.equal(s.calls(), captionLimits.visitor); assert.equal(s.db.cacheReads, 0); assert.equal(s.db.cacheWrites, 1);
  const env = { YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_PROVIDER: "direct", APP_ORIGIN: config.origin,
    VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" };
  assert.equal(parseYoutubeSourceConfig({ ...env, YOUTUBE_CAPTION_CACHE_BYPASS: "true" })?.cacheBypass, true);
  assert.equal(parseYoutubeSourceConfig({ ...env, NEXT_PUBLIC_YOUTUBE_CAPTION_CACHE_BYPASS: "true" })?.cacheBypass, undefined);
  assert.equal(parseYoutubeSourceConfig({ ...env, YOUTUBE_INGESTION_PROVIDER: "supadata", YOUTUBE_CAPTION_CACHE_BYPASS: "true" }), null);
});

test("bootstrap, origin, request overrides and admission reject before cache/provider IO", async () => {
  for (const [headers, expected] of [[{ cookie: "" }, 401], [{ origin: "https://foreign.invalid" }, 403]] as const) {
    const s = setup(); await status(await s.handler(s.request(undefined, headers)), expected);
    assert.equal(s.db.cacheReads, 0); assert.equal(s.calls(), 0);
  }
  const s = setup();
  await status(await s.handler(s.request({ video: videoId, cacheBypass: true })), 400);
  const admission = new Admission(captionLimits); admission.acquire(s.visitor.owner, "unverified-network", Date.now());
  const handler = createYoutubeSourceHandler({ config: () => config, cache: s.cache,
    repository: createSourceRepository(() => s.db.asClient()), provider: async () => { throw new Error(); }, admission });
  await status(await handler(s.request()), 429, "limit_reached");
  assert.equal(s.db.cacheReads, 0); assert.equal(s.calls(), 0);
});

for (const failure of ["blocked", "timeout", "no_captions", "quota_exhausted"] as const) test(`provider ${failure} never writes cache`, async () => {
  const s = setup(); s.result({ ok: false, error: { code: failure, message: "synthetic" } });
  const response = await s.handler(s.request()); assert.equal((await response.json()).error.code, failure);
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheWrites, 0); assert.equal(s.db.rows.size, 0);
});
test("pending/malformed success, wrong video and wrong originating provider never cache", async () => {
  for (const value of [{ jobId: "pending" }, { ...transcript, fullText: "partial" },
    { ...transcript, provider: "supadata" }, { ...transcript, language: "fr" },
    { ...transcript, videoId: "Cache06a002", canonicalUrl: "https://www.youtube.com/watch?v=Cache06a002" }]) {
    const s = setup(); s.result({ ok: true, transcript: value as CaptionTranscript });
    await status(await s.handler(s.request()), 502, "malformed");
    assert.equal(s.calls(), 1); assert.equal(s.db.cacheWrites, 0); assert.equal(s.db.rows.size, 0);
  }
});

test("cache read/write IO fails as storage-unavailable, preserves source, never falls back", async () => {
  for (const failure of ["failCacheRead", "failCacheWrite"] as const) {
    const s = setup(), prior = captionRecord(transcript, s.visitor); s.db.rows.set(prior.id, prior); s.db[failure] = true;
    await status(await s.handler(s.request()), 503, "storage_unavailable");
    assert.equal(s.calls(), failure === "failCacheRead" ? 0 : 1);
    assert.deepEqual([...s.db.rows.keys()], [prior.id]); assert.equal(s.db.cacheRows.size, 0);
  }
});
test("Source write failure allows validated public cache population but no second extraction", async () => {
  const s = setup(), prior = captionRecord(transcript, s.visitor); s.db.rows.set(prior.id, prior); s.db.failCreate = true;
  await status(await s.handler(s.request()), 503, "storage_unavailable");
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheRows.size, 1); assert.ok(s.db.rows.has(prior.id));
  s.db.failCreate = true;
  await status(await s.handler(s.request()), 503, "storage_unavailable");
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheWrites, 1); assert.ok(s.db.rows.has(prior.id));
});
test("unique-key upsert converges modeled concurrent writers without read-before-write (not SQL race proof)", async () => {
  const s = setup();
  await Promise.all([s.cache.put(key, transcript, at), s.cache.put(key, transcript, at)]);
  assert.equal(s.db.cacheRows.size, 1); assert.equal(s.db.cacheReads, 0); assert.equal(s.db.cacheWrites, 2);
  assert.deepEqual(await s.cache.get(key, at), transcript);
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /@@unique\(\[videoId, languagePreference, mode\]\)/);
  assert.match(schema.slice(schema.indexOf("model TranscriptCache")), /@@index\(\[expiresAt\]\)/);
});

test("visitor expiry/cancellation during cache waits cannot start provider work or replace prior source", async () => {
  for (const phase of ["read-expiry", "read-cancel", "write-expiry"] as const) {
    const s = setup(), prior = captionRecord(transcript, s.visitor), controller = new AbortController();
    s.db.rows.set(prior.id, prior);
    if (phase !== "write-expiry") await s.cache.put(key, transcript, at);
    let clock = Date.now(), calls = 0;
    const cache = { get: async (...args: Parameters<typeof s.cache.get>) => {
      const found = await s.cache.get(...args);
      if (phase === "read-expiry") clock = s.visitor.expiresAt * 1000;
      if (phase === "read-cancel") controller.abort();
      return found;
    }, put: async (...args: Parameters<typeof s.cache.put>) => {
      await s.cache.put(...args); clock = s.visitor.expiresAt * 1000;
    } };
    const handler = createYoutubeSourceHandler({ config: () => config, cache, now: () => clock,
      repository: createSourceRepository(() => s.db.asClient()), provider: async () => { calls++; return { ok: true, transcript }; } });
    const request = new Request(s.request(), { signal: controller.signal });
    await status(await handler(request), phase === "read-cancel" ? 408 : 401, phase === "read-cancel" ? "cancelled" : "visitor_required");
    assert.equal(calls, phase === "write-expiry" ? 1 : 0); assert.equal(s.db.creates, 0);
    assert.deepEqual([...s.db.rows.keys()], [prior.id]);
  }
});
