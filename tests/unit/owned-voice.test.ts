import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { getEventListeners } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createPreparationDiagnostics, type PreparationTrace } from "../../src/server/voice/diagnostics.ts";
import { parseVoiceConfig } from "../../src/server/voice/config.ts";
import { VoiceRegistry } from "../../src/server/voice/registry.ts";
import { createVoiceHandlers } from "../../src/server/voice/handlers.ts";
import { createVoiceMint, initialVoiceSession, type VoiceMint } from "../../src/server/voice/provider.ts";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { captionRecord, uploadedRecord, type SourceRepository } from "../../src/server/sources/service.ts";
import { sourceChanged } from "../../src/server/sources/invalidation.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { PROVIDER_VOICE_POLICY as policy } from "../../src/shared/priming-provider-policy.ts";
import { validateProviderAdmission } from "../../src/shared/priming-admission.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";

const config = { origin: "https://voice.example", secure: true, cookieSecret: randomBytes(32).toString("hex"), apiKey: "sk-synthetic02d-not-a-real-key" };
const registries: VoiceRegistry[] = [];
afterEach(() => { for (const r of registries.splice(0)) r.dispose(); });
function fixture(kind = "PDF", options: Partial<ConstructorParameters<typeof VoiceRegistry>[0]> = {}, diagnostics?: () => PreparationTrace | undefined) {
  let at = Date.now(), available = true, calls = 0, reads = 0;
  const now = () => at, visitor = createVisitor(config, at), db = new SyntheticSourceDatabase();
  const row = kind === "PDF" ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
  db.rows.set(row.id, row);
  const repo = createSourceRepository(() => db.asClient());
  let get: SourceRepository["get"] = repo.get;
  let mint: VoiceMint = async ({ signal }) => { assert.equal(signal.aborted, false); return { clientSecret: "ek_synthetic02d", expiresAt: Math.floor(at / 1000) + 60 }; };
  const registry = new VoiceRegistry({ repository: { get: (...args) => { reads++; return get(...args); } }, now,
    mint: input => { calls++; return mint(input); }, ...options }); registries.push(registry);
  const handlers = createVoiceHandlers({ config: () => available ? config : null, registry, now, diagnostics });
  const cookie = visitorCookie(visitor, config, at).split(";", 1)[0], requestId = randomUUID();
  const request = (input: unknown, headers: Record<string, string> = {}, signal = new AbortController().signal) => new Request(config.origin + "/api/voice-preparations", {
    method: "POST", headers: { cookie, origin: config.origin, "content-type": "application/json", ...headers }, body: JSON.stringify(input), signal });
  const prepare = () => handlers.prepare(request({ sourceId: row.id, requestId }));
  const start = async () => { const r = await prepare(); assert.equal(r.status, 201); return await r.json(); };
  const credential = (p: { preparationId: string }, signal?: AbortSignal) => handlers.credential(request({ sourceId: row.id, requestId, preparationId: p.preparationId }, {}, signal));
  return { db, row, visitor, repo, registry, handlers, request, requestId, prepare, start, credential,
    get calls() { return calls; }, get reads() { return reads; }, now,
    advance: (ms: number) => { at += ms; }, gate: () => { available = false; },
    read: (fn: SourceRepository["get"]) => { get = fn; }, mint: (fn: VoiceMint) => { mint = fn; } };
}
const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function until(fn: () => boolean) { for (let i = 0; i < 100; i++) { if (fn()) return; await delay(2); } assert.fail("condition deadline"); }
function clean(f: ReturnType<typeof fixture>, pendingMints = 0) { assert.deepEqual(f.registry.resources,
  { entries: 0, timers: 0, replayEntries: 1, pendingMints }); }

test("08J server timing is versioned, source-clipped, and reauthorization still expires the ticket", async () => {
  const f = fixture(); f.row.expiresAt = new Date(f.now() + 1500);
  const p = await f.start();
  assert.equal(p.timingVersion, "owned-voice-time-v1"); assert.equal(p.issuedAt, f.now());
  assert.equal(p.expiresAt - p.issuedAt, 1500);
  assert.equal(Date.parse(p.input.variant.source.expiresAt), p.expiresAt);
  f.advance(1500);
  assert.equal((await f.credential(p)).status, 404); assert.equal(f.calls, 0); clean(f);
});
test("08J credential timestamp shares server milliseconds; provider expiry remains seconds", async () => {
  const f = fixture(), p = await f.start();
  assert.equal(p.expiresAt - p.issuedAt, 30_000);
  f.advance(1234); const r = await f.credential(p); assert.equal(r.status, 200);
  const d = await r.json(); assert.equal(d.timingVersion, "owned-voice-time-v1"); assert.equal(d.issuedAt, f.now());
  assert.ok(d.expiresAt * 1000 - d.issuedAt > 59_000); assert.ok(d.expiresAt * 1000 - d.issuedAt <= 60_000); clean(f);
});

const env = { NODE_ENV: "production", OWNED_SOURCE_VOICE_ENABLED: "true", PDF_INGESTION_ENABLED: "true", APP_ORIGIN: config.origin,
  VISITOR_COOKIE_SECRET: config.cookieSecret, OPENAI_API_KEY: config.apiKey, DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic" };
for (const field of ["OWNED_SOURCE_VOICE_ENABLED", "PDF_INGESTION_ENABLED", "APP_ORIGIN", "VISITOR_COOKIE_SECRET", "OPENAI_API_KEY", "DATABASE_URL"])
  test(`02D missing ${field} fails closed`, () => { assert.equal(parseVoiceConfig({ ...env, [field]: "" }), null); });
test("02D only independent voice gate authorizes configuration", () => {
  assert.ok(parseVoiceConfig(env));
  assert.equal(parseVoiceConfig({ ...env, OWNED_SOURCE_VOICE_ENABLED: "false", PROOF_ENABLED: "true", REALTIME_ISSUANCE_ENABLED: "true", OWNED_SOURCE_TEXT_ENABLED: "true" }), null);
  assert.equal(parseVoiceConfig({ ...env, NEXT_PUBLIC_OPENAI_API_KEY: config.apiKey }), null);
});
test("02D disabled handlers are uncached 503 without reads/provider", async () => {
  const f = fixture(); f.gate(); for (const h of [f.handlers.prepare, f.handlers.credential, f.handlers.cancel]) {
    const r = await h(f.request({})); assert.equal(r.status, 503); assert.equal(r.headers.get("cache-control"), "no-store");
  } assert.equal(f.calls, 0); assert.equal(f.reads, 0);
});
test("08D cancellation is owner/source/request bound, idempotent, uncached and cannot refund preparation attempts", async () => {
  const f = fixture(), other = fixture(), p = await f.start();
  const input = { sourceId: f.row.id, requestId: f.requestId };
  const foreign = await f.handlers.cancel(other.request(input)); assert.equal(foreign.status, 200);
  assert.equal(f.registry.resources.entries, 1);
  for (const altered of [{ ...input, sourceId: randomUUID() }, { ...input, requestId: randomUUID() }]) {
    assert.equal((await f.handlers.cancel(f.request(altered))).status, 200); assert.equal(f.registry.resources.entries, 1);
  }
  for (let n = 0; n < 2; n++) {
    const r = await f.handlers.cancel(f.request(input)); assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store");
    assert.deepEqual(await r.json(), { cancelled: true });
  }
  clean(f); assert.equal((await f.credential(p)).status, 404); assert.equal((await f.prepare()).status, 409); assert.equal(f.calls, 0);
  const fresh = await f.handlers.prepare(f.request({ sourceId: f.row.id, requestId: randomUUID() })); assert.equal(fresh.status, 201);
  // A late Stop for the old request cannot cancel the fresh preparation.
  assert.equal((await f.handlers.cancel(f.request(input))).status, 200); assert.equal(f.registry.resources.entries, 1);
});
test("08D cancelled pending mint remains charged until late result settles; no credential delivered", async () => {
  const f = fixture(), hold = deferred<{ clientSecret: string; expiresAt: number }>(); f.mint(() => hold.promise);
  const p = await f.start(), pending = f.credential(p); await until(() => f.calls === 1);
  assert.equal((await f.handlers.cancel(f.request({ sourceId: f.row.id, requestId: f.requestId }))).status, 200);
  assert.equal((await pending).status, 404); clean(f, 1);
  hold.resolve({ clientSecret: "ek_synthetic08d_late", expiresAt: Math.floor(f.now() / 1000) + 60 });
  await until(() => f.registry.resources.pendingMints === 0); clean(f); assert.equal(f.calls, 1);
});
test("08D cancellation interrupts a pending preparation; a late read cannot recreate its ticket", async () => {
  const f = fixture(), held = deferred<typeof f.row>(); f.read(() => held.promise);
  const pending = f.prepare(); await until(() => f.reads === 1);
  assert.equal((await f.handlers.cancel(f.request({ sourceId: f.row.id, requestId: f.requestId }))).status, 200);
  assert.equal((await pending).status, 404); clean(f); held.resolve(f.row); await delay(1); clean(f); assert.equal(f.calls, 0);
});
for (const [label, headers, status] of [["missing visitor", { cookie: "" }, 401], ["foreign origin", { origin: "https://foreign.example" }, 403], ["cross-site", { "sec-fetch-site": "cross-site" }, 403]] as const)
  test(`08D cancellation ${label} denied without affecting ticket`, async () => {
    const f = fixture(); await f.start(); const r = await f.handlers.cancel(f.request({ sourceId: f.row.id, requestId: f.requestId }, headers));
    assert.equal(r.status, status); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(f.registry.resources.entries, 1);
  });
for (const kind of ["PDF", "YOUTUBE"]) test(`02D ${kind} complete structuredB; one credential; replay denied`, async () => {
  const f = fixture(kind), p = await f.start();
  assert.equal(p.input.policy.model, policy.model); assert.equal(p.input.variant.id, "B"); assert.equal(p.conversationReady, false);
  assert.equal(p.providerConfirmed, false); assert.equal(validateProviderAdmission(p.input), true);
  assert.equal(p.input.variant.source.sections.map((s: { text: string }) => s.text).join(p.input.variant.source.separator), f.row.fullText);
  assert.equal(f.calls, 0); const r = await f.credential(p); assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store");
  const output = await r.json(); assert.deepEqual(Object.keys(output).sort(), ["clientSecret", "expiresAt", "issuedAt", "preparationId", "timingVersion"]);
  assert.equal(f.calls, 1); assert.equal((await f.credential(p)).status, 404); clean(f);
  const safe = JSON.stringify({ p, output });
  for (const secret of [config.apiKey, config.cookieSecret, f.visitor.owner, "ownerSessionHash", "activeSourceOwner"]) assert.equal(safe.includes(secret), false);
});
for (const [label, headers, status] of [
  ["missing visitor", { cookie: "" }, 401], ["forged visitor", { cookie: "__Host-td-visitor=forged" }, 401],
  ["foreign origin", { origin: "https://foreign.example" }, 403], ["cross-site metadata", { "sec-fetch-site": "cross-site" }, 403],
  ["wrong content type", { "content-type": "text/plain" }, 400],
] as const) test(`02D ${label} denied before storage/acquisition`, async () => {
  const f = fixture(), r = await f.handlers.prepare(f.request({ sourceId: f.row.id, requestId: f.requestId }, headers));
  assert.equal(r.status, status); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(f.calls, 0); assert.equal(f.reads, 0);
});
for (const extra of [{ model: "other" }, { policy: policy }, { sourceText: "override" }, { ready: true }, { owner: "forged" }, { maxEventBytes: 4096 }])
  test(`02D altered ${Object.keys(extra)[0]} rejected`, async () => {
    const f = fixture(), r = await f.handlers.prepare(f.request({ sourceId: f.row.id, requestId: f.requestId, ...extra }));
    assert.equal(r.status, 400); assert.equal(f.reads, 0); assert.equal(f.calls, 0);
  });
for (const body of [{}, [], null, { sourceId: "bad", requestId: randomUUID() }, { sourceId: randomUUID(), requestId: "bad" }, { x: "雪".repeat(513) }])
  test(`02D malformed/oversized body ${JSON.stringify(body).slice(0, 50)}`, async () => {
    const f = fixture(); assert.equal((await f.handlers.prepare(f.request(body))).status, 400); assert.equal(f.reads, 0);
  });
test("02D chunked oversized and stalled body cancel reader and free command slot", async () => {
  const f = fixture(); let cancelled = 0;
  for (const stalled of [false, true]) {
    const body = new ReadableStream({ start(c) { if (!stalled) c.enqueue(new Uint8Array(513)); }, cancel() { cancelled++; } });
    const r = new Request(f.request({}), { body, duplex: "half" } as RequestInit);
    assert.equal((await f.handlers.prepare(r)).status, 400);
  }
  assert.equal(cancelled, 2); assert.equal(f.calls, 0); assert.equal((await f.prepare()).status, 201);
});
test("02D abort stalled body removes listener and cancels reader promptly", async () => {
  const f = fixture(), abort = new AbortController(); let cancelled = 0;
  const r = new Request(f.request({}), { body: new ReadableStream({ cancel() { cancelled++; } }), signal: abort.signal, duplex: "half" } as RequestInit);
  const pending = f.handlers.prepare(r); abort.abort(); assert.equal((await pending).status, 400); assert.equal(cancelled, 1);
  assert.equal(getEventListeners(r.signal, "abort").length, 0);
});
for (const change of ["foreign", "missing", "expired", "not-ready", "wrong-kind", "wrong-id"])
  test(`02D ${change} source unavailable without provider or existence leakage`, async () => {
    const f = fixture();
    if (change === "foreign") f.row.ownerSessionHash = f.row.activeSourceOwner = "foreign";
    if (change === "missing") f.db.rows.clear();
    if (change === "expired") f.row.expiresAt = new Date(f.now() - 1);
    if (change === "not-ready") f.row.extractionStatus = "PENDING";
    if (change === "wrong-kind") f.row.kind = "SYNTHETIC";
    if (change === "wrong-id") f.read(async () => ({ ...f.row, id: randomUUID() }));
    const r = await f.prepare(); assert.equal(r.status, 404); assert.deepEqual(await r.json(), { error: "Voice preparation unavailable" });
    assert.equal(f.calls, 0); clean(f);
  });
test("02D expired visitor denied before source read", async () => {
  const f = fixture(); f.advance(3600_001); assert.equal((await f.prepare()).status, 401); assert.equal(f.reads, 0);
});
test("02D changed visitor bearer during mint cannot receive a credential", async () => {
  const f = fixture(), p = await f.start(), held = deferred<{ clientSecret: string; expiresAt: number }>();
  const request = f.request({ sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId });
  f.mint(() => held.promise); const pending = f.handlers.credential(request); await until(() => f.calls === 1);
  request.headers.set("cookie", visitorCookie(createVisitor(config, f.now()), config, f.now()).split(";", 1)[0]);
  held.resolve({ clientSecret: "ek_changed_bearer", expiresAt: Math.floor(f.now() / 1000) + 60 });
  const r = await pending; assert.equal(r.status, 404); assert.equal((await r.text()).includes("ek_"), false); clean(f);
});
for (const field of ["sourceId", "requestId", "preparationId"] as const) test(`02D ticket ${field} binding`, async () => {
  const f = fixture(), p = await f.start();
  const input = { sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId, [field]: field === "preparationId" ? "x".repeat(43) : randomUUID() };
  assert.equal((await f.handlers.credential(f.request(input))).status, 404); assert.equal(f.calls, 0);
});
test("02D foreign visitor cannot use or consume ticket", async () => {
  const f = fixture(), p = await f.start(), foreign = createVisitor(config, f.now());
  const r = await f.handlers.credential(f.request({ sourceId: f.row.id, requestId: f.requestId, preparationId: p.preparationId },
    { cookie: visitorCookie(foreign, config, f.now()).split(";", 1)[0] }));
  assert.equal(r.status, 404); assert.equal(f.calls, 0); assert.equal((await f.credential(p)).status, 200);
});
for (const phase of ["prepare", "mint"] as const) for (const reason of ["abort", "timeout", "change", "gate"] as const)
  test(`02D ${reason} during held ${phase}; late result discarded`, async () => {
    const f = fixture("PDF", { limits: { preparationMs: 25, acquisitionMs: 25 } }), held = deferred<never>();
    const abort = new AbortController(); let pending: Promise<Response>;
    if (phase === "prepare") { f.read(() => held.promise); pending = f.handlers.prepare(f.request({ sourceId: f.row.id, requestId: f.requestId }, {}, abort.signal)); await until(() => f.reads > 0); }
    else { const p = await f.start(); f.mint(() => held.promise); pending = f.credential(p, abort.signal); await until(() => f.calls === 1); }
    if (reason === "abort") abort.abort();
    if (reason === "change") sourceChanged(f.visitor.owner);
    if (reason === "gate") { f.gate(); held.reject(new Error("PRIVATE provider failure")); }
    const r = await pending; assert.equal(r.status, 404); assert.equal((await r.text()).includes("PRIVATE"), false);
    if (reason !== "gate") held.reject(new Error("late upstream rejection")); await delay(2); clean(f);
    assert.ok(getEventListeners(abort.signal, "abort").length <= 1);
  });
for (const change of ["remove", "replace", "content", "expiry", "visitor-expiry"] as const)
  test(`02D ${change} during asynchronous mint suppresses credential`, async () => {
    const f = fixture(), p = await f.start(), held = deferred<{ clientSecret: string; expiresAt: number }>();
    f.mint(() => held.promise); const pending = f.credential(p); await until(() => f.calls === 1);
    if (change === "remove") await f.repo.remove(f.row.id, f.visitor.owner, new Date(), () => {});
    if (change === "replace") await f.repo.replace(uploadedRecord(pdfFixture, f.visitor), () => {});
    if (change === "content") { const text = "altered"; Object.assign(f.db.rows.get(f.row.id)!, { fullText: text, pageCount: 1, sections: [{ id: "page-1", pageNumber: 1, text }], characterCount: text.length, wordCount: 1 }); }
    if (change === "expiry") f.db.rows.get(f.row.id)!.expiresAt = new Date(f.now());
    if (change === "visitor-expiry") f.advance(3600_001);
    held.resolve({ clientSecret: "ek_should_never_escape", expiresAt: Math.floor(f.now() / 1000) + 60 });
    const r = await pending; assert.equal(r.status, 404); assert.equal((await r.text()).includes("ek_"), false); clean(f);
  });
for (const reason of ["expired-ticket", "removed", "content", "gate"] as const) test(`02D ${reason} before mint makes zero provider calls`, async () => {
  const f = fixture(), p = await f.start();
  if (reason === "expired-ticket") f.advance(30_001);
  if (reason === "removed") f.db.rows.clear();
  if (reason === "content") f.row.title = "changed"; // Title is intentionally outside context. Change source expiry as well.
  if (reason === "content") f.db.rows.get(f.row.id)!.expiresAt = new Date(f.row.expiresAt.getTime() - 1000);
  if (reason === "gate") f.gate();
  assert.equal((await f.credential(p)).status, reason === "gate" ? 503 : 404); assert.equal(f.calls, 0);
});
test("02D source expiry and replay deadlines release abandoned tickets", async () => {
  const f = fixture("PDF", { limits: { ticketMs: 15 } }); await f.start(); await delay(25); clean(f);
  assert.equal((await f.prepare()).status, 409);
});
test("02D simultaneous credential claims acquire once; failure consumes ticket", async () => {
  const f = fixture(), p = await f.start(), held = deferred<never>(); f.mint(() => held.promise);
  const first = f.credential(p); await until(() => f.calls === 1);
  assert.equal((await f.credential(p)).status, 429); held.reject(new Error("PRIVATE"));
  assert.equal((await first).status, 404); assert.equal((await f.credential(p)).status, 404); clean(f);
});
test("02D unabortable mint retains slot until settled; no stale success or duplicate release", async () => {
  const f = fixture(), p = await f.start(), held = deferred<{ clientSecret: string; expiresAt: number }>(), abort = new AbortController();
  f.mint(() => held.promise); const pending = f.credential(p, abort.signal); await until(() => f.calls === 1); abort.abort();
  assert.equal((await pending).status, 404); clean(f, 1);
  held.resolve({ clientSecret: "ek_late", expiresAt: Math.floor(f.now() / 1000) + 60 }); await delay(2); clean(f);
});
for (const limit of ["visitor", "ip", "global", "lifetime", "concurrent"] as const) test(`02D issuance ${limit} exhaustion consumes preparation`, async () => {
  const f = fixture("PDF", { issuance: { visitor: 3, ip: 10, global: 20, lifetime: 50, concurrent: 2, windowMs: 3600_000, [limit]: 0 } });
  const p = await f.start(); assert.equal((await f.credential(p)).status, 429); assert.equal(f.calls, 0); clean(f);
  assert.equal((await f.credential(p)).status, 404);
});
for (const limit of ["entries", "replayEntries"] as const) test(`02D bounded ${limit} refuses excess before read`, async () => {
  const f = fixture("PDF", { limits: { [limit]: 0 } }); assert.equal((await f.prepare()).status, 429); assert.equal(f.reads, 0);
});

const upstream = (session: unknown = initialVoiceSession, value: unknown = "ek_synthetic_provider02d", expires_at = Math.floor(Date.now() / 1000) + 60) =>
  Response.json({ value, expires_at, session });
for (const cap of [512, 2047, 2049, "inf"]) test(`08K issuance rejects stale/wrong/unlimited effective cap ${cap}`, async () => {
  const mint = createVoiceMint(async () => upstream({ ...initialVoiceSession, max_output_tokens: cap }));
  await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: new AbortController().signal }), /^Error: Voice provider unavailable$/);
});
for (const threshold of [undefined, 0.5, 0.6]) test(`08M issuance rejects enabled VAD even with threshold ${threshold}`, async () => {
  let calls = 0;
  const session = structuredClone(initialVoiceSession);
  Object.assign(session.audio.input, { turn_detection: { type: "server_vad", threshold, create_response: false, interrupt_response: false } });
  const mint = createVoiceMint(async () => { calls++; return upstream(session); });
  await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: new AbortController().signal }), /^Error: Voice provider unavailable$/);
  assert.equal(calls, 1);
});

test("02D provider exact official request; source-free initial barrier and safe DTO", async () => {
  let count = 0;
  const mint = createVoiceMint(async (url, init) => {
    count++; assert.equal(url, "https://api.openai.com/v1/realtime/client_secrets"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(init!.body as string), { expires_after: { anchor: "created_at", seconds: 60 }, session: initialVoiceSession });
    assert.equal(initialVoiceSession.audio.input.turn_detection, null); assert.equal(initialVoiceSession.audio.input.transcription, null);
    assert.deepEqual(initialVoiceSession.output_modalities, ["text"]); return upstream();
  });
  const result = await mint({ apiKey: config.apiKey, safetyIdentifier: "a".repeat(64), signal: new AbortController().signal });
  assert.deepEqual(Object.keys(result).sort(), ["clientSecret", "expiresAt"]); assert.equal(count, 1);
});
for (const field of ["model", "output_modalities", "instructions", "tools", "tool_choice", "truncation", "max_output_tokens", "audio"])
  test(`02D provider effective ${field} mismatch denied`, async () => {
    const session = { ...initialVoiceSession, [field]: null }, mint = createVoiceMint(async () => upstream(session));
    await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: new AbortController().signal }), /^Error: Voice provider unavailable$/);
  });
for (const mode of ["http-error", "wrong-content-type", "json", "oversized", "missing", "expired", "too-far", "bad-key"])
  test(`02D provider ${mode} bounded sanitized failure without retries`, async () => {
    let calls = 0, cancelled = 0;
    const mint = createVoiceMint(async () => { calls++;
      if (mode === "http-error") return new Response(new ReadableStream({ cancel() { cancelled++; } }), { status: 500 });
      if (mode === "wrong-content-type") return new Response("PRIVATE");
      if (mode === "json") return new Response("PRIVATE", { headers: { "content-type": "application/json" } });
      if (mode === "oversized") return new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(32_769)); }, cancel() { cancelled++; } }), { headers: { "content-type": "application/json" } });
      if (mode === "missing") return Response.json({ value: "ek_test" });
      return upstream(initialVoiceSession, mode === "bad-key" ? config.apiKey : "ek_test", Math.floor(Date.now() / 1000) + (mode === "expired" ? -1 : 66));
    });
    await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: new AbortController().signal }), /^Error: Voice provider unavailable$/);
    assert.equal(calls, 1); if (["http-error", "oversized"].includes(mode)) assert.equal(cancelled, 1);
  });
for (const phase of ["fetch", "body"] as const) test(`02D provider deadline includes held ${phase}; late response cancelled`, async () => {
  const held = deferred<Response>(); let cancelled = 0;
  const response = () => new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { "content-type": "application/json" } });
  const mint = createVoiceMint(async () => phase === "fetch" ? held.promise : response(), Date.now, 15);
  const abort = new AbortController(); await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: abort.signal }));
  if (phase === "fetch") { held.resolve(response()); await delay(2); }
  assert.equal(cancelled, 1); assert.ok(getEventListeners(abort.signal, "abort").length <= 1);
});
test("02D provider already-aborted does not acquire transport", async () => {
  let calls = 0; const mint = createVoiceMint(async () => { calls++; return upstream(); });
  await assert.rejects(mint({ apiKey: config.apiKey, safetyIdentifier: "x", signal: AbortSignal.abort() })); assert.equal(calls, 0);
});



function diagnosticFixture(options: Partial<ConstructorParameters<typeof VoiceRegistry>[0]> = {}) {
  const lines: string[] = [];
  const f = fixture("PDF", options, createPreparationDiagnostics(line => lines.push(line)));
  const events = () => lines.map(line => JSON.parse(line) as { event: string; sample: number; stage: string; elapsedMs: number; status: number });
  return { f, lines, events };
}
test("08H success traces authorization, all five repository reads, context and serialized response without request data", async () => {
  const { f, lines, events } = diagnosticFixture();
  const response = await f.prepare(); assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(events().map(e => e.stage), ["entry", "authorization", "body", "registry", "initial_authorization",
    "repository_start", "repository_end", "context", "repository_start", "repository_end", "repository_start",
    "repository_end", "repository_start", "repository_end", "final_authorization", "repository_start", "repository_end", "response", "exit"]);
  assert.equal(events().at(-1)?.status, 201); assert.equal(f.calls, 0);
  for (const value of [f.row.id, f.requestId, f.visitor.owner, f.visitor.token, f.row.fullText, config.apiKey, config.cookieSecret])
    assert.equal(lines.join("").includes(value), false);
  const count = lines.length;
  await f.handlers.cancel(f.request({ sourceId: f.row.id, requestId: f.requestId }));
  assert.equal(lines.length, count); clean(f);
});
for (const read of [1, 2, 3, 4, 5]) for (const reason of ["deadline", "abort", "stop"] as const)
  test(`08H held repository read ${read}: ${reason}, no late result or diagnostic revival`, async () => {
    const { f, lines, events } = diagnosticFixture({ limits: { preparationMs: 100 } });
    const held = deferred<typeof f.row>(); let reads = 0;
    f.read((...args) => ++reads === read ? held.promise : f.repo.get(...args));
    const abort = new AbortController(), request = f.request({ sourceId: f.row.id, requestId: f.requestId }, {}, abort.signal);
    const pending = f.handlers.prepare(request); await until(() => reads === read);
    assert.equal(events().at(-1)?.stage, "repository_start");
    if (reason === "abort") abort.abort();
    if (reason === "stop") assert.equal((await f.handlers.cancel(f.request({ sourceId: f.row.id, requestId: f.requestId }))).status, 200);
    assert.equal((await pending).status, 404); assert.equal(events().at(-1)?.status, 404); clean(f);
    assert.equal(getEventListeners(request.signal, "abort").length, 0);
    const count = lines.length;
    if (read % 2) held.resolve(f.row); else held.reject(new Error("PRIVATE_SOURCE_COOKIE_KEY_SENTINEL"));
    await delay(5); clean(f); assert.equal(lines.length, count); assert.equal(f.calls, 0);
  });
for (const reason of ["deadline", "abort"] as const) test(`08H pre-registry body ${reason} is bounded, releases reader and admission`, async () => {
  const { f, events } = diagnosticFixture(); let cancelled = 0;
  const abort = new AbortController();
  const request = new Request(f.request({}), { body: new ReadableStream({ cancel() { cancelled++; } }), signal: abort.signal, duplex: "half" } as RequestInit);
  const pending = f.handlers.prepare(request);
  assert.equal(events().at(-1)?.stage, "body");
  if (reason === "abort") abort.abort();
  assert.equal((await pending).status, 400); assert.equal(events().at(-1)?.status, 400);
  assert.equal(cancelled, 1); assert.equal(f.reads, 0); assert.equal(f.calls, 0);
  assert.equal(getEventListeners(request.signal, "abort").length, 0);
  assert.equal((await f.prepare()).status, 201);
});
test("08H repository exceptions expose only category and status; auth denial never reads", async () => {
  const { f, lines, events } = diagnosticFixture();
  f.read(async () => { throw new Error("PRIVATE_SOURCE_COOKIE_KEY_SENTINEL"); });
  assert.equal((await f.prepare()).status, 404);
  assert.ok(events().some(e => e.stage === "repository_failed"));
  assert.equal(lines.join("").includes("PRIVATE_SOURCE_COOKIE_KEY_SENTINEL"), false);
  const reads = f.reads;
  const r = await f.handlers.prepare(f.request({}, { cookie: "PRIVATE_SOURCE_COOKIE_KEY_SENTINEL" }));
  assert.equal(r.status, 401); assert.equal(f.reads, reads); assert.equal(f.calls, 0);
});
test("08H synchronous work cannot be preempted by timers but cannot publish an expired preparation", async () => {
  const { f, events } = diagnosticFixture({ now: Date.now, limits: { preparationMs: 10 } });
  f.read(async () => { const end = performance.now() + 35; while (performance.now() < end) { /* controlled CPU stall */ } return f.row; });
  assert.equal((await f.prepare()).status, 404); clean(f); assert.equal(f.calls, 0);
  assert.ok(events().at(-1)!.elapsedMs >= 35);
});
test("08H diagnostics have closed fields, bounded sampling/output, clamped timing and inert late calls", () => {
  const lines: string[] = []; let at = 0;
  const begin = createPreparationDiagnostics(line => lines.push(line), () => at);
  for (let n = 0; n < 1000; n++) {
    const trace = begin();
    if (!trace) continue;
    trace.mark("PRIVATE_SOURCE_COOKIE_KEY_SENTINEL" as "body");
    for (let i = 0; i < 1000; i++) trace.mark("body");
    trace.finish(999); trace.mark("context"); trace.finish(201);
  }
  assert.equal(lines.length, 128);
  for (const line of lines) {
    const e = JSON.parse(line);
    assert.deepEqual(Object.keys(e).sort(), ["elapsedMs", "event", "sample", "stage", "status"]);
    assert.equal(e.event, "voice_preparation"); assert.ok(["entry", "body", "exit"].includes(e.stage));
    assert.equal(e.status, 0); assert.equal(e.elapsedMs, 0); assert.ok(e.sample >= 1 && e.sample <= 4);
  }
  assert.equal(lines.join("").includes("SENTINEL"), false);
  at = 60_000; const trace = begin()!; assert.ok(trace);
  at = 999_999; trace.mark("body"); assert.equal(JSON.parse(lines.at(-1)!).elapsedMs, 300_000);
  at = -10; trace.mark("body"); assert.equal(JSON.parse(lines.at(-1)!).elapsedMs, 0);
  at = NaN; trace.finish(503); assert.equal(JSON.parse(lines.at(-1)!).elapsedMs, 0);
  assert.equal(begin(), undefined);
});
test("08H a failed log sink cannot break preparation", async () => {
  const f = fixture("PDF", {}, createPreparationDiagnostics(() => { throw new Error("PRIVATE_LOG_SINK_SENTINEL"); }));
  assert.equal((await f.prepare()).status, 201); assert.equal(f.calls, 0);
});
