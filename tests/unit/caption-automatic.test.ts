import assert from "node:assert/strict";
import { test } from "node:test";
import { createAutomaticCaptionProvider, automaticBounds } from "../../src/server/captions/automatic.ts";
import { CaptionCoordinator, captionJobKey } from "../../src/server/captions/coordinator.ts";
import { captionCacheKey, createCaptionCache } from "../../src/server/captions/cache.ts";
import { configuredCaptionProvider } from "../../src/server/captions/configured.ts";
import { parseCaptionConfig, type CaptionSelectionConfig } from "../../src/server/captions/config.ts";
import { parseYoutubeSourceConfig } from "../../src/server/sources/config.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { createDirectCaptionProvider } from "../../src/server/captions/provider.ts";
import { createSupadataCaptionProvider } from "../../src/server/captions/supadata.ts";
import type { CaptionFailureCode, CaptionResult, CaptionTranscript } from "../../src/shared/captions.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config: CaptionSelectionConfig = { provider: "auto", directFirst: true, supadataApiKey: "synthetic-key",
  origin: "https://automatic.invalid", secure: true, cookieSecret: "ab".repeat(32) };
const id = "Cache06c001", input = { videoId: id, language: "en", signal: new AbortController().signal };
const transcript: CaptionTranscript = { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, language: "en",
  provider: "youtube-transcript-plus@2.0.3", fullText: " FIRST \nLAST", segments: [
    { text: " FIRST ", startSeconds: 1.2505, durationSeconds: 0.500125 }, { text: "LAST", startSeconds: 0, durationSeconds: 0 }] };
const success = (provider: CaptionTranscript["provider"] = "youtube-transcript-plus@2.0.3"): CaptionResult => ({ ok: true, transcript: { ...transcript, provider } });
const failure = (code: CaptionFailureCode): CaptionResult => ({ ok: false, error: { code, message: "synthetic" } });
function setup() {
  let direct = success(), managed = success("supadata"), directCalls = 0, managedCalls = 0, clock = 0;
  const run = createAutomaticCaptionProvider({ direct: async () => { directCalls++; return direct; },
    managed: () => async () => { managedCalls++; return managed; }, now: () => clock });
  return { run: (patch = {}) => run(input, { ...config, ...patch }), direct: (r: CaptionResult) => { direct = r; },
    managed: (r: CaptionResult) => { managed = r; }, calls: () => [directCalls, managedCalls], advance: (ms = automaticBounds.cooldownMs) => { clock += ms; } };
}
const code = (r: CaptionResult) => r.ok ? "success" : r.error.code;
async function flush() { for (let i = 0; i < 80; i++) await Promise.resolve(); }

test("auto direct success validates output and never submits managed", async () => {
  const s = setup(); assert.deepEqual(await s.run(), success()); assert.deepEqual(s.calls(), [1, 0]);
});
for (const category of ["blocked", "timeout", "rate_limited", "upstream_failure"] as const) test(`${category} falls back exactly once`, async () => {
  const s = setup(); s.direct(failure(category)); assert.deepEqual(await s.run(), success("supadata")); assert.deepEqual(s.calls(), [1, 1]);
});
for (const category of ["no_captions", "unavailable", "invalid_input", "too_large", "malformed", "cancelled", "disabled", "forbidden",
  "invalid_request", "limit_reached", "internal", "quota_exhausted", "provider_limited"] as const) test(`terminal ${category} never falls back`, async () => {
  const s = setup(); s.direct(failure(category)); assert.equal(code(await s.run()), category); assert.deepEqual(s.calls(), [1, 0]);
});
for (const patch of [{ fullText: "partial" }, { provider: "supadata" }, { videoId: "Cache06c002" }, { language: "fr" }, { segments: [] }]) {
  test(`malformed direct success is terminal: ${Object.keys(patch)[0]}`, async () => {
    const s = setup(); s.direct({ ok: true, transcript: { ...transcript, ...patch } as CaptionTranscript });
    assert.equal(code(await s.run()), "malformed"); assert.deepEqual(s.calls(), [1, 0]);
  });
}
test("auto defaults to managed-only, always needs managed configuration; proof still rejects auto", async () => {
  const env = { YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_PROVIDER: "auto", APP_ORIGIN: config.origin,
    VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic", SUPADATA_API_KEY: "synthetic-key" };
  assert.equal(parseYoutubeSourceConfig(env)?.directFirst, false);
  assert.equal(parseYoutubeSourceConfig({ ...env, YOUTUBE_AUTO_DIRECT_FIRST: "true" })?.directFirst, true);
  for (const patch of [{ SUPADATA_API_KEY: "" }, { SUPADATA_API_KEY: "bad\nkey" }, { NEXT_PUBLIC_SUPADATA_API_KEY: "bad" }, { YOUTUBE_INGESTION_ENABLED: "false" }]) {
    assert.equal(parseYoutubeSourceConfig({ ...env, ...patch, YOUTUBE_AUTO_DIRECT_FIRST: "true" }), null);
  }
  assert.equal(parseYoutubeSourceConfig({}), null);
  assert.equal(parseCaptionConfig({ ...env, CAPTION_PROOF_ENABLED: "true", CAPTION_PROOF_PROVIDER: "auto" }), null);
  const s = setup(); await s.run({ directFirst: undefined }); await s.run({ directFirst: false }); assert.deepEqual(s.calls(), [0, 2]);
  assert.equal(code(await s.run({ supadataApiKey: "" })), "disabled"); assert.deepEqual(s.calls(), [0, 2]);
});
for (const category of ["blocked", "rate_limited"] as const) test(`${category} immediately opens finite direct cooldown; expiry and forced verification`, async () => {
  const s = setup(); s.direct(failure(category)); await s.run(); await s.run(); assert.deepEqual(s.calls(), [1, 2]);
  await s.run({ provider: "direct" }); assert.deepEqual(s.calls(), [2, 2]);
  await s.run(); assert.deepEqual(s.calls(), [2, 3]); // forced call did not change cooldown
  s.advance(automaticBounds.cooldownMs - 1); await s.run(); assert.deepEqual(s.calls(), [2, 4]);
  s.advance(1); s.direct(success()); await s.run(); await s.run(); assert.deepEqual(s.calls(), [4, 4]);
});
test("two consecutive eligible failures open cooldown; direct success and terminal results reset streak", async () => {
  const s = setup(); s.direct(failure("timeout")); await s.run(); s.direct(success()); await s.run();
  s.direct(failure("upstream_failure")); await s.run(); assert.deepEqual(s.calls(), [3, 2]);
  s.direct(failure("no_captions")); await s.run(); s.direct(failure("timeout")); await s.run();
  s.direct(failure("upstream_failure")); await s.run(); await s.run(); assert.deepEqual(s.calls(), [6, 5]);
  s.advance(); s.direct(success()); await s.run(); assert.deepEqual(s.calls(), [7, 5]);
});
test("managed rate limit suppresses automatic misses without waiting, expires, and never suppresses forced managed", async () => {
  const s = setup(); s.direct(failure("blocked")); s.managed(failure("rate_limited"));
  assert.equal(code(await s.run()), "rate_limited"); assert.equal(code(await s.run()), "rate_limited"); assert.deepEqual(s.calls(), [1, 1]);
  await s.run({ provider: "supadata" }); assert.deepEqual(s.calls(), [1, 2]);
  s.advance(); s.direct(success()); assert.equal(code(await s.run()), "success"); assert.deepEqual(s.calls(), [2, 2]);
});
for (const category of ["quota_exhausted", "provider_limited", "blocked", "disabled", "malformed"] as const) test(`managed ${category} retains authored category, no retry`, async () => {
  const s = setup(); s.managed(failure(category)); assert.equal(code(await s.run({ directFirst: false })), category); assert.deepEqual(s.calls(), [0, 1]);
});
test("cooldown has one policy cell; rotation replaces it and identities isolate modes/opt-in/credentials", async () => {
  const s = setup(); s.direct(failure("blocked")); await s.run(); s.direct(success());
  await s.run({ supadataApiKey: "rotated-synthetic" }); assert.deepEqual(s.calls(), [2, 1]);
  const key = captionCacheKey(id, "en"), identity = captionJobKey(key, config);
  for (const patch of [{ provider: "direct" as const }, { provider: "supadata" as const }, { directFirst: false }, { supadataApiKey: "PRIVATE" }]) {
    const other = captionJobKey(key, { ...config, ...patch }); assert.notEqual(identity, other); assert.doesNotMatch(other, /PRIVATE/);
  }
});
test("aborted/late adapter success cannot fallback, update cooldown or return success", async () => {
  const abort = new AbortController(); let calls = 0, release!: (r: CaptionResult) => void;
  const run = createAutomaticCaptionProvider({ direct: () => new Promise(resolve => { release = resolve; }), managed: () => async () => { calls++; return success("supadata"); } });
  const pending = run({ ...input, signal: abort.signal }, config); abort.abort(); release(failure("blocked"));
  assert.equal(code(await pending), "cancelled"); assert.equal(calls, 0);
  assert.equal(code(await run({ ...input, signal: abort.signal }, config)), "cancelled");
});

// A real direct adapter's 9s timer followed by a real managed adapter, all within
// the handler's one job timer. Cache lookup spends 3s first; follower cannot reset it.
test("one 15s job includes cache + direct9s + remaining managed3s; late results cannot commit", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const db = new SyntheticSourceDatabase(), coordinator = new CaptionCoordinator();
  let releaseCache!: (value: null) => void, calls = 0, managedSignal!: AbortSignal;
  const provider = configuredCaptionProvider(async (_url, init) => {
    calls++; if (calls > 1) managedSignal = init!.signal!;
    return new Promise((_, reject) => init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  });
  const handler = createYoutubeSourceHandler({ config: () => config, coordinator, repository: createSourceRepository(() => db.asClient()),
    cache: { get: () => new Promise(resolve => { releaseCache = resolve; }), put: async () => { throw new Error("must not write"); } }, provider });
  const request = () => new Request(config.origin, { method: "POST", headers: { origin: config.origin, "content-type": "application/json",
    cookie: visitorCookie(createVisitor(config, Date.now()), config, Date.now()).split(";", 1)[0] }, body: JSON.stringify({ video: id, language: "en" }) });
  const a = handler(request()); await flush(); t.mock.timers.tick(3000); releaseCache(null); await flush(); assert.equal(calls, 1);
  t.mock.timers.tick(9000); await flush(); assert.equal(calls, 2); assert.equal(managedSignal.aborted, false);
  const b = handler(request()); await flush(); assert.equal(calls, 2);
  t.mock.timers.tick(2999); await flush(); assert.equal(coordinator.size, 1);
  t.mock.timers.tick(1); await flush(); assert.equal(managedSignal.aborted, true);
  for (const r of await Promise.all([a, b])) { assert.equal(r.status, 504); assert.equal((await r.json()).error.code, "timeout"); }
  assert.equal(db.creates, 0); assert.equal(coordinator.size, 0); t.mock.timers.tick(300000); await flush(); assert.equal(calls, 2);
});
for (const stage of ["cache", "direct", "managed", "poll"] as const) test(`last cancellation aborts during ${stage} and leaves no timer/job/Source`, async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const abort = new AbortController(), coordinator = new CaptionCoordinator(); let active!: AbortSignal, submits = 0, polls = 0;
  const held = (signal: AbortSignal) => { active = signal; return new Promise<Response>((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }); };
  const provider = createAutomaticCaptionProvider({
    direct: createDirectCaptionProvider({ fetch: async (_url, init) => stage === "direct" ? held(init!.signal!) : new Response(null, { status: 403 }) }),
    managed: () => createSupadataCaptionProvider({ apiKey: "synthetic", wait: async () => {}, fetch: async (url, init) => {
      if (String(url).endsWith("/safe")) { polls++; return held(init!.signal!); }
      submits++; return stage === "managed" ? held(init!.signal!) : Response.json({ jobId: "safe" }, { status: 202 });
    } }),
  });
  const pending = coordinator.run("same", abort.signal, 15000, async signal => {
    active = signal;
    if (stage === "cache") await held(signal);
    return (await provider({ ...input, signal }, config)).ok ? transcript : Promise.reject(new Error("cancelled"));
  });
  const rejected = assert.rejects(pending, /cancelled/); await flush(); abort.abort(); await rejected; await flush();
  assert.equal(active.aborted, true); assert.equal(coordinator.size, 0);
  assert.equal(submits, stage === "managed" || stage === "poll" ? 1 : 0); assert.equal(polls, stage === "poll" ? 1 : 0);
  t.mock.timers.tick(300000); await flush(); assert.equal(coordinator.size, 0);
});

test("managed cooldown still permits a validated cache hit with original provenance and no provider call", async () => {
  const db = new SyntheticSourceDatabase(), cache = createCaptionCache(() => db.asClient());
  let calls = 0;
  const provider = createAutomaticCaptionProvider({ direct: async () => failure("blocked"), managed: () => async () => { calls++; return failure("rate_limited"); } });
  await provider(input, config);
  await cache.put(captionCacheKey(id, "en"), { ...transcript, provider: "supadata" }, new Date());
  const handler = createYoutubeSourceHandler({ config: () => config, cache, provider, repository: createSourceRepository(() => db.asClient()) });
  const request = new Request(config.origin, { method: "POST", headers: { origin: config.origin, "content-type": "application/json",
    cookie: visitorCookie(createVisitor(config, Date.now()), config, Date.now()).split(";", 1)[0] }, body: JSON.stringify({ video: id, language: "en" }) });
  const r = await handler(request); assert.equal(r.status, 201); assert.equal(calls, 1); assert.equal(db.creates, 1);
  assert.equal(db.cacheWrites, 1); assert.equal((await r.json()).source.provider, "supadata");
});
