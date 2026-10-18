import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeVideo } from "../../src/server/captions/input.ts";
import { parseCaptionConfig } from "../../src/server/captions/config.ts";
import { createDirectCaptionProvider, normalizeSegments, captionBounds, CAPTION_PROVIDER } from "../../src/server/captions/provider.ts";
import { createCaptionHandler } from "../../src/server/captions/handler.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { readBounded } from "../../src/server/captions/bounded-body.ts";
import type { CaptionResult } from "../../src/shared/captions.ts";

const id = "dQw4w9WgXcQ";
const config = { origin: "https://proof.invalid", secure: true, cookieSecret: "ab".repeat(32) };
const input = { videoId: id, language: "en", signal: new AbortController().signal };
const xml = '<transcript><text start="1.25" dur="2.5"> FIRST &amp; marker </text><text start="25" dur="0">MIDDLE marker</text><text start="50.125" dur="3.75">LAST marker</text></transcript>';
const player = { playabilityStatus: { status: "OK" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [
  { languageCode: "en", kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?v=" + id + "&fmt=srv3" },
] } } };

// All routine network goes through this synthetic fetch; the actual installed parser executes.
function network(overrides: Partial<Record<"watch" | "player" | "transcript", () => Response>> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const stage = new URL(String(url)).pathname === "/watch" ? "watch" : new URL(String(url)).pathname === "/youtubei/v1/player" ? "player" : "transcript";
    return overrides[stage]?.() ?? new Response(stage === "watch" ? '"INNERTUBE_API_KEY":"synthetic-bootstrap"'
      : stage === "player" ? JSON.stringify(player) : xml);
  };
  return { fetcher, calls };
}
const rejectedUrls = ["https://evil.test/watch?v=" + id, "https://youtube.com.evil.test/watch?v=" + id,
  "https://evilyoutube.com/watch?v=" + id, "https://youtube.com@evil.test/watch?v=" + id,
  "https://user:pass@www.youtube.com/watch?v=" + id, "https://@youtube.com/watch?v=" + id,
  "http://www.youtube.com/watch?v=" + id, "ftp://youtube.com/watch?v=" + id, "javascript:" + id,
  "//youtube.com/watch?v=" + id, "www.youtube.com/watch?v=" + id, "https://youtu.be/" + id + "/more",
  "https://youtube.com/watch?v=" + id + "&v=" + id, "https://youtube.com/watch?v=short",
  "https://youtube.com/playlist?list=" + id, "https://youtube.com:444/watch?v=" + id,
  "https://youtube.com/shorts/" + id + "/extra", "https://youtube.com/\\watch?v=" + id,
  "bad", id + "x", " " + id, "https://youtu.be/%64Qw4w9WgXcQ"];

test("ordinary HTTPS YouTube forms normalize to an ID and canonical watch URL", () => {
  for (const value of [id, `https://youtu.be/${id}?si=discard`, `https://youtube.com/watch?v=${id}&t=3`,
    `https://www.youtube.com/watch?v=${id}#t=2`, `https://m.youtube.com/watch?v=${id}`,
    ...["shorts", "embed", "live"].map(path => `https://www.youtube.com/${path}/${id}`)]) {
    assert.deepEqual(normalizeVideo(value), { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` });
  }
  for (const value of [...rejectedUrls, null, {}, 3]) assert.equal(normalizeVideo(value), null, String(value));
});

test("caption configuration is independently gated, key/DB-free and strictly origin validated", () => {
  const env = { CAPTION_PROOF_ENABLED: "true", APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret, NODE_ENV: "production" };
  assert.deepEqual(parseCaptionConfig(env), config);
  for (const patch of [{ CAPTION_PROOF_ENABLED: "false" }, { VISITOR_COOKIE_SECRET: "" }, { APP_ORIGIN: "https://proof.invalid/" },
    { APP_ORIGIN: "http://evil.test", CAPTION_PROOF_LOCAL_HTTP: "true" }, { APP_ORIGIN: "http://127.0.0.1:3103" },
    { NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "private" }, { NEXT_PUBLIC_OPENAI_API_KEY: "private" }]) {
    assert.equal(parseCaptionConfig({ ...env, ...patch }), null);
  }
  assert.equal(parseCaptionConfig({}), null);
  assert.equal(parseCaptionConfig({ ...env, APP_ORIGIN: "http://127.0.0.1:3103", CAPTION_PROOF_LOCAL_HTTP: "true" })?.secure, false);
});

test("actual package maps fractional XML seconds and preserves first/middle/last, language and complete text", async () => {
  const n = network(); const provider = createDirectCaptionProvider({ fetch: n.fetcher });
  const result = await provider(input);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.transcript, { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, language: "en", provider: CAPTION_PROVIDER,
    trackType: "automatic", segments: [{ text: " FIRST & marker ", startSeconds: 1.25, durationSeconds: 2.5 },
      { text: "MIDDLE marker", startSeconds: 25, durationSeconds: 0 }, { text: "LAST marker", startSeconds: 50.125, durationSeconds: 3.75 }],
    fullText: " FIRST & marker \nMIDDLE marker\nLAST marker" });
  assert.equal(n.calls.length, 3);
  for (const call of n.calls) {
    assert.equal(call.init?.cache, "no-store"); assert.equal(call.init?.redirect, "manual");
    assert.equal(call.init?.credentials, "omit"); assert.ok(call.init?.signal);
  }
  assert.equal(n.calls[2].url.includes("fmt="), false);
  assert.equal(JSON.parse(n.calls[1].init!.body as string).videoId, id);
  await provider(input); assert.equal(n.calls.length, 6, "second call does fresh extraction; no application or extractor cache");
});

test("missing or malformed title metadata never blocks captions; unknown track type is omitted", async () => {
  const n = network({ player: () => Response.json({ ...player, videoDetails: { title: { invalid: true } },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "en", baseUrl: "https://www.youtube.com/api/timedtext?v=" + id }] } } }) });
  const result = await createDirectCaptionProvider({ fetch: n.fetcher })({ ...input, language: undefined });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal("trackType" in result.transcript, false);
});

test("normalization rejects empty, malformed, nonfinite, negative, mixed-language and oversized data", () => {
  const good = { text: "kept", offset: 0, duration: 1, lang: "en" };
  for (const value of [null, [], {}, [{ ...good, text: " " }], [{ ...good, offset: NaN }], [{ ...good, duration: Infinity }],
    [{ ...good, offset: -1 }], [{ ...good, duration: -1 }], [{ ...good, lang: "" }], [good, { ...good, lang: "fr" }],
    [{ ...good, text: "x".repeat(captionBounds.characters + 1) }], Array(captionBounds.segments + 1).fill(good)]) {
    assert.throws(() => normalizeSegments(value, id));
  }
  const unordered = normalizeSegments([good, { ...good, text: "later in source", offset: 0 }], id);
  assert.equal(unordered.fullText, "kept\nlater in source");
});

test("provider rejects invalid IDs/languages before all network", async () => {
  const n = network(); const provider = createDirectCaptionProvider({ fetch: n.fetcher });
  for (const videoId of rejectedUrls) assert.equal((await provider({ ...input, videoId })).ok, false);
  assert.equal((await provider({ ...input, language: "../bad" })).ok, false);
  assert.equal(n.calls.length, 0);
});

test("upstream classifications are sanitized and never retry", async t => {
  const cases: [string, Parameters<typeof network>[0], string, number][] = [
    ["watch 429", { watch: () => new Response("private key=secret", { status: 429 }) }, "rate_limited", 1],
    ["player 403", { player: () => new Response("private", { status: 403 }) }, "blocked", 2],
    ["player 500", { player: () => new Response("private", { status: 500 }) }, "upstream_failure", 2],
    ["redirect", { watch: () => new Response(null, { status: 302, headers: { location: "https://evil.test" } }) }, "blocked", 1],
    ["missing bootstrap", { watch: () => new Response("consent or changed page") }, "unavailable", 1],
    ["challenge", { watch: () => new Response('class="g-recaptcha"') }, "rate_limited", 1],
    ["login required", { player: () => Response.json({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "private secret" } }) }, "blocked", 2],
    ["no tracks", { player: () => Response.json({ playabilityStatus: { status: "OK" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [] } } }) }, "no_captions", 2],
    ["empty body", { transcript: () => new Response("") }, "no_captions", 3],
    ["empty captions", { transcript: () => new Response("<transcript></transcript>") }, "no_captions", 3],
    ["partial XML", { transcript: () => new Response(xml.replace("MIDDLE marker", "<b>MIDDLE marker</b>")) }, "malformed", 3],
    ["invalid numeric XML", { transcript: () => new Response(xml.replace('start="25"', 'start="25junk"')) }, "malformed", 3],
    ["oversized length", { watch: () => new Response("small", { headers: { "content-length": String(captionBounds.watchBytes + 1) } }) }, "too_large", 1],
    ["network error", { watch: () => { throw new Error("private https://secret.test?key=secret"); } }, "upstream_failure", 1],
  ];
  for (const [name, overrides, code, calls] of cases) await t.test(name, async () => {
    const n = network(overrides); const result = await createDirectCaptionProvider({ fetch: n.fetcher })(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, code);
    assert.equal(n.calls.length, calls);
    assert.doesNotMatch(JSON.stringify(result), /private|secret|proxy|cookie|reason/);
  });
});

test("untrusted upstream caption URL is rejected without outbound work to that host", async () => {
  const n = network({ player: () => Response.json({ ...player, captions: { playerCaptionsTracklistRenderer: { captionTracks: [
    { languageCode: "en", baseUrl: "https://evil.test/api/timedtext" },
  ] } } }) });
  const result = await createDirectCaptionProvider({ fetch: n.fetcher })(input);
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, "blocked");
  assert.equal(n.calls.length, 2);
});

test("deadline aborts outstanding fetch, caller abort propagates, no retry or follow-on request", async () => {
  for (const callerAbort of [false, true]) {
    let calls = 0; let aborted = false;
    const caller = new AbortController();
    const provider = createDirectCaptionProvider({ deadlineMs: 25, fetch: async (_, init) => {
      calls++;
      return new Promise((_, reject) => {
        init!.signal!.addEventListener("abort", () => { aborted = true; reject(init!.signal!.reason); }, { once: true });
        if (callerAbort) caller.abort();
      });
    } });
    const result = await provider({ ...input, signal: caller.signal });
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, callerAbort ? "cancelled" : "timeout");
    assert.equal(calls, 1); assert.equal(aborted, true);
  }
});

test("deadline cancels a stalled response stream; byte overflow cancels consumption", async () => {
  let cancelled = false;
  const result = await createDirectCaptionProvider({ deadlineMs: 25, fetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) })(input);
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, "timeout");
  assert.equal(cancelled, true);
  cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(10)); }, cancel() { cancelled = true; } });
  await assert.rejects(readBounded(stream, 9, new AbortController().signal)); assert.equal(cancelled, true);
});

test("one total deadline reaches player and transcript fetches, with no retries", async () => {
  for (const stalledPath of ["/youtubei/v1/player", "/api/timedtext"]) {
    const n = network(); let cancelled = false; let stalledCalls = 0;
    const result = await createDirectCaptionProvider({ deadlineMs: 25, fetch: async (url, init) => {
      if (new URL(String(url)).pathname !== stalledPath) return n.fetcher(url, init);
      stalledCalls++;
      return new Promise((_, reject) => init!.signal!.addEventListener("abort", () => {
        cancelled = true; reject(init!.signal!.reason);
      }, { once: true }));
    } })(input);
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, "timeout");
    assert.equal(stalledCalls, 1); assert.equal(cancelled, true);
  }
});

const request = (body: unknown = { video: id }, headers: Record<string, string> = {}) => new Request(config.origin + "/api/proof-captions", {
  method: "POST", headers: { origin: config.origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body),
});

test("route gate, origin, fields, body and URL rejections precede provider work", async () => {
  let calls = 0;
  const handler = () => createCaptionHandler({ config: () => config, provider: async () => { calls++; throw new Error("unexpected"); } });
  const disabled = createCaptionHandler({ config: () => null, provider: async () => { calls++; throw new Error("unexpected"); } });
  assert.equal((await disabled(request())).status, 503);
  for (const req of [request({}, { origin: "https://evil.test" }), request({}, { "sec-fetch-site": "cross-site" }),
    request({ video: id, endpoint: "https://evil.test" }), request({ video: id, owner: "bad" }), request([], {}), request({ video: "x".repeat(600) }),
    request({ video: id, language: "../x" }), request({ video: id }, { "content-type": "text/plain" }),
    ...rejectedUrls.map(video => request({ video }))]) {
    const response = await handler()(req);
    assert.ok(response.status >= 400); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(calls, 0);
});

test("route minimal DTO/cookie, error sanitation, reuse, per-visitor and global admission", async () => {
  let calls = 0;
  const success: CaptionResult = { ok: true, transcript: normalizeSegments([{ text: "safe", offset: 1, duration: 2, lang: "en" }], id) };
  const handler = createCaptionHandler({ config: () => config, provider: async value => {
    calls++; assert.equal(value.videoId, id); return success;
  } });
  const response = await handler(request());
  assert.deepEqual(await response.json(), success); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
  const cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
  for (let i = 0; i < 3; i++) assert.equal((await handler(request({ video: id }, { cookie }))).status, 200);
  assert.equal((await handler(request({ video: id }, { cookie }))).status, 429); assert.equal(calls, 4);
  for (let i = 0; i < 4; i++) assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429); assert.equal(calls, 8);
  const throwing = createCaptionHandler({ config: () => config, provider: async () => { throw new Error("secret owner database key"); } });
  const failed = await throwing(request());
  assert.equal(failed.status, 500); assert.deepEqual(await failed.json(), { ok: false, error: { code: "internal", message: "Caption proof failed" } });
});

test("route bounds concurrency, releases after failure, handles signed visitors without any Source", async () => {
  const cookie = visitorCookie(createVisitor(config, Date.now()), config, Date.now()).split(";", 1)[0];
  let finish: (value: CaptionResult) => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>(resolve => { started = resolve; });
  const handler = createCaptionHandler({ config: () => config, provider: () => { started(); return new Promise(resolve => { finish = resolve; }); } });
  const pending = handler(request({ video: id }, { cookie }));
  await ready;
  assert.equal((await handler(request())).status, 429);
  finish({ ok: false, error: { code: "timeout", message: "Deadline" } });
  assert.equal((await pending).status, 504);
  const again = handler(request({ video: id }, { cookie }));
  await new Promise(resolve => setImmediate(resolve));
  finish({ ok: false, error: { code: "no_captions", message: "Unavailable" } });
  assert.equal((await again).status, 422);
});

test("slow and malformed request bodies cancel before upstream work; admission releases", async () => {
  let calls = 0; let cancelled = false;
  const handler = createCaptionHandler({ config: () => config, provider: async () => {
    calls++; return { ok: false, error: { code: "no_captions", message: "Unavailable" } };
  } });
  const slow = new Request(config.origin, { method: "POST", headers: { origin: config.origin, "content-type": "application/json" },
    body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: "half" } as RequestInit);
  assert.equal((await handler(slow)).status, 400); assert.equal(cancelled, true);
  const malformed = new Request(config.origin, { method: "POST", headers: { origin: config.origin, "content-type": "application/json" }, body: "{" });
  assert.equal((await handler(malformed)).status, 400);
  const noOrigin = request(); noOrigin.headers.delete("origin");
  assert.equal((await handler(noOrigin)).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handler(request())).status, 422); assert.equal(calls, 1);
});
