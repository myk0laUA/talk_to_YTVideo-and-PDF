import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import ts from "typescript";
import { encodeManifest, bytes } from "../../src/shared/priming-manifest.ts";
import { validateAdmission, preparePrimingInput, type PrimingInput } from "../../src/shared/priming-admission.ts";
import { PrimingController } from "../../src/shared/priming-controller.ts";
import { fixture, harness, flush, configure, acknowledge, ScriptedTransport } from "../priming/harness.ts";

const traces: unknown[] = [];
mock.method(globalThis, "fetch", async () => { throw new Error("External requests prohibited in priming tests."); });
for (const kind of ["PDF", "YOUTUBE"] as const) for (const variant of ["A", "B"] as const) for (const mode of ["voice", "text"] as const) {
  test(`${kind}/${variant}/${mode}: exact reconstruction, bounded schemas, withheld final ACK and once-only readiness`, async () => {
    const f = await fixture(kind, variant, "runA", mode), { manifest: m } = f;
    assert.deepEqual(m, encodeManifest(f.prepared.variants[variant], "runA", mode, 2048));
    const parts = m.items.map(e => JSON.parse(e.item.content[0].text));
    const reconstructed = f.prepared.context.sections.map(() => "");
    let full = "";
    for (const part of parts) {
      assert.equal(part.source.id, f.row.id); assert.equal(part.source.kind, kind);
      assert.equal(part.variant, variant);
      if (variant === "A") { assert.equal(part.offset, full.length); full += part.text; }
      else { assert.equal(part.offset, reconstructed[part.sectionIndex].length); reconstructed[part.sectionIndex] += part.text;
        const locator: Record<string, unknown> = { ...f.prepared.context.sections[part.sectionIndex] }; delete locator.text;
        assert.deepEqual(part.locator, locator); }
    }
    assert.equal(variant === "A" ? full : reconstructed.join(f.prepared.context.separator), f.row.fullText);
    if (variant === "B") assert.deepEqual(reconstructed, f.prepared.context.sections.map(s => s.text));
    assert.equal(parts.reduce((n, p) => n + p.text.length, 0), variant === "A" ? f.row.fullText.length : f.prepared.context.sections.reduce((n, s) => n + s.text.length, 0));
    assert.ok(parts.every(p => !p.source.fullText && !p.source.sections));
    assert.ok(m.items.every(e => bytes(JSON.stringify(e)) <= 2048));
    assert.equal(m.bytes, bytes(m.representation)); assert.ok(!m.configure.session.instructions.includes("BANANA"));
    const h = harness(f.input); assert.equal(h.begin(), true); assert.equal(h.begin(), true);
    assert.equal(h.transport.outbound.length, 1); assert.equal(h.controller.canSendQuestions, false);
    await configure(h);
    assert.equal(h.transport.outbound.length, m.items.length + 1);
    for (const e of [...m.items].reverse()) { h.transport.emit(h.transport.item(e, "conversation.item.added")); }
    await flush(); assert.equal(h.controller.snapshot.acknowledged, 0);
    for (const e of [...m.items].reverse().slice(1)) {
      h.transport.emit(h.transport.item(e)); h.transport.emit(h.transport.item(e));
    }
    await flush(); assert.equal(h.controller.canSendQuestions, false); assert.equal(h.calls(), 0);
    assert.equal(h.transport.outbound.length, m.items.length + 1);
    h.transport.emit(h.transport.item(m.items.at(-1)!)); await flush();
    assert.equal(h.transport.outbound.length, m.items.length + 2); assert.equal(h.calls(), 0);
    assert.equal(h.controller.canSendQuestions, false);
    h.transport.emit(h.transport.config(m.configure)); await flush(); assert.equal(h.calls(), 0);
    const final = h.transport.config(m.finalize); h.transport.emit(final); h.transport.emit(final); await flush();
    assert.equal(h.calls(), 1); assert.equal(h.controller.snapshot.state, "primed"); assert.equal(h.controller.canSendQuestions, true);
    assert.equal(h.controller.snapshot.productionReady, false); assert.equal(h.controller.snapshot.basis, "synthetic-test-only");
    assert.equal(h.clock.timers.size, 0);
    assert.equal(h.transport.outbound.filter(e => e.type === "conversation.item.create").length, m.items.length);
    assert.equal(h.transport.outbound.some(e => (e as { type: string }).type === "response.create"), false);
    h.controller.stop(); h.controller.stop(); h.transport.stale?.(final); await flush();
    assert.equal(h.transport.closes, 1); assert.equal(h.transport.unsubscribes, 1); assert.equal(h.transport.receive, undefined);
    assert.equal(h.controller.snapshot.state, "stopped"); assert.equal(h.calls(), 1);
    traces.push({ scenario: `${kind}/${variant}/${mode}`, states: h.states, itemCount: m.items.length,
      wireBytes: m.bytes, sourceCharacters: f.row.fullText.length, wireSha256: createHash("sha256").update(m.representation).digest("hex"),
      outbound: h.transport.outbound.length, closes: h.transport.closes, callbacks: h.calls(), timers: h.clock.timers.size });
  });
}

test("large semantic text splits Unicode safely before encoding; empty sections, lone surrogates, escaping and ordering survive", async () => {
  const f = await fixture(); const v = structuredClone(f.prepared.variants.B);
  const text = ('🌱<&>\\"\r\n\u2028\uD800' + " data ").repeat(1000);
  const long = { ...v, source: { ...v.source, sections: [{ id: "page-1", pageNumber: 1, text }, { id: "page-2", pageNumber: 2, text: "" }] } };
  const m = encodeManifest(long, "long", "text", 2048);
  const parts = m.items.map(e => JSON.parse(e.item.content[0].text));
  assert.ok(parts.length > 10); assert.equal(parts.filter(p => p.sectionIndex === 0).map(p => p.text).join(""), text);
  assert.equal(parts.at(-1).text, ""); assert.equal(parts.at(-1).last, true);
  for (const p of parts.filter(p => p.sectionIndex === 0).slice(1)) assert.ok(!/^[\uDC00-\uDFFF]/u.test(p.text));
  assert.throws(() => encodeManifest(v, "bad id", "text"));
  assert.throws(() => encodeManifest(v, "long", "text", 2047));
  const many = { ...v, source: { ...v.source, sections: Array.from({ length: 4097 }, () => ({ id: "p", pageNumber: 1, text: "" })) } };
  assert.throws(() => encodeManifest(many, "long", "text"));
});

test("wire byte limit rejects complete oversized sources without partial manifest or truncation", async () => {
  const f = await fixture("PDF", "A");
  const variant = { ...f.prepared.variants.A, source: { ...f.prepared.variants.A.source, fullText: "a".repeat(8_000_001) } };
  assert.throws(() => encodeManifest(variant, "large", "text"), /bounds/);
  assert.equal(f.row.fullText, f.prepared.context.fullText);
});

for (const mode of ["voice", "text"] as const) for (const field of ["truncation", "turn", "mode", "instructions", "model"] as const) {
  test(`Final ${mode} effective ${field} mismatch cannot prime`, async () => {
    const f = await fixture("PDF", "B", "runA", mode), h = harness(f.input); h.begin(); await configure(h); await acknowledge(h, f.manifest);
    const e = h.transport.config(f.manifest.finalize);
    if (field === "truncation") (e.session as { truncation: string }).truncation = "auto";
    if (field === "turn") e.session.audio.input.turn_detection = { type: "server_vad", create_response: true, interrupt_response: true, idle_timeout_ms: null };
    if (field === "turn" && mode === "voice") e.session.audio.input.turn_detection = null;
    if (field === "mode") e.session.output_modalities = [mode === "voice" ? "text" : "audio"];
    if (field === "instructions") e.session.instructions = "unconfirmed";
    if (field === "model") e.session.model = "unmeasured-model";
    h.transport.emit(e); await flush(); assert.equal(h.controller.snapshot.failure, "configuration");
    assert.equal(h.calls(), 0); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
  });
}

for (const event of [null, {}, { type: "conversation.item.done" }, { type: "session.updated", event_id: "bad" },
  { type: "unrelated", padding: "x".repeat(25_000) }] as const) test(`Malformed/bounded inbound event ${JSON.stringify(event)?.slice(0, 65)}`, async () => {
  const f = await fixture(), h = harness(f.input); h.begin(); h.transport.emit(event); await flush();
  assert.equal(h.controller.snapshot.failure, "protocol"); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
});

for (const type of ["conversation.item.truncated", "conversation.item.deleted"] as const) test(`Provider ${type} fails rather than dropping source`, async () => {
  const f = await fixture(), h = harness(f.input); h.begin(); await configure(h);
  h.transport.emit({ type, event_id: "server_error", item_id: f.manifest.items[0].item.id }); await flush();
  assert.equal(h.controller.snapshot.failure, "protocol"); assert.equal(h.transport.closes, 1);
});

test("late send rejection/resolve and connection callbacks after Stop cannot affect replacement", async () => {
  const a = await fixture(), b = await fixture("YOUTUBE", "A", "runB", "text");
  for (const reject of [false, true]) {
    const h = harness(a.input); let resolve!: () => void, fail!: (error: Error) => void;
    h.transport.sendAction = () => new Promise<void>((yes, no) => { resolve = yes; fail = no; });
    h.begin(); const closed = h.transport.closed; h.controller.stop();
    const t = new ScriptedTransport(); h.controller.start({ runId: "runB", connectionId: "connB" }, b.input, t);
    if (reject) fail(new Error("SECRET")); else resolve(); closed?.(); await flush();
    assert.equal(h.controller.snapshot.state, "configuring"); assert.equal(t.outbound.length, 1); assert.equal(h.transport.closes, 1);
    t.emit(t.config()); await flush(); for (const e of b.manifest.items) t.emit(t.item(e)); await flush();
    assert.equal(h.calls(), 0); const final = t.config(b.manifest.finalize); t.emit(final); await flush(); assert.equal(h.calls(), 1);
    h.controller.stop(); assert.equal(t.closes, 1); assert.equal(h.clock.timers.size, 0);
    traces.push({ scenario: `replacement-late-send-${reject ? "rejection" : "resolve"}`, states: h.states,
      aOutbound: h.transport.outbound.length, bOutbound: t.outbound.length, callbacks: h.calls(), closes: [h.transport.closes, t.closes] });
  }
});

test("fixed deadline applies even after final ACK when final send is still pending", async () => {
  const f = await fixture(), h = harness(f.input); let release!: () => void;
  h.transport.sendAction = e => { if (e.event_id.endsWith("_final")) return new Promise<void>(resolve => { release = resolve; }); };
  h.begin(); await configure(h); await acknowledge(h, f.manifest); h.transport.emit(h.transport.config(f.manifest.finalize));
  assert.equal(h.calls(), 0); h.clock.tick(1000); release(); await flush();
  assert.equal(h.controller.snapshot.failure, "timeout"); assert.equal(h.calls(), 0); assert.equal(h.transport.closes, 1);
});

for (const phase of ["configuration", "item-0", "item-1", "item-2", "item-3", "item-4", "item-5", "item-6", "item-7", "final", "primed"] as const) {
  test(`Stop/replacement during ${phase}: fresh source B, no late sends or inherited ACKs`, async () => {
    const a = await fixture(), b = await fixture("YOUTUBE", "B", "runB", "text");
    const h = harness(a.input); h.begin();
    if (phase !== "configuration") await configure(h);
    if (phase.startsWith("item-")) {
      for (const e of a.manifest.items.slice(0, Number(phase.slice(5)) + 1)) h.transport.emit(h.transport.item(e));
      await flush();
    }
    if (phase === "final" || phase === "primed") await acknowledge(h, a.manifest);
    if (phase === "primed") { h.transport.emit(h.transport.config(a.manifest.finalize)); await flush(); }
    const before = h.transport.outbound.length, callbacks = h.calls();
    h.controller.stop(); h.controller.stop(); h.clock.tick(2000);
    for (const e of a.manifest.items) h.transport.stale?.(h.transport.item(e));
    h.transport.stale?.(h.transport.config(a.manifest.finalize)); await flush();
    assert.equal(h.transport.outbound.length, before); assert.equal(h.transport.closes, 1);
    assert.equal(h.clock.timers.size, 0); assert.equal(h.calls(), callbacks);
    assert.equal(h.controller.start({ runId: "runA", connectionId: "conn_new" }, a.input, new ScriptedTransport()), false);
    const t = new ScriptedTransport();
    assert.equal(h.controller.start({ runId: "runB", connectionId: "conn_runA" }, b.input, t), false);
    assert.equal(h.controller.start({ runId: "runB", connectionId: "conn_runB" }, b.input, t), true);
    h.transport.stale?.(h.transport.config(a.manifest.finalize)); await flush();
    assert.equal(h.controller.snapshot.state, "configuring"); assert.equal(t.outbound.length, 1);
    t.emit(t.config()); await flush(); assert.equal(h.controller.snapshot.acknowledged, 0);
    for (const e of a.manifest.items) t.emit(h.transport.item(e));
    await flush(); assert.equal(h.controller.snapshot.acknowledged, 0);
    assert.equal(t.outbound.length, b.manifest.items.length + 1);
    assert.ok(t.outbound.filter(e => e.type === "conversation.item.create").every(e => JSON.parse(e.item.content[0].text).source.id === b.row.id));
    h.controller.stop(); assert.equal(t.closes, 1); assert.equal(t.unsubscribes, 1); assert.equal(h.clock.timers.size, 0);
    traces.push({ scenario: `stop-replace-${phase}`, states: h.states, aOutbound: before,
      bOutbound: t.outbound.length, callbacks: h.calls(), closes: [h.transport.closes, t.closes], timers: h.clock.timers.size });
  });
}

const defects = ["missing-session", "wrong-truncation", "auto-response", "tools", "instructions", "modality", "session-id", "malformed-item", "wrong-role", "wrong-content", "incomplete", "wrong-previous", "provider", "overflow", "unexpected-response"] as const;
for (const defect of defects) test(`Fail closed: ${defect}`, async () => {
  const f = await fixture(), h = harness(f.input); h.begin();
  if (["missing-session", "wrong-truncation", "auto-response", "tools", "instructions", "modality"].includes(defect)) {
    const e = h.transport.config() as unknown as Record<string, unknown>; const s = e.session as Record<string, unknown>;
    if (defect === "missing-session") delete e.session;
    if (defect === "wrong-truncation") s.truncation = "auto";
    if (defect === "auto-response") s.audio = { input: { turn_detection: { type: "server_vad", create_response: true } } };
    if (defect === "tools") s.tools = [{ type: "function", name: "bad" }];
    if (defect === "instructions") s.instructions = "bad";
    if (defect === "modality") s.output_modalities = ["audio"];
    h.transport.emit(e);
  } else {
    await configure(h);
    const e = h.transport.item(f.manifest.items[0]) as unknown as Record<string, unknown>, item = e.item as Record<string, unknown>;
    if (defect === "malformed-item") delete item.content;
    if (defect === "wrong-role") item.role = "system";
    if (defect === "wrong-content") item.content = [{ type: "input_text", text: "partial" }];
    if (defect === "incomplete") item.status = "incomplete";
    if (defect === "wrong-previous") e.previous_item_id = "unrelated";
    if (defect === "session-id") { const c = h.transport.config(); c.session.id = "sess_other"; h.transport.emit(c); }
    else if (defect === "provider" || defect === "overflow") h.transport.emit({ type: "error", event_id: "err_1", error: {
      event_id: f.manifest.items[0].event_id, code: defect === "overflow" ? "context_length_exceeded" : "invalid_request_error", message: "SECRET" } });
    else if (defect === "unexpected-response") h.transport.emit({ type: "response.created" });
    else h.transport.emit(e);
  }
  await flush(); assert.equal(h.controller.snapshot.state, "failed"); assert.equal(h.calls(), 0);
  assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0); assert.equal(h.transport.unsubscribes, 1);
  assert.ok(!JSON.stringify(h.states).includes("SECRET"));
  assert.equal(f.row.fullText, f.prepared.context.fullText);
  traces.push({ scenario: `failure-${defect}`, states: h.states, outbound: h.transport.outbound.length,
    callbacks: h.calls(), closes: h.transport.closes, timers: h.clock.timers.size });
});

test("item.added with in-progress status is schema-valid but never a final acknowledgment", async () => {
  const f = await fixture(), h = harness(f.input); h.begin(); await configure(h);
  for (const item of f.manifest.items) {
    const e = h.transport.item(item, "conversation.item.added"); e.item.status = "in_progress"; h.transport.emit(e);
  }
  await flush(); assert.equal(h.controller.snapshot.state, "priming"); assert.equal(h.controller.snapshot.acknowledged, 0);
  assert.equal(h.calls(), 0); h.controller.stop();
});

for (const stage of ["initial", "source", "final"] as const) for (const kind of ["throw", "reject", "closed", "never"] as const) {
  test(`Transport ${kind} during ${stage}: fixed deadline, no retries, safe teardown`, async () => {
    const f = await fixture(), h = harness(f.input);
    h.transport.sendAction = e => {
      const match = stage === "initial" ? e.event_id.endsWith("_config") : stage === "final" ? e.event_id.endsWith("_final") : e.type === "conversation.item.create";
      if (!match) return;
      if (kind === "throw") throw new Error("SECRET");
      if (kind === "reject") return Promise.reject(new Error("SECRET"));
      if (kind === "closed") { h.transport.open = false; h.transport.closed?.(); }
      if (kind === "never") return new Promise<void>(() => {});
    };
    h.begin(); await flush();
    if (stage !== "initial") await configure(h);
    if (stage === "final") await acknowledge(h, f.manifest);
    const count = h.transport.outbound.length;
    h.clock.tick(1000); await flush();
    assert.equal(h.controller.snapshot.state, "failed"); assert.equal(h.calls(), 0); assert.equal(h.transport.closes, 1);
    assert.equal(h.clock.timers.size, 0); assert.equal(h.transport.outbound.length, count);
    assert.ok(!JSON.stringify(h.states).includes("SECRET"));
  });
}

test("fixed total deadline is never extended by duplicate or unrelated events", async () => {
  const f = await fixture(), h = harness(f.input); h.begin(); h.clock.tick(400); await configure(h);
  for (let i = 0; i < 5; i++) { h.clock.tick(100); h.transport.emit(h.transport.config(f.manifest.configure));
    h.transport.emit({ type: "error", error: { event_id: "another_run", message: "unrelated" } });
    h.transport.emit({ type: "conversation.item.done", item: { id: "unrelated" } }); }
  assert.equal(h.controller.snapshot.state, "priming"); h.clock.tick(100);
  assert.equal(h.controller.snapshot.failure, "timeout"); assert.equal(h.clock.timers.size, 0); assert.equal(h.transport.closes, 1);
});

test("effective initial configuration duplicates ignore server defaults and property order, including during final phase", async () => {
  const f = await fixture("PDF", "B", "runA", "text"), h = harness(f.input); h.begin(); await configure(h);
  const duplicate = h.transport.config(f.manifest.configure);
  duplicate.session = Object.fromEntries(Object.entries(duplicate.session).reverse()) as typeof duplicate.session;
  Object.assign(duplicate.session, { expires_at: 2_000_000_000, max_output_tokens: "inf" });
  h.transport.emit(duplicate); await flush(); assert.equal(h.controller.snapshot.state, "priming");
  await acknowledge(h, f.manifest); h.transport.emit({ ...duplicate, event_id: "server_late_duplicate" }); await flush();
  assert.equal(h.calls(), 0); assert.equal(h.controller.snapshot.state, "priming");
  h.transport.emit(h.transport.config(f.manifest.finalize)); await flush(); assert.equal(h.calls(), 1); h.controller.stop();
});

test("closed channel before first send, throwing channel state and synchronous subscription closure all clean once", async () => {
  const f = await fixture();
  for (const mode of ["closed", "throws", "subscribe-closes"] as const) {
    const h = harness(f.input);
    if (mode === "closed") h.transport.open = false;
    if (mode === "throws") h.transport.isOpen = () => { throw new Error("SECRET"); };
    if (mode === "subscribe-closes") h.transport.subscribe = (_receive, closed) => { closed(); return () => { h.transport.unsubscribes++; }; };
    assert.equal(h.begin(), false); await flush();
    assert.equal(h.controller.snapshot.failure, "transport"); assert.equal(h.transport.closes, 1); assert.equal(h.transport.unsubscribes, 1);
    assert.equal(h.transport.outbound.length, 0); assert.equal(h.clock.timers.size, 0);
  }
});

test("default production controller and factory reject synthetic, absent, oversized and unverified budgets", async () => {
  const f = await fixture();
  for (const mutate of [() => {}, (i: PrimingInput) => { delete (i as { wireBudget?: unknown }).wireBudget; },
    (i: PrimingInput) => { (i as { preparedBudget: unknown }).preparedBudget = { status: "budget_unavailable" }; },
    (i: PrimingInput) => { (i as { preparedBudget: unknown }).preparedBudget = { status: "context_too_large" }; },
    (i: PrimingInput) => { (i.wireBudget as { verification: string }).verification = "unverified"; }]) {
    const input = structuredClone(f.input); mutate(input);
    assert.equal(validateAdmission(input), false);
    const h = harness(input, true); assert.equal(h.begin(), false); assert.equal(h.controller.snapshot.failure, "budget_unavailable");
    assert.equal(h.transport.outbound.length, 0); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
  }
  assert.throws(() => preparePrimingInput(f.prepared, "B", "runA", "voice", f.input.wireBudget));
});

test("verified-shaped accounting must match exact wire representation, binding and reserves (validation only; no real token proof)", async () => {
  const f = await fixture(); const input = structuredClone(f.input);
  assert.ok(input.preparedBudget.status === "offline_fit");
  const a = input.preparedBudget.accounting;
  const verified = { ...input, preparedBudget: { ...input.preparedBudget, status: "measured_fit", accounting: { ...a,
    binding: { ...a.binding, verification: "verified", unit: "tokens" } } },
    wireBudget: { ...input.wireBudget, status: "measured_fit", verification: "verified", unit: "tokens" } } as PrimingInput;
  assert.equal(validateAdmission(verified), true); // Structural validation only, never starts a production session.
  for (const patch of [{ measured: NaN }, { capacity: 0 }, { measured: -1 }, { measured: 2.5 }, { measured: Number.MAX_SAFE_INTEGER },
    { representation: "different" }, { tokenizer: "other" }, { model: "other" }, { historyAllowance: 101 }, { policyVersion: "other" }]) {
    assert.equal(validateAdmission({ ...verified, wireBudget: { ...verified.wireBudget, ...patch } }), false);
  }
});

test("stop synchronously from state observer, send hook, and pending send completion cannot revive a run", async () => {
  const f = await fixture();
  for (const phase of ["configuring", "priming", "send", "pending"] as const) {
    const h = harness(f.input);
    let release: (() => void) | undefined;
    const c = new (class extends PrimingController { protected override admission() { return "synthetic-test-only" as const; } })(h.clock,
      s => { if (s.state === phase) c.stop(); }, () => assert.fail("Must not prime"), 1000);
    h.transport.sendAction = () => { if (phase === "send") c.stop(); if (phase === "pending") return new Promise<void>(resolve => { release = resolve; }); };
    c.start({ runId: "runA", connectionId: "conn" }, f.input, h.transport);
    if (phase === "priming") h.transport.emit(h.transport.config());
    c.stop(); release?.(); await flush();
    assert.equal(c.snapshot.state, "stopped"); assert.equal(h.transport.closes, 1); assert.equal(h.clock.timers.size, 0);
  }
});

test("safe shared dependency trace and sanitized two-source transport matrix", async () => {
  const dependencies: Record<string, string[]> = {};
  for (const name of await readdir("src/shared")) {
    if (!name.startsWith("priming-")) continue;
    const source = await readFile(`src/shared/${name}`, "utf8");
    assert.doesNotMatch(source, /\b(fetch|WebSocket|RTCPeerConnection|getUserMedia|localStorage|sessionStorage|console\.log|process\.env)\b/);
    for (const line of source.split("\n")) if (/^import.*server\//.test(line)) assert.match(line, /^import type /);
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    assert.doesNotMatch(emitted, /from ["'][^"']*server\//);
    assert.doesNotMatch(emitted, /from ["'][^"']*tests\//);
    dependencies[name] = [...emitted.matchAll(/from ["']([^"']+)["']/g)].map(m => m[1]);
    assert.ok(dependencies[name].every(name => name.startsWith("./priming-")));
  }
  await mkdir(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12d/regression/07b`, { recursive: true });
  await writeFile(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12d/regression/07b/transport-matrix.json`, JSON.stringify({ environment: "local/scripted/synthetic-only",
    realTokens: "NOT_RUN", provider: "NOT_RUN", physicalDevice: "NOT_RUN", traces }, null, 2));
  await writeFile(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12d/regression/07b/dependency-audit.json`, JSON.stringify({ runtimeImports: dependencies,
    serverRuntimeImports: 0, testRuntimeImports: 0, newEndpoints: 0, runtimeIntegration: "none" }, null, 2));
});
