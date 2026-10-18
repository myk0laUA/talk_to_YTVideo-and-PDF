import assert from "node:assert/strict";
import { test } from "node:test";
import { CaptionAdmission, captionLimits } from "../../src/server/captions/admission.ts";
import { CaptionCoordinator, captionJobKey } from "../../src/server/captions/coordinator.ts";
import { createCaptionCache, captionCacheKey } from "../../src/server/captions/cache.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord } from "../../src/server/sources/service.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import type { CaptionResult, CaptionTranscript } from "../../src/shared/captions.ts";
import type { YoutubeSourceConfig } from "../../src/server/sources/config.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config: YoutubeSourceConfig = { origin: "https://coalesce.invalid", secure: true, cookieSecret: "ab".repeat(32), provider: "direct" };
const videoId = "Cache06b001", key = captionCacheKey(videoId, "en");
const transcript: CaptionTranscript = { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`, language: "en",
  provider: "youtube-transcript-plus@2.0.3", fullText: " FIRST \nLAST", segments: [
    { text: " FIRST ", startSeconds: 1.2505, durationSeconds: 0.500125 }, { text: "LAST", startSeconds: 0, durationSeconds: 0 }] };
const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function flush() { for (let i = 0; i < 50; i++) await Promise.resolve(); }
function setup() {
  const db = new SyntheticSourceDatabase(), admission = new CaptionAdmission(captionLimits), coordinator = new CaptionCoordinator();
  let calls = 0, upstreamSignal!: AbortSignal, providerLanguage: string | undefined, clock = Date.now();
  let upstream = deferred<CaptionResult>();
  const current = { ...config }, cache = createCaptionCache(() => db.asClient());
  const handler = createYoutubeSourceHandler({ config: () => ({ ...current }), admission, coordinator, cache, now: () => clock,
    repository: createSourceRepository(() => db.asClient()), provider: async input => { calls++; upstreamSignal = input.signal; providerLanguage = input.language; return upstream.promise; } });
  const visitors = Array.from({ length: 10 }, () => createVisitor(config, clock));
  const request = (index: number, signal?: AbortSignal, language = "en") => new Request(config.origin, { method: "POST", signal,
    headers: { origin: config.origin, cookie: visitorCookie(visitors[index], config, clock).split(";", 1)[0], "content-type": "application/json" },
    body: JSON.stringify({ video: videoId, language }) });
  const seed = () => visitors.slice(0, 2).map(v => { const row = captionRecord(transcript, v); db.rows.set(row.id, row); return row.id; });
  return { db, admission, coordinator, current, cache, visitors, request, handler, seed, calls: () => calls, signal: () => upstreamSignal, language: () => providerLanguage,
    resolve: (value: CaptionResult = { ok: true, transcript }) => upstream.resolve(value),
    pending: () => upstream, reset: () => { upstream = deferred<CaptionResult>(); }, expire: (i: number) => { clock = visitors[i].expiresAt * 1000; } };
}
async function response(promise: Promise<Response>, status: number, code?: string) {
  const r = await promise, value = await r.json(); assert.equal(r.status, status, JSON.stringify(value));
  if (code) assert.equal(value.error.code, code); return value;
}

test("overlapping normalized key shares exactly one read/extraction/write and fresh independent Source commits; warm hit extracts zero", async () => {
  const s = setup(); const a = s.handler(s.request(0)), b = s.handler(s.request(1, undefined, "EN")); await flush();
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheReads, 1); assert.equal(s.coordinator.size, 1);
  s.resolve(); const [ra, rb] = await Promise.all([response(a, 201), response(b, 201)]);
  assert.notEqual(ra.source.id, rb.source.id); assert.equal(s.db.creates, 2); assert.equal(s.db.cacheWrites, 1);
  const expiry = [...s.db.cacheRows.values()][0].expiresAt;
  assert.equal(s.coordinator.size, 0); await response(s.handler(s.request(2)), 201);
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheReads, 2); assert.equal(s.db.cacheWrites, 1);
  assert.deepEqual([...s.db.cacheRows.values()][0].expiresAt, expiry);
});

for (const cancelled of [0, 1]) test(`cancelling participant ${cancelled} detaches without cancelling survivor or writing cancelled Source`, async () => {
  const s = setup(), controllers = [new AbortController(), new AbortController()], prior = s.seed();
  const promises = controllers.map((c, i) => s.handler(s.request(i, c.signal))); await flush(); controllers[cancelled].abort();
  await response(promises[cancelled], 408, "cancelled"); assert.equal(s.signal().aborted, false);
  s.resolve(); await response(promises[1 - cancelled], 201);
  assert.equal(s.calls(), 1); assert.equal(s.db.creates, 1); assert.ok(s.db.rows.has(prior[cancelled]));
  assert.equal(s.coordinator.size, 0);
});

test("last cancellation aborts immediately, racing join starts fresh, late old work cannot resurrect or delete the new job", async () => {
  const s = setup(), a = new AbortController(), b = new AbortController();
  const pa = s.handler(s.request(0, a.signal)), pb = s.handler(s.request(1, b.signal)); await flush();
  const oldSignal = s.signal(); a.abort(); b.abort();
  assert.equal(oldSignal.aborted, true); assert.equal(s.coordinator.size, 0);
  const oldResolve = s.pending().resolve; s.reset(); const retry = s.handler(s.request(2)); await flush();
  assert.equal(s.calls(), 2); assert.equal(s.coordinator.size, 1);
  oldResolve({ ok: true, transcript }); await flush(); assert.equal(s.coordinator.size, 1); assert.equal(s.db.creates, 0);
  await response(pa, 408); await response(pb, 408); s.resolve(); await response(retry, 201);
  assert.equal(s.db.creates, 1); assert.equal(s.db.cacheWrites, 1); assert.equal(s.coordinator.size, 0);
});

test("already-aborted caller performs no cache/provider work or Source write", async () => {
  const s = setup(), controller = new AbortController(); controller.abort();
  await response(s.handler(s.request(0, controller.signal)), 408, "cancelled");
  assert.equal(s.calls(), 0); assert.equal(s.db.transactions, 0); assert.equal(s.coordinator.size, 0);
});

for (const change of ["language", "provider", "key", "bypass"] as const) test(`incompatible ${change} is busy before cache/provider IO`, async () => {
  const s = setup(), a = s.handler(s.request(0)); await flush();
  if (change === "provider") s.current.provider = "supadata";
  if (change === "key") s.current.supadataApiKey = "different-policy";
  if (change === "bypass") s.current.cacheBypass = true;
  await response(s.handler(s.request(1, undefined, change === "language" ? "fr" : "en")), 429, "limit_reached");
  assert.equal(s.db.cacheReads, 1); assert.equal(s.calls(), 1); s.resolve(); await response(a, 201);
});

test("policy identity separates default/explicit language, native policy and key rotation without retaining plaintext key", () => {
  const base = captionJobKey(key, config);
  for (const other of [captionJobKey(captionCacheKey(videoId), config), captionJobKey(captionCacheKey(videoId, "fr"), config),
    captionJobKey(key, { ...config, provider: "supadata", supadataApiKey: "PRIVATE" }),
    captionJobKey(key, { ...config, supadataApiKey: "PRIVATE" })]) { assert.notEqual(other, base); assert.doesNotMatch(other, /PRIVATE/); }
});

test("normalized language identity retains original regional-tag spelling for the existing provider contract", async () => {
  const s = setup(), a = s.handler(s.request(0, undefined, "en-US")), b = s.handler(s.request(1, undefined, "en-us")); await flush();
  assert.equal(s.calls(), 1); assert.equal(s.language(), "en-US");
  s.resolve({ ok: true, transcript: { ...transcript, language: "en-US" } });
  await Promise.all([response(a, 201), response(b, 201)]); assert.equal(s.db.cacheWrites, 1);
});

test("bypass never reads/writes cache or enters coordinator; deliberate sequential calls each extract", async () => {
  const s = setup(); s.current.cacheBypass = true;
  for (let i = 0; i < 2; i++) { s.reset(); const pending = s.handler(s.request(i)); await flush();
    assert.equal(s.coordinator.size, 0); s.resolve(); await response(pending, 201); }
  assert.equal(s.calls(), 2); assert.equal(s.db.cacheReads, 0); assert.equal(s.db.cacheWrites, 0);
});

test("uncached bypass preserves authored cancellation even when the adapter resolves after caller abort", async () => {
  const s = setup(), controller = new AbortController(), prior = s.seed(); s.current.cacheBypass = true;
  const pending = s.handler(s.request(0, controller.signal)); await flush(); controller.abort(); s.resolve();
  await response(pending, 408, "cancelled"); assert.equal(s.calls(), 1); assert.equal(s.db.creates, 0);
  assert.equal(s.db.cacheReads, 0); assert.equal(s.db.cacheWrites, 0); assert.deepEqual([...s.db.rows.keys()], prior);
});

for (const failure of ["blocked", "timeout", "malformed", "cache-write", "cache-read"] as const) test(`shared ${failure} clears job and preserves both Sources, deliberate retry is fresh`, async () => {
  const s = setup(), prior = s.seed();
  if (failure === "cache-write") s.db.failCacheWrite = true;
  if (failure === "cache-read") s.db.failCacheRead = true;
  const a = s.handler(s.request(0)), b = s.handler(s.request(1)); await flush();
  s.resolve(failure === "blocked" || failure === "timeout" ? { ok: false, error: { code: failure, message: "synthetic" } }
    : { ok: true, transcript: failure === "malformed" ? { ...transcript, fullText: "partial" } : transcript });
  const code = failure.startsWith("cache-") ? "storage_unavailable" : failure;
  const status = failure.startsWith("cache-") ? 503 : failure === "timeout" ? 504 : 502;
  await response(a, status, code); await response(b, status, code);
  assert.deepEqual([...s.db.rows.keys()], prior); assert.equal(s.coordinator.size, 0); assert.equal(s.db.creates, 0);
  assert.equal(s.calls(), failure === "cache-read" ? 0 : 1);
  s.reset(); const retry = s.handler(s.request(2)); await flush(); s.resolve(); await response(retry, 201);
  assert.equal(s.calls(), failure === "cache-read" ? 1 : 2);
});

test("one Source transaction failure cannot fail another caller or restart extraction", async () => {
  const s = setup(), prior = s.seed(); s.db.failCreate = true;
  const a = s.handler(s.request(0)), b = s.handler(s.request(1)); await flush(); s.resolve();
  await response(a, 503, "storage_unavailable"); await response(b, 201);
  assert.equal(s.calls(), 1); assert.equal(s.db.cacheWrites, 1); assert.equal(s.db.creates, 2); assert.ok(s.db.rows.has(prior[0]));
});

test("expired visitors cannot consume a late result into owned storage", async () => {
  const s = setup(), prior = s.seed(), a = s.handler(s.request(0)), b = s.handler(s.request(1)); await flush();
  s.expire(0); s.resolve(); await response(a, 401, "visitor_required"); await response(b, 401, "visitor_required");
  assert.equal(s.db.creates, 0); assert.deepEqual([...s.db.rows.keys()], prior); assert.equal(s.coordinator.size, 0);
});

test("one visitor expires while a later-expiring follower independently commits the same result", async () => {
  const s = setup(); s.visitors[0] = createVisitor(config, Date.now() - 2000);
  const prior = s.seed(), a = s.handler(s.request(0)), b = s.handler(s.request(1)); await flush();
  s.expire(0); s.resolve(); await response(a, 401, "visitor_required"); await response(b, 201);
  assert.equal(s.calls(), 1); assert.equal(s.db.creates, 1); assert.equal(s.db.cacheWrites, 1); assert.ok(s.db.rows.has(prior[0]));
});

test("eight participants, duplicate visitor, proof exclusivity and every quota remain bounded", () => {
  const admission = new CaptionAdmission(captionLimits), now = Date.now();
  const leases = Array.from({ length: 8 }, (_, i) => admission.acquireImport(String(i), "ip", now)!);
  leases.forEach(lease => assert.equal(lease.bind("same"), true));
  assert.equal(admission.acquireImport("0", "ip", now), null); assert.equal(admission.acquireImport("ninth", "ip", now), null);
  assert.equal(admission.acquire("proof", "ip", now), null);
  leases.forEach(lease => { lease.release(); lease.release(); });
  assert.equal(admission.acquireImport("ninth", "ip", now), null); // global/IP8 consumed
  for (let i = 0; i < 8; i++) admission.acquire(String(i), "ip", now + captionLimits.windowMs)!();
  assert.equal(admission.acquire("new", "ip", now + 2 * captionLimits.windowMs), null); // lifetime16
  const perVisitor = new CaptionAdmission(captionLimits);
  for (let i = 0; i < 4; i++) perVisitor.acquire("same", "ip", now)!();
  assert.equal(perVisitor.acquireImport("same", "ip", now), null);
  const exclusive = new CaptionAdmission(captionLimits), release = exclusive.acquire("proof", "ip", now)!;
  assert.equal(exclusive.acquireImport("other", "ip", now), null); release();
  assert.ok(exclusive.acquireImport("other", "ip", now));
});

test("deadline is fixed at job creation; waiter cannot extend it; timers cleared and late resolve is ignored", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const coordinator = new CaptionCoordinator(), held = deferred<CaptionTranscript>(), controller = new AbortController();
  let signal!: AbortSignal;
  const work = (input: AbortSignal) => { signal = input; return held.promise; };
  const a = coordinator.run("key", controller.signal, 100, work); const ra = assert.rejects(a, /timeout/);
  await flush(); t.mock.timers.tick(90);
  const b = coordinator.run("key", controller.signal, 100, work); const rb = assert.rejects(b, /timeout/);
  t.mock.timers.tick(10); assert.equal(coordinator.size, 0); // abort removes it before promise cleanup
  const immediateRetry = coordinator.run("key", controller.signal, 100, async () => transcript);
  await Promise.all([ra, rb, immediateRetry]);
  assert.equal(signal.aborted, true); assert.equal(coordinator.size, 0);
  held.resolve(transcript); await flush(); assert.equal(coordinator.size, 0);
  let successSignal!: AbortSignal;
  await coordinator.run("key", controller.signal, 100, async input => { successSignal = input; return transcript; });
  t.mock.timers.tick(1000); assert.equal(coordinator.size, 0); assert.equal(successSignal.aborted, false);
});

test("coordinator itself bounds jobs and waiters, rejects pre-abort, and returns immutable shared handler data", async () => {
  const coordinator = new CaptionCoordinator(), held = deferred<CaptionTranscript>(), signal = new AbortController().signal;
  const pending = Array.from({ length: 8 }, () => coordinator.run("same", signal, 1000, () => held.promise));
  await assert.rejects(coordinator.run("same", signal, 1000, () => held.promise), /limit_reached/);
  await assert.rejects(coordinator.run("different", signal, 1000, () => held.promise), /limit_reached/);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(coordinator.run("same", aborted.signal, 1000, () => held.promise), /cancelled/);
  held.resolve(transcript); await Promise.all(pending); assert.equal(coordinator.size, 0);
  const s = setup(); let shared: CaptionTranscript | undefined;
  const originalRun = s.coordinator.run.bind(s.coordinator);
  s.coordinator.run = async (...args) => { shared = await originalRun(...args); return shared; };
  const a = s.handler(s.request(0)), b = s.handler(s.request(1)); await flush(); s.resolve();
  await Promise.all([response(a, 201), response(b, 201)]);
  assert.ok(Object.isFrozen(shared)); assert.ok(Object.isFrozen(shared!.segments)); assert.ok(Object.isFrozen(shared!.segments[0]));
  assert.throws(() => { shared!.segments[0].text = "mutated"; });
  assert.equal(transcript.segments[0].text, " FIRST "); // provider input was cloned before sharing
});
