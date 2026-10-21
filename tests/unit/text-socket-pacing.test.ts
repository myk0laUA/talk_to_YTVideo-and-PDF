import assert from "node:assert/strict";
import { EventEmitter, getEventListeners } from "node:events";
import { test } from "node:test";
import { openTextSocket, TEXT_SEND_LIMITS } from "../../src/server/text/socket.ts";
import { TextLifecycle } from "../../src/shared/text-lifecycle.ts";
import { FakeClock } from "../priming/harness.ts";
import { manySections } from "../priming/many-sections.ts";

class DelayedSocket extends EventEmitter {
  static instances: DelayedSocket[] = [];
  readyState = 1; bufferedAmount = 0; peak = 0; closes = 0;
  writes: string[] = []; pending: { bytes: number; done: (error?: Error) => void }[] = [];
  constructor() { super(); DelayedSocket.instances.push(this); queueMicrotask(() => this.emit("open")); }
  send(raw: string, done: (error?: Error) => void) {
    assert.equal(this.readyState, 1); this.writes.push(raw);
    const bytes = Buffer.byteLength(raw); this.bufferedAmount += bytes; this.peak = Math.max(this.peak, this.bufferedAmount);
    this.pending.push({ bytes, done });
  }
  drain(error?: Error) { const p = this.pending.shift(); assert.ok(p); this.bufferedAmount -= p.bytes; p.done(error); }
  terminate() { this.closes++; this.readyState = 3; queueMicrotask(() => this.emit("close")); }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function connected() {
  const abort = new AbortController();
  const connection = await openTextSocket("synthetic-key", "synthetic-owner", abort.signal, DelayedSocket);
  return { connection, abort, socket: DelayedSocket.instances.at(-1)! };
}

test("03D many-section native delivery stays bounded and preserves every ordered write", async () => {
  const { connection, socket, abort } = await connected();
  const m = manySections().manifest; assert.ok(m.bytes > 300_000);
  const expected = m.items.map(e => JSON.stringify(e));
  const results = expected.map(raw => Promise.resolve(connection.transport.send(raw)));
  // Attach rejection observers before checking the deliberately failing pre-fix case.
  const all = Promise.allSettled(results);
  try {
    assert.equal(socket.closes, 0, "admitted source burst must not terminate transport");
    assert.equal(socket.pending.length, 1, "one native write in flight");
    while (socket.pending.length) { socket.drain(); await flush(); }
    assert.ok((await all).every(r => r.status === "fulfilled"));
    assert.deepEqual(socket.writes, expected); assert.ok(socket.peak <= 16_384);
  } finally {
    connection.close(); while (socket.pending.length) socket.drain(); await all; await flush();
  }
  assert.equal(getEventListeners(abort.signal, "abort").length, 0); assert.equal(socket.eventNames().length, 0);
});

for (const action of ["close", "abort", "error", "remote-close", "failed-write"] as const) {
  test(`03D ${action} settles every pending promise; late callbacks cannot flush`, async () => {
    const { connection, socket, abort } = await connected();
    const results = Array.from({ length: 20 }, () => Promise.resolve(connection.transport.send("{}")));
    const all = Promise.allSettled(results);
    const late = socket.pending[0].done;
    if (action === "close") connection.close();
    if (action === "abort") abort.abort();
    if (action === "error") socket.emit("error", new Error("synthetic"));
    if (action === "remote-close") socket.emit("close");
    if (action === "failed-write") socket.drain(new Error("synthetic"));
    assert.ok((await all).every(r => r.status === "rejected"));
    late(); late(new Error("late")); await flush();
    assert.equal(socket.writes.length, 1); assert.equal(socket.closes, 1);
    assert.equal(socket.eventNames().length, 0); assert.equal(getEventListeners(abort.signal, "abort").length, 0);
    // A replacement owns a separate queue. Old callbacks cannot drain it.
    const replacement = await connected();
    const next = Promise.resolve(replacement.connection.transport.send("next"));
    late(); assert.equal(replacement.socket.pending.length, 1);
    replacement.socket.drain(); await next; replacement.connection.close(); await flush();
  });
}

for (const bound of ["frame", "bytes", "commands", "native"] as const) {
  test(`03D ${bound} bound fails closed and settles the entire queue`, async () => {
    const { connection, socket } = await connected();
    const results: Promise<void>[] = [];
    if (bound === "native") socket.bufferedAmount = TEXT_SEND_LIMITS.nativeBytes + 1;
    const count = bound === "commands" ? TEXT_SEND_LIMITS.commands + 1 : bound === "bytes" ? 126 : 1;
    const raw = bound === "frame" ? "x".repeat(64_001) : bound === "bytes" ? "x".repeat(64_000) : "{}";
    for (let i = 0; i < count; i++) results.push(Promise.resolve(connection.transport.send(raw)));
    const settled = await Promise.allSettled(results); await flush();
    assert.ok(settled.every(r => r.status === "rejected")); assert.equal(socket.closes, 1);
    assert.ok(socket.writes.length <= 1); for (const p of socket.pending) p.done(); await flush();
    assert.ok(socket.writes.length <= 1); assert.equal(socket.eventNames().length, 0);
  });
}

test("03D stale command validity is checked at drain; duplicate callbacks are inert", async () => {
  const { connection, socket } = await connected(); let valid = true;
  const one = Promise.resolve(connection.transport.send("one"));
  const two = Promise.resolve(connection.transport.send("stale", () => valid));
  const three = Promise.resolve(connection.transport.send("three"));
  const old = socket.pending[0].done; valid = false; socket.drain(); await flush();
  assert.deepEqual(socket.writes, ["one", "three"]); old(); await flush();
  assert.equal(socket.pending.length, 1); socket.drain(); await Promise.all([one, two, three]);
  connection.close(); await flush();
});

test("03D stalled native completion has a fixed queue deadline and no late flush", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2030, 0, 1) });
  const { connection, socket, abort } = await connected();
  const all = Promise.allSettled([connection.transport.send("one"), connection.transport.send("two")]);
  t.mock.timers.tick(TEXT_SEND_LIMITS.lifetimeMs); await flush();
  assert.ok((await all).every(r => r.status === "rejected"));
  socket.drain(); await flush(); assert.equal(socket.writes.length, 1);
  assert.equal(socket.closes, 1); assert.equal(getEventListeners(abort.signal, "abort").length, 0);
});

async function lifecycle(count = 428) {
  const clock = new FakeClock();
  const controller = new TextLifecycle(clock, {
    prepare: async identity => manySections(identity.runId, count),
    connect: async (_identity, signal) => openTextSocket("synthetic-key", "synthetic-owner", signal, DelayedSocket),
  }, () => {});
  assert.equal(controller.start(manySections().variant.source.id), true); await flush();
  const socket = DelayedSocket.instances.at(-1)!;
  let seq = 0;
  const emit = (event: object) => socket.emit("message", Buffer.from(JSON.stringify({ event_id: `ack_${++seq}`, ...event })), false);
  const input = manySections("text_1", count), m = input.manifest;
  const config = (final = false) => emit({ type: "session.updated", session: {
    ...(final ? m.finalize : m.configure).session, id: "session_test", object: "realtime.session", model: input.policy.model } });
  const ack = (index: number, bad = false) => {
    const e = m.items[index];
    emit({ type: "conversation.item.done", previous_item_id: e.previous_item_id ?? null,
      item: { ...e.item, status: "completed", ...(bad ? { content: [{ type: "input_text", text: "wrong" }] } : {}) } });
  };
  const drainAll = async () => { while (socket.pending.length) { socket.drain(); await flush(); } };
  return { controller, clock, socket, m, config, ack, drainAll };
}

for (const count of [3, 428]) test(`03D actual lifecycle/socket ${count} sections require all ACKs and final settings`, async () => {
  const h = await lifecycle(count);
  assert.equal(h.socket.writes.length, 1); h.socket.drain(); await flush(); h.config(); await flush();
  assert.equal(h.controller.submit("too early"), false); await h.drainAll();
  assert.deepEqual(h.socket.writes.slice(1), h.m.items.map(e => JSON.stringify(e)));
  assert.equal(h.controller.canSubmit, false); // native completion is NOT an acknowledgement
  for (let i = count - 1; i > 0; i--) { h.ack(i); h.ack(i); } await flush();
  assert.equal(h.socket.writes.length, count + 1); assert.equal(h.controller.canSubmit, false);
  h.ack(0); await flush(); assert.equal(h.socket.writes.length, count + 2);
  h.config(true); h.config(true); await flush(); assert.equal(h.controller.canSubmit, false); // final native write still pending
  h.socket.drain(); await flush(); assert.equal(h.controller.snapshot.phase, "ready");
  h.ack(0); await flush(); assert.equal(h.controller.snapshot.phase, "ready");
  assert.ok(h.socket.peak < 16_384); h.controller.stop(); await flush();
  assert.equal(h.clock.timers.size, 0); assert.equal(h.socket.eventNames().length, 0);
});

for (const action of ["stop", "replace", "deadline", "malformed-ack", "bad-final"] as const) {
  test(`03D actual lifecycle ${action} during pending delivery cannot revive ready`, async () => {
    const h = await lifecycle(); h.socket.drain(); await flush(); h.config(); await flush();
    assert.equal(h.socket.pending.length, 1); const late = h.socket.pending[0].done;
    if (action === "stop") h.controller.stop();
    if (action === "replace") h.controller.reset();
    if (action === "deadline") h.clock.tick(25_001);
    if (action === "malformed-ack") h.ack(0, true);
    if (action === "bad-final") {
      await h.drainAll(); for (let i = 0; i < h.m.items.length; i++) h.ack(i); await flush();
      h.socket.emit("message", Buffer.from(JSON.stringify({ type: "session.updated", event_id: "bad",
        session: { ...h.m.finalize.session, instructions: "changed", id: "session_test", model: "gpt-realtime-2.1-mini" } })), false);
    }
    await flush(); const writes = h.socket.writes.length;
    late(); h.config(true); h.ack(0); await flush();
    assert.equal(h.socket.writes.length, writes); assert.equal(h.controller.canSubmit, false);
    assert.equal(h.socket.closes, 1); assert.equal(h.clock.timers.size, 0);
    assert.equal(h.socket.eventNames().length, 0);
  });
}
