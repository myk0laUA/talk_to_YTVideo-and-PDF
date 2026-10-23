import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCaptionConfig } from "../../src/server/captions/config.ts";
import { createConfiguredCaptionHandler } from "../../src/server/captions/configured.ts";
import { createCaptionHandler } from "../../src/server/captions/handler.ts";
import { captionBounds, type CaptionProvider } from "../../src/server/captions/provider.ts";
import { createSupadataCaptionProvider, normalizeSupadata, supadataBounds } from "../../src/server/captions/supadata.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import type { CaptionFailureCode } from "../../src/shared/captions.ts";
import { directCaptionEnvironment } from "../../tests/integration/lib/caption-proof-env.ts";

const id = "dQw4w9WgXcQ";
const key = "synthetic-03b-key";
const config = { origin: "https://proof.invalid", secure: true, cookieSecret: "cd".repeat(32) };
const env = { APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret, CAPTION_PROOF_ENABLED: "true",
  CAPTION_PROOF_PROVIDER: "supadata", SUPADATA_API_KEY: key };
const input = { videoId: id, language: "en", signal: new AbortController().signal };
const transcript = { lang: "en-GB", content: [
  { text: " FIRST marker ", offset: 1250.5, duration: 2500.125, lang: "en-GB" },
  { text: "MIDDLE marker", offset: 25000, duration: 0, lang: "en-GB" },
  { text: "LAST marker", offset: 50125.75, duration: 3750.5, lang: "en-GB" },
] };
const request = (body: unknown = { video: id, language: "en" }, headers: Record<string, string> = {}, signal?: AbortSignal) =>
  new Request(config.origin + "/api/proof-captions", { method: "POST", headers: {
    origin: config.origin, "content-type": "application/json", ...headers,
  }, body: JSON.stringify(body), signal });

function network(responses: (() => Response)[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.origin, "https://api.supadata.ai");
    assert.match(parsed.pathname, /^\/v1\/transcript(?:\/safe-job_1)?$/);
    assert.equal(init?.method, "GET"); assert.equal(init?.redirect, "manual");
    assert.equal(init?.credentials, "omit"); assert.equal(init?.cache, "no-store");
    assert.deepEqual(init?.headers, { "x-api-key": key });
    assert.equal(parsed.href.includes(key), false); assert.ok(init?.signal);
    calls.push({ url: parsed, init: init! });
    assert.ok(responses.length, "no unexpected call/resubmission/retry");
    return responses.shift()!();
  };
  return { fetcher, calls };
}
const immediateWaits: number[] = [];
const wait = async (ms: number, signal: AbortSignal) => { signal.throwIfAborted(); immediateWaits.push(ms); };
function failure(result: Awaited<ReturnType<CaptionProvider>>, code: CaptionFailureCode) {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-03b-key|RAW_PRIVATE|evil\.invalid|documentationUrl/);
}

// Every terminal adapter scenario also checks that the HTTP handler releases concurrency.
async function throughHandler(provider: CaptionProvider, code: CaptionFailureCode, signal?: AbortSignal) {
  let attempts = 0;
  const handler = createCaptionHandler({ config: () => config, provider: value => ++attempts === 1 ? provider(value)
    : Promise.resolve({ ok: false, error: { code: "no_captions", message: "Released" } }) });
  const response = await handler(request(undefined, {}, signal));
  failure(await response.json(), code);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await handler(request())).status, 422);
  assert.equal(attempts, 2, "terminal path releases admission");
}

test("managed synchronous raw HTTP preserves all text, fractional milliseconds, returned language and minimal metadata", async () => {
  const n = network([() => Response.json(transcript), () => Response.json(transcript)]);
  const provider = createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher });
  const result = await provider(input);
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.deepEqual(result.transcript, { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    language: "en-GB", provider: "supadata", fullText: " FIRST marker \nMIDDLE marker\nLAST marker", segments: [
      { text: " FIRST marker ", startSeconds: 1.2505, durationSeconds: 2.500125 },
      { text: "MIDDLE marker", startSeconds: 25, durationSeconds: 0 },
      { text: "LAST marker", startSeconds: 50.12575, durationSeconds: 3.7505 },
    ] });
  assert.deepEqual(Object.fromEntries(n.calls[0].url.searchParams), { url: `https://www.youtube.com/watch?v=${id}`,
    mode: "native", text: "false", lang: "en" });
  await provider({ ...input, language: undefined });
  assert.equal(n.calls.length, 2); assert.equal(n.calls[1].url.searchParams.has("lang"), false);
});

test("raw async queued/active/completed polls one job without initial resubmission", async () => {
  immediateWaits.length = 0;
  const n = network([() => Response.json({ jobId: "safe-job_1" }, { status: 202 }),
    () => Response.json({ status: "queued" }), () => Response.json({ status: "active" }),
    () => Response.json({ status: "completed", ...transcript })]);
  const result = await createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher, wait })(input);
  assert.equal(result.ok, true); if (result.ok) assert.equal(result.transcript.fullText, transcript.content.map(s => s.text).join("\n"));
  assert.equal(n.calls.length, 4);
  for (const call of n.calls.slice(1)) { assert.equal(call.url.pathname, "/v1/transcript/safe-job_1"); assert.equal(call.url.search, ""); }
  assert.deepEqual(immediateWaits, [1000, 1000, 1000]);
});

test("runtime polling timer waits at least one second before each poll", async () => {
  const n = network([() => Response.json({ jobId: "safe-job_1" }, { status: 202 }),
    () => Response.json({ status: "active" }), () => Response.json({ status: "completed", ...transcript })]);
  const times: number[] = [];
  const result = await createSupadataCaptionProvider({ apiKey: key, fetch: async (url, init) => {
    times.push(performance.now()); return n.fetcher(url, init);
  } })(input);
  assert.equal(result.ok, true);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 1000);
});

test("pending jobs stop after five polls and release admission", async () => {
  const n = network([() => Response.json({ jobId: "safe-job_1" }, { status: 202 }),
    ...Array.from({ length: 5 }, () => () => Response.json({ status: "active" }))]);
  await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher, wait }), "timeout");
  assert.equal(n.calls.length, 6); assert.equal(supadataBounds.deadlineMs, 15000);
});

test("documented statuses, known rate/quota, unknown 429 and failures are authored and never retried", async t => {
  const privateError = { error: "limit-exceeded", message: "RAW_PRIVATE " + key, documentationUrl: "https://evil.invalid" };
  const cases: [string, () => Response, CaptionFailureCode][] = [
    ...([206, 401, 402, 403, 404, 500, 502, 503] as const).map(status => [String(status),
      () => Response.json(privateError, { status }), status === 206 ? "no_captions" : status === 404 ? "unavailable"
        : status < 500 ? "blocked" : "upstream_failure"] as [string, () => Response, CaptionFailureCode]),
    ["redirect", () => new Response(null, { status: 302, headers: { location: "https://evil.invalid" } }), "blocked"],
    ["quota", () => Response.json({ ...privateError, details: "Plan usage limit was exceeded." }, { status: 429 }), "quota_exhausted"],
    ...["Global request rate limit was exceeded.", "Request rate limit on current plan was exceeded."].map(details =>
      [details, () => Response.json({ ...privateError, details }, { status: 429 }), "rate_limited"] as [string, () => Response, CaptionFailureCode]),
    ["unknown 429", () => Response.json({ ...privateError, details: "quota? RAW_PRIVATE" }, { status: 429 }), "provider_limited"],
    ["unknown error code", () => Response.json({ error: "other", details: "Plan usage limit was exceeded." }, { status: 429 }), "provider_limited"],
    ["non-JSON 429", () => new Response("RAW_PRIVATE", { status: 429 }), "provider_limited"],
    ["broken JSON", () => new Response("{"), "malformed"],
    ["declared oversize", () => new Response("{}", { headers: { "content-length": String(supadataBounds.responseBytes + 1) } }), "too_large"],
    ["network failure", () => { throw new Error("RAW_PRIVATE " + key); }, "upstream_failure"],
  ];
  for (const [name, response, code] of cases) await t.test(name, async () => {
    const n = network([response]);
    await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher }), code);
    assert.equal(n.calls.length, 1);
  });
});

test("empty, partial, SDK-wrapped, malformed and oversized results fail without dropping segments", async t => {
  const good = transcript.content[0];
  const cases: [unknown, CaptionFailureCode][] = [
    [null, "malformed"], [{}, "malformed"], [{ ...transcript, content: [] }, "no_captions"],
    [{ ...transcript, content: "plain text despite text=false" }, "malformed"],
    [{ ...transcript, lang: undefined }, "malformed"], [{ ...transcript, content: [good, null] }, "malformed"],
    [{ ...transcript, content: [good, { ...good, text: " " }] }, "malformed"],
    [{ ...transcript, content: [good, { ...good, lang: "en" }] }, "malformed"],
    [{ ...transcript, content: [{ ...good, lang: undefined }] }, "malformed"],
    [{ ...transcript, content: [{ ...good, offset: "3" }] }, "malformed"],
    [{ ...transcript, content: [{ ...good, duration: -1 }] }, "malformed"],
    [{ ...transcript, status: "partial" }, "malformed"], [{ ...transcript, error: "RAW_PRIVATE" }, "malformed"],
    [{ status: "completed", result: transcript }, "malformed"],
    [{ ...transcript, content: [{ ...good, text: "x".repeat(captionBounds.characters + 1) }] }, "too_large"],
    [{ ...transcript, content: Array(captionBounds.segments + 1).fill(good) }, "too_large"],
  ];
  for (const [i, [raw, code]] of cases.entries()) await t.test(String(i), async () => {
    const n = network([() => Response.json(raw)]);
    await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher }), code);
    assert.equal(n.calls.length, 1);
  });
  for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE]) assert.throws(() => normalizeSupadata({ ...transcript,
    content: [{ ...good, offset: value, duration: value }] }, id));
  const ordered = normalizeSupadata({ ...transcript, content: [transcript.content[2], good] }, id);
  assert.equal(ordered.fullText, "LAST marker\n FIRST marker ");
});

test("unsafe jobs, failed jobs and unsupported raw job states terminate without retries", async t => {
  const cases: [unknown, unknown, CaptionFailureCode, number][] = [
    ...["../escape", "https://evil.invalid", "a?key=x", "%2e%2e", "a/b", "", "x".repeat(129), 1].map(jobId =>
      [{ jobId }, undefined, "malformed", 1] as [unknown, unknown, CaptionFailureCode, number]),
    [{ jobId: "safe-job_1" }, { status: "failed", error: { message: "RAW_PRIVATE" } }, "upstream_failure", 2],
    [{ jobId: "safe-job_1" }, { status: "failed", error: { error: "limit-exceeded", details: "Plan usage limit was exceeded." } }, "quota_exhausted", 2],
    [{ jobId: "safe-job_1" }, { status: "completed", result: transcript }, "malformed", 2],
    [{ jobId: "safe-job_1" }, { status: "unknown" }, "malformed", 2],
    [{ jobId: "safe-job_1" }, { status: "queued", content: transcript.content }, "malformed", 2],
    [{ jobId: "safe-job_1", content: [] }, undefined, "malformed", 1],
  ];
  for (const [i, [initial, job, code, calls]] of cases.entries()) await t.test(String(i), async () => {
    const n = network([() => Response.json(initial, { status: 202 }), () => Response.json(job)]);
    await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher, wait }), code);
    assert.equal(n.calls.length, calls);
  });
});

test("caller and total deadline abort fetch, streamed body and pending wait, including job fetch/body", async t => {
  for (const phase of ["fetch", "body", "wait", "job-fetch", "job-body"]) for (const caller of [false, true]) {
    await t.test(`${phase}/${caller ? "caller" : "deadline"}`, async () => {
      const controller = new AbortController(); let aborted = false; let calls = 0;
      const started = performance.now();
      const cancel = () => { if (caller) setTimeout(() => controller.abort(), 5); };
      const fetcher: typeof fetch = async (_, init) => {
        calls++;
        if (phase === "wait" || (phase.startsWith("job-") && calls === 1)) {
          if (phase === "wait") cancel();
          return Response.json({ jobId: "safe-job_1" }, { status: 202 });
        }
        cancel();
        if (phase.endsWith("body")) return new Response(new ReadableStream({ cancel() { aborted = true; } }));
        return new Promise((_, reject) => init!.signal!.addEventListener("abort", () => {
          aborted = true; reject(init!.signal!.reason);
        }, { once: true }));
      };
      await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: fetcher, deadlineMs: 40,
        ...(phase.startsWith("job-") ? { wait } : {}) }), caller ? "cancelled" : "timeout", controller.signal);
      assert.equal(calls, phase.startsWith("job-") ? 2 : 1);
      assert.ok(performance.now() - started < 500, "abort settles without waiting for the poll interval");
      if (phase !== "wait") assert.equal(aborted, true);
    });
  }
});

test("stream overflow actively cancels and failed/poll HTTP errors stop immediately", async () => {
  let cancelled = false;
  await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: async () => new Response(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(supadataBounds.responseBytes + 1)); }, cancel() { cancelled = true; },
  })) }), "too_large");
  assert.equal(cancelled, true);
  for (const status of [206, 401, 429, 500, 202]) {
    const n = network([() => Response.json({ jobId: "safe-job_1" }, { status: 202 }), () => Response.json({}, { status })]);
    await throughHandler(createSupadataCaptionProvider({ apiKey: key, fetch: n.fetcher, wait }),
      status === 206 ? "no_captions" : status === 401 ? "blocked" : status === 429 ? "provider_limited" : status === 202 ? "malformed" : "upstream_failure");
    assert.equal(n.calls.length, 2);
  }
});

test("configuration and invalid provider input fail closed before network", async () => {
  let calls = 0; const fetcher: typeof fetch = async () => { calls++; throw new Error("unexpected"); };
  assert.equal(parseCaptionConfig({ ...env, CAPTION_PROOF_PROVIDER: undefined })?.provider, "direct");
  for (const patch of [{ CAPTION_PROOF_ENABLED: "false" }, { CAPTION_PROOF_PROVIDER: "auto" }, { CAPTION_PROOF_PROVIDER: "" },
    { SUPADATA_API_KEY: "" }, { SUPADATA_API_KEY: undefined }, { SUPADATA_API_KEY: "bad\nkey" },
    { NEXT_PUBLIC_SUPADATA_API_KEY: "bad" }, { APP_ORIGIN: "https://invalid/" }]) {
    assert.equal(parseCaptionConfig({ ...env, ...patch }), null);
    const handler = createConfiguredCaptionHandler({ env: () => ({ ...env, ...patch }), fetch: fetcher });
    assert.equal((await handler(request())).status, 503);
  }
  failure(await createSupadataCaptionProvider({ fetch: fetcher })(input), "disabled");
  const controller = new AbortController(); controller.abort();
  failure(await createSupadataCaptionProvider({ apiKey: key, fetch: fetcher })({ ...input, signal: controller.signal }), "cancelled");
  for (const patch of [{ videoId: "../bad" }, { videoId: `https://youtu.be/${id}` }, { language: "../bad" }]) {
    failure(await createSupadataCaptionProvider({ apiKey: key, fetch: fetcher })({ ...input, ...patch }), "invalid_input");
  }
  assert.equal(calls, 0);
});

test("managed gate/origin/body/fields/URL rejection does zero upstream work", async () => {
  let calls = 0;
  for (const req of [request({}, { origin: "https://evil.invalid" }), request({}, { "sec-fetch-site": "cross-site" }),
    request({}, { "content-type": "text/plain" }), request([]), request({ video: "https://evil.invalid" }),
    request({ video: id, language: "../bad" }), request({ video: "x".repeat(600) }),
    ...["provider", "mode", "baseUrl", "apiKey"].map(field => request({ video: id, [field]: "RAW_PRIVATE" }))]) {
    const handler = createConfiguredCaptionHandler({ env: () => env, fetch: async () => { calls++; throw new Error("unexpected"); } });
    assert.ok((await handler(req)).status >= 400);
  }
  assert.equal(calls, 0);
});

test("alternating direct and managed selection shares visitor/global limits and concurrency", async () => {
  let selected = "direct"; let calls = 0;
  let finish: (() => void) | undefined;
  const handler = createConfiguredCaptionHandler({ env: () => ({ ...env, CAPTION_PROOF_PROVIDER: selected }), fetch: async () => {
    calls++;
    if (finish === undefined) await new Promise<void>(resolve => { finish = resolve; });
    return new Response(null, { status: 403 });
  } });
  const cookie = visitorCookie(createVisitor(config, Date.now()), config, Date.now()).split(";", 1)[0];
  const pending = handler(request(undefined, { cookie }));
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  selected = "supadata";
  assert.equal((await handler(request())).status, 429); assert.equal(calls, 1);
  finish(); await pending;
  for (let i = 1; i < 4; i++) {
    selected = i % 2 ? "supadata" : "direct";
    assert.equal((await handler(request(undefined, { cookie }))).status, 502);
  }
  assert.equal((await handler(request(undefined, { cookie }))).status, 429); assert.equal(calls, 4);
  for (let i = 0; i < 4; i++) { selected = i % 2 ? "supadata" : "direct"; assert.equal((await handler(request())).status, 502); }
  assert.equal((await handler(request())).status, 429); assert.equal(calls, 8);
});

test("local live harness explicitly forces direct and removes inherited managed credentials", async () => {
  const isolated = directCaptionEnvironment({ ...env, CAPTION_PROOF_PROVIDER: "supadata", NEXT_PUBLIC_SUPADATA_API_KEY: key,
    OPENAI_API_KEY: "synthetic-openai", DATABASE_URL: "postgresql://private.invalid/db", NODE_OPTIONS: "--unexpected" }, config.origin, config.cookieSecret);
  assert.equal(parseCaptionConfig(isolated)?.provider, "direct");
  for (const name of ["SUPADATA_API_KEY", "NEXT_PUBLIC_SUPADATA_API_KEY", "OPENAI_API_KEY", "NODE_OPTIONS"] as const) assert.equal(isolated[name], "");
  for (const name of ["PROOF_ENABLED", "REALTIME_ISSUANCE_ENABLED", "TEXT_PROOF_ENABLED"] as const) assert.equal(isolated[name], "false");
  assert.match(isolated.DATABASE_URL, /127\.0\.0\.1:1/);
  let calls = 0;
  const handler = createConfiguredCaptionHandler({ env: () => isolated, fetch: async (url, init) => {
    calls++; assert.equal(new URL(String(url)).origin, "https://www.youtube.com");
    assert.equal(new Headers(init?.headers).has("x-api-key"), false);
    return new Response(null, { status: 403 });
  } });
  assert.equal((await handler(request())).status, 502); assert.equal(calls, 1);
});
