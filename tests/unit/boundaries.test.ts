// Supplemental 11C gaps. Existing source/proof/context suites remain the main matrix.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { createSourceHandlers } from "../../src/server/sources/handler.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, uploadedRecord } from "../../src/server/sources/service.ts";
import { createYoutubeSourceHandler } from "../../src/server/sources/youtube.ts";
import { createProofHandlers } from "../../src/server/proof/handlers.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { proofId, PROOF_PROVIDER, PROOF_TEXT, PROOF_TITLE, type ProofRecord } from "../../src/server/proof/source.ts";
import { createMint, type Mint } from "../../src/server/proof/provider.ts";
import { createPdfHandler } from "../../src/server/pdf/handler.ts";
import { createCaptionHandler } from "../../src/server/captions/handler.ts";
import type { PdfExtraction } from "../../src/shared/pdf.ts";
import type { CaptionTranscript } from "../../src/shared/captions.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config = { origin: "https://boundary.invalid", secure: true, cookieSecret: randomBytes(32).toString("hex"),
  issuanceEnabled: true, textEnabled: true, apiKey: "synthetic-test-only", model: "synthetic-model" };
const extraction: PdfExtraction = { parser: "pdf-parse@2.4.5", fileBytes: 30, pageCount: 1, fullText: "AUTHORED FIXTURE", characterCount: 16,
  sections: [{ id: "page-1", pageNumber: 1, text: "AUTHORED FIXTURE" }], warnings: [] };
const transcript: CaptionTranscript = { videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  language: "en", provider: "youtube-transcript-plus@2.0.3", fullText: "AUTHORED CAPTION", segments: [{ text: "AUTHORED CAPTION", startSeconds: 0, durationSeconds: 1 }] };
const cases: { label: string; status: number; noStore: boolean }[] = [];
const sideEffects: { label: string; counts: Record<string, number> }[] = [];
let forbiddenNetwork = 0;
const realFetch = globalThis.fetch;
before(() => { globalThis.fetch = async () => { forbiddenNetwork++; throw new Error("Network forbidden in boundary units"); }; });
after(async () => {
  globalThis.fetch = realFetch; assert.equal(forbiddenNetwork, 0);
  await mkdir("artifacts/local/11c", { recursive: true });
  await writeFile("artifacts/local/11c/handler-boundaries.json", JSON.stringify({ finishedUtc: new Date().toISOString(),
    context: "actual handlers/repository over synthetic Prisma, injected mint/parser/captions; NOT real SQL/provider", forbiddenNetwork, cases, sideEffects }, null, 2) + "\n");
});
function harness(mint?: Mint, waitForProofRead?: () => Promise<void>) {
  let at = Date.now(); const a = createVisitor(config, at), b = createVisitor(config, at);
  const cookie = (v = a) => visitorCookie(v, config, at).split(";", 1)[0];
  const db = new SyntheticSourceDatabase(), repository = createSourceRepository(() => db.asClient());
  const source = uploadedRecord(extraction, a); db.rows.set(source.id, source);
  const other = captionRecord(transcript, b); db.rows.set(other.id, other);
  const proofRows = new Map<string, ProofRecord>();
  for (const v of [a, b]) proofRows.set(proofId(v.owner), { id: proofId(v.owner), ownerSessionHash: v.owner, title: PROOF_TITLE,
    fullText: PROOF_TEXT, provider: PROOF_PROVIDER, extractionStatus: "READY", expiresAt: new Date(v.expiresAt * 1000) });
  const counts = { parse: 0, caption: 0, mint: 0, proofGet: 0, proofCreate: 0, bodyRead: 0, cache: 0 };
  const parse = async () => { counts.parse++; return extraction; };
  const provider = async () => { counts.caption++; return { ok: true as const, transcript }; };
  const pdf = createSourceHandlers({ config: () => config, repository, parse, now: () => at });
  const yt = createYoutubeSourceHandler({ config: () => ({ ...config, provider: "direct", cacheBypass: true }), repository, provider,
    cache: { get: async () => { counts.cache++; return null; }, put: async () => { counts.cache++; } }, now: () => at });
  const proof = createProofHandlers({ config: () => config, now: () => at,
    store: { get: async id => { counts.proofGet++; await waitForProofRead?.(); return proofRows.get(id) ?? null; },
      createOnce: async row => { counts.proofCreate++; if (!proofRows.has(row.id)) proofRows.set(row.id, row); return proofRows.get(row.id)!; } },
    mint: async input => { counts.mint++; return mint ? mint(input) : { clientSecret: `ek_${randomBytes(12).toString("hex")}`, expiresAt: Math.floor(at / 1000) + 60 }; } });
  const pdfDiagnostic = createPdfHandler({ config: () => config, parse, now: () => at });
  const captionDiagnostic = createCaptionHandler({ config: () => ({ ...config, provider: "direct" }), provider, now: () => at });
  const operations = {
    read: (r: Request) => pdf.read(r, source.id), delete: (r: Request) => pdf.remove(r, source.id), pdf: pdf.upload, youtube: yt,
    proof: proof.proof, credential: proof.credential, pdfDiagnostic, captionDiagnostic,
  };
  const request = (method = "POST", headers: Record<string, string> = {}, body: unknown = {}, signal?: AbortSignal) => new Request(config.origin, {
    method, signal, headers: { origin: config.origin, cookie: cookie(), "content-type": "application/json", ...headers },
    ...(!["GET", "HEAD"].includes(method) ? { body: JSON.stringify(body) } : {}),
  });
  const poisonRequest = (method = "POST", headers: Record<string, string> = {}) => new Request(config.origin, { method,
    headers: { origin: config.origin, cookie: cookie(), "content-type": "application/json", ...headers },
    body: new ReadableStream({ pull() { counts.bodyRead++; throw new Error("Rejected request body must stay unread"); } }, { highWaterMark: 0 }),
    duplex: "half" } as RequestInit);
  return { a, b, at: () => at, setTime: (time: number) => { at = time; }, source, other, db, repository, proofRows, counts, cookie, request, poisonRequest, operations, proof, pdf, yt };
}
type Harness = ReturnType<typeof harness>;
async function check(label: string, response: Response, status: number) {
  assert.equal(response.status, status, label);
  const noStore = response.headers.get("cache-control") === "no-store"; assert.ok(noStore, label);
  const value = await response.json();
  assert.ok(!/ownerSessionHash|activeSourceOwner|cookieSecret|postgresql:|extractionStatus|synthetic-test-only|upstream-private/.test(JSON.stringify(value)), label);
  if (status !== 200 && status !== 201) assert.ok(!/AUTHORED|clientSecret|ek_/.test(JSON.stringify(value)), label);
  cases.push({ label, status, noStore }); return value;
}
function zeroWork(h: Harness) {
  assert.equal(h.db.transactions, 0);
  assert.ok(Object.values(h.counts).every(value => value === 0));
}
const operationNames = ["read", "delete", "pdf", "youtube", "proof", "credential", "pdfDiagnostic", "captionDiagnostic"] as const;
for (const name of operationNames) {
  test(`${name}: complete absent/foreign/null/malformed Origin policy before side effects`, async () => {
    for (const [label, origin] of [["absent", null], ["foreign", "https://foreign.invalid"], ["null", "null"], ["malformed", "bad origin"], ["trailing slash", config.origin + "/"]] as const) {
      const h = harness(), request = name === "read" ? h.request("GET") : h.poisonRequest(name === "delete" ? "DELETE" : "POST");
      if (origin === null) request.headers.delete("origin"); else request.headers.set("origin", origin);
      const allowedRead = name === "read" && origin === null;
      await check(`${name} Origin ${label}`, await h.operations[name](request), allowedRead ? 200 : 403);
      if (!allowedRead) zeroWork(h); else assert.equal(h.db.reads, 1);
    }
  });
  test(`${name}: hostile fetch metadata denied before side effects`, async () => {
    for (const site of ["cross-site", "same-site", "malformed", "none"]) {
      const h = harness();
      const allowedRead = name === "read" && site === "none";
      const request = name === "read" ? h.request("GET", { "sec-fetch-site": site }) : h.poisonRequest(name === "delete" ? "DELETE" : "POST", { "sec-fetch-site": site });
      await check(`${name} metadata ${site}`, await h.operations[name](request), allowedRead ? 200 : 403);
      if (!allowedRead) zeroWork(h);
    }
  });
}
for (const name of ["read", "delete", "pdf", "youtube", "credential", "proof"] as const) test(`${name}: invalid cookies cannot claim the prior visitor capability`, async () => {
  for (const kind of ["missing", "malformed", "tampered", "expired", "duplicate", "wrong host prefix"] as const) {
    const h = harness();
    const bad = kind === "missing" ? "" : kind === "malformed" ? "__Host-td-visitor=bad" : kind === "tampered" ? h.cookie().slice(0, -1) + "!"
      : kind === "duplicate" ? h.cookie() + "; " + h.cookie() : kind === "wrong host prefix" ? h.cookie().replace("__Host-", "") : h.cookie();
    if (kind === "expired") h.setTime(h.a.expiresAt * 1000);
    const r = h.request(name === "read" ? "GET" : name === "delete" ? "DELETE" : "POST", { cookie: bad }, name === "credential" ? { sourceId: proofId(h.a.owner) } : {});
    const response = await h.operations[name](r);
    const body = await check(`${name} cookie ${kind}`, response, name === "proof" ? 200 : 401);
    assert.equal(h.counts.mint, 0); assert.equal(h.db.transactions, 0);
    if (name === "proof") { assert.notEqual(body.id, proofId(h.a.owner)); assert.ok(response.headers.has("set-cookie")); }
    else { assert.equal(h.counts.proofGet, 0); assert.equal(h.counts.parse, 0); assert.equal(h.counts.caption, 0); }
    assert.ok(h.db.rows.has(h.other.id));
  }
});
for (const kind of ["PDF", "YOUTUBE"] as const) for (const mode of ["voice", "text"] as const) test(`${kind}/${mode}: actual credential handler denies genuine and foreign source capability`, async () => {
  const h = harness();
  const row = kind === "PDF" ? h.source : captionRecord(transcript, h.a);
  h.proofRows.set(row.id, row);
  for (const id of [row.id, proofId(h.b.owner)]) await check(`${kind}/${mode} source ID denied`, await h.proof.credential(h.request("POST", {}, { sourceId: id, mode })), 404);
  // A fresh handler prevents admission quota from masking forged owner fields.
  for (const field of ["owner", "ownerSessionHash", "cookie", "visitorId"]) {
    const fresh = harness();
    await check(`credential ${field} injection`, await fresh.proof.credential(fresh.request("POST", {}, { sourceId: proofId(fresh.b.owner), [field]: fresh.b.owner })), 400);
    assert.equal(fresh.counts.proofGet, 0); assert.equal(fresh.counts.mint, 0);
  }
  assert.equal(h.counts.mint, 0);
});
test("both genuine kinds have allowed owner operations; injected replacement target cannot replace B", async () => {
  const h = harness();
  const before = structuredClone(h.db.rows.get(h.other.id));
  await check("foreign YouTube read", await h.pdf.read(h.request("GET"), h.other.id), 404);
  await check("foreign YouTube delete", await h.pdf.remove(h.request("DELETE"), h.other.id), 404);
  for (const field of ["sourceId", "owner", "ownerSessionHash", "cookie"]) await check(`YouTube ${field} injection`, await h.yt(h.request("POST", {}, { video: transcript.videoId, [field]: field === "sourceId" ? h.other.id : h.b.owner })), 400);
  assert.equal(h.counts.caption, 0); assert.deepEqual(h.db.rows.get(h.other.id), before);
  // Fresh handler: invalid-body attempts deliberately consumed the existing quota.
  const fresh = harness();
  const oldId = fresh.source.id;
  await check("allowed caption replacement", await fresh.yt(fresh.request("POST", { "sec-fetch-site": "same-origin" }, { video: transcript.videoId })), 201);
  await check("stale replaced PDF ID", await fresh.pdf.read(fresh.request("GET"), oldId), 404);
  assert.ok(fresh.db.rows.has(fresh.other.id));
  const own = [...fresh.db.rows.values()].find(row => row.activeSourceOwner === fresh.a.owner)!;
  const response = await check("allowed own caption read", await fresh.pdf.read(fresh.request("GET"), own.id), 200);
  assert.equal(Date.parse(response.source.expiresAt), fresh.a.expiresAt * 1000);
  await check("allowed own caption delete", await fresh.pdf.remove(fresh.request("DELETE"), own.id), 200);
  sideEffects.push({ label: "owned caption replacement/read/delete with stale and foreign denial", counts: { ...fresh.counts,
    transactions: fresh.db.transactions, creates: fresh.db.creates, reads: fresh.db.reads, deletes: fresh.db.deletes, remainingSources: fresh.db.rows.size } });
});
test("PDF multipart owner/source fields are rejected before parse or replacement", async () => {
  const h = harness(); const body = new FormData();
  body.append("file", new Blob(["%PDF-1.7\nsynthetic"], { type: "application/pdf" }), "synthetic.pdf");
  body.append("sourceId", h.other.id); body.append("ownerSessionHash", h.b.owner);
  await check("PDF multipart target injection", await h.pdf.upload(new Request(config.origin, { method: "POST", headers: { origin: config.origin, cookie: h.cookie() }, body })), 400);
  assert.equal(h.counts.parse, 0); assert.equal(h.db.transactions, 0); assert.ok(h.db.rows.has(h.other.id));
});
test("unsupported kind and mismatched kind/provenance are uniformly unavailable", async () => {
  for (const patch of [{ kind: "TEXT" }, { kind: "YOUTUBE" }, { kind: "PDF", provider: "supadata", canonicalOrigin: transcript.canonicalUrl }]) {
    const h = harness(); Object.assign(h.source, patch); h.proofRows.set(h.source.id, h.source);
    await check("wrong-kind source read", await h.pdf.read(h.request("GET"), h.source.id), 404);
    await check("wrong-kind source delete", await h.pdf.remove(h.request("DELETE"), h.source.id), 404);
    await check("wrong-kind credential capability", await h.proof.credential(h.request("POST", {}, { sourceId: h.source.id })), 404);
    assert.equal(h.counts.mint, 0); assert.equal(h.db.deletes, 0); assert.equal(h.db.rows.size, 2);
  }
});
test("expiry and cancellation crossing held source read/delete await withhold authority", async () => {
  for (const method of ["GET", "DELETE"]) for (const event of ["visitor expiry", "cancel"]) {
    const h = harness(), controller = new AbortController();
    let finish!: () => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { finish = resolve; });
    const repository = { ...h.repository,
      get: async (...args: Parameters<typeof h.repository.get>) => { const row = await h.repository.get(...args); entered(); await held; return row; },
      remove: async (...args: Parameters<typeof h.repository.remove>) => { entered(); await held; return h.repository.remove(...args); } };
    const handler = createSourceHandlers({ config: () => config, repository, parse: async () => extraction, now: h.at });
    const pending = method === "GET" ? handler.read(h.request(method, {}, {}, controller.signal), h.source.id) : handler.remove(h.request(method, {}, {}, controller.signal), h.source.id);
    await started;
    if (event === "cancel") controller.abort(); else h.setTime(h.a.expiresAt * 1000);
    finish(); await check(`${method} held ${event}`, await pending, event === "cancel" ? 408 : 401);
    assert.ok(h.db.rows.has(h.source.id));
    sideEffects.push({ label: `${method} held ${event}`, counts: { ...h.counts, transactions: h.db.transactions, deletes: h.db.deletes } });
  }
});
test("cancel before proof DB return never mints; cancelled pending mint is withheld and admission released", async () => {
  for (const stage of ["read", "mint"]) {
    const controller = new AbortController(); let finish!: () => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; }); const held = new Promise<void>(resolve => { finish = resolve; });
    const h = harness(async () => { if (stage === "mint") { entered(); await held; }
      return { clientSecret: `ek_${randomBytes(12).toString("hex")}`, expiresAt: Math.floor(h.at() / 1000) + 60 }; },
    stage === "read" ? async () => { entered(); await held; } : undefined);
    const pending = h.proof.credential(h.request("POST", {}, { sourceId: proofId(h.a.owner) }, controller.signal));
    await started; controller.abort(); finish();
    await check(`credential cancelled ${stage}`, await pending, stage === "read" ? 400 : 404);
    assert.equal(h.counts.mint, stage === "read" ? 0 : 1);
    if (stage === "mint") {
      // A fresh request for the same owner succeeds: no leaked active lease after late mint.
      await check("retry after cancelled mint", await h.proof.credential(h.request("POST", {}, { sourceId: proofId(h.a.owner) })), 200);
      assert.equal(h.counts.mint, 2);
    }
    sideEffects.push({ label: `credential cancelled ${stage}`, counts: { ...h.counts } });
  }
});
test("provider timeout releases admission; late fake transport success cannot publish credentials", async () => {
  let finish!: (r: Response) => void, upstreamCalls = 0, aborted = false;
  const h = harness(createMint(async (_, input) => {
    upstreamCalls++; input?.signal?.addEventListener("abort", () => { aborted = true; }, { once: true });
    return new Promise<Response>(resolve => { finish = resolve; });
  }, Date.now, 10));
  await check("credential provider timeout", await h.proof.credential(h.request("POST", {}, { sourceId: proofId(h.a.owner) })), 503);
  assert.ok(aborted); assert.equal(upstreamCalls, 1);
  finish(Response.json({ value: `ek_${randomBytes(12).toString("hex")}`, expires_at: Math.floor(Date.now() / 1000) + 60 }));
  await new Promise(resolve => setImmediate(resolve));
  await check("timeout released active lease", await h.proof.credential(h.request("POST", {}, { sourceId: proofId(h.a.owner) })), 503);
  assert.equal(upstreamCalls, 2);
  sideEffects.push({ label: "provider timeouts release admission, no retry", counts: { ...h.counts, upstreamCalls } });
});
test("source-only expiry crossing held read and mint is rejected at the exact boundary", async () => {
  const h = harness(); h.source.expiresAt = new Date(h.at() + 1000);
  let finish!: () => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; }), held = new Promise<void>(resolve => { finish = resolve; });
  const pdf = createSourceHandlers({ config: () => config, now: h.at, parse: async () => extraction,
    repository: { ...h.repository, get: async (...args) => { const row = await h.repository.get(...args); entered(); await held; return row; } } });
  const read = pdf.read(h.request("GET"), h.source.id); await started; h.setTime(h.source.expiresAt.getTime()); finish();
  await check("source-only expiry after held read", await read, 404); assert.equal(h.counts.mint, 0);
  assert.equal(h.db.rows.get(h.source.id)!.expiresAt.getTime(), h.at());
  let mintFinish!: () => void, mintEntered!: () => void;
  const mintStarted = new Promise<void>(resolve => { mintEntered = resolve; }), mintHeld = new Promise<void>(resolve => { mintFinish = resolve; });
  const p = harness(async () => { mintEntered(); await mintHeld; return { clientSecret: `ek_${randomBytes(12).toString("hex")}`, expiresAt: Math.floor(p.at() / 1000) + 60 }; });
  const row = p.proofRows.get(proofId(p.a.owner))!; row.expiresAt = new Date(p.at() + 1000);
  const pending = p.proof.credential(p.request("POST", {}, { sourceId: row.id }));
  await mintStarted; p.setTime(row.expiresAt.getTime()); mintFinish();
  await check("source-only expiry after held mint", await pending, 404); assert.equal(p.counts.mint, 1);
  assert.equal(row.expiresAt.getTime(), p.at());
  sideEffects.push({ label: "source-only expiry after pending mint", counts: { ...p.counts } });
});
