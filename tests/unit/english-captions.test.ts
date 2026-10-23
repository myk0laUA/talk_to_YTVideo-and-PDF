import assert from "node:assert/strict";
import { test } from "node:test";
import { createDirectCaptionProvider } from "../../src/server/captions/provider.ts";
import { createSupadataCaptionProvider } from "../../src/server/captions/supadata.ts";
import { captionCacheKey, createCaptionCache } from "../../src/server/captions/cache.ts";
import { captionJobKey } from "../../src/server/captions/coordinator.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { uploadedRecord } from "../../src/server/sources/service.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { captionFixture, pdfFixture } from "../context/fixtures.ts";

const config = { origin: "https://english.invalid", secure: true, cookieSecret: "13".repeat(32), provider: "direct" as const };
const videoId = captionFixture.videoId;
for (const [tags, expected] of [
  [["ar", "en-US", "en"], "en"], [["ar", "en-US", "en-GB"], "en-GB"],
  [["en-GB", "ar", "en-US"], "en-GB"], [["ar", "EN-us"], "EN-us"], [["ar", "fr"], null],
] as const) test(`13E direct English selection ${tags.join(",")}`, async () => {
  const calls: string[] = [];
  const provider = createDirectCaptionProvider({ fetch: async (url, init) => {
    const u = new URL(String(url)); calls.push(u.href);
    assert.equal((init?.headers as Record<string, string>)["Accept-Language"], "en");
    if (u.pathname === "/watch") return new Response('"INNERTUBE_API_KEY":"synthetic"');
    if (u.pathname === "/youtubei/v1/player") return Response.json({ captions: { playerCaptionsTracklistRenderer: {
      captionTracks: tags.map(languageCode => ({ languageCode, kind: languageCode === expected ? "asr" : undefined,
        baseUrl: `https://www.youtube.com/api/timedtext?lang=${languageCode}` })) } } });
    assert.equal(u.searchParams.get("lang"), expected);
    return new Response('<transcript><text start="1.25" dur="2.5"> Original text </text></transcript>');
  } });
  const result = await provider({ videoId, language: "en", signal: new AbortController().signal });
  if (expected) {
    assert.ok(result.ok); assert.equal(result.transcript.language, expected);
    assert.equal(result.transcript.trackType, "automatic"); assert.equal(result.transcript.fullText, " Original text ");
    assert.equal(calls.length, 3);
  } else { assert.ok(!result.ok); assert.equal(result.error.code, "no_captions"); assert.equal(calls.length, 2); }
});

for (const lang of ["ar", "en-GB"]) for (const asynchronous of [false, true])
  test(`13E managed English ${lang} async=${asynchronous}: validate final language without retry`, async () => {
    let calls = 0;
    const provider = createSupadataCaptionProvider({ apiKey: "synthetic", wait: async () => {}, fetch: async url => {
      calls++; const u = new URL(String(url));
      if (calls === 1) { assert.equal(u.searchParams.get("lang"), "en"); assert.equal(u.searchParams.get("mode"), "native"); }
      if (asynchronous && calls === 1) return Response.json({ jobId: "synthetic" }, { status: 202 });
      return Response.json({ ...(asynchronous ? { status: "completed" } : {}), lang, content: [{ text: "Original", offset: 0, duration: 10, lang }] });
    } });
    const result = await provider({ videoId, language: "en", signal: new AbortController().signal });
    if (lang === "ar") { assert.ok(!result.ok); assert.equal(result.error.code, "no_captions"); }
    else { assert.ok(result.ok); assert.equal(result.transcript.language, lang); }
    assert.equal(calls, asynchronous ? 2 : 1);
  });

function setup() {
  const at = Date.now(), visitor = createVisitor(config, at), db = new SyntheticSourceDatabase();
  const repository = createSourceRepository(() => db.asClient()), cache = createCaptionCache(() => db.asClient(), () => at);
  const request = (language?: string) => new Request(config.origin, { method: "POST", headers: { origin: config.origin,
    cookie: visitorCookie(visitor, config, at).split(";", 1)[0], "content-type": "application/json" },
    body: JSON.stringify({ video: videoId, ...(language ? { language } : {}) }) });
  return { at, visitor, db, repository, cache, request };
}
test("13E omitted language requests en, isolates legacy default/Arabic cache and preserves selected regional provenance", async () => {
  const s = setup();
  await s.cache.put(captionCacheKey(videoId), { ...captionFixture, language: "ar" }, new Date(s.at));
  await s.cache.put(captionCacheKey(videoId, "ar"), { ...captionFixture, language: "ar" }, new Date(s.at));
  assert.notEqual(captionJobKey(captionCacheKey(videoId), config), captionJobKey(captionCacheKey(videoId, "en"), config));
  let calls = 0;
  const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, cache: s.cache, provider: async input => {
    calls++; assert.equal(input.language, "en"); return { ok: true, transcript: { ...captionFixture, language: "en-GB" } };
  } });
  for (const language of [undefined, "EN"]) {
    const response = await handler(s.request(language)); assert.equal(response.status, 201);
    assert.equal((await response.json()).source.language, "en-GB");
  }
  assert.equal(calls, 1); assert.equal(s.db.rows.size, 1); assert.equal(s.db.cacheRows.size, 3);
});
for (const scenario of ["non-English selection", "missing English", "fresh mismatch", "cache mismatch"] as const)
  test(`13E ${scenario} preserves prior PDF with safe failure and no cache write`, async () => {
    const s = setup(), old = await s.repository.replace(uploadedRecord(pdfFixture, s.visitor), () => {});
    let calls = 0, reads = 0, writes = 0;
    const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository,
      cache: { get: async () => { reads++; return scenario === "cache mismatch" ? { ...captionFixture, language: "ar" } : null; },
        put: async () => { writes++; } }, provider: async input => {
        calls++; assert.equal(input.language, "en");
        return scenario === "missing English" ? { ok: false, error: { code: "no_captions", message: "PRIVATE" } }
          : { ok: true, transcript: { ...captionFixture, language: "ar" } };
      } });
    const response = await handler(s.request(scenario === "non-English selection" ? "ar" : undefined));
    assert.equal(response.status, scenario === "non-English selection" ? 400 : scenario === "missing English" ? 422 : 502);
    const body = await response.json(); assert.doesNotMatch(JSON.stringify(body), /PRIVATE|owner|secret/);
    if (scenario === "missing English" || scenario === "non-English selection") assert.match(body.error.message, /English/);
    assert.deepEqual([...s.db.rows.keys()], [old.id]); assert.equal(writes, 0);
    assert.equal(calls, scenario === "non-English selection" || scenario === "cache mismatch" ? 0 : 1);
    assert.equal(reads, scenario === "non-English selection" ? 0 : 1);
  });
