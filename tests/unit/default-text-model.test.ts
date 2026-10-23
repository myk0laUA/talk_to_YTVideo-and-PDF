import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { EventEmitter, getEventListeners } from "node:events";
import { Tiktoken } from "js-tiktoken/lite";
import ranks from "js-tiktoken/ranks/o200k_base";
import { estimateTextInput, TEXT_ESTIMATOR } from "../../scripts/lib/text-input-estimate.ts";
import { createProviderTextPreparation, matchesProviderPreparation } from "../../src/server/context/model-measurement.ts";
import { DIAGNOSTIC_MINI_TEXT_POLICY as mini, PROVIDER_TEXT_POLICY as large, PROVIDER_VOICE_POLICY,
  type ProviderTextPolicy } from "../../src/shared/priming-provider-policy.ts";
import { validateProviderAdmission, type ProviderPrimingInput } from "../../src/shared/priming-admission.ts";
import { encodeManifest } from "../../src/shared/priming-manifest.ts";
import { contextVariants, sourceContext } from "../../src/server/context/document.ts";
import { uploadedRecord, captionRecord } from "../../src/server/sources/service.ts";
import { createVisitor } from "../../src/server/proof/visitor.ts";
import { TextRegistry } from "../../src/server/text/registry.ts";
import { openTextSocket, type TextSocketConstructor } from "../../src/server/text/socket.ts";
import { scriptedFullSource } from "../../scripts/lib/full-source-scripted.ts";
import { pdfFixture, captionFixture } from "../context/fixtures.ts";
import type { TextRelaySnapshot } from "../../src/shared/text-relay.ts";
import { routingCalibrationFixtures } from "../context/routing-calibration-fixtures.ts";
import { PrimingController } from "../../src/shared/priming-controller.ts";
import { FakeClock, flush } from "../priming/harness.ts";
import { TextTransport } from "../priming/text-harness.ts";

const config = { origin: "https://routing.invalid", cookieSecret: "03".repeat(32), secure: true };
function source(kind: "PDF" | "YOUTUBE") {
  const visitor = createVisitor(config, Date.now());
  const row = kind === "PDF" ? uploadedRecord(structuredClone(pdfFixture), visitor) : captionRecord(structuredClone(captionFixture), visitor);
  return { visitor, row };
}
for (const kind of ["PDF", "YOUTUBE"] as const) test(`03I ${kind} complete multilingual fragments, metadata and replacing instructions estimated`, async () => {
  const { row } = source(kind), v = contextVariants(sourceContext(row)).B;
  // Use actual serializer fragmentation with Unicode, escaped source commands and final markers.
  const original = structuredClone(v);
  const m = encodeManifest(v, "estimate03i", "text", 2048, true), snapshot = JSON.stringify(m);
  const e = await estimateTextInput(m), encoder = new Tiktoken(ranks);
  const count = (text: string) => encoder.encode(text, [], []).length;
  assert.equal(e.basis, "estimated_tokens"); assert.equal(e.tokenizer, TEXT_ESTIMATOR);
  assert.deepEqual(e.sourceMessages, m.items.map(item => count(item.item.content[0].text)));
  assert.equal(e.instructions, Math.max(count(m.configure.session.instructions), count(m.finalize.session.instructions)));
  assert.equal(e.inputSize, e.instructions! + e.sourceMessages!.reduce((a, b) => a + b, 0));
  assert.ok(e.inputSize! > count(row.fullText)); // Metadata/instructions really included.
  assert.equal(JSON.stringify(m), snapshot); assert.deepEqual(v, original);
  const parts = m.items.flatMap(item => { const data = JSON.parse(item.item.content[0].text); return data.fragments ?? [data]; });
  const texts = v.source.sections!.map(section => parts.filter(p => p.locator.id === section.id).map(p => p.text).join(""));
  assert.equal(texts.join(v.source.separator), row.fullText);
});
test("03I long non-ASCII PDF serializes and estimates each fragment without losing content", async () => {
  const { visitor } = source("PDF"), text = 'العربية 中文 café é 🌱 <|endoftext|> "quoted"\n'.repeat(600);
  const row = uploadedRecord({ ...pdfFixture, pageCount: 1, sections: [{ id: "page-1", pageNumber: 1, text }],
    fullText: text, characterCount: text.length }, visitor);
  const v = contextVariants(sourceContext(row)).B, m = encodeManifest(v, "fragmented03i", "text", 2048, true);
  assert.ok(m.items.length > 2);
  assert.equal(m.items.map(i => JSON.parse(i.item.content[0].text).text).join(""), text);
  const e = await estimateTextInput(m); assert.equal(e.basis, "estimated_tokens");
  assert.equal(e.sourceMessages!.length, m.items.length);
});
test("03I frozen six-fixture load inventory preserves every support key and ordered full content", () => {
  const fixtures = routingCalibrationFixtures(); assert.equal(fixtures.length, 6);
  for (const f of fixtures) {
    const { visitor } = source(f.kind);
    const row = f.kind === "PDF" ? uploadedRecord(f.content as typeof pdfFixture, visitor) : captionRecord(f.content as typeof captionFixture, visitor);
    const v = contextVariants(sourceContext(row)).B, ids = new Set(v.source.sections!.map(s => s.id));
    assert.equal(v.source.sections!.map(s => s.text).join(v.source.separator), f.content.fullText);
    assert.equal(f.questions.length, 13);
    for (const q of f.questions) for (const key of q.evidence) assert.ok(ids.has(key), `${f.id}/${q.id}/${key}`);
    assert.ok(f.questions.some(q => q.category === "absent")); assert.ok(f.questions.some(q => q.category === "follow_up"));
  }
});
for (const kind of ["PDF", "YOUTUBE"] as const) for (const policy of [mini, large])
  test(`03I ${kind} ${policy.model} preparation/provenance/admission and mismatched policy denial`, async () => {
    const { visitor, row } = source(kind);
    const prepare = createProviderTextPreparation({ repository: { get: async () => row } });
    const expected = { model: policy.model, mode: "text" as const, policyVersion: policy.policyVersion, sourceId: row.id, runId: "routing03i" };
    const r = await prepare({ ...expected, visitor,
      signal: new AbortController().signal, variant: "B" });
    assert.equal(r.status, "prepared"); if (r.status !== "prepared") return;
    assert.equal(r.input.policy, policy); assert.ok(Object.isFrozen(r.input.policy));
    assert.equal(validateProviderAdmission(r.input), true); assert.equal(matchesProviderPreparation(r.input, expected, Date.now()), true);
    const other = policy === mini ? large : mini;
    assert.equal(matchesProviderPreparation(r.input, { ...expected, model: other.model, policyVersion: other.policyVersion }, Date.now()), false);
    assert.equal(matchesProviderPreparation(structuredClone(r.input), expected, Date.now()), false);
    assert.equal(validateProviderAdmission({ ...r.input, policy: { ...policy, model: other.model } } as ProviderPrimingInput), false);
  });

const registries: TextRegistry[] = [];
afterEach(() => { for (const r of registries.splice(0)) { r.dispose(); assert.equal(r.size, 0); } });
const wait = async (condition: () => boolean) => { for (let i = 0; i < 200; i++) { if (condition()) return; await delay(5); } assert.ok(condition(), "routing lifecycle deadline"); };
function fixture(kind: "PDF" | "YOUTUBE", options: { mismatch?: boolean;
  unavailable?: boolean; changedPolicy?: boolean; contextLimit?: boolean; outputLimit?: boolean } = {}) {
  const { visitor, row: original } = source(kind); let row: typeof original | null = original;
  let reads = 0, connects = 0, closes = 0;
  let duringPreparation: (() => Promise<void>) | undefined, duringConnect: (() => void) | undefined;
  const policies: ProviderTextPolicy[] = [], commands: Record<string, unknown>[] = [];
  const registry = new TextRegistry({ repository: { get: async (id, owner) => {
      reads++; if (reads === 5) await duringPreparation?.();
      return row?.id === id && row.ownerSessionHash === owner ? structuredClone(row) : null;
    } },
    connect: async (_owner, _signal, policy) => {
      connects++; policies.push(policy); duringConnect?.();
      if (options.unavailable) throw new Error("synthetic model unavailable");
      const transport = scriptedFullSource(kind, "success", undefined, policy.model);
      let receiveEvent: ((event: unknown) => void) | undefined;
      return { close: () => { closes++; transport.close(); }, transport: { ...transport,
        subscribe: (receive, lost) => { receiveEvent = receive; return transport.subscribe(event => {
          const e = structuredClone(event) as { type: string; session?: Record<string, unknown>; response?: Record<string, unknown> };
          if (e.type === "session.updated") { e.session!.model = options.mismatch ? (policy === mini ? large : mini).model : policy.model;
            if (options.changedPolicy) e.session!.max_output_tokens = 512; }
          if (options.outputLimit && e.type === "response.done") Object.assign(e.response as object, {
            status: "incomplete", status_details: { type: "incomplete", reason: "max_output_tokens" },
            usage: { input_tokens: 100, output_tokens: 2048, total_tokens: 2148 } });
          receive(e);
        }, lost); }, send: raw => { const e = JSON.parse(raw); commands.push(e);
          if (options.contextLimit && e.type === "response.create") {
            queueMicrotask(() => receiveEvent?.({ type: "error", event_id: "synthetic_context_limit", error: { code: "context_length_exceeded" } })); return;
          }
          return transport.send(raw); } } };
    } });
  registries.push(registry);
  const requestId = randomUUID();
  const begin = async (sourceId = original.id, startRequestId = requestId) => {
    const id = await registry.start(visitor, sourceId, startRequestId, new AbortController().signal), abort = new AbortController();
    const reader = (await registry.stream(visitor, id, abort.signal)).getReader(), snapshots: TextRelaySnapshot[] = [];
    const done = (async () => { for (;;) { const r = await reader.read(); if (r.done) break;
      for (const line of new TextDecoder().decode(r.value).trimEnd().split("\n")) snapshots.push(JSON.parse(line)); } })();
    return { id, abort, snapshots, done };
  };
  return { visitor, original, registry, requestId, begin, policies, commands, row: () => row,
    setRow: (next: typeof row) => { row = next; },
    duringPreparation: (fn: () => Promise<void>) => { duringPreparation = fn; }, duringConnect: (fn: () => void) => { duringConnect = fn; },
    counts: () => ({ reads, connects, closes }) };
}
for (const kind of ["PDF", "YOUTUBE"] as const) for (const policy of [large])
  test(`03M actual owned ${kind}/${policy.model} lifecycle: matching ACK, frozen follow-ups, Stop`, async () => {
    const f = fixture(kind), s = await f.begin();
    await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
    for (let n = 0; n < 2; n++) {
      await f.registry.question(f.visitor, s.id, randomUUID(), `Question ${n}`, new AbortController().signal);
      await wait(() => s.snapshots.at(-1)?.status.phase === "ready" && s.snapshots.at(-1)?.transcript.turns.length === (n + 1) * 2);
    }
    assert.deepEqual(f.policies, [policy]);
    assert.equal(f.commands.filter(c => c.type === "response.create").length, 2);
    for (const c of f.commands.filter(c => c.type === "response.create")) assert.equal((c.response as Record<string, unknown>).max_output_tokens, 2048);
    const sessions = f.commands.filter(c => c.type === "session.update");
    assert.equal(sessions.length, 2);
    for (const c of sessions) assert.equal((c.session as Record<string, unknown>).max_output_tokens, 2048);
    f.registry.stop(f.visitor, f.requestId); await s.done;
    assert.equal(f.registry.size, 0); assert.equal(f.counts().closes, 1); assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
    assert.equal(s.snapshots.at(-1)?.transcript.turns.length, 4);
    assert.ok(!JSON.stringify(s.snapshots).includes(TEXT_ESTIMATOR));
  });
test("03M replacement source starts a fresh larger session after Stop; old session cannot reconnect", async () => {
  const f = fixture("PDF"), first = await f.begin();
  await wait(() => first.snapshots.at(-1)?.status.phase === "ready");
  f.registry.stop(f.visitor, f.requestId); await first.done;
  const replacement = captionRecord(captionFixture, f.visitor), requestId = randomUUID();
  f.setRow(replacement);
  const second = await f.begin(replacement.id, requestId);
  await wait(() => second.snapshots.at(-1)?.status.phase === "ready");
  assert.deepEqual(f.policies, [large, large]);
  await assert.rejects(f.registry.question(f.visitor, first.id, randomUUID(), "stale", new AbortController().signal));
  f.registry.stop(f.visitor, requestId); await second.done; assert.equal(f.counts().closes, 2);
});
for (const kind of ["PDF", "YOUTUBE"] as const) for (const options of [{ mismatch: true }, { changedPolicy: true }, { unavailable: true }])
  test(`03I ${kind} mismatched ACK/policy or unavailable larger fails without downgrade ${JSON.stringify(options)}`, async () => {
    const f = fixture(kind, options), s = await f.begin(); await s.done;
    assert.equal(s.snapshots.at(-1)?.status.phase, "failed"); assert.deepEqual(f.policies, [large]);
    assert.equal(f.counts().connects, 1); assert.equal(f.registry.size, 0);
    assert.equal(f.commands.filter(c => c.type === "response.create").length, 0);
  });
for (const kind of ["PDF", "YOUTUBE"] as const) test(`03I ${kind} larger context limit keeps explicit recovery without switching`, async () => {
  const f = fixture(kind, { contextLimit: true }), s = await f.begin();
  await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
  await f.registry.question(f.visitor, s.id, randomUUID(), "Question", new AbortController().signal);
  await s.done; assert.equal(s.snapshots.at(-1)?.status.failure, "context_limit");
  assert.deepEqual(f.policies, [large]); assert.equal(f.registry.size, 0); assert.equal(f.counts().closes, 1);
  assert.ok(f.row()); assert.equal(f.row()!.fullText, f.original.fullText);
});
for (const kind of ["PDF", "YOUTUBE"] as const) for (const phase of ["foreign", "expired", "replaced-preparation", "expired-preparation", "removed-connection", "mutated-connection", "stop-preparation"])
  test(`03I ${kind} authorization/cleanup ${phase}`, async () => {
    const f = fixture(kind);
    if (phase === "foreign") { const row = f.row()!; row.ownerSessionHash = "foreign-owner"; f.setRow(row); }
    if (phase === "expired") { const row = f.row()!; row.expiresAt = new Date(0); f.setRow(row); }
    if (phase === "foreign" || phase === "expired") { await assert.rejects(f.begin()); assert.equal(f.counts().connects, 0); return; }
    let resume: (() => void) | undefined;
    if (phase.includes("preparation")) f.duringPreparation(async () => {
      if (phase === "stop-preparation") { await new Promise<void>(resolve => { resume = resolve; }); return; }
      const row = f.row()!;
      if (phase === "replaced-preparation") row.id = randomUUID(); else row.expiresAt = new Date(0);
      f.setRow(row);
    });
    if (phase === "removed-connection") f.duringConnect(() => f.setRow(null));
    if (phase === "mutated-connection") f.duringConnect(() => {
      const row = f.row()!, sections = Array.isArray(row.sections) ? row.sections : row.sections.segments;
      sections[0].text += " changed";
      row.fullText = sections.map(s => s.text).join(row.kind === "PDF" ? "\n\n" : "\n");
      row.characterCount = row.fullText.length; row.wordCount = row.fullText.trim().split(/\s+/u).filter(Boolean).length;
      f.setRow(row);
    });
    const s = await f.begin();
    if (phase === "stop-preparation") { await wait(() => !!resume); f.registry.stop(f.visitor, f.requestId); resume!(); }
    await s.done; await delay(5);
    assert.equal(f.registry.size, 0); assert.equal(f.counts().connects, phase.includes("connection") ? 1 : 0);
    assert.equal(f.counts().closes, f.counts().connects); assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  });
test("03M fixed larger default and independent voice policy", () => {
  assert.equal(large.model, "gpt-realtime-2.1"); assert.equal(large.maxOutputTokens, 2048);
  assert.equal(PROVIDER_VOICE_POLICY.model, large.model); assert.equal(PROVIDER_VOICE_POLICY.maxOutputTokens, 2048);
  assert.equal(PROVIDER_VOICE_POLICY.mode, "voice");
  assert.notEqual(PROVIDER_VOICE_POLICY.policyVersion, large.policyVersion);
  assert.equal(PROVIDER_VOICE_POLICY.policyVersion, "provider-voice-full-source-default-2026-10-22-v8");
});
test("03I socket URL uses selected allowlisted model; invalid model/policy never constructs socket", async () => {
  for (const policy of [mini, large]) {
    let url = "", terminated = 0;
    class Socket extends EventEmitter {
      readyState = 1; bufferedAmount = 0;
      constructor(value: string) { super(); url = value; queueMicrotask(() => this.emit("open")); }
      send(_raw: string, done: () => void) { done(); }
      terminate() { terminated++; this.emit("close"); }
    }
    const c = await openTextSocket("sk-synthetic-never-live", "synthetic", new AbortController().signal, Socket, policy);
    assert.equal(new URL(url).searchParams.get("model"), policy.model); c.close(); assert.equal(terminated, 1);
  }
  let calls = 0;
  class Denied extends EventEmitter {
    readyState = 1; bufferedAmount = 0;
    constructor() { super(); calls++; }
    send(_raw: string, done: () => void) { done(); }
    terminate() {}
  }
  await assert.rejects(openTextSocket("synthetic", "synthetic", new AbortController().signal, Denied satisfies TextSocketConstructor,
    { ...large, model: "browser-selected" } as unknown as ProviderTextPolicy));
  assert.equal(calls, 0);
});

for (const kind of ["PDF", "YOUTUBE"] as const) for (const policy of [mini, large]) {
  test(`03K ${kind}/${policy.model} new revision, stale policy and manifest rejection`, async () => {
    const { visitor, row } = source(kind);
    const prepare = createProviderTextPreparation({ repository: { get: async () => row } });
    const args = { visitor, sourceId: row.id, runId: "cap03k", mode: "text" as const, variant: "B" as const,
      model: policy.model, policyVersion: policy.policyVersion, signal: new AbortController().signal };
    const r = await prepare(args); assert.equal(r.status, "prepared"); if (r.status !== "prepared") return;
    assert.equal(r.input.policy, policy); assert.equal(policy.maxOutputTokens, 2048);
    assert.ok(policy.policyVersion.endsWith("-v4"));
    for (const policyVersion of ["provider-text-full-source-2026-10-20-v1", "provider-text-full-source-2026-10-22-v2",
      "provider-text-full-source-large-2026-10-22-v2"]) {
      assert.equal((await prepare({ ...args, policyVersion })).status, "unavailable");
      const stale: ProviderPrimingInput = structuredClone(r.input); Object.assign(stale.policy, { policyVersion });
      assert.equal(validateProviderAdmission(stale), false);
    }
    for (const patch of [{ maxOutputTokens: 512 }, { policyVersion: policy === mini
      ? "provider-text-full-source-2026-10-20-v1" : "provider-text-full-source-large-2026-10-22-v1" }]) {
      const old: ProviderPrimingInput = structuredClone(r.input); Object.assign(old.policy, patch);
      assert.equal(validateProviderAdmission(old), false);
    }
    for (const stage of ["configure", "finalize"] as const) {
      const old: ProviderPrimingInput = structuredClone(r.input); old.manifest[stage].session.max_output_tokens = 512;
      assert.equal(validateProviderAdmission(old), false);
    }
    for (const stage of ["configure", "finalize"] as const) for (const cap of [512, 2047, 2049, "inf"]) {
      const clock = new FakeClock(), transport = new TextTransport();
      const controller = new PrimingController(clock, () => {}, () => assert.fail("mismatched ACK cannot prime"));
      controller.start({ runId: r.input.manifest.runId, connectionId: "cap03k" }, r.input, transport);
      const ack = (bad: boolean) => {
        const event = transport.commands.filter(c => c.session).at(-1)!;
        transport.emit({ type: "session.updated", session: { ...event.session, id: "cap03k", object: "realtime.session", model: policy.model,
          ...(bad ? { max_output_tokens: cap } : {}) } });
      };
      if (stage === "finalize") {
        ack(false); await flush(); for (const item of r.input.manifest.items) transport.ack(item); await flush();
      }
      ack(true); await flush(); assert.equal(controller.snapshot.failure, "configuration");
      assert.equal(transport.closes, 1); assert.equal(clock.timers.size, 0);
    }
  });
}
for (const kind of ["PDF", "YOUTUBE"] as const) {
  test(`03M ${kind} default max-output terminal keeps partial text without retry or model switch`, async () => {
    const f = fixture(kind, { outputLimit: true }), s = await f.begin();
    await wait(() => s.snapshots.at(-1)?.status.phase === "ready");
    await f.registry.question(f.visitor, s.id, randomUUID(), "Question", new AbortController().signal);
    await wait(() => s.snapshots.at(-1)?.transcript.turns.some(t => t.generation === "incomplete") === true);
    const transcript = s.snapshots.at(-1)!.transcript;
    assert.equal(transcript.incomplete, true);
    assert.ok(transcript.turns.some(t => t.parts.some(p => p.text.length > 0)));
    assert.equal(f.commands.filter(c => c.type === "response.create").length, 1);
    assert.deepEqual(f.policies, [large]); assert.equal(f.row()!.fullText, f.original.fullText);
    f.registry.stop(f.visitor, f.requestId); await s.done;
    assert.equal(f.registry.size, 0); assert.equal(f.counts().closes, 1);
    assert.equal(getEventListeners(s.abort.signal, "abort").length, 0);
  });
}
