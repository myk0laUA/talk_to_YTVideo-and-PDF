import assert from "node:assert/strict";
import { test } from "node:test";
import { TextProofController, initialTextState, type TextState, type TextSocket, type TextDependencies } from "../../src/app/proof/text/text-controller.ts";
import { textProofAvailable } from "../../src/server/proof/availability.ts";
const source = { id: "00000000-0000-4000-8000-000000000001", title: "Synthetic", text: "Seven windows. Rowan.", expiresAt: new Date(Date.now() + 3600000).toISOString() };
const session = { type: "session.created", session: { id: "sess_test", type: "realtime", model: "gpt-realtime", output_modalities: ["text"], audio: { input: { turn_detection: null } }, max_output_tokens: 256 } };
const done = (rid = "resp_1", status = "completed") => ({ type: "response.done", response: { id: rid, status, output: [{ id: "item_1", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Seven windows." }] }] } });
class Socket implements TextSocket {
  readyState = 0; onopen: WebSocket["onopen"] = null; onmessage: WebSocket["onmessage"] = null; onclose: WebSocket["onclose"] = null; onerror: WebSocket["onerror"] = null;
  sent: unknown[] = []; closed = 0;
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.closed++; this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.call(this as unknown as WebSocket, {} as Event); }
  event(value: unknown) { this.onmessage?.call(this as unknown as WebSocket, { data: JSON.stringify(value) } as MessageEvent); }
}
function setup(options: Partial<TextDependencies> = {}) {
  let state: TextState = initialTextState; const sockets: Socket[] = []; const calls: { path: string; body: unknown; signal?: AbortSignal | null }[] = [];
  const controller = new TextProofController({ fetch: async (path, init) => { calls.push({ path: String(path), body: JSON.parse(init!.body as string), signal: init?.signal }); return Response.json(String(path).includes("proof-source") ? source : { clientSecret: "ek_synthetic", expiresAt: Math.floor(Date.now() / 1000) + 60, model: "gpt-realtime" }); }, socket: (url, protocols) => { assert.equal(url, "wss://api.openai.com/v1/realtime?model=gpt-realtime"); assert.equal(protocols.length, 2); assert.ok(protocols[1] === "openai-insecure-api-key.ek_synthetic"); const s = new Socket(); sockets.push(s); return s; }, ...options }, value => { state = value; });
  return { controller, sockets, calls, state: () => state, async ready() { await controller.start(); const s = sockets.at(-1)!; s.open(); s.event(session); return s; } };
}
const delay = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));

test("text availability requires its separate opt-in", () => { assert.equal(textProofAvailable({}), false); assert.equal(textProofAvailable({ PROOF_ENABLED: "true" }), false); });
test("text sends exact events once, validates, reconciles finals and accepts explicit follow-up", async () => {
  const h = setup(); const s = await h.ready();
  assert.equal(h.calls.length, 2); assert.deepEqual(h.calls[1].body, { sourceId: source.id, mode: "text" });
  assert.equal(h.controller.send(" "), false); assert.match(h.state().validation, /1–1000/);
  assert.equal(h.controller.send("x".repeat(1001)), false); assert.equal(s.sent.length, 0);
  assert.equal(h.controller.send("How many?"), true); assert.equal(h.controller.send("duplicate"), false);
  assert.deepEqual(s.sent, [{ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: "How many?" }] } }, { type: "response.create", response: { output_modalities: ["text"] } }]);
  s.event({ type: "response.created", response: { id: "resp_1" } });
  const part = { response_id: "resp_1", item_id: "item_1", content_index: 0, output_index: 0 };
  s.event({ type: "response.output_text.delta", ...part, delta: "Se" }); assert.equal(h.state().lines[0].text, "Se");
  s.event({ type: "response.output_text.done", ...part, text: "Seven" });
  s.event({ type: "response.output_text.delta", ...part, delta: "duplicate" }); assert.equal(h.state().lines[0].text, "Seven");
  s.event(done()); assert.equal(h.state().lines[0].text, "Seven windows."); assert.equal(h.state().lines[0].status, "complete");
  assert.equal(h.controller.send("Who?"), true); s.event(done()); assert.equal(h.state().phase, "waiting");
  s.event({ type: "response.created", response: { id: "resp_2" } }); s.event(done("resp_2")); assert.equal(h.state().lines.length, 2);
  h.controller.dispose(); assert.equal(s.closed, 1);
});
test("socket open alone is not ready; invalid config fails safely", async () => {
  const h = setup(); await h.controller.start(); h.sockets[0].open(); assert.equal(h.state().phase, "connecting");
  h.sockets[0].event({ ...session, session: { ...session.session, output_modalities: ["audio"] } }); assert.equal(h.state().phase, "error"); h.controller.dispose();
});
test("double Start, Stop, retry and captured old callbacks never revive old attempt", async () => {
  const h = setup(); await Promise.all([h.controller.start(), h.controller.start()]); const old = h.sockets[0]; const open = old.onopen; const message = old.onmessage; const close = old.onclose;
  h.controller.stop(); h.controller.stop(); assert.equal(old.closed, 1); assert.equal(old.onmessage, null);
  await h.ready(); open?.call(old as unknown as WebSocket, {} as Event); message?.call(old as unknown as WebSocket, { data: JSON.stringify(session) } as MessageEvent); close?.call(old as unknown as WebSocket, {} as CloseEvent);
  assert.equal(h.state().phase, "ready"); assert.equal(h.sockets.length, 2); h.controller.dispose();
});
for (const stage of ["source", "mint"] as const) test(`Stop cancels ${stage} wait and late result`, async () => {
  let resolve!: (value: Response) => void; let signal: AbortSignal | null | undefined;
  const h = setup({ fetch: async (path, init) => { signal = init?.signal; if (stage === "mint" && String(path).includes("proof-source")) return Response.json(source); return new Promise<Response>(r => { resolve = r; }); } });
  const pending = h.controller.start(); await delay(); h.controller.stop(); await pending; assert.equal(signal?.aborted, true);
  resolve(Response.json({ clientSecret: "ek_late", expiresAt: 0 })); await delay(); assert.equal(h.sockets.length, 0); assert.equal(h.state().phase, "ended"); h.controller.dispose();
});
for (const status of [401, 403, 404, 429, 503]) test(`HTTP ${status} safe failure without socket or retry`, async () => {
  let count = 0; const h = setup({ fetch: async () => { count++; return Response.json({ error: "sensitive" }, { status }); } }); await h.controller.start(); assert.equal(h.state().phase, "error"); assert.ok(!h.state().message.includes("sensitive")); assert.equal(count, 1); assert.equal(h.sockets.length, 0); h.controller.dispose();
});
for (const status of ["failed", "incomplete", "cancelled"]) test(`${status} response never completes`, async () => {
  const h = setup(); const s = await h.ready(); h.controller.send("Q"); s.event({ type: "response.created", response: { id: "resp_1" } }); s.event({ type: "response.output_text.delta", response_id: "resp_1", item_id: "item_1", output_index: 0, content_index: 0, delta: "Partial" }); s.event(done("resp_1", status)); assert.equal(h.state().phase, "error"); assert.equal(h.state().lines[0].status, "incomplete"); h.controller.dispose();
});
for (const kind of ["startup", "session", "response"] as const) test(`${kind} deadline releases socket`, async () => {
  const h = setup({ startupMs: kind === "startup" ? 5 : 25000, sessionMs: kind === "session" ? 5 : 60000, responseMs: 5 });
  if (kind === "startup") await h.controller.start(); else { await h.ready(); if (kind === "response") h.controller.send("Q"); }
  await delay(25); assert.ok(["error", "ended"].includes(h.state().phase)); assert.equal(h.sockets[0].closed, 1); h.controller.dispose();
});
test("expired credentials never reach socket", async () => { const h = setup({ fetch: async path => Response.json(String(path).includes("proof-source") ? source : { clientSecret: "ek_expired", expiresAt: 1, model: "gpt-realtime" }) }); await h.controller.start(); assert.equal(h.sockets.length, 0); assert.match(h.state().message, /expired/); h.controller.dispose(); });
for (const event of [{ type: "error", error: { message: "secret" } }, {}, { type: "unknown", value: "x".repeat(64000) }]) test("malformed/error/oversized events are safe", async () => { const h = setup(); const s = await h.ready(); s.event(event); assert.equal(h.state().phase, "error"); assert.ok(!h.state().message.includes("secret")); h.controller.dispose(); });
test("Stop while answering and dispose clear listeners and ignore late answers", async () => { const h = setup(); const s = await h.ready(); h.controller.send("Q"); const callback = s.onmessage; h.controller.dispose(); callback?.call(s as unknown as WebSocket, { data: JSON.stringify(done()) } as MessageEvent); assert.equal(s.closed, 1); assert.equal(s.onmessage, null); await h.controller.start(); assert.equal(h.sockets.length, 1); });

for (const status of [401, 403, 404, 429, 503]) test(`mint HTTP ${status} never constructs socket`, async () => {
  const h = setup({ fetch: async path => String(path).includes("proof-source") ? Response.json(source) : Response.json({ error: "sensitive" }, { status }) }); await h.controller.start(); assert.equal(h.state().phase, "error"); assert.equal(h.sockets.length, 0); h.controller.dispose();
});
test("socket constructor failure clears the parsed credential reference", async () => {
  const dto = { clientSecret: "ek_synthetic", expiresAt: Math.floor(Date.now() / 1000) + 60, model: "gpt-realtime" };
  const h = setup({ fetch: async path => ({ ok: true, json: async () => String(path).includes("proof-source") ? source : dto }) as Response, socket: () => { throw new Error("sensitive handshake"); } });
  await h.controller.start(); assert.equal(dto.clientSecret, undefined); assert.equal(h.state().phase, "error"); assert.ok(!h.state().message.includes("handshake")); h.controller.dispose();
});
test("received text and event retention are bounded", async () => {
  const h = setup(); const s = await h.ready(); h.controller.send("Q"); s.event({ type: "response.created", response: { id: "resp_1" } });
  s.event({ type: "response.output_text.delta", response_id: "resp_1", item_id: "item_1", output_index: 0, content_index: 0, delta: "x".repeat(8001) }); assert.equal(h.state().phase, "error"); assert.equal(h.state().lines.length, 0); h.controller.dispose();
  const next = setup(); const socket = await next.ready(); for (let i = 0; i < 2001; i++) socket.event({ type: "ignored" }); assert.equal(next.state().phase, "error"); next.controller.dispose();
});
test("response identity and multiple content parts reconcile independently", async () => {
  const h = setup(); const s = await h.ready(); h.controller.send("Q"); s.event({ type: "response.created", response: { id: "resp_1" } });
  const part = { type: "response.output_text.delta", item_id: "item_1", output_index: 0, content_index: 0, delta: "Seven" };
  s.event({ ...part, response_id: "other" }); assert.equal(h.state().lines.length, 0);
  s.event({ ...part, response_id: "resp_1" }); s.event({ ...part, response_id: "resp_1", content_index: 1, delta: "Rowan" }); assert.equal(h.state().lines[0].text, "Seven\nRowan"); h.controller.stop(); assert.equal(h.state().lines[0].status, "incomplete");
});
