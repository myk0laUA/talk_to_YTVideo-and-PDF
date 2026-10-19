import assert from "node:assert/strict";
import { createContextService } from "../../src/server/context/service.ts";
import { captionRecord, uploadedRecord } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import { encodeManifest, bytes, type ItemEvent, type SessionEvent, type Manifest, type Mode } from "../../src/shared/priming-manifest.ts";
import type { PrimingInput } from "../../src/shared/priming-admission.ts";
import { PrimingController, type Basis, type PrimingClock, type PrimingTransport, type PrimingStatus } from "../../src/shared/priming-controller.ts";
import type { InterruptEvent } from "../../src/shared/voice-response.ts";

export const start = Date.UTC(2030, 0, 1);
export async function fixture(kind: "PDF" | "YOUTUBE" = "PDF", variant: "A" | "B" = "B", runId = "runA", mode: Mode = "voice", limit = 2048) {
  const visitor = createVisitor({ origin: "https://synthetic.invalid", cookieSecret: "07".repeat(32), secure: true }, start);
  const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
  row.expiresAt = new Date(start + 60_000);
  const binding = { model: "offline-fixture-only", tokenizer: "utf8-bytes-test-only", verification: "synthetic", unit: "synthetic-units" } as const;
  const prepared = await createContextService({ repository: { get: async () => row }, now: () => start })({
    visitor, sourceId: row.id, signal: new AbortController().signal,
    policy: { version: "synthetic-budget-v1", binding, capacity: 1_000_000, historyAllowance: 100, outputReserve: 200, framingAllowance: 50 },
    measurement: { binding, measure: async text => bytes(text) },
  });
  assert.equal(prepared.status, "prepared"); if (prepared.status !== "prepared") throw new Error("Fixture preparation failed.");
  const manifest = encodeManifest(prepared.variants[variant], runId, mode, limit);
  const input: PrimingInput = { manifest, preparedBudget: prepared.budgets[variant], wireBudget: {
    status: "offline_fit", ...binding,
    policyVersion: "synthetic-budget-v1", representation: manifest.representation, measured: manifest.bytes,
    capacity: 1_000_000, historyAllowance: 100, outputReserve: 200, framingAllowance: 50,
  } };
  return { prepared, row, input, manifest };
}

/** Deliberate test-only subclass. Production factory/default controller rejects every fixture here. */
export class SyntheticPrimingController extends PrimingController {
  protected override admission(input: PrimingInput): Basis | undefined {
    return input.preparedBudget.status === "offline_fit" && input.wireBudget.status === "offline_fit"
      && input.wireBudget.model === "offline-fixture-only" && input.wireBudget.verification === "synthetic"
      && input.wireBudget.unit === "synthetic-units" && input.wireBudget.representation === input.manifest.representation
      && input.wireBudget.measured === input.manifest.bytes ? "synthetic-test-only" : undefined;
  }
}
export class FakeClock implements PrimingClock {
  at = start;
  timers = new Map<number, { at: number; callback: () => void }>();
  sequence = 0;
  now() { return this.at; }
  setTimeout(callback: () => void, ms: number) { const n = ++this.sequence; this.timers.set(n, { at: this.at + ms, callback }); return n; }
  clearTimeout(handle: unknown) { this.timers.delete(handle as number); }
  tick(ms: number) { this.at += ms; for (const [id, timer] of this.timers) if (timer.at <= this.at) { this.timers.delete(id); timer.callback(); } }
}
type Outbound = SessionEvent | ItemEvent | InterruptEvent;
// Narrow documented subset validator: no socket/fetch/key/media/environment dependency.
export function validateOutbound(e: Outbound) {
  const keys = (v: object, expected: string[]) => assert.deepEqual(Object.keys(v).sort(), expected.sort());
  if (e.type === "session.update") {
    keys(e, ["type", "event_id", "session"]);
    keys(e.session, ["type", "instructions", "truncation", "tools", "output_modalities", "audio"]);
    assert.equal(e.session.type, "realtime"); assert.equal(e.session.truncation, "disabled");
    assert.deepEqual(e.session.tools, []);
    assert.ok(["text", "audio"].includes(e.session.output_modalities[0])); assert.equal(e.session.output_modalities.length, 1);
    const turn = e.session.audio.input.turn_detection;
    if (turn !== null) assert.deepEqual(turn, { type: "server_vad", create_response: true, interrupt_response: true, idle_timeout_ms: null });
  } else if (e.type === "response.cancel" || e.type === "output_audio_buffer.clear") {
    keys(e, ["type", "event_id", ...(e.type === "response.cancel" ? ["response_id"] : [])]);
    if (e.type === "response.cancel") assert.match(e.response_id, /^[A-Za-z0-9_-]{1,128}$/);
  } else {
    assert.equal(e.type, "conversation.item.create"); keys(e, ["type", "event_id", "item", ...(e.previous_item_id ? ["previous_item_id"] : [])]);
    keys(e.item, ["id", "type", "role", "content"]); assert.equal(e.item.type, "message"); assert.equal(e.item.role, "user");
    assert.equal(e.item.content.length, 1); keys(e.item.content[0], ["type", "text"]);
    assert.equal(e.item.content[0].type, "input_text"); assert.equal(typeof e.item.content[0].text, "string");
    assert.equal(JSON.parse(e.item.content[0].text).protocol, "source-priming-v1");
  }
  assert.match(e.event_id, /^[A-Za-z0-9_-]+$/);
}
export class ScriptedTransport implements PrimingTransport {
  open = true; closes = 0; unsubscribes = 0; outbound: Outbound[] = [];
  receive?: (event: unknown) => void; closed?: () => void;
  // Retained only by this test harness to exercise events after unsubscribe.
  stale?: (event: unknown) => void;
  sendAction?: (event: Outbound) => void | Promise<void>;
  subscribe(receive: (e: unknown) => void, closed: () => void) {
    this.receive = this.stale = receive; this.closed = closed;
    return () => { this.unsubscribes++; this.receive = this.closed = undefined; };
  }
  isOpen() { return this.open; }
  send(raw: string) { assert.ok(this.open); const e = JSON.parse(raw) as Outbound; validateOutbound(e); this.outbound.push(e); return this.sendAction?.(e); }
  close() { this.open = false; this.closes++; }
  emit(e: unknown) { this.receive?.(e); }
  sequence = 0;
  config(event?: SessionEvent) {
    const e = event ?? this.outbound.filter((e): e is SessionEvent => e.type === "session.update").at(-1)!;
    return { type: "session.updated", event_id: `server_${++this.sequence}`, session: {
      ...structuredClone(e.session), object: "realtime.session", id: "sess_synthetic", model: "offline-fixture-only" } };
  }
  item(e: ItemEvent, type = "conversation.item.done") {
    return { type, event_id: `server_${++this.sequence}`, previous_item_id: e.previous_item_id ?? null,
      item: { ...structuredClone(e.item), object: "realtime.item", status: "completed" } };
  }
}
export const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
export function harness(input: PrimingInput, production = false) {
  const clock = new FakeClock(), transport = new ScriptedTransport(), states: PrimingStatus[] = [];
  let calls = 0;
  const Controller = production ? PrimingController : SyntheticPrimingController;
  const controller = new Controller(clock, s => states.push(s), (_identity, basis) => { assert.equal(basis, "synthetic-test-only"); calls++; }, 1000);
  const begin = () => controller.start({ runId: input.manifest.runId, connectionId: `conn_${input.manifest.runId}` }, input, transport);
  return { controller, clock, transport, states, begin, calls: () => calls };
}
export async function configure(h: ReturnType<typeof harness>) { h.transport.emit(h.transport.config()); await flush(); }
export async function acknowledge(h: ReturnType<typeof harness>, m: Manifest) {
  for (const e of m.items) h.transport.emit(h.transport.item(e)); await flush();
}
