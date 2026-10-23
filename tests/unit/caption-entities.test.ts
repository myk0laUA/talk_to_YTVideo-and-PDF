import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchTranscript } from "youtube-transcript-plus";
import { entityCases, entityNetwork, entityTranscript, entityVideoId, entityXml } from "../captions/entities.ts";
import { captionBounds, normalizeSegments } from "../../src/server/captions/provider.ts";
import { createSupadataCaptionProvider } from "../../src/server/captions/supadata.ts";
import { captionCacheKey, createCaptionCache } from "../../src/server/captions/cache.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, sourceDto, uploadedRecord } from "../../src/server/sources/service.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { createProviderTextPreparation, createProviderVoicePreparation } from "../../src/server/context/model-measurement.ts";
import { PROVIDER_TEXT_POLICY, PROVIDER_VOICE_POLICY } from "../../src/shared/priming-provider-policy.ts";
import { decodeCaptions } from "../priming/caption-decoder.ts";
import { pdfFixture } from "../context/fixtures.ts";

test("13F actual installed parser layer and direct canonical layer: fixed table, order, duplicates, Unicode, timing and provenance", async () => {
  const n = entityNetwork();
  const hook = async ({ url }: { url: string }) => n.fetcher(url);
  const parsed = await fetchTranscript(entityVideoId, { retries: 0, videoDetails: false, videoFetch: hook, playerFetch: hook, transcriptFetch: hook });
  assert.deepEqual(parsed.map(s => s.text), entityCases.map(c => c[1]));
  const transcript = await entityTranscript();
  assert.deepEqual(transcript.segments, entityCases.map((c, i) => ({ text: c[2], startSeconds: i % 2 ? 0 : i + 1.25, durationSeconds: .125 })));
  assert.equal(transcript.fullText, entityCases.map(c => c[2]).join("\n"));
  assert.equal(transcript.language, "en-GB"); assert.equal(transcript.trackType, "automatic");
  assert.equal(transcript.provider, "youtube-transcript-plus@2.0.3");
  assert.equal(n.calls.length, 3);
});

test("13F final canonical character boundary, with unchanged upstream byte and segment limits", async () => {
  // Raw text is over 1M, under the unchanged 2MiB HTTP bound; decoded final text fits.
  const text = "a".repeat(captionBounds.characters - 2) + "&amp;#39;";
  for (const [suffix, expected] of [["", true], ["ab", false]] as const) {
    const n = entityNetwork(entityXml([text + suffix]));
    const result = await n.provider({ videoId: entityVideoId, language: "en", signal: new AbortController().signal });
    assert.equal(result.ok, expected);
    if (result.ok) { assert.equal(result.transcript.fullText.length, captionBounds.characters - 1); assert.ok(result.transcript.fullText.endsWith("'")); }
    else assert.equal(result.error.code, "too_large");
  }
});

const config = { origin: "https://entities.invalid", secure: true, cookieSecret: "13".repeat(32), provider: "direct" as const };
function setup() {
  const at = Date.now(), visitor = createVisitor(config, at), db = new SyntheticSourceDatabase();
  const repository = createSourceRepository(() => db.asClient()), cache = createCaptionCache(() => db.asClient(), () => at);
  const request = () => new Request(config.origin, { method: "POST", headers: { origin: config.origin,
    cookie: visitorCookie(visitor, config, at).split(";", 1)[0], "content-type": "application/json" }, body: JSON.stringify({ video: entityVideoId }) });
  return { at, visitor, db, repository, cache, request };
}
for (const oldCache of [false, true]) test(`13F fresh import / obsolete cache=${oldCache}, canonical storage/preview and both preparations, identical subsequent hit`, async () => {
  const s = setup(), canonical = await entityTranscript(), key = captionCacheKey(entityVideoId, "en"), n = entityNetwork();
  if (oldCache) {
    const legacy = { ...canonical, segments: canonical.segments.map((segment, i) => ({ ...segment, text: entityCases[i][1] })), fullText: entityCases.map(c => c[1]).join("\n") };
    await s.cache.put(key, legacy, new Date(s.at));
    s.db.cacheRows.get(JSON.stringify(key))!.providerMetadata = { version: 1, trackType: "automatic" };
    const prior = captionRecord(legacy, s.visitor); s.db.rows.set(prior.id, prior);
    assert.equal(await s.cache.get(key, new Date(s.at)), null);
    assert.equal((await s.repository.get(prior.id, s.visitor.owner, new Date(s.at)))!.fullText, legacy.fullText, "existing owned sources are never retroactively decoded");
  }
  const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, cache: s.cache, provider: n.provider });
  let firstText = "", firstId = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await handler(s.request()); assert.equal(response.status, 201);
    const dto = (await response.json()).source;
    const row = await s.repository.get(dto.id, s.visitor.owner, new Date(s.at)); assert.ok(row);
    const preview = sourceDto(row, true); assert.ok("fullText" in preview);
    assert.equal(preview.fullText, canonical.fullText);
    assert.deepEqual(preview.sections, canonical.segments.map((segment, i) => ({ id: `segment-${i + 1}`, ...segment })));
    assert.equal(dto.characterCount, canonical.fullText.length);
    assert.equal(dto.wordCount, canonical.fullText.trim().split(/\s+/u).filter(Boolean).length);
    assert.equal(sourceDto(row).characterCount, dto.characterCount);
    if (attempt) { assert.notEqual(dto.id, firstId); assert.equal(row.fullText, firstText); }
    firstId = dto.id; firstText = row.fullText;
    for (const mode of ["text", "voice"] as const) {
      const policy = mode === "text" ? PROVIDER_TEXT_POLICY : PROVIDER_VOICE_POLICY;
      const prepare = (mode === "text" ? createProviderTextPreparation : createProviderVoicePreparation)({ repository: s.repository, now: () => s.at });
      const result = await prepare({ visitor: s.visitor, sourceId: row.id, signal: new AbortController().signal,
        model: policy.model, mode, policyVersion: policy.policyVersion, runId: "entities13f", variant: "B" });
      assert.equal(result.status, "prepared"); if (result.status !== "prepared") return;
      assert.deepEqual(decodeCaptions(result.input.manifest), preview.sections);
      assert.equal(decodeCaptions(result.input.manifest).map(segment => segment.text).join("\n"), row.fullText);
    }
  }
  assert.equal(n.calls.length, 3); assert.deepEqual(await s.cache.get(key, new Date(s.at)), canonical);
  assert.deepEqual(s.db.cacheRows.get(JSON.stringify(key))!.providerMetadata, { version: 2, trackType: "automatic" });
  assert.equal(await s.cache.get(captionCacheKey(entityVideoId), new Date(s.at)), null);
  assert.equal(await s.cache.get(captionCacheKey(entityVideoId, "ar"), new Date(s.at)), null);
});

test("13F obsolete cache plus failed extraction preserves prior source and obsolete row", async () => {
  const s = setup(), transcript = await entityTranscript(), key = captionCacheKey(entityVideoId, "en");
  const old = captionRecord(transcript, s.visitor); s.db.rows.set(old.id, old);
  await s.cache.put(key, transcript, new Date(s.at));
  s.db.cacheRows.get(JSON.stringify(key))!.providerMetadata = { version: 1 };
  const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, cache: s.cache,
    provider: async () => ({ ok: false, error: { code: "blocked", message: "synthetic" } }) });
  assert.equal((await handler(s.request())).status, 502); assert.deepEqual([...s.db.rows.keys()], [old.id]);
  assert.deepEqual(s.db.cacheRows.get(JSON.stringify(key))!.providerMetadata, { version: 1 });
});

test("13F JSON provider, generic validator, PDF storage/preview and managed v1 cache preserve literal entity text", async () => {
  const text = "literal &#39; &amp;#39; &#x27; <script> don't 😀", s = setup();
  assert.equal(normalizeSegments([{ text, offset: 0, duration: 1, lang: "en" }], entityVideoId).fullText, text);
  const result = await createSupadataCaptionProvider({ apiKey: "synthetic", fetch: async () => Response.json({ lang: "en",
    content: [{ text, offset: 0, duration: 1000, lang: "en" }] }) })({ videoId: entityVideoId, language: "en", signal: new AbortController().signal });
  assert.ok(result.ok); assert.equal(result.transcript.fullText, text);
  const key = captionCacheKey(entityVideoId, "en"); await s.cache.put(key, result.transcript, new Date(s.at));
  assert.deepEqual(s.db.cacheRows.get(JSON.stringify(key))!.providerMetadata, { version: 1 });
  assert.equal((await s.cache.get(key, new Date(s.at)))!.fullText, text);
  const pdf = uploadedRecord({ ...pdfFixture, pageCount: 1, sections: [{ id: "page-1", pageNumber: 1, text }], fullText: text, characterCount: text.length }, s.visitor);
  const saved = await s.repository.replace(pdf, () => {});
  const preview = sourceDto(saved, true); assert.ok("fullText" in preview); assert.equal(preview.fullText, text);
});
