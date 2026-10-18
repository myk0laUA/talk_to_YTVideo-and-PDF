import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { PDF_MAX_FILE_BYTES, type PdfExtraction } from "../../src/shared/pdf.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { parsePdfConfig } from "../../src/server/pdf/config.ts";
import { createPdfHandler } from "../../src/server/pdf/handler.ts";
import { PdfError } from "../../src/server/pdf/errors.ts";
import { PDF_MAX_REQUEST_BYTES, readPdfMultipart } from "../../src/server/pdf/multipart.ts";
import { parsePdf } from "../../src/server/pdf/worker.ts";

const config = { origin: "http://localhost:3000", cookieSecret: "a".repeat(64), secure: false };
const cookie = () => visitorCookie(createVisitor(config, Date.now()), config, Date.now()).split(";", 1)[0];
const header = '--td04a\r\nContent-Disposition: form-data; name="file"; filename="synthetic.pdf"\r\nContent-Type: application/pdf\r\n\r\n';
const footer = "\r\n--td04a--\r\n";
const small = Buffer.from("%PDF-1.7\nsynthetic-only mocked parser input");
const multipart = (bytes = small) => Buffer.concat([Buffer.from(header), bytes, Buffer.from(footer)]);
const request = (body: BodyInit | ReadableStream = multipart(), headers: Record<string, string> = {}, signal?: AbortSignal) => new Request(config.origin + "/api/proof-pdf", {
  method: "POST", headers: { origin: config.origin, cookie: cookie(), "content-type": "multipart/form-data; boundary=td04a", ...headers }, body,
  signal, duplex: "half",
} as RequestInit);
const extraction: PdfExtraction = { parser: "pdf-parse@2.4.5", fileBytes: small.length, pageCount: 1, characterCount: 4, fullText: "TEXT",
  sections: [{ id: "page-1", pageNumber: 1, text: "TEXT" }], warnings: [] };
const dto = async (response: Response, status: number, code?: string) => {
  assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json(); if (code) assert.equal(data.error.code, code); return data;
};

test("PDF config is separately default-off, requires signing/origin, needs no provider/DB", () => {
  assert.equal(parsePdfConfig({}), null);
  assert.equal(parsePdfConfig({ PDF_PROOF_ENABLED: "true" }), null);
  const env = { PDF_PROOF_ENABLED: "true", APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret, NODE_ENV: "production" };
  assert.equal(parsePdfConfig(env), null);
  assert.deepEqual(parsePdfConfig({ ...env, PDF_PROOF_LOCAL_HTTP: "true" }), config);
  assert.equal(parsePdfConfig({ ...env, APP_ORIGIN: "https://example.test/" }), null);
  assert.ok(parsePdfConfig({ ...env, APP_ORIGIN: "https://example.test" }));
});

test("gate, origin, visitor and admission run before body/parser", async () => {
  let parses = 0, reads = 0;
  const parse = async () => { parses++; return extraction; };
  const body = () => new ReadableStream({ pull() { reads++; throw new Error("must not read"); } }, { highWaterMark: 0 });
  await dto(await createPdfHandler({ config: () => null, parse })(request(body())), 503, "disabled");
  const handler = createPdfHandler({ config: () => config, parse });
  const badHeaders: Record<string, string>[] = [{ origin: "https://evil.invalid" }, { "sec-fetch-site": "cross-site" }];
  for (const headers of badHeaders) {
    await dto(await handler(request(body(), headers)), 403, "forbidden");
  }
  for (const invalid of ["", "td-visitor=forged"]) {
    const response = await handler(request(body(), { cookie: invalid }));
    assert.ok(response.headers.get("set-cookie")); await dto(response, 401, "visitor_required");
  }
  const fixedCookie = cookie();
  for (let i = 0; i < 6; i++) await dto(await handler(request(multipart(), { cookie: fixedCookie })), 200);
  await dto(await handler(request(body(), { cookie: fixedCookie })), 429, "limit_reached");
  assert.equal(parses, 6); assert.equal(reads, 0);
});

for (const [label, body, headers, status, code] of [
  ["missing file", "--td04a--\r\n", {}, 400, "invalid_request"],
  ["not multipart", multipart(), { "content-type": "application/pdf" }, 400, "invalid_request"],
  ["long boundary", multipart(), { "content-type": `multipart/form-data; boundary=${"a".repeat(71)}` }, 400, "invalid_request"],
  ["extra field", multipart().toString().replace("--td04a--", '--td04a\r\nContent-Disposition: form-data; name="extra"\r\n\r\nx\r\n--td04a--'), {}, 400, "invalid_request"],
  ["duplicate files", Buffer.concat([Buffer.from(header), small, Buffer.from("\r\n"), multipart()]), {}, 400, "invalid_request"],
  ["wrong field", multipart().toString().replace('name="file"', 'name="other"'), {}, 400, "invalid_request"],
  ["filename", multipart().toString().replace("synthetic.pdf", "synthetic.txt"), {}, 415, "wrong_type"],
  ["path filename", multipart().toString().replace("synthetic.pdf", "../synthetic.pdf"), {}, 415, "wrong_type"],
  ["file media", multipart().toString().replace("application/pdf", "text/plain"), {}, 415, "wrong_type"],
  ["duplicate headers", multipart().toString().replace("Content-Type: application/pdf", "Content-Type: application/pdf\r\nContent-Type: application/pdf"), {}, 400, "invalid_request"],
  ["large header", multipart().toString().replace("synthetic.pdf", "x".repeat(4100) + ".pdf"), {}, 400, "invalid_request"],
  ["wrong bytes", multipart(Buffer.from("this is not a PDF document")), {}, 415, "wrong_type"],
  ["empty file", multipart(Buffer.alloc(0)), {}, 415, "wrong_type"],
  ["truncated multipart", multipart().subarray(0, -4), {}, 400, "invalid_request"],
  ["excess declared length", multipart(), { "content-length": String(PDF_MAX_REQUEST_BYTES + 1) }, 413, "too_large"],
] as const) test(`PDF rejects ${label} without parsing`, async () => {
  let calls = 0;
  const handler = createPdfHandler({ config: () => config, parse: async () => { calls++; return extraction; } });
  await dto(await handler(request(body, headers)), status, code); assert.equal(calls, 0);
});

for (const claimed of [undefined, "1"]) test(`actual byte boundary with Content-Length ${claimed ?? "missing"}`, async () => {
  const file = Buffer.alloc(PDF_MAX_FILE_BYTES, 80); small.copy(file);
  // Chunked stream, including tiny split headers/delimiters, bypasses any Blob/FormData cap.
  const body = multipart(file);
  const make = (bytes: Buffer) => {
    let at = 0;
    return new ReadableStream({ pull(controller) { if (at >= bytes.length) controller.close(); else {
      const end = Math.min(at + (at < 200 ? 1 : 65536), bytes.length); controller.enqueue(bytes.subarray(at, end)); at = end;
    } } });
  };
  const headers: Record<string, string> = claimed ? { "content-length": claimed } : {};
  const read = await readPdfMultipart(request(make(body), headers));
  assert.equal(read.length, PDF_MAX_FILE_BYTES); assert.equal(read[read.length - 1], 80);
  let calls = 0;
  const handler = createPdfHandler({ config: () => config, parse: async () => { calls++; return extraction; } });
  await dto(await handler(request(make(multipart(Buffer.concat([file, Buffer.from("P")]))), headers)), 413, "too_large");
  assert.equal(calls, 0);
});

test("stream cap cancels excessive body with absent length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(PDF_MAX_REQUEST_BYTES + 1)); }, cancel() { cancelled = true; } });
  await assert.rejects(readPdfMultipart(request(stream)), { code: "too_large" }); assert.equal(cancelled, true);
});

test("upload deadline and abort cancel stalled streams and release admission", async () => {
  for (const outcome of ["timeout", "cancelled"] as const) {
    let cancelled = false, calls = 0;
    const handler = createPdfHandler({ config: () => config, uploadMs: 40, parse: async () => { calls++; return extraction; } });
    const stream = new ReadableStream({ cancel() { cancelled = true; } });
    const controller = new AbortController(); const saved = cookie();
    const pending = handler(request(stream, { cookie: saved }, controller.signal));
    if (outcome === "cancelled") controller.abort();
    await dto(await pending, outcome === "timeout" ? 504 : 408, outcome);
    assert.equal(cancelled, true); assert.equal(calls, 0);
    await dto(await handler(request(multipart(), { cookie: saved })), 200);
  }
});

test("one admitted upload/parse; failure paths release it and sanitize exception dumps", async () => {
  for (const code of ["malformed", "encrypted", "no_text", "timeout", "cancelled", "extraction_limit", "internal"] as const) {
    let finish: (() => void) | undefined;
    let calls = 0;
    const handler = createPdfHandler({ config: () => config, parse: async () => {
      calls++; await new Promise<void>(resolve => { finish = resolve; }); throw code === "internal" ? new Error("PRIVATE DUMP") : new PdfError(code);
    } });
    const pending = handler(request());
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    await dto(await handler(request()), 429, "limit_reached"); assert.equal(calls, 1);
    finish(); const response = await pending;
    assert.equal((await response.json()).error.code, code);
    const next = handler(request()); while (calls < 2) await new Promise(resolve => setImmediate(resolve)); finish(); await next;
    assert.equal(calls, 2);
  }
});

for (const outcome of ["timeout", "cancelled"] as const) test(`CPU worker ${outcome} terminates before returning and next parse can proceed`, async () => {
  let exit: number | undefined;
  const controller = new AbortController();
  const start = performance.now();
  const pending = parsePdf(Uint8Array.from(small), controller.signal, {
    createWorker: settings => new Worker(path.resolve("tests/pdf/slow-worker.mjs"), settings), deadlineMs: 500, onExit: code => { exit = code; },
  });
  const timer = outcome === "cancelled" ? setTimeout(() => controller.abort(), 150) : undefined;
  await assert.rejects(pending, { code: outcome }); clearTimeout(timer);
  assert.equal(exit, 1); assert.ok(performance.now() - start < 3000);
  // A real parser receives corrupt bytes, exits cleanly under the parent, and releases its isolate.
  await assert.rejects(parsePdf(Uint8Array.from(small), new AbortController().signal), { code: "malformed" });
});
