import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { openTextSocket } from "../../src/server/text/socket.ts";
import { PrimingController, type PrimingTransport } from "../../src/shared/priming-controller.ts";
import { FakeClock, flush } from "../priming/harness.ts";
import { manySections } from "../priming/many-sections.ts";
import { SetupObserver } from "../priming/setup-observer.ts";

for (const action of ["before", "after", "missing", "socket-first", "malformed", "stop"] as const) {
  test(`03D correction 2: ${action}, first cause and fixed setup deadline`, async () => {
    const clock = new FakeClock(), observer = new SetupObserver(() => clock.now());
    const input = manySections("text_1", 3), m = input.manifest;
    let receive: (e: unknown) => void = () => {}, lost = () => {}, closes = 0, removes = 0, sequence = 0;
    const transport: PrimingTransport = {
      isOpen: () => closes === 0, send: () => {},
      subscribe: (next, closed) => { receive = next; lost = closed; return () => { removes++; }; },
      close: () => { closes++; observer.event("cleanup"); observer.event("socket_close", 1006); },
    };
    const controller = new PrimingController(clock, s => {
      if (s.state === "configuring") observer.event("priming_start", s.expected);
      if (s.state === "priming") observer.event("source_ack", s.acknowledged);
      if (s.state === "failed") observer.event("priming_failure", 0, s.failure);
      if (s.state === "stopped") observer.event("priming_stop", 0, "stop");
    }, () => {});
    controller.start({ runId: "text_1", connectionId: "connection" }, input, transport);
    const config = (final = false) => receive({ type: "session.updated", event_id: `ack_${++sequence}`,
      session: { ...(final ? m.finalize : m.configure).session, id: "session", object: "realtime.session", model: input.policy.model } });
    const ack = (index: number, bad = false) => receive({ type: "conversation.item.done", event_id: `ack_${++sequence}`,
      previous_item_id: m.items[index].previous_item_id ?? null,
      item: { ...m.items[index].item, status: "completed", ...(bad ? { content: [] } : {}) } });
    config(); await flush(); ack(0);
    clock.tick(24_998); ack(0); ack(0); // Duplicates cannot extend the absolute deadline or count as progress.
    assert.equal(observer.summary.unique, 1); assert.equal(observer.summary.offsets.last_source_ack, 0);
    if (action === "before") { clock.tick(1); ack(1); ack(2); await flush(); config(true); await flush(); assert.equal(controller.canSendQuestions, true); }
    if (action === "after") { clock.tick(3); ack(1); ack(2); config(true); }
    if (action === "missing") { ack(1); clock.tick(2); }
    if (action === "socket-first") { observer.event("socket_failure", 0, "remote_close"); lost(); }
    if (action === "malformed") ack(1, true);
    if (action === "stop") controller.stop();
    await flush(); controller.stop(); lost(); clock.tick(30_000); ack(2); config(true); await flush();
    assert.equal(closes, 1); assert.equal(removes, 1); assert.equal(clock.timers.size, 0);
    assert.equal(observer.summary.cleanupCount, 1);
    assert.equal(observer.summary.firstTerminal?.reason, ({ before: "stop", after: "timeout", missing: "timeout",
      "socket-first": "remote_close", malformed: "protocol", stop: "stop" })[action]);
    assert.equal(controller.canSendQuestions, false);
  });
}

test("03D correction 2: socket close reaches priming before later Stop and timeout", async () => {
  class Socket extends EventEmitter {
    static current: Socket;
    readyState = 1; bufferedAmount = 0; closes = 0;
    constructor() { super(); Socket.current = this; queueMicrotask(() => this.emit("open")); }
    send(_raw: string, callback: () => void) { queueMicrotask(callback); }
    terminate() { this.closes++; this.readyState = 3; queueMicrotask(() => this.emit("close", 1006)); }
  }
  const clock = new FakeClock(), observer = new SetupObserver(() => clock.now());
  const abort = new AbortController(), connection = await openTextSocket("synthetic", "synthetic", abort.signal, Socket);
  const controller = new PrimingController(clock, s => {
    if (s.state === "configuring") observer.event("priming_start", s.expected);
    if (s.state === "failed") observer.event("priming_failure", 0, s.failure);
    if (s.state === "stopped") observer.event("priming_stop", 0, "stop");
  }, () => {});
  controller.start({ runId: "text_1", connectionId: "conn" }, manySections("text_1", 3), connection.transport);
  await flush(); clock.tick(100); Socket.current.readyState = 3; Socket.current.emit("close", 1001);
  controller.stop(); clock.tick(25_000); abort.abort(); await flush();
  assert.deepEqual(observer.summary.firstTerminal, { origin: "priming_failure", reason: "transport", ms: 100 });
  assert.equal(Socket.current.closes, 1); assert.equal(Socket.current.eventNames().length, 0);
  assert.equal(clock.timers.size, 0); assert.equal(controller.snapshot.failure, "transport");
});
