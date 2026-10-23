import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createSourceHandlers } from "../../src/server/sources/handler.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { SourceError, uploadedRecord, type SourceRepository } from "../../src/server/sources/service.ts";
import { parseSourceConfig } from "../../src/server/sources/config.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { createPdfHandler, pdfLimits } from "../../src/server/pdf/handler.ts";
import { PdfError } from "../../src/server/pdf/errors.ts";
import { Admission } from "../../src/server/proof/admission.ts";
import type { PdfExtraction } from "../../src/shared/pdf.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config = { origin: "http://localhost:3000", cookieSecret: "a".repeat(64), secure: false };
const extraction: PdfExtraction = { parser: "pdf-parse@2.4.5", fileBytes: 30, pageCount: 1, characterCount: 9,
  fullText: "SAFE TEXT", sections: [{ id: "page-1", pageNumber: 1, text: "SAFE TEXT" }], warnings: [] };
const input = '--source-test\r\nContent-Disposition: form-data; name="file"; filename="synthetic.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7\nsynthetic\r\n--source-test--\r\n';
const visitor = () => createVisitor(config, Date.now());
type Visitor = ReturnType<typeof visitor>;
const cookie = (v: Visitor) => visitorCookie(v, config, Date.now()).split(";", 1)[0];
const request = (v: Visitor, method = "POST", headers: Record<string, string> = {}, signal?: AbortSignal, body?: BodyInit | ReadableStream) => new Request(config.origin + "/api/sources/pdf", {
  method, headers: { origin: config.origin, cookie: cookie(v), "content-type": "multipart/form-data; boundary=source-test", ...headers },
  ...(method === "POST" ? { body: body ?? input, duplex: "half" } : {}), signal,
} as RequestInit);
const result = async (response: Response, status: number, code?: string) => {
  assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "no-store");
  const dto = await response.json(); if (code) assert.equal(dto.error.code, code);
  assert.doesNotMatch(JSON.stringify(dto), /owner|PRIVATE|postgresql|cookieSecret|extractionStatus|providerJobId/);
  return dto;
};
const setup = () => {
  const db = new SyntheticSourceDatabase(); const repository = createSourceRepository(() => db.asClient());
  return { db, repository, handlers: createSourceHandlers({ config: () => config, repository, parse: async () => extraction }) };
};

test("invalid PDF attempts remain bounded but recover after every window without a process restart", async () => {
  const { repository } = setup(); let now = Date.now(), parses = 0;
  const handlers = createSourceHandlers({ config: () => config, repository, now: () => now,
    parse: async () => { parses++; return extraction; } });
  const fresh = () => createVisitor(config, now);
  for (let window = 0; window < 3; window++) {
    for (let i = 0; i < pdfLimits.global; i++) await result(await handlers.upload(request(fresh(), "POST", { "content-type": "text/plain" })), 400, "invalid_request");
    const denied = await handlers.upload(request(fresh()));
    assert.equal(denied.headers.get("retry-after"), "3600");
    assert.equal((await result(denied, 429, "limit_reached")).error.admission.reason, "window");
    now += pdfLimits.windowMs;
  }
  assert.equal(parses, 0);
  await result(await handlers.upload(request(fresh())), 201); assert.equal(parses, 1);
});

test("ingestion config independent/default-off, signed origin required, production HTTP explicit", () => {
  assert.equal(parseSourceConfig({}), null);
  const env = { PDF_INGESTION_ENABLED: "true", APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret, NODE_ENV: "production",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" };
  assert.equal(parseSourceConfig(env), null);
  assert.deepEqual(parseSourceConfig({ ...env, PDF_INGESTION_LOCAL_HTTP: "true" }), config);
  assert.equal(parseSourceConfig({ ...env, APP_ORIGIN: "https://example.test", VISITOR_COOKIE_SECRET: "" }), null);
  assert.ok(parseSourceConfig({ ...env, APP_ORIGIN: "https://example.test" }));
  assert.equal(parseSourceConfig({ ...env, DATABASE_URL: "" }), null);
  assert.equal(parseSourceConfig({ ...env, DATABASE_URL: "invalid" }), null);
});

test("origin, visitor, gate, UUID and admission reject before parsing/database/body reads", async () => {
  const { db, repository } = setup(); let parses = 0, reads = 0;
  const parse = async () => { parses++; return extraction; };
  const handlers = createSourceHandlers({ config: () => config, repository, parse }); const a = visitor();
  const body = () => new ReadableStream({ pull() { reads++; throw new Error("unexpected read"); } }, { highWaterMark: 0 });
  await result(await createSourceHandlers({ config: () => null, repository, parse }).upload(request(a, "POST", {}, undefined, body())), 503, "disabled");
  const badHeaders: Record<string, string>[] = [{ origin: "https://foreign.invalid" }, { "sec-fetch-site": "cross-site" }];
  for (const headers of badHeaders) {
    await result(await handlers.upload(request(a, "POST", headers, undefined, body())), 403, "forbidden");
    await result(await handlers.remove(request(a, "DELETE", headers), randomUUID()), 403, "forbidden");
  }
  for (const token of ["", "td-visitor=forged", cookie({ ...a, token: a.token.replace(/.$/, "!") }), cookie(createVisitor(config, Date.now() - 3_601_000))]) {
    const response = await handlers.upload(request(a, "POST", { cookie: token }, undefined, body()));
    assert.ok(response.headers.get("set-cookie")); await result(response, 401, "visitor_required");
    await result(await handlers.read(request(a, "GET", { cookie: token }), randomUUID()), 401, "visitor_required");
  }
  for (const id of ["bad", "x".repeat(5000), "00000000-0000-0000-0000-000000000000"]) {
    await result(await handlers.read(request(a, "GET"), id), 404, "unavailable");
    await result(await handlers.remove(request(a, "DELETE"), id), 404, "unavailable");
  }
  const admission = new Admission(pdfLimits); const release = admission.acquire(a.owner, "unverified-network", Date.now());
  await result(await createSourceHandlers({ config: () => config, repository, parse, admission }).upload(request(a, "POST", {}, undefined, body())), 429);
  release?.(); assert.equal(parses, 0); assert.equal(reads, 0); assert.equal(db.transactions, 0);
});

test("committed UUID, full text DTO, replacement/delete isolate two visitors and proof fixtures", async () => {
  const { db, handlers } = setup(); const a = visitor(), b = visitor();
  const proof = { ...uploadedRecord(extraction, a), id: randomUUID(), activeSourceOwner: null, provider: "synthetic-proof-02a-v1" };
  db.rows.set(proof.id, proof);
  const first = (await result(await handlers.upload(request(a)), 201)).source;
  assert.equal(db.rows.has(first.id), true); assert.equal(first.fullText, undefined);
  const second = (await result(await handlers.upload(request(b)), 201)).source;
  const read = (await result(await handlers.read(request(a, "GET"), first.id), 200)).source;
  assert.equal(read.fullText, extraction.fullText); assert.deepEqual(read.sections, extraction.sections);
  assert.equal(read.expiresAt, first.expiresAt); assert.equal(Date.parse(read.expiresAt), a.expiresAt * 1000);
  const lostCookie = await handlers.read(request(a, "GET", { cookie: "" }), first.id);
  const freshCookie = lostCookie.headers.get("set-cookie")!.split(";", 1)[0];
  await result(lostCookie, 401, "visitor_required");
  await result(await handlers.read(request(a, "GET", { cookie: freshCookie }), first.id), 404, "unavailable");
  for (const id of [first.id, randomUUID(), proof.id]) {
    await result(await handlers.read(request(b, "GET"), id), 404, "unavailable");
    await result(await handlers.remove(request(b, "DELETE"), id), 404, "unavailable");
  }
  const replacement = (await result(await handlers.upload(request(a)), 201)).source;
  assert.notEqual(replacement.id, first.id); assert.equal(db.rows.has(first.id), false);
  assert.equal(db.rows.has(second.id), true); assert.equal(db.rows.has(proof.id), true);
  await result(await handlers.read(request(a, "GET"), first.id), 404, "unavailable");
  await result(await handlers.remove(request(a, "DELETE"), replacement.id), 200);
  await result(await handlers.remove(request(a, "DELETE"), replacement.id), 404, "unavailable");
  assert.equal(db.rows.has(proof.id), true); assert.equal(db.rows.has(second.id), true);
});

for (const code of ["malformed", "encrypted", "no_text", "timeout", "cancelled", "extraction_limit"] as const) {
  test(`parse ${code} preserves committed prior source and releases admission`, async () => {
    const { db, repository, handlers } = setup(); const a = visitor();
    const first = (await result(await handlers.upload(request(a)), 201)).source;
    const admission = new Admission(pdfLimits);
    const failed = createSourceHandlers({ config: () => config, repository, admission, parse: async () => { throw new PdfError(code); } });
    const expected = code === "timeout" ? 504 : code === "cancelled" ? 408 : 422;
    await result(await failed.upload(request(a)), expected, code);
    assert.equal(db.rows.has(first.id), true);
    await result(await createSourceHandlers({ config: () => config, repository, admission, parse: async () => extraction }).upload(request(a)), 201);
  });
}

test("oversize/invalid upload and database create failure roll back prior replacement", async () => {
  const { db, handlers } = setup(); const a = visitor(); const first = (await result(await handlers.upload(request(a)), 201)).source;
  await result(await handlers.upload(request(a, "POST", { "content-length": "25016385" })), 413, "too_large");
  await result(await handlers.upload(request(a, "POST", { "content-type": "text/plain" })), 400);
  db.failCreate = true; await result(await handlers.upload(request(a)), 503, "storage_unavailable");
  assert.equal(db.rows.size, 1); assert.equal(db.rows.has(first.id), true);
  await result(await handlers.read(request(a, "GET"), first.id), 200);
});

test("visitor expiry during parsing and repository awaits rejects success, with transaction rollback", async () => {
  for (const phase of ["parse", "create", "read"] as const) {
    const { db, repository, handlers } = setup(); const a = visitor();
    const first = (await result(await handlers.upload(request(a)), 201)).source; let at = Date.now();
    const expire = () => { at = a.expiresAt * 1000; };
    if (phase === "create") db.afterCreate = expire;
    const wrapped: SourceRepository = { ...repository, get: async (...args) => { const row = await repository.get(...args); expire(); return row; } };
    const later = createSourceHandlers({ config: () => config, repository: wrapped, now: () => at,
      parse: async () => { if (phase === "parse") expire(); return extraction; } });
    await result(await (phase === "read" ? later.read(request(a, "GET"), first.id) : later.upload(request(a))), 401, "visitor_required");
    assert.equal(db.rows.has(first.id), true); assert.equal(db.rows.size, 1);
  }
});

test("expiry/cancellation after commit cannot undo commit, response never reports false success", async () => {
  for (const mode of ["expire", "abort"] as const) {
    const { db, repository } = setup(); const a = visitor(); let at = Date.now(); const controller = new AbortController();
    const wrapped: SourceRepository = { ...repository, replace: async (...args) => {
      const row = await repository.replace(...args);
      if (mode === "expire") at = a.expiresAt * 1000; else controller.abort(); return row;
    } };
    const h = createSourceHandlers({ config: () => config, repository: wrapped, now: () => at, parse: async () => extraction });
    await result(await h.upload(request(a, "POST", {}, controller.signal)), mode === "expire" ? 401 : 408, mode === "expire" ? "visitor_required" : "cancelled");
    assert.equal(db.rows.size, 1);
  }
});

test("expired/non-ready/non-uploaded records inaccessible; read expiry never renewed", async () => {
  const { db, handlers } = setup(); const a = visitor();
  for (const override of [{ expiresAt: new Date(0) }, { activeSourceOwner: null }, { extractionStatus: "FAILED" }, { provider: "synthetic-proof-02a-v1" }]) {
    const row = { ...uploadedRecord(extraction, a), ...override }; db.rows.set(row.id, row);
    await result(await handlers.read(request(a, "GET"), row.id), 404, "unavailable");
    await result(await handlers.remove(request(a, "DELETE"), row.id), 404, "unavailable");
    assert.equal(db.rows.has(row.id), true);
  }
});

test("mock serialized concurrent replacements leave one record and rollback retains winner", async () => {
  const { db, repository } = setup(); const a = visitor(); const guard = () => {};
  const values = [uploadedRecord(extraction, a), uploadedRecord(extraction, a)];
  await Promise.all(values.map(value => repository.replace(value, guard)));
  assert.equal(db.rows.size, 1); assert.ok(db.rows.has(values[1].id));
  db.failCreate = true;
  await assert.rejects(repository.replace(uploadedRecord(extraction, a), guard), { code: "storage_unavailable" });
  assert.ok(db.rows.has(values[1].id));
  const original = db.$transaction.bind(db);
  db.$transaction = async () => { throw Object.assign(new Error("PRIVATE"), { code: "P2002" }); };
  await assert.rejects(repository.replace(uploadedRecord(extraction, a), guard), { code: "replacement_conflict" });
  db.$transaction = original;
});

test("abort inside create/delete transaction rolls back; proof and ingestion share parser admission", async () => {
  const { db, repository } = setup(); const a = visitor();
  const old = await repository.replace(uploadedRecord(extraction, a), () => {});
  db.afterCreate = () => { throw new SourceError("cancelled"); };
  await assert.rejects(repository.replace(uploadedRecord(extraction, a), () => {}), { code: "cancelled" });
  assert.ok(db.rows.has(old.id));
  let checks = 0;
  await assert.rejects(repository.remove(old.id, a.owner, new Date(), () => { if (++checks === 3) throw new SourceError("cancelled"); }), { code: "cancelled" });
  assert.ok(db.rows.has(old.id)); db.afterCreate = undefined;
  const admission = new Admission(pdfLimits); let complete: (() => void) | undefined;
  const proof = createPdfHandler({ config: () => config, admission, parse: async () => { await new Promise<void>(resolve => { complete = resolve; }); return extraction; } });
  const source = createSourceHandlers({ config: () => config, repository, admission, parse: async () => extraction });
  const pending = proof(request(a));
  while (!complete) await new Promise(resolve => setImmediate(resolve));
  await result(await source.upload(request(visitor())), 429, "limit_reached");
  complete(); await result(await pending, 200);
  await result(await source.upload(request(a)), 201);
});
