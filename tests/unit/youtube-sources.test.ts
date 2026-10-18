import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createYoutubeSourceHandler as createHandler } from "../../src/server/sources/youtube.ts";
import { parseSourceReadConfig, parseYoutubeSourceConfig } from "../../src/server/sources/config.ts";
import { createSourceHandlers } from "../../src/server/sources/handler.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, sourceDto, uploadedRecord } from "../../src/server/sources/service.ts";
import { configuredCaptionProvider } from "../../src/server/captions/configured.ts";
import { createCaptionHandler } from "../../src/server/captions/handler.ts";
import { captionLimits } from "../../src/server/captions/admission.ts";
import { Admission } from "../../src/server/proof/admission.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { isOwnedReady } from "../../src/server/proof/source.ts";
import type { CaptionTranscript } from "../../src/shared/captions.ts";
import type { CaptionConfig } from "../../src/server/captions/config.ts";
import type { PdfExtraction } from "../../src/shared/pdf.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config: CaptionConfig = { origin: "https://source.invalid", secure: true, cookieSecret: "ab".repeat(32), provider: "direct" };
// These pre-cache boundary tests deliberately exercise uncached imports. Cache tests use the real adapter.
const createYoutubeSourceHandler = (deps: Omit<Parameters<typeof createHandler>[0], "cache">) => createHandler({ ...deps,
  cache: { get: async () => null, put: async () => {} } });
const id = "dQw4w9WgXcQ";
const transcript: CaptionTranscript = { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, language: "en",
  provider: "youtube-transcript-plus@2.0.3", trackType: "automatic", fullText: " FIRST \nMIDDLE\nLAST",
  segments: [{ text: " FIRST ", startSeconds: 1.2505, durationSeconds: 0.500125 },
    { text: "MIDDLE", startSeconds: 0, durationSeconds: 0 }, { text: "LAST", startSeconds: 50.125, durationSeconds: 3.75 }] };
const extraction: PdfExtraction = { parser: "pdf-parse@2.4.5", fileBytes: 30, pageCount: 1, fullText: "SAFE PDF", characterCount: 8,
  sections: [{ id: "page-1", pageNumber: 1, text: "SAFE PDF" }], warnings: [] };
const visitor = () => createVisitor(config, Date.now());
const cookie = (v = visitor()) => visitorCookie(v, config, Date.now()).split(";", 1)[0];
const req = (token = cookie(), body: unknown = { video: id }, headers: Record<string, string> = {}, signal?: AbortSignal) => new Request(config.origin, {
  method: "POST", headers: { origin: config.origin, cookie: token, "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body), signal,
});
const readReq = (token: string, method = "GET", headers = {}) => new Request(config.origin, { method, headers: { origin: config.origin, cookie: token, ...headers } });
async function result(r: Response, status: number, code?: string) {
  const value = await r.json(); assert.equal(r.status, status, JSON.stringify(value));
  assert.equal(r.headers.get("cache-control"), "no-store"); if (code) assert.equal(value.error.code, code);
  assert.doesNotMatch(JSON.stringify(value), /owner|PRIVATE|postgresql|cookieSecret|supadataApiKey|extractionStatus|providerJobId/);
  return value;
}
function setup() {
  const db = new SyntheticSourceDatabase(), v = visitor();
  const repository = createSourceRepository(() => db.asClient());
  const pdf = createSourceHandlers({ config: () => config, repository, parse: async () => extraction });
  const youtube = createYoutubeSourceHandler({ config: () => config, repository, provider: async () => ({ ok: true, transcript }) });
  return { db, v, token: cookie(v), repository, pdf, youtube };
}

test("YouTube production config requires explicit gate/provider, valid DB/visitor, and managed key only when selected", () => {
  const env = { YOUTUBE_INGESTION_ENABLED: "true", YOUTUBE_INGESTION_PROVIDER: "direct", APP_ORIGIN: config.origin,
    VISITOR_COOKIE_SECRET: config.cookieSecret, NODE_ENV: "production", DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" };
  assert.deepEqual(parseYoutubeSourceConfig(env), config);
  for (const patch of [{ YOUTUBE_INGESTION_ENABLED: "false" }, { YOUTUBE_INGESTION_PROVIDER: "" }, { YOUTUBE_INGESTION_PROVIDER: "auto" },
    { DATABASE_URL: "" }, { DATABASE_URL: "bad" }, { VISITOR_COOKIE_SECRET: "" }, { APP_ORIGIN: "http://other.invalid" },
    { APP_ORIGIN: "http://127.0.0.1:3108" }, { NEXT_PUBLIC_SUPADATA_API_KEY: "PRIVATE" }, { YOUTUBE_INGESTION_PROVIDER: "supadata" }]) {
    assert.equal(parseYoutubeSourceConfig({ ...env, ...patch }), null);
  }
  assert.equal(parseYoutubeSourceConfig({ ...env, APP_ORIGIN: "http://127.0.0.1:3108", YOUTUBE_INGESTION_LOCAL_HTTP: "true" })?.secure, false);
  assert.equal(parseYoutubeSourceConfig({ ...env, YOUTUBE_INGESTION_PROVIDER: "supadata", SUPADATA_API_KEY: "PRIVATE" })?.provider, "supadata");
  assert.equal(parseYoutubeSourceConfig({}), null);
  assert.deepEqual(parseSourceReadConfig(env), { origin: config.origin, secure: true, cookieSecret: config.cookieSecret });
  assert.deepEqual(parseSourceReadConfig({ ...env, YOUTUBE_INGESTION_ENABLED: "false", PDF_INGESTION_ENABLED: "true" }),
    { origin: config.origin, secure: true, cookieSecret: config.cookieSecret });
  assert.equal(parseSourceReadConfig({ ...env, YOUTUBE_INGESTION_ENABLED: "false" }), null);
});

test("gate/origin/fetch metadata/forged and expired visitor reject before reading body/provider/repository", async () => {
  for (const [headers, status, code] of [
    [{ origin: "https://foreign.invalid" }, 403, "forbidden"], [{ "sec-fetch-site": "cross-site" }, 403, "forbidden"],
    [{ cookie: "" }, 401, "visitor_required"], [{ cookie: "td-visitor=forged" }, 401, "visitor_required"],
    [{ cookie: cookie(createVisitor(config, Date.now() - 3601000)) }, 401, "visitor_required"],
  ] as const) {
    const s = setup(); let calls = 0;
    const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, provider: async () => { calls++; throw new Error("PRIVATE"); } });
    const request = new Request(config.origin, { method: "POST", headers: Object.assign({ origin: config.origin, cookie: s.token }, headers),
      body: new ReadableStream({ pull() { throw new Error("body must not be read"); } }, { highWaterMark: 0 }), duplex: "half" } as RequestInit);
    const response = await handler(request); if (status === 401) assert.match(response.headers.get("set-cookie")!, /HttpOnly.*SameSite=Strict/);
    await result(response, status, code); assert.equal(calls, 0); assert.equal(s.db.transactions, 0);
    await result(await createYoutubeSourceHandler({ config: () => null, repository: s.repository, provider: async () => { throw new Error(); } })(req(s.token)), 503, "disabled");
  }
});

test("one 401 handshake then owned normalized full content, safe DTO, stable IDs and unchanged expiry", async () => {
  const s = setup();
  const response = await s.youtube(req("")); const token = response.headers.get("set-cookie")!.split(";", 1)[0];
  await result(response, 401, "visitor_required"); assert.equal(s.db.transactions, 0);
  const created = (await result(await s.youtube(req(token)), 201)).source;
  assert.equal(created.fullText, undefined); assert.equal(created.kind, "YOUTUBE"); assert.equal(created.title, "YouTube captions");
  const content = (await result(await s.pdf.read(readReq(token), created.id), 200)).source;
  assert.equal(content.fullText, transcript.fullText); assert.equal(content.language, "en"); assert.equal(content.trackType, "automatic");
  assert.equal(content.provider, transcript.provider); assert.equal(content.canonicalUrl, transcript.canonicalUrl); assert.equal(content.segmentCount, 3);
  assert.deepEqual(content.sections, transcript.segments.map((segment, i) => ({ id: `segment-${i + 1}`, ...segment })));
  assert.equal(content.expiresAt, created.expiresAt); assert.equal(content.characterCount, transcript.fullText.length);
  assert.equal(content.pageCount, undefined); assert.equal(content.parser, undefined);
  assert.deepEqual((await result(await s.pdf.read(readReq(token), created.id), 200)).source, content);
});

for (const provider of ["direct", "supadata"] as const) test(`owned ${provider} selection runs real adapter with injected upstream; timing remains seconds`, async () => {
  const s = setup(), calls: string[] = [];
  const network: typeof fetch = async url => {
    const parsed = new URL(String(url)); calls.push(parsed.hostname + parsed.pathname);
    if (parsed.hostname === "api.supadata.ai") return Response.json({ lang: "en", content: transcript.segments.map(s => ({ text: s.text, offset: s.startSeconds * 1000, duration: s.durationSeconds * 1000, lang: "en" })) });
    if (parsed.pathname === "/watch") return new Response('"INNERTUBE_API_KEY":"synthetic"');
    if (parsed.pathname === "/youtubei/v1/player") return Response.json({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "en", kind: "asr", baseUrl: `https://www.youtube.com/api/timedtext?v=${id}` }] } } });
    return new Response(`<transcript>${transcript.segments.map(s => `<text start="${s.startSeconds}" dur="${s.durationSeconds}">${s.text}</text>`).join("")}</transcript>`);
  };
  const handler = createYoutubeSourceHandler({ config: () => ({ ...config, provider, supadataApiKey: "PRIVATE" }), repository: s.repository, provider: configuredCaptionProvider(network) });
  const metadata = (await result(await handler(req(s.token)), 201)).source;
  const content = (await result(await s.pdf.read(readReq(s.token), metadata.id), 200)).source;
  assert.equal(content.fullText, transcript.fullText); assert.equal(content.sections[0].startSeconds, 1.2505);
  assert.equal(content.sections[0].durationSeconds, 0.500125);
  assert.equal(calls.length, provider === "direct" ? 3 : 1);
  assert.ok(calls.every(c => provider === "direct" ? c.startsWith("www.youtube.com/") : c.startsWith("api.supadata.ai/")));
});

for (const [body, headers, code] of [
  [{ video: id, provider: "supadata" }, {}, "invalid_request"], [{ video: id, apiKey: "PRIVATE" }, {}, "invalid_request"],
  [{ video: "https://evil.invalid/watch?v=" + id }, {}, "invalid_input"], [{ video: id, language: "../../" }, {}, "invalid_input"],
  [[], {}, "invalid_request"], ["{", {}, "invalid_request"], ["x".repeat(513), {}, "invalid_request"],
  [{ video: id }, { "content-length": "513" }, "invalid_request"], [{ video: id }, { "content-type": "text/plain" }, "invalid_request"],
] as const) test(`bounded YouTube request rejects ${JSON.stringify(body).slice(0, 60)} before provider`, async () => {
  const s = setup(); let calls = 0;
  const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, provider: async () => { calls++; throw new Error(); } });
  await result(await handler(req(s.token, body, { ...headers })), 400, code); assert.equal(calls, 0); assert.equal(s.db.transactions, 0);
});

test("slow body hits deadline and never starts extraction", async () => {
  const s = setup(); let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const request = new Request(config.origin, { method: "POST", headers: { origin: config.origin, cookie: s.token, "content-type": "application/json" }, body, duplex: "half" } as RequestInit);
  const started = performance.now(); await result(await s.youtube(request), 400, "invalid_request");
  assert.ok(performance.now() - started < 3000); assert.ok(cancelled); assert.equal(s.db.transactions, 0);
});

test("PDF to YouTube and back uses one slot, preserves other visitor/proof, and rolls back create failure", async () => {
  const s = setup(), other = visitor();
  const old = await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
  const proof = { ...old, id: crypto.randomUUID(), activeSourceOwner: null, provider: "synthetic-proof-02a-v1" };
  s.db.rows.set(proof.id, proof);
  const foreign = await s.repository.replace(captionRecord(transcript, other), () => {});
  const replacement = (await result(await s.youtube(req(s.token)), 201)).source;
  assert.ok(!s.db.rows.has(old.id)); assert.ok(s.db.rows.has(foreign.id)); assert.ok(s.db.rows.has(proof.id));
  s.db.failCreate = true;
  await assert.rejects(s.repository.replace(uploadedRecord(extraction, s.v), () => {}), { code: "storage_unavailable" });
  assert.ok(s.db.rows.has(replacement.id));
  const pdf = await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
  assert.ok(!s.db.rows.has(replacement.id)); assert.ok(s.db.rows.has(pdf.id));
  assert.equal([...s.db.rows.values()].filter(row => row.activeSourceOwner === s.v.owner).length, 1);
  s.db.failCreate = true; await result(await s.youtube(req(s.token)), 503, "storage_unavailable"); assert.ok(s.db.rows.has(pdf.id));
});

test("caption validation/failure/abort/expiry before commit always preserves the prior PDF", async () => {
  const invalid = [{ ...transcript, segments: [] }, { ...transcript, fullText: "truncated" },
    { ...transcript, segments: [{ text: "x", startSeconds: -1, durationSeconds: 1 }] },
    { ...transcript, provider: "supadata" }, { ...transcript, canonicalUrl: "https://evil.invalid" }];
  for (const value of invalid) {
    const s = setup(); const prior = await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
    const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, provider: async () => ({ ok: true, transcript: value as CaptionTranscript }) });
    await result(await handler(req(s.token)), 502, "malformed"); assert.ok(s.db.rows.has(prior.id));
  }
  for (const mode of ["fail", "abort", "expire", "transaction-abort"] as const) {
    const s = setup(), controller = new AbortController(); let at = Date.now(), calls = 0;
    const prior = await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
    if (mode === "transaction-abort") s.db.afterCreate = () => controller.abort();
    const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, now: () => at, provider: async () => {
      calls++; if (mode === "abort") controller.abort(); if (mode === "expire") at = s.v.expiresAt * 1000;
      return mode === "fail" ? { ok: false, error: { code: "quota_exhausted", message: "PRIVATE" } } : { ok: true, transcript };
    } });
    await result(await handler(req(s.token, { video: id }, {}, controller.signal)), mode === "fail" ? 503 : mode === "expire" ? 401 : 408,
      mode === "fail" ? "quota_exhausted" : mode === "expire" ? "visitor_required" : "cancelled");
    assert.equal(calls, 1); assert.ok(s.db.rows.has(prior.id)); assert.equal(s.db.rows.size, 1);
  }
});

test("initial and replacement conflict categories do not retry the transaction or provider", async () => {
  for (const code of ["P2002", "P2034"]) for (const existing of [false, true]) {
    const s = setup(); if (existing) await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
    const before = [...s.db.rows.keys()]; let txCalls = 0, providerCalls = 0;
    s.db.$transaction = async () => { txCalls++; throw Object.assign(new Error("PRIVATE"), { code }); };
    const handler = createYoutubeSourceHandler({ config: () => config, repository: s.repository, provider: async () => { providerCalls++; return { ok: true, transcript }; } });
    await result(await handler(req(s.token)), 409, "replacement_conflict");
    assert.equal(txCalls, 1); assert.equal(providerCalls, 1); assert.deepEqual([...s.db.rows.keys()], before);
  }
});

test("cancellation after commit reports uncertainty without claiming the committed replacement was undone", async () => {
  const s = setup(), controller = new AbortController();
  const prior = await s.repository.replace(uploadedRecord(extraction, s.v), () => {});
  const repository = { ...s.repository, replace: async (...args: Parameters<typeof s.repository.replace>) => {
    const saved = await s.repository.replace(...args); controller.abort(); return saved;
  } };
  const handler = createYoutubeSourceHandler({ config: () => config, repository, provider: async () => ({ ok: true, transcript }) });
  await result(await handler(req(s.token, { video: id }, {}, controller.signal)), 408, "cancelled");
  assert.equal(s.db.rows.has(prior.id), false); assert.equal(s.db.rows.size, 1);
  assert.equal([...s.db.rows.values()][0].kind, "YOUTUBE");
});

test("read/delete exclude missing, foreign, expired, proof and nonready records; expiry is not renewed", async () => {
  for (const change of [{}, { activeSourceOwner: null }, { provider: "synthetic-proof-02a-v1" }, { extractionStatus: "FAILED" }, { expiresAt: new Date(0) }]) {
    const s = setup(), row = { ...captionRecord(transcript, s.v), ...change }; s.db.rows.set(row.id, row);
    await result(await s.pdf.read(readReq(cookie(visitor())), row.id), 404, "unavailable");
    await result(await s.pdf.remove(readReq(cookie(visitor()), "DELETE"), row.id), 404, "unavailable");
    const valid = Object.keys(change).length === 0;
    await result(await s.pdf.read(readReq(s.token), row.id), valid ? 200 : 404);
    assert.equal(s.db.rows.get(row.id)!.expiresAt.getTime(), row.expiresAt.getTime());
    await result(await s.pdf.remove(readReq(s.token, "DELETE"), row.id), valid ? 200 : 404);
    assert.equal(s.db.rows.has(row.id), !valid);
  }
});

test("stored JSON is validated and extras never reach public DTOs; genuine sources cannot mint proof credentials", async () => {
  const s = setup(), original = captionRecord(transcript, s.v);
  assert.ok(!Array.isArray(original.sections)); if (Array.isArray(original.sections)) return;
  const bad = [[], {}, { ...original.sections, videoId: "bad" }, { ...original.sections, segments: [] },
    { ...original.sections, segments: original.sections.segments.map(s => ({ ...s, id: "wrong" })) },
    { ...original.sections, segments: original.sections.segments.map(s => ({ ...s, startSeconds: null })) }];
  for (const sections of bad) {
    s.db.rows.set(original.id, { ...original, sections } as typeof original);
    await result(await s.pdf.read(readReq(s.token), original.id), 503, "storage_unavailable");
  }
  const extra = { ...original, PRIVATE: "PRIVATE", sections: { ...original.sections, PRIVATE: "PRIVATE",
    segments: original.sections.segments.map(s => ({ ...s, PRIVATE: "PRIVATE" })) } };
  assert.doesNotMatch(JSON.stringify(sourceDto(extra, true)), /PRIVATE|owner/);
  assert.equal(isOwnedReady(original, s.v, Date.now()), false);
  assert.equal(isOwnedReady(uploadedRecord(extraction, s.v), s.v, Date.now()), false);
});

test("caption proof and production share admission in both directions and release after failure", async () => {
  for (const firstProof of [true, false]) {
    const s = setup(), admission = new Admission(captionLimits); let complete: (() => void) | undefined;
    const provider = async () => { await new Promise<void>(resolve => { complete = resolve; }); return { ok: true as const, transcript }; };
    const proof = createCaptionHandler({ config: () => config, provider, admission });
    const owned = createYoutubeSourceHandler({ config: () => config, repository: s.repository, provider, admission });
    const pending = (firstProof ? proof : owned)(req(s.token));
    while (!complete) await new Promise(resolve => setImmediate(resolve));
    await result(await (firstProof ? owned : proof)(req(cookie(visitor()))), 429, "limit_reached");
    complete(); await result(await pending, firstProof ? 200 : 201);
    assert.ok(admission.acquire(visitor().owner, "unverified-network", Date.now()));
  }
});

test("migration reuses the one unique slot without rewriting valid PDFs or proof rows (static review only)", async () => {
  const sql = await readFile("prisma/migrations/20261018200000_active_source_owner/migration.sql", "utf8");
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /activeSourceOwner String\?\s+@unique\(map: "Source_uploadedPdfOwner_key"\) @map\("uploadedPdfOwner"\)/);
  assert.match(sql, /BEGIN;[\s\S]*DROP CONSTRAINT[\s\S]*ADD CONSTRAINT[\s\S]*COMMIT;/);
  assert.match(sql, /"uploadedPdfOwner" IS NULL OR/); assert.match(sql, /"kind" = 'PDF'/); assert.match(sql, /"kind" = 'YOUTUBE'/);
  assert.doesNotMatch(sql, /DELETE FROM|UPDATE "Source"|ADD COLUMN|DROP INDEX/);
});
