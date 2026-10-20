import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { getEventListeners } from "node:events";
import { TextRegistry, RelayError } from "../../src/server/text/registry.ts";
import { createTextHandlers } from "../../src/server/text/handlers.ts";
import { parseTextConfig, textAvailability } from "../../src/server/text/config.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { uploadedRecord, captionRecord } from "../../src/server/sources/service.ts";
import { sourceChanged } from "../../src/server/sources/invalidation.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { scriptedFullSource } from "../../scripts/lib/full-source-scripted.ts";
import type { TextRelaySnapshot } from "../../src/shared/text-relay.ts";
import type { TextConnection } from "../../src/shared/text-lifecycle.ts";
import { openTextSocket, type TextSocket, type TextSocketConstructor } from "../../src/server/text/socket.ts";
import { EventEmitter } from "node:events";
import { createSourceRepository } from "../../src/server/sources/repository.ts";
import { SyntheticSourceDatabase } from "../sources/database.ts";

const config = { origin: "http://localhost:3000", cookieSecret: "a".repeat(64), secure: false, apiKey: "sk-synthetic10d-never-live" };
const registries: TextRegistry[] = [];
afterEach(() => { for (const r of registries.splice(0)) { r.dispose(); assert.equal(r.size, 0); } });
const wait = async (condition: () => boolean) => { for (let i = 0; i < 200; i++) { if (condition()) return; await delay(5); } assert.ok(condition(), "condition deadline"); };
function fixture(kind: "PDF" | "YOUTUBE" = "PDF", limits: Parameters<typeof make>[0] = {}, scenario = "success") { return make(limits, kind, scenario); }
function make(limits: ConstructorParameters<typeof TextRegistry>[0]["limits"] = {}, kind: "PDF" | "YOUTUBE" = "PDF", scenario = "success") {
  const visitor = createVisitor(config, Date.now());
  let row = kind === "PDF" ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
  const counts = { opens: 0, closes: 0, reads: 0, sends: 0 };
  let read: (() => Promise<typeof row | null>) | undefined;
  let acquire: (() => Promise<TextConnection>) | undefined;
  const registry = new TextRegistry({ limits, repository: { get: async (id, owner) => { counts.reads++; return read ? read() : row && row.id === id && row.ownerSessionHash === owner ? structuredClone(row) : null; } },
    connect: async () => { counts.opens++; if (acquire) return acquire();
      const transport = scriptedFullSource(kind, scenario);
      return { transport: { ...transport, send: raw => { counts.sends++; return transport.send(raw); } }, close: () => { counts.closes++; transport.close(); } }; } });
  registries.push(registry);
  const handlers = createTextHandlers({ config: () => config, registry });
  const startId = randomUUID();
  const request = (path = "", value: unknown = {}, headers: Record<string, string> = {}, signal?: AbortSignal) => new Request(config.origin + "/api/text-sessions" + path, {
    method: "POST", headers: { origin: config.origin, "content-type": "application/json", cookie: visitorCookie(visitor, config, Date.now()).split(";", 1)[0], ...headers }, body: JSON.stringify(value), signal });
  const begin = async () => {
    const id = await registry.start(visitor, row.id, startId, new AbortController().signal);
    const abort = new AbortController();
    const stream = await registry.stream(visitor, id, abort.signal); const reader = stream.getReader();
    const snapshots: TextRelaySnapshot[] = [];
    const consume = (async () => { const decoder = new TextDecoder(); let pending = "";
      for (;;) { const r = await reader.read(); if (r.done) break; pending += decoder.decode(r.value); let n;
        while ((n = pending.indexOf("\n")) >= 0) { snapshots.push(JSON.parse(pending.slice(0, n))); pending = pending.slice(n + 1); } }
    })();
    return { id, abort, reader, snapshots, consume };
  };
  return { registry, visitor, counts, handlers, request, startId, begin, get row() { return row; }, setRow: (next: typeof row) => { row = next; },
    read: (next: typeof read) => { read = next; }, acquire: (next: typeof acquire) => { acquire = next; } };
}
for (const kind of ["PDF", "YOUTUBE"] as const) test(`10D actual lifecycle and preparation ${kind}: full ACK, follow-up, Stop`, async () => {
  const f = fixture(kind), s = await f.begin();
  await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
  for (let i = 0; i < 2; i++) {
    await f.registry.question(f.visitor, s.id, randomUUID(), `Question ${i}`, new AbortController().signal);
    await wait(() => s.snapshots.at(-1)?.transcript.turns.length === (i + 1) * 2 && s.snapshots.at(-1)?.status.phase === "ready");
  }
  f.registry.stop(f.visitor, f.startId); await s.consume;
  assert.equal(s.snapshots.at(-1)?.status.phase, "ended"); assert.equal(s.snapshots.at(-1)?.transcript.turns.length, 4);
  assert.equal(f.counts.closes, 1); assert.equal(f.registry.size, 0);
  assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
});
test("10D gate absent/key absent/config injected public secret all unavailable", () => {
  const base = { APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: "postgresql://x:x@localhost/x", PDF_INGESTION_ENABLED: "true", OPENAI_API_KEY: config.apiKey };
  for (const env of [base, { ...base, OWNED_SOURCE_TEXT_ENABLED: "false" }, { ...base, OWNED_SOURCE_TEXT_ENABLED: "true", OPENAI_API_KEY: "" },
    { ...base, OWNED_SOURCE_TEXT_ENABLED: "true", NEXT_PUBLIC_OPENAI_API_KEY: "unsafe" }]) assert.deepEqual(textAvailability(env), { available: false });
  assert.ok(parseTextConfig({ ...base, OWNED_SOURCE_TEXT_ENABLED: "true" }));
});
test("10D mutations reject missing/foreign/expired visitor and untrusted model/settings/body", async () => {
  const f = fixture();
  for (const headers of [{ cookie: "" }, { cookie: "td-visitor=forged" }, { cookie: visitorCookie(createVisitor(config, Date.now() - 3600_000), config, Date.now()).split(";", 1)[0] }]) {
    assert.equal((await f.handlers.start(f.request("", { sourceId: f.row.id, requestId: randomUUID() }, headers))).status, 401);
  }
  assert.equal((await f.handlers.start(f.request("", {}, { origin: "http://evil.example" }))).status, 403);
  for (const input of [[], null, { sourceId: "bad", requestId: randomUUID() }, { sourceId: f.row.id, requestId: randomUUID(), model: "other" },
    { sourceId: f.row.id, requestId: randomUUID(), sourceText: "override" }, { sourceId: f.row.id, requestId: randomUUID(), session: {} }]) {
    const r = await f.handlers.start(f.request("", input)); assert.equal(r.status, 400); assert.equal(r.headers.get("cache-control"), "no-store");
  }
  const foreign = createVisitor(config, Date.now());
  assert.equal((await f.handlers.start(f.request("", { sourceId: f.row.id, requestId: randomUUID() }, { cookie: visitorCookie(foreign, config, Date.now()).split(";", 1)[0] }))).status, 404);
  assert.equal(f.counts.opens, 0); assert.equal(f.registry.size, 0);
});
test("10D foreign session/stream and replayed Start cannot gain authority", async () => {
  const f = fixture(), s = await f.begin(), foreign = createVisitor(config, Date.now());
  await assert.rejects(f.registry.stream(foreign, s.id, new AbortController().signal), (e: unknown) => e instanceof RelayError && e.status === 404);
  await assert.rejects(f.registry.question(foreign, s.id, randomUUID(), "x", new AbortController().signal));
  f.registry.stop(foreign, f.startId); assert.equal(f.registry.size, 1);
  await assert.rejects(f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal));
  f.registry.stop(f.visitor, f.startId); await s.consume;
  await assert.rejects(f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal));
});
test("10D one pending question and duplicate ID produce no extra generation", async () => {
  const f = fixture(), s = await f.begin(); await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
  const id = randomUUID();
  const first = f.registry.question(f.visitor, s.id, id, "x", new AbortController().signal);
  await assert.rejects(f.registry.question(f.visitor, s.id, randomUUID(), "second", new AbortController().signal));
  await first; await wait(() => s.snapshots.at(-1)?.transcript.turns.length === 2);
  await assert.rejects(f.registry.question(f.visitor, s.id, id, "replayed", new AbortController().signal));
  f.registry.stop(f.visitor, f.startId); await s.consume; assert.equal(f.counts.closes, 1);
});
for (const stage of ["initial", "preparation", "acquisition", "question"] as const) test(`10D replacement/removal cancels ${stage} and late work`, async () => {
  const f = fixture();
  let resolve!: (v: typeof f.row | null) => void;
  if (stage === "initial") f.read(() => new Promise(r => { resolve = r; }));
  let acquired!: (v: TextConnection) => void;
  if (stage === "acquisition") f.acquire(() => new Promise(r => { acquired = r; }));
  if (stage === "initial") {
    const pending = f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal);
    sourceChanged(f.visitor.owner); resolve(f.row); await assert.rejects(pending); assert.equal(f.counts.opens, 0);
  } else {
    if (stage === "preparation") { let n = 0; f.read(async () => { if (++n > 2) return new Promise(r => { resolve = r; }); return f.row; }); }
    const s = await f.begin();
    if (stage === "acquisition") await wait(() => !!acquired);
    else if (stage === "preparation") await wait(() => !!resolve);
    else { await wait(() => s.snapshots.at(-1)?.status.phase === "ready"); f.read(() => new Promise(r => { resolve = r; })); }
    const q = stage === "question" ? f.registry.question(f.visitor, s.id, randomUUID(), "x", new AbortController().signal) : undefined;
    // Attach rejection before invalidation to avoid an unhandled test promise.
    const rejected = q ? assert.rejects(q) : undefined;
    sourceChanged(f.visitor.owner);
    if (resolve) resolve(f.row);
    if (acquired) acquired({ transport: scriptedFullSource("PDF"), close: () => { f.counts.closes++; } });
    await rejected; await s.consume; await delay(15);
    assert.equal(f.counts.closes, f.counts.opens); assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  }
  assert.equal(f.registry.size, 0);
});
for (const reason of ["attach", "idle", "absolute", "source-expiry", "disconnect", "slow-consumer", "question-limit", "context"] as const) test(`10D resource cleanup: ${reason}`, async () => {
  const limits = reason === "attach" ? { attachMs: 30 } : reason === "idle" ? { idleMs: 45 } : reason === "absolute" ? { lifetimeMs: 45 }
    : reason === "slow-consumer" ? { backlogBytes: 400 } : reason === "question-limit" ? { questions: 1 } : {};
  const f = fixture("PDF", limits, reason === "context" ? "error" : "success");
  if (reason === "source-expiry") f.setRow({ ...f.row, expiresAt: new Date(Date.now() + 65) });
  if (reason === "attach") { await f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal); }
  else if (reason === "slow-consumer") {
    const id = await f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal);
    await f.registry.stream(f.visitor, id, new AbortController().signal);
  } else {
    const s = await f.begin();
    if (reason === "disconnect") s.abort.abort();
    if (reason === "question-limit") {
      await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
      await f.registry.question(f.visitor, s.id, randomUUID(), "x", new AbortController().signal);
      await wait(() => s.snapshots.at(-1)?.transcript.turns.length === 2);
      await assert.rejects(f.registry.question(f.visitor, s.id, randomUUID(), "x", new AbortController().signal));
    }
    await s.consume;
  }
  await wait(() => f.registry.size === 0); assert.equal(f.counts.closes, f.counts.opens);
});
test("10D body byte cap, slow body deadline, gate/key off contact zero", async () => {
  const f = fixture();
  assert.equal((await f.handlers.question(f.request("/question", { question: "x".repeat(9000) }))).status, 400);
  const handler = createTextHandlers({ config: () => null, registry: f.registry });
  for (const method of [handler.start, handler.question, handler.stop]) {
    const r = await method(f.request()); assert.equal(r.status, 503); assert.equal(r.headers.get("cache-control"), "no-store");
  }
  const r = await f.handlers.start(new Request(config.origin, { method: "POST", headers: { origin: config.origin,
    cookie: visitorCookie(f.visitor, config, Date.now()).split(";", 1)[0], "content-type": "application/json" },
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("{")); } }), duplex: "half" } as RequestInit));
  assert.equal(r.status, 400); assert.equal(f.counts.opens, 0);
});
test("10D server socket auth/settings, bounded writes, once-only listener cleanup", async () => {
  const sockets: (EventEmitter & TextSocket)[] = []; let captured: unknown;
  class Fake extends EventEmitter {
    readyState = 1; bufferedAmount = 0; closes = 0;
    constructor(url: string, options: unknown) { super(); captured = { url, options }; sockets.push(this); queueMicrotask(() => this.emit("open")); }
    send(_raw: string, callback: (e?: Error) => void) { callback(); }
    terminate() { this.closes++; queueMicrotask(() => this.emit("close")); }
  }
  const abort = new AbortController();
  const c = await openTextSocket(config.apiKey, "owner", abort.signal, Fake as unknown as TextSocketConstructor);
  assert.ok(JSON.stringify(captured).includes("gpt-realtime-2.1-mini"));
  const remove = c.transport.subscribe(() => {}, () => {});
  await c.transport.send("{}"); remove(); c.close(); c.close(); await delay(0);
  assert.equal((sockets[0] as Fake).closes, 1); assert.equal(sockets[0].eventNames().length, 0);
  assert.equal(getEventListeners(abort.signal, "abort").length, 0);
});
test("10D concurrent cap and abandoned Start consume bounded admission before provider work", async () => {
  const f = fixture("PDF", { concurrent: 1 });
  const id = await f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal);
  assert.ok(id);
  const foreign = createVisitor(config, Date.now());
  await assert.rejects(f.registry.start(foreign, f.row.id, randomUUID(), new AbortController().signal), (e: unknown) => e instanceof RelayError && e.status === 429);
  assert.equal(f.counts.opens, 0); assert.equal(f.counts.reads, 1);
  f.registry.stop(f.visitor, f.startId); assert.equal(f.registry.size, 0);
});
test("10D visitor Start rate and process admission lifetime survive cleanup", async () => {
  const f = fixture();
  for (let n = 0; n < 3; n++) { const requestId = randomUUID(); await f.registry.start(f.visitor, f.row.id, requestId, new AbortController().signal); f.registry.stop(f.visitor, requestId); }
  const before = f.counts.reads;
  await assert.rejects(f.registry.start(f.visitor, f.row.id, randomUUID(), new AbortController().signal), (e: unknown) => e instanceof RelayError && e.status === 429);
  assert.equal(f.counts.reads, before); assert.equal(f.counts.opens, 0); assert.equal(f.registry.resources.replayEntries, 3);
});
test("10D duplicate stream subscription is refused; cancelled body releases session", async () => {
  const f = fixture();
  const id = await f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal);
  const stream = await f.registry.stream(f.visitor, id, new AbortController().signal);
  await assert.rejects(f.registry.stream(f.visitor, id, new AbortController().signal), (e: unknown) => e instanceof RelayError && e.status === 409);
  await stream.cancel(); await delay(10); assert.equal(f.registry.size, 0); assert.equal(f.counts.closes, f.counts.opens);
});
test("10D default twenty question limit closes instead of shortening history", async () => {
  const f = fixture(), s = await f.begin(); await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
  for (let n = 0; n < 20; n++) {
    await f.registry.question(f.visitor, s.id, randomUUID(), `Question ${n}`, new AbortController().signal);
    await wait(() => s.snapshots.at(-1)?.status.phase === "ready" && s.snapshots.at(-1)?.transcript.turns.length === (n + 1) * 2);
  }
  await assert.rejects(f.registry.question(f.visitor, s.id, randomUUID(), "twenty-one", new AbortController().signal), (e: unknown) => e instanceof RelayError && e.status === 429);
  await s.consume; assert.equal(s.snapshots.at(-1)?.transcript.turns.length, 40); assert.equal(f.counts.closes, 1);
});
test("10D Stop tombstone wins even if a Start command arrives later", async () => {
  const f = fixture(); f.registry.stop(f.visitor, f.startId);
  await assert.rejects(f.registry.start(f.visitor, f.row.id, f.startId, new AbortController().signal));
  assert.equal(f.counts.reads, 0); assert.equal(f.counts.opens, 0);
});
test("10D actual repository replacement invalidates only after commit; rollback preserves active session", async () => {
  const visitor = createVisitor(config, Date.now()), database = new SyntheticSourceDatabase();
  const repository = createSourceRepository(() => database.asClient()), original = uploadedRecord(pdfFixture, visitor);
  await repository.replace(original, () => {});
  let closes = 0;
  const registry = new TextRegistry({ repository, connect: async () => { const transport = scriptedFullSource("PDF");
    return { transport: { ...transport, send: raw => JSON.parse(raw).type === "response.create" ? undefined : transport.send(raw) }, close: () => { closes++; transport.close(); } }; } });
  registries.push(registry);
  const requestId = randomUUID(), id = await registry.start(visitor, original.id, requestId, new AbortController().signal);
  const reader = (await registry.stream(visitor, id, new AbortController().signal)).getReader();
  const snapshots: TextRelaySnapshot[] = [];
  const consuming = (async () => { for (;;) { const r = await reader.read(); if (r.done) break; for (const line of new TextDecoder().decode(r.value).trimEnd().split("\n")) snapshots.push(JSON.parse(line)); } })();
  await wait(() => snapshots.at(-1)?.status.phase === "ready");
  database.failCreate = true;
  await assert.rejects(repository.replace(captionRecord(captionFixture, visitor), () => {}));
  assert.equal(registry.size, 1); assert.equal(closes, 0);
  await registry.question(visitor, id, randomUUID(), "Pending answer", new AbortController().signal);
  await repository.replace(captionRecord(captionFixture, visitor), () => {});
  await consuming;
  assert.equal(registry.size, 0); assert.equal(closes, 1); assert.equal(snapshots.at(-1)?.status.failure, "preparation");
  assert.equal((await repository.get(original.id, visitor.owner, new Date())), null);
});
