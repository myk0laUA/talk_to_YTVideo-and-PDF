import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProofConfig, type ProofConfig } from "../../src/server/proof/config.ts";
import { createVisitor, readVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { Admission, issuanceLimits } from "../../src/server/proof/admission.ts";
import { createProofHandlers } from "../../src/server/proof/handlers.ts";
import { createMint, type Mint, type MintInput } from "../../src/server/proof/provider.ts";
import { proofId, PROOF_TEXT, PROOF_TITLE, PROOF_PROVIDER, type ProofRecord, type ProofStore } from "../../src/server/proof/source.ts";

const epoch = 1792300000000;
const config: ProofConfig = { origin: "https://example.test", secure: true, cookieSecret: "a1".repeat(32),
  issuanceEnabled: true, apiKey: "mock-permanent-key", model: "gpt-realtime" };
const request = (body: unknown = {}, cookie?: string, headers: Record<string, string> = {}) => new Request(`${config.origin}/api/test`, {
  method: "POST", headers: { origin: config.origin, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(body),
});

// Explicit in-memory database mock; this does not verify Prisma/PostgreSQL behavior.
function harness(mintOverride?: Mint) {
  let time = epoch; let currentConfig: ProofConfig | null = { ...config }; let reads = 0;
  const rows = new Map<string, ProofRecord>(); const calls: MintInput[] = [];
  const store: ProofStore = {
    async get(id) { reads++; return rows.get(id) ?? null; },
    async createOnce(row) { if (!rows.has(row.id)) rows.set(row.id, row); return rows.get(row.id)!; },
  };
  const handlers = createProofHandlers({ config: () => currentConfig, store, now: () => time,
    mint: async input => { calls.push(input); return mintOverride ? mintOverride(input) : { clientSecret: "ek_mock", expiresAt: Math.floor(time / 1000) + 60 }; } });
  async function establish() {
    const response = await handlers.proof(request()); assert.equal(response.status, 200);
    const dto = await response.json();
    return { dto, cookie: response.headers.get("set-cookie")!.split(";", 1)[0] };
  }
  return { handlers, rows, calls, establish, setTime: (value: number) => { time = value; },
    setConfig: (value: ProofConfig | null) => { currentConfig = value; }, reads: () => reads };
}

async function expectError(response: Response, status: number) {
  assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
  const body = await response.json(); assert.deepEqual(Object.keys(body), ["error"]);
  assert.doesNotMatch(JSON.stringify(body), /mock-permanent-key|upstream-private|ek_mock|ownerSessionHash/);
}

test("proof config is opt-in, HTTPS in production, and fails closed for missing or public secrets/model", () => {
  const env = { PROOF_ENABLED: "true", APP_ORIGIN: config.origin, VISITOR_COOKIE_SECRET: config.cookieSecret,
    REALTIME_ISSUANCE_ENABLED: "true", OPENAI_API_KEY: config.apiKey, OPENAI_REALTIME_MODEL: config.model };
  assert.equal(parseProofConfig({}), null);
  assert.deepEqual(parseProofConfig(env), config);
  for (const patch of [{ PROOF_ENABLED: "false" }, { VISITOR_COOKIE_SECRET: "weak" }, { APP_ORIGIN: "https://example.test/path" },
    { APP_ORIGIN: "http://example.test" }, { NEXT_PUBLIC_VISITOR_COOKIE_SECRET: "private" }, { NEXT_PUBLIC_OPENAI_API_KEY: "private" },
    { APP_ORIGIN: "http://localhost:3000", NODE_ENV: "production" }]) assert.equal(parseProofConfig({ ...env, ...patch }), null);
  assert.equal(parseProofConfig({ ...env, APP_ORIGIN: "http://localhost:3000" })?.secure, false);
  assert.equal(parseProofConfig({ ...env, OPENAI_REALTIME_MODEL: "" })?.model, undefined);
});

test("real cookie round-trip is signed, random, bounded, HttpOnly, Strict, host-only and Secure", () => {
  const first = createVisitor(config, epoch), second = createVisitor(config, epoch);
  assert.notEqual(first.token, second.token); assert.match(first.owner, /^[a-f0-9]{64}$/);
  assert.notEqual(first.owner, first.token); assert.equal(first.expiresAt, epoch / 1000 + 3600);
  const cookie = visitorCookie(first, config, epoch);
  assert.match(cookie, /^__Host-td-visitor=/); assert.match(cookie, /; Path=\/; HttpOnly; SameSite=Strict; Max-Age=3600; Expires=.*; Secure$/);
  assert.doesNotMatch(cookie, /Domain=/);
  const pair = cookie.split(";", 1)[0];
  assert.deepEqual(readVisitor(`other=ok; ${pair}`, config, epoch), first);
  for (const bad of [null, "", "td-visitor=" + first.token, pair + "; " + pair,
    pair.slice(0, -1) + "!", "__Host-td-visitor=%xx", "__Host-td-visitor=" + "a".repeat(9000)]) assert.equal(readVisitor(bad, config, epoch), null);
  assert.equal(readVisitor(pair, { ...config, cookieSecret: "b2".repeat(32) }, epoch), null);
  assert.equal(readVisitor(pair, config, epoch + 3600000), null);
  assert.equal(readVisitor(pair, config, epoch - 1000), null);
  const local = { ...config, secure: false };
  assert.match(visitorCookie(first, local, epoch), /^td-visitor=/);
  assert.doesNotMatch(visitorCookie(first, local, epoch), /; Secure/);
});

test("proof reuses one fixed source; two anonymous visitors are isolated; issuance DTO is minimal", async () => {
  const h = harness(); const a = await h.establish(); const b = await h.establish();
  const reused = await h.handlers.proof(request({}, a.cookie));
  assert.deepEqual(await reused.json(), a.dto); assert.equal(h.rows.size, 2);
  assert.deepEqual(Object.keys(a.dto).sort(), ["expiresAt", "id", "text", "title"]);
  assert.equal(a.dto.text, PROOF_TEXT);
  await expectError(await h.handlers.credential(request({ sourceId: a.dto.id }, b.cookie)), 404);
  assert.equal(h.calls.length, 0);
  const success = await h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie));
  assert.equal(success.status, 200); assert.equal(success.headers.get("cache-control"), "no-store");
  assert.deepEqual(await success.json(), { clientSecret: "ek_mock", expiresAt: epoch / 1000 + 60 });
  assert.equal(h.calls.length, 1); assert.match(h.calls[0].safetyIdentifier, /^[a-f0-9]{64}$/);
  assert.notEqual(h.calls[0].safetyIdentifier, h.rows.get(a.dto.id)!.ownerSessionHash);
});

test("every credential policy rejection makes zero provider calls", async t => {
  const cases: [string, number, (h: ReturnType<typeof harness>, a: Awaited<ReturnType<ReturnType<typeof harness>["establish"]>>) => Request][] = [
    ["missing cookie", 401, (_, a) => request({ sourceId: a.dto.id })],
    ["forged cookie", 401, (_, a) => request({ sourceId: a.dto.id }, a.cookie + "x")],
    ["expired cookie", 401, (h, a) => { h.setTime(epoch + 3600000); return request({ sourceId: a.dto.id }, a.cookie); }],
    ["invalid origin", 403, (_, a) => request({ sourceId: a.dto.id }, a.cookie, { origin: "https://evil.test" })],
    ["missing origin", 403, (_, a) => { const r = request({ sourceId: a.dto.id }, a.cookie); r.headers.delete("origin"); return r; }],
    ["cross-site metadata", 403, (_, a) => request({ sourceId: a.dto.id }, a.cookie, { "sec-fetch-site": "cross-site" })],
    ["malformed ID", 400, (_, a) => request({ sourceId: "bad" }, a.cookie)],
    ["owner injection", 400, (_, a) => request({ sourceId: a.dto.id, owner: "forged" }, a.cookie)],
    ["array body", 400, (_, a) => request([], a.cookie)],
    ["oversized body", 400, (_, a) => request({ sourceId: "x".repeat(257) }, a.cookie)],
    ["wrong content type", 400, (_, a) => request({ sourceId: a.dto.id }, a.cookie, { "content-type": "text/plain" })],
    ["invalid JSON", 400, (_, a) => new Request(config.origin, { method: "POST", headers: { origin: config.origin, cookie: a.cookie, "content-type": "application/json" }, body: "{" })],
    ["missing source", 404, (h, a) => { h.rows.clear(); return request({ sourceId: a.dto.id }, a.cookie); }],
    ["other owner", 404, (h, a) => { h.rows.get(a.dto.id)!.ownerSessionHash = "other"; return request({ sourceId: a.dto.id }, a.cookie); }],
    ["expired source", 404, (h, a) => { h.rows.get(a.dto.id)!.expiresAt = new Date(epoch); return request({ sourceId: a.dto.id }, a.cookie); }],
    ["pending source", 404, (h, a) => { h.rows.get(a.dto.id)!.extractionStatus = "PENDING"; return request({ sourceId: a.dto.id }, a.cookie); }],
    ["failed source", 404, (h, a) => { h.rows.get(a.dto.id)!.extractionStatus = "FAILED"; return request({ sourceId: a.dto.id }, a.cookie); }],
    ["operator fixture", 404, (h, a) => { h.rows.get(a.dto.id)!.provider = "operator"; return request({ sourceId: a.dto.id }, a.cookie); }],
    ["altered proof text", 404, (h, a) => { h.rows.get(a.dto.id)!.fullText = "arbitrary"; return request({ sourceId: a.dto.id }, a.cookie); }],
  ];
  for (const [name, status, make] of cases) await t.test(name, async () => {
    const h = harness(), a = await h.establish();
    await expectError(await h.handlers.credential(make(h, a)), status); assert.equal(h.calls.length, 0);
  });
});

test("disabled/missing config fails before database or provider access", async () => {
  for (const value of [null, { ...config, issuanceEnabled: false }, { ...config, apiKey: undefined }, { ...config, model: undefined }]) {
    const h = harness(); h.setConfig(value);
    await expectError(await h.handlers.credential(request()), 503);
    assert.equal(h.calls.length, 0); assert.equal(h.reads(), 0);
    if (!value) { await expectError(await h.handlers.proof(request()), 503); assert.equal(h.rows.size, 0); }
  }
});

test("proof rejects arbitrary input/origin and caps creation with spoofed forwarding headers", async () => {
  const h = harness();
  await expectError(await h.handlers.proof(request({ text: "user supplied" })), 400);
  await expectError(await h.handlers.proof(request({}, undefined, { origin: "null" })), 403);
  assert.equal(h.rows.size, 0);
  for (let i = 0; i < 20; i++) assert.equal((await h.handlers.proof(request({}, undefined, { "x-forwarded-for": `192.0.2.${i}` }))).status, 200);
  await expectError(await h.handlers.proof(request()), 429); assert.equal(h.rows.size, 20); assert.equal(h.calls.length, 0);
});

test("handler issuance visitor and shared-IP limits reject before provider and DB", async () => {
  const h = harness(), a = await h.establish();
  for (let i = 0; i < 3; i++) assert.equal((await h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie))).status, 200);
  await expectError(await h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie)), 429);
  assert.equal(h.calls.length, 3); assert.equal(h.reads(), 3);
  for (let i = 0; i < 7; i++) { const v = await h.establish(); assert.equal((await h.handlers.credential(request({ sourceId: v.dto.id }, v.cookie, { "x-forwarded-for": `192.0.2.${i}` }))).status, 200); }
  const b = await h.establish(); await expectError(await h.handlers.credential(request({ sourceId: b.dto.id }, b.cookie)), 429);
  assert.equal(h.calls.length, 10); assert.equal(h.reads(), 10);
});

test("admission bounds global, IP, visitor, lifetime, window and concurrency independently", () => {
  const gate = new Admission(issuanceLimits);
  const a = gate.acquire("a", "ip-a", epoch)!; assert.ok(a);
  assert.equal(gate.acquire("a", "ip-a", epoch), null);
  const b = gate.acquire("b", "ip-b", epoch)!; assert.ok(b);
  assert.equal(gate.acquire("c", "ip-c", epoch), null); a(); b();
  for (let i = 2; i < 20; i++) { const release = gate.acquire(String(i), String(i), epoch); assert.ok(release); release(); }
  assert.equal(gate.acquire("next", "next", epoch), null);
  for (let i = 0; i < 20; i++) { const release = gate.acquire(String(i), String(i), epoch + 3600000); assert.ok(release); release(); }
  for (let i = 0; i < 10; i++) { const release = gate.acquire(String(i), String(i), epoch + 7200000); assert.ok(release); release(); }
  assert.equal(gate.acquire("next", "next", epoch + 10800000), null);
});

test("concurrent issuance is bounded; failure releases slots but consumes attempts", async () => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const h = harness(async () => { await pending; throw new Error("upstream-private"); });
  const a = await h.establish(), b = await h.establish(), c = await h.establish();
  const one = h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie));
  const two = h.handlers.credential(request({ sourceId: b.dto.id }, b.cookie));
  await new Promise(resolve => setImmediate(resolve));
  await expectError(await h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie)), 429);
  await expectError(await h.handlers.credential(request({ sourceId: c.dto.id }, c.cookie)), 429);
  assert.equal(h.calls.length, 2); finish();
  await expectError(await one, 503); await expectError(await two, 503);
  await expectError(await h.handlers.credential(request({ sourceId: c.dto.id }, c.cookie)), 503); assert.equal(h.calls.length, 3);
});

test("source expiry during database await prevents provider invocation", async () => {
  let time = epoch; const visitor = createVisitor(config, time);
  let calls = 0;
  const h = createProofHandlers({ config: () => config, now: () => time,
    store: { async createOnce(row) { return row; }, async get() { time += 3600000; return {
      id: proofId(visitor.owner), ownerSessionHash: visitor.owner, title: PROOF_TITLE, fullText: PROOF_TEXT,
      provider: PROOF_PROVIDER, extractionStatus: "READY", expiresAt: new Date(visitor.expiresAt * 1000),
    }; } },
    mint: async () => { calls++; throw new Error("unexpected"); } });
  await expectError(await h.credential(request({ sourceId: proofId(visitor.owner) }, visitorCookie(visitor, config, epoch).split(";", 1)[0])), 404);
  assert.equal(calls, 0);
});

test("proof creation concurrency is bounded and deterministic identity survives handler restart", async () => {
  const visitor = createVisitor(config, epoch), cookie = visitorCookie(visitor, config, epoch).split(";", 1)[0];
  const rows = new Map<string, ProofRecord>(); let creates = 0; let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const store: ProofStore = { async get(id) { return rows.get(id) ?? null; }, async createOnce(row) {
    creates++; await pending; if (!rows.has(row.id)) rows.set(row.id, row); return rows.get(row.id)!;
  } };
  const deps = { config: () => config, store, now: () => epoch, mint: async () => { throw new Error("unexpected"); } };
  const h = createProofHandlers(deps);
  const first = h.proof(request({}, cookie)); await new Promise(resolve => setImmediate(resolve));
  await expectError(await h.proof(request({}, cookie)), 429); assert.equal(creates, 1);
  finish(); const dto = await (await first).json();
  const restarted = createProofHandlers(deps);
  assert.deepEqual(await (await restarted.proof(request({}, cookie))).json(), dto); assert.equal(rows.size, 1);
});

test("database failures and provider timeout stay generic with no-store; expired late issuance is withheld", async () => {
  const h = harness(createMint(async () => new Promise<Response>(() => {}), () => epoch, 10));
  const a = await h.establish();
  await expectError(await h.handlers.credential(request({ sourceId: a.dto.id }, a.cookie)), 503);
  assert.equal(h.calls.length, 1);
  const failing = createProofHandlers({ config: () => config, now: () => epoch,
    store: { async get() { throw new Error("upstream-private"); }, async createOnce() { throw new Error("upstream-private"); } },
    mint: async () => { throw new Error("must not run"); } });
  await expectError(await failing.proof(request()), 503);
  await expectError(await failing.credential(request({ sourceId: a.dto.id }, a.cookie)), 503);
  const late = harness(async () => { late.setTime(epoch + 3600000); return { clientSecret: "ek_mock", expiresAt: epoch / 1000 + 3660 }; });
  const b = await late.establish();
  await expectError(await late.handlers.credential(request({ sourceId: b.dto.id }, b.cookie)), 404);
});

test("mock HTTP provider uses verified contract, 60-second TTL, safety header, no retry and minimal response", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++; assert.equal(url, "https://api.openai.com/v1/realtime/client_secrets");
    assert.equal(init?.method, "POST"); assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
    const headers = new Headers(init?.headers); assert.equal(headers.get("authorization"), "Bearer mock-permanent-key");
    assert.equal(headers.get("OpenAI-Safety-Identifier"), "mock-hashed-visitor");
    const body = JSON.parse(init?.body as string);
    assert.deepEqual(body.expires_after, { anchor: "created_at", seconds: 60 });
    assert.equal(body.session.type, "realtime"); assert.equal(body.session.model, "configured-model");
    assert.equal(body.session.max_output_tokens, 256); assert.ok(body.session.instructions.includes(PROOF_TEXT));
    assert.deepEqual(body.session.output_modalities, ["audio"]);
    assert.deepEqual(body.session.audio, { input: { transcription: { model: "gpt-4o-mini-transcribe" },
      turn_detection: { type: "server_vad", create_response: true, interrupt_response: true } }, output: { voice: "marin" } });
    return Response.json({ value: "ek_mock", expires_at: epoch / 1000 + 60, session: { private: "not returned" }, unexpected: "not returned" });
  };
  const result = await createMint(transport, () => epoch)({ apiKey: "mock-permanent-key", model: "configured-model", safetyIdentifier: "mock-hashed-visitor" });
  assert.deepEqual(result, { clientSecret: "ek_mock", expiresAt: epoch / 1000 + 60 }); assert.equal(calls, 1);
});

test("mock HTTP upstream errors, malformed response, long TTL and timeout are redacted without retry", async () => {
  for (const transport of [
    async () => new Response("upstream-private", { status: 429 }),
    async () => { throw new Error("upstream-private"); },
    async () => new Response("not json"),
    async () => Response.json({ value: "permanent-key", expires_at: epoch / 1000 + 60 }),
    async () => Response.json({ value: "ek_mock", expires_at: epoch / 1000 }),
    async () => Response.json({ value: "ek_mock", expires_at: epoch / 1000 + 600 }),
  ]) {
    let calls = 0;
    const mint = createMint(async () => { calls++; return transport(); }, () => epoch);
    await assert.rejects(mint({ apiKey: "mock", model: "mock", safetyIdentifier: "mock" }), { message: "Provider unavailable" }); assert.equal(calls, 1);
  }
  let signal: AbortSignal | null | undefined;
  const mint = createMint(async (_, init) => { signal = init?.signal; return new Promise<Response>(() => {}); }, () => epoch, 10);
  await assert.rejects(mint({ apiKey: "mock", model: "mock", safetyIdentifier: "mock" }), { message: "Provider unavailable" });
  assert.equal(signal?.aborted, true);
});
