import assert from "node:assert/strict";
import { test, after, mock } from "node:test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import tls from "node:tls";
import ts from "typescript";
import { DEFAULT_LIMITS, PROBE_MODELS, runProbe, probeSequence, sanitizeUsage,
  type ProbeOptions, type ProbeReport } from "../../scripts/lib/realtime-probe.ts";
import { parseProbeArguments, probeMain } from "../../scripts/realtime-probe.ts";
import { openLiveProbe, readProbeKey, type ProbeSocket, type SocketConstructor } from "../../scripts/lib/realtime-probe-live.ts";
import type { PrimingClock, PrimingTransport } from "../../src/shared/priming-controller.ts";

// Every network constructor available to the implementation is blocked throughout this test process.
let externalAttempts = 0;
const blocked = () => { externalAttempts++; throw new Error("Network prohibited in probe tests."); };
mock.method(globalThis, "fetch", blocked);
mock.method(https, "request", blocked); mock.method(http, "request", blocked);
mock.method(net, "connect", blocked); mock.method(net, "createConnection", blocked); mock.method(tls, "connect", blocked);
mock.method(globalThis, "WebSocket", blocked);
const traces: { label: string; report: ProbeReport }[] = [];
const base = (overrides: Partial<ProbeOptions> = {}): ProbeOptions => ({ model: "gpt-realtime-2.1-mini", phase: "response", ...DEFAULT_LIMITS, ...overrides });
const secret = "sk-synthetic-SECRET-MUST-NOT-LEAK";
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function harness(options = base()) {
  let now = Date.UTC(2026, 9, 20, 19), serial = 0;
  const timers = new Map<number, { callback: () => void; at: number }>();
  const clock: PrimingClock = { now: () => now,
    setTimeout: (callback, ms) => { const handle = ++serial; timers.set(handle, { callback, at: now + ms }); return handle; },
    clearTimeout: handle => { timers.delete(handle as number); } };
  let receiver: ((event: unknown) => void) | undefined, lost: (() => void) | undefined;
  let late: ((event: unknown) => void) | undefined;
  const state = { opens: 0, closes: 0, disposals: 0, isOpen: true, throwSend: false, rejectSend: false, throwSubscribe: false,
    throwClose: false, throwDispose: false, pendingSend: false };
  const sent: Record<string, unknown>[] = [];
  let rejectPending: ((error: Error) => void) | undefined;
  const transport: PrimingTransport = {
    isOpen: () => state.isOpen,
    send: text => { sent.push(JSON.parse(text)); if (state.throwSend) throw new Error(secret);
      if (state.rejectSend) return Promise.reject(new Error(secret));
      if (state.pendingSend) return new Promise<void>((_, reject) => { rejectPending = reject; }); },
    close: () => { state.closes++; state.isOpen = false; if (state.throwClose) throw new Error(secret); },
    subscribe: (receive, closed) => { if (state.throwSubscribe) throw new Error(secret); receiver = receive; late = receive; lost = closed;
      return () => { state.disposals++; receiver = undefined; lost = undefined; if (state.throwDispose) throw new Error(secret); }; },
  };
  const controller = new AbortController();
  const promise = runProbe(options, { environment: "mocked", clock, signal: controller.signal, open: () => { state.opens++; return transport; } });
  const emit = (event: unknown) => receiver?.(event);
  const sequence = probeSequence(options);
  const session = { id: "session_test", type: "realtime", object: "realtime.session", model: options.model };
  const created = () => emit({ type: "session.created", session });
  const updated = (changes = {}) => emit({ type: "session.updated", session: { ...session, ...sequence.configure.session, ...changes } });
  const ack = (question = false, type = "conversation.item.done", changes = {}) => {
    const event = question ? sequence.question : sequence.context;
    emit({ type, previous_item_id: event.previous_item_id ?? null, item: { ...event.item, status: "completed" }, ...changes });
  };
  const ready = () => { created(); updated(); ack(); if (options.phase === "response") ack(true); };
  const responseCreated = () => emit({ type: "response.created", response: { id: "response_test" } });
  const usage = { input_tokens: 100, output_tokens: 4, total_tokens: 104,
    input_token_details: { text_tokens: 100, audio_tokens: 0, image_tokens: 0, cached_tokens: 0,
      cached_tokens_details: { text_tokens: 0, audio_tokens: 0, image_tokens: 0 } }, output_token_details: { text_tokens: 4, audio_tokens: 0 } };
  const done = (changes = {}) => emit({ type: "response.done", response: { id: "response_test", status: "completed", usage,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "cobalt" }] }], ...changes } });
  const advance = (ms: number) => { now += ms; for (const [handle, timer] of timers) if (timer.at <= now) { timers.delete(handle); timer.callback(); } };
  const result = async (label: string, expected = "PASS", failure?: string) => {
    const report = await promise; assert.equal(report.outcome, expected); assert.equal(report.failure, failure);
    assert.ok(report.counts.connections <= 1); assert.ok(report.counts.outboundEvents <= 4); assert.ok(report.counts.responsesRequested <= 1);
    assert.ok(report.counts.requestUnits <= options.maxRequests); assert.equal(report.counts.closes, 1);
    assert.equal(state.closes, 1); assert.equal(timers.size, 0); assert.equal(report.liveResult, "NOT_RUN");
    assert.doesNotMatch(JSON.stringify(report), /SECRET|source_text|raw_credentials|provider_private|cobalt|observatory|Bearer/u);
    traces.push({ label, report }); return report;
  };
  return { options, state, sent, timers, promise, emit, created, updated, ack, ready, responseCreated, done, usage, advance, controller, result,
    late: (event: unknown) => late?.(event), disconnect: () => lost?.(), rejectPending: () => rejectPending?.(new Error(secret)) };
}

for (const model of PROBE_MODELS) for (const phase of ["acknowledgments", "response"] as const) {
  test(`${model}/${phase}: exact bounded sequence, acknowledgments and numeric report`, async () => {
    const h = harness(base({ model, phase, maxRequests: phase === "response" ? 5 : 3 })); h.created();
    h.emit({ type: "conversation.created", conversation: { id: "conversation_test", object: "realtime.conversation" } });
    assert.equal(h.sent.length, 1); h.updated(); assert.equal(h.sent.length, 2);
    h.ack(false, "conversation.item.added"); assert.equal(h.sent.length, 2);
    h.ack();
    if (phase === "response") { assert.equal(h.sent.length, 3); h.ack(true, "conversation.item.added"); assert.equal(h.sent.length, 3);
      h.ack(true); assert.equal(h.sent.length, 4); h.responseCreated();
      for (const type of ["response.output_item.added", "response.content_part.added", "response.output_text.delta", "response.output_text.done", "response.content_part.done", "response.output_item.done"]) h.emit({ type, response_id: "response_test", delta: secret });
      h.emit({ type: "conversation.item.done", item: { type: "message", role: "assistant" } });
      h.done();
    }
    const report = await h.result(`${model}/${phase}`);
    assert.deepEqual(report.acknowledgments, { sessionCreated: true, sessionUpdated: true, contextItemDone: true, questionItemDone: phase === "response" });
    assert.equal(report.counts.requestUnits, phase === "response" ? 5 : 3); assert.equal(h.state.disposals, 1);
    assert.equal(report.estimatedTextCostUsd, phase === "response" ? model.endsWith("mini") ? 0.0000696 : 0.000496 : null);
    assert.deepEqual(h.sent.map(e => e.type), phase === "response" ? ["session.update", "conversation.item.create", "conversation.item.create", "response.create"] : ["session.update", "conversation.item.create"]);
    const settings = h.sent[0].session as Record<string, unknown>;
    assert.equal(settings.max_output_tokens, 64); assert.equal(settings.truncation, "disabled");
    assert.deepEqual(settings.audio, { input: { turn_detection: null } }); assert.deepEqual(settings.tools, []);
    assert.equal(settings.tracing, null); assert.deepEqual(settings.output_modalities, ["text"]);
  });
}

for (const options of [base({ model: "unknown" as ProbeOptions["model"] }), base({ phase: "bad" as ProbeOptions["phase"] }),
  ...[0, 65, Infinity, NaN, 1.5].map(maxOutputTokens => base({ maxOutputTokens })),
  ...[0, 99, 15_001, Infinity, NaN].map(timeoutMs => base({ timeoutMs })),
  ...[0, 4, 6, NaN, Infinity].map(maxRequests => base({ maxRequests }))]) {
  test(`invalid options fail before factory (${JSON.stringify(options)})`, () => {
    let opens = 0; assert.throws(() => runProbe(options, { environment: "live", open: () => { opens++; throw Error(secret); } })); assert.equal(opens, 0);
  });
}
for (const args of [["--live"], ["--live", "--model", "gpt-realtime-2.1-mini"], ["--live", "--phase", "response"],
  ["--live", "--offline"], ["--live", "--live"], ["--model", "gpt-realtime-2.1-mini", "--model", "gpt-realtime-2.1"],
  ["--key", secret], ["--timeout-ms", "16000"], ["--max-requests", "6"], ["--model", secret], ["--phase"], ["--endpoint", "https://invalid"]]) {
  test(`CLI rejects invalid/ambiguous arguments ${args[0]}/${args.length}`, () => { assert.throws(() => parseProbeArguments(args)); });
}

test("default/offline CLI cannot read keys or files or contact network", async () => {
  // A trapped getter proves neither offline execution nor preflight reaches key reading.
  // process.env disallows accessors; use a Proxy without reading any original values.
  const environment = process.env;
  process.env = new Proxy(environment, { get(target, key) { if (["OPENAI_API_KEY", "DATABASE_URL"].includes(String(key))) throw new Error("Forbidden environment access"); return Reflect.get(target, key); } });
  try {
    for (const args of [[], ["--offline"], ["--offline", "--model", "gpt-realtime-2.1", "--phase", "acknowledgments"]]) {
      const report = await probeMain(args); assert.equal(report.environment, "mocked"); assert.equal(report.outcome, "PASS"); assert.equal(report.liveResult, "NOT_RUN");
    }
    await assert.rejects(probeMain(["--live", "--model", "bad"]));
  } finally { process.env = environment; }
});

for (const stage of ["created", "updated", "context", "question", "response"] as const) {
  function atStage(h: ReturnType<typeof harness>) { if (stage !== "created") h.created(); if (!["created", "updated"].includes(stage)) h.updated(); if (["question", "response"].includes(stage)) h.ack(); if (stage === "response") h.ack(true); }
  test(`${stage}: fixed deadline, cleanup and late events`, async () => {
    const h = harness(); atStage(h); h.advance(14_999); h.emit({ type: "rate_limits.updated" }); h.advance(1);
    const report = await h.result(`${stage}/timeout`, "FAIL", "timeout"); const count = h.sent.length;
    h.late({ type: "session.created", session: { model: secret } }); h.late({ type: "response.done" }); h.created(); h.done();
    assert.equal(h.sent.length, count); assert.equal(report.elapsedMs, 15_000); assert.equal(h.state.disposals, 1);
  });
  test(`${stage}: cancellation closes once and cannot retry`, async () => {
    const h = harness(); atStage(h); h.controller.abort(); h.disconnect(); h.advance(30_000);
    await h.result(`${stage}/cancelled`, "CANCELLED", "cancelled"); assert.equal(h.state.opens, 1);
  });
  test(`${stage}: unsolicited response is rejected or only one response accepted`, async () => {
    const h = harness(); atStage(h); h.responseCreated(); if (stage === "response") h.responseCreated();
    await h.result(`${stage}/unexpected-response`, "FAIL", "protocol");
  });
}

for (const code of ["invalid_api_key", "context_length_exceeded", "rate_limit_exceeded", secret]) {
  test(`provider errors are authored categories ${code === secret ? "redacted" : code}`, async () => {
    const h = harness(); h.created(); h.emit({ type: "error", error: { code, message: secret, event_id: secret, raw_credentials: secret } });
    await h.result(`provider/${code === secret ? "redacted" : code}`, "FAIL", code === "context_length_exceeded" ? "context_limit" : "provider");
  });
}
for (const changes of [{ model: "gpt-realtime" }, { truncation: "auto" }, { max_output_tokens: "inf" }, { tools: [{ secret }] },
  { output_modalities: ["audio"] }, { tool_choice: "auto" }, { tracing: "auto" }, { audio: { input: { turn_detection: { type: "server_vad" } } } },
  { instructions: secret }, { id: "wrong_session" }, { reasoning: { effort: "high" } }]) {
  test(`effective settings must match (${Object.keys(changes)[0]})`, async () => {
    const h = harness(); h.created(); h.updated(changes); await h.result(`config/${Object.keys(changes)[0]}`, "FAIL", "configuration"); assert.equal(h.sent.length, 1);
  });
}
for (const event of [null, "text", {}, { type: "private_event_" + secret }, { type: "input_audio_buffer.speech_started" },
  { type: "response.output_audio.delta", delta: secret }, { type: "session.updated" }]) {
  test(`malformed/unexpected event ${typeof event}/${Object.keys(event ?? {}).length}`, async () => {
    const h = harness(); h.emit(event); await h.result("unexpected", "FAIL", event && typeof event === "object" && "type" in event && event.type === "session.updated" ? "configuration" : "protocol");
  });
}
test("wrong/partial/missing item ACK cannot trigger generation", async () => {
  const h = harness(); h.created(); h.updated(); h.ack(false, "conversation.item.added");
  assert.equal(h.sent.length, 2); h.ack(false, "conversation.item.done", { item: { id: "probe_context", status: "incomplete", role: "user" } });
  await h.result("item/invalid", "FAIL", "protocol"); assert.equal(h.sent.length, 2);
});
test("wrong predecessor on question cannot trigger generation", async () => {
  const h = harness(); h.created(); h.updated(); h.ack(); h.ack(true, "conversation.item.done", { previous_item_id: "other_item" });
  await h.result("item/predecessor", "FAIL", "protocol"); assert.equal(h.sent.length, 3);
});
test("duplicate ACK cannot trigger extra events or responses", async () => {
  const h = harness(); h.created(); h.updated(); h.ack(); h.ack(); await h.result("item/duplicate", "FAIL", "protocol"); assert.equal(h.sent.length, 3);
});
for (const event of [{ type: "rate_limits.updated", private: "x".repeat(65_536) }, ...Array.from({ length: 1 }, () => ({ type: "rate_limits.updated" }))]) {
  test(`inbound size/count cap ${JSON.stringify(event).length > 100 ? "size" : "count"}`, async () => {
    const h = harness(); for (let i = 0; i < 129; i++) h.emit(event);
    await h.result("inbound/cap", "FAIL", JSON.stringify(event).length > 100 ? "protocol" : "event_limit");
  });
}
for (const failure of ["throwSend", "rejectSend", "isOpen", "disconnect", "pendingSend"] as const) {
  test(`transport ${failure} is bounded and redacted`, async () => {
    const h = harness();
    if (failure === "isOpen") h.state.isOpen = false;
    else if (failure !== "disconnect") h.state[failure] = true;
    if (failure === "disconnect") h.disconnect(); else h.created();
    if (failure === "pendingSend") { h.controller.abort(); h.rejectPending(); }
    await flush(); await h.result(`transport/${failure}`, failure === "pendingSend" ? "CANCELLED" : "FAIL", failure === "pendingSend" ? "cancelled" : "transport");
    assert.equal(h.state.opens, 1);
  });
}
test("cleanup exceptions cannot retain timer or prevent close", async () => {
  const h = harness(); h.state.throwClose = true; h.state.throwDispose = true; h.controller.abort();
  await h.result("cleanup/throws", "CANCELLED", "cancelled"); assert.equal(h.state.disposals, 1);
});
test("already cancelled performs zero connection/key work", async () => {
  const controller = new AbortController(); controller.abort(); let opens = 0;
  const report = await runProbe(base(), { environment: "mocked", signal: controller.signal, open: () => { opens++; throw Error(secret); } });
  assert.equal(opens, 0); assert.equal(report.counts.connections, 0); assert.equal(report.counts.closes, 0); assert.equal(report.outcome, "CANCELLED");
});
test("factory/subscribe exceptions are sanitized, timers cleared and acquired resource closed", async () => {
  for (const at of ["factory", "subscribe"]) {
    let timers = 0, closes = 0;
    const clock: PrimingClock = { now: () => 0, setTimeout: () => { timers++; return 1; }, clearTimeout: () => { timers--; } };
    const report = await runProbe(base(), { environment: "mocked", clock, open: () => {
      if (at === "factory") throw Error(secret);
      return { isOpen: () => true, send: () => {}, subscribe: () => { throw Error(secret); }, close: () => { closes++; } };
    } });
    assert.equal(report.failure, "transport"); assert.equal(timers, 0); assert.equal(closes, at === "subscribe" ? 1 : 0);
    assert.doesNotMatch(JSON.stringify(report), /SECRET/);
  }
});
test("synchronous subscription failure disposes the returned subscription once", async () => {
  let closes = 0, disposals = 0;
  const report = await runProbe(base(), { environment: "mocked", open: () => ({ isOpen: () => true, send: () => {},
    subscribe: receive => { receive({ type: "error", error: { message: secret } }); return () => { disposals++; }; }, close: () => { closes++; } }) });
  assert.equal(report.failure, "provider"); assert.equal(closes, 1); assert.equal(disposals, 1);
});
test("unsafe runtime debug logging fails before live key reading", async () => {
  const environment = process.env;
  process.env = new Proxy(environment, { get(target, key) {
    if (key === "NODE_DEBUG") return "http";
    if (key === "OPENAI_API_KEY") assert.fail("Must reject debug before reading key");
    return Reflect.get(target, key);
  } });
  try { await assert.rejects(probeMain(["--live", "--model", "gpt-realtime-2.1-mini", "--phase", "response"])); }
  finally { process.env = environment; }
});
for (const changes of [{ status: "failed", status_details: { error: { message: secret } } }, { status: "incomplete" },
  { id: "wrong_response" }, { usage: undefined }, { usage: { input_tokens: -1, output_tokens: 2, total_tokens: 1 } },
  { output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: secret }] }] },
  { output: [{ type: "function_call", arguments: secret }] },
  { usage: { input_tokens: 100, output_tokens: 65, total_tokens: 165 } },
  { usage: { input_tokens: 100, output_tokens: 4, total_tokens: 104, input_token_details: { audio_tokens: 2 } } }]) {
  test(`response failure ${Object.keys(changes)[0]}/${JSON.stringify(changes).length} preserves accounting and closes`, async () => {
    const h = harness(); h.ready(); h.responseCreated(); h.done(changes); const report = await h.promise;
    assert.equal(report.outcome, "FAIL"); assert.equal(h.state.closes, 1); assert.equal(h.timers.size, 0); assert.doesNotMatch(JSON.stringify(report), /SECRET|cobalt|function_call|provider_private/);
    traces.push({ label: "response/failure", report });
  });
}
test("usage whitelist strips secrets, accepts numeric cache detail, rejects malformed totals", () => {
  const value = { input_tokens: 100, output_tokens: 4, total_tokens: 104, secret,
    input_token_details: { text_tokens: 100, cached_tokens: 20, cached_tokens_details: { text_tokens: 20, secret }, secret },
    output_token_details: { text_tokens: 4, secret } };
  assert.doesNotMatch(JSON.stringify(sanitizeUsage(value)), /SECRET|secret/);
  for (const bad of [null, {}, { ...value, total_tokens: NaN }, { ...value, output_token_details: { text_tokens: 100 } }]) assert.equal(sanitizeUsage(bad), null);
});

class FakeSocket extends EventEmitter implements ProbeSocket {
  static instances: FakeSocket[] = [];
  static options: ConstructorParameters<SocketConstructor>[1];
  readyState = 1; terminated = 0; sent: string[] = [];
  constructor(url: string, options: ConstructorParameters<SocketConstructor>[1]) {
    super(); assert.match(url, /^wss:\/\/api\.openai\.com\/v1\/realtime\?model=gpt-realtime-2\.1-mini$/); FakeSocket.options = options; FakeSocket.instances.push(this);
  }
  send(text: string) { this.sent.push(text); }
  terminate() { this.terminated++; this.emit("error", new Error(secret)); this.emit("close"); }
}
test("live adapter uses one pinned endpoint, authenticated header, no retries/redirects/compression and cleans up", () => {
  const transport = openLiveProbe(base(), secret, FakeSocket); const socket = FakeSocket.instances.at(-1)!;
  const opts = FakeSocket.options;
  assert.equal(opts.followRedirects, false); assert.equal(opts.perMessageDeflate, false); assert.equal(opts.handshakeTimeout, 15_000); assert.equal(opts.maxPayload, 65_536);
  assert.equal(opts.headers.Authorization, `Bearer ${secret}`);
  let received = 0, closed = 0; const dispose = transport.subscribe(() => { received++; }, () => { closed++; });
  socket.emit("message", Buffer.from('{"type":"session.created"}'), false); assert.equal(received, 1);
  dispose(); transport.close(); transport.close(); socket.emit("message", Buffer.from("{}"), false);
  assert.equal(socket.terminated, 1); assert.equal(received, 1); assert.equal(closed, 0); assert.equal(socket.eventNames().length, 0);
});
test("missing key/invalid limits fail before socket constructor", () => {
  const before = FakeSocket.instances.length;
  for (const key of ["", "bad", "sk-\n" + secret]) assert.throws(() => openLiveProbe(base(), key, FakeSocket));
  assert.throws(() => openLiveProbe(base({ maxRequests: 6 }), secret, FakeSocket)); assert.equal(FakeSocket.instances.length, before);
});
test("live key preflight uses injected synthetic environment/files only; missing/duplicate/bad key never opens socket", async () => {
  const before = FakeSocket.instances.length;
  for (const text of ["", "DATABASE_URL=synthetic-do-not-load", "OPENAI_API_KEY=", "OPENAI_API_KEY=bad", `OPENAI_API_KEY=${secret}\nOPENAI_API_KEY=${secret}`]) {
    await assert.rejects(readProbeKey({ environment: {}, readKeyFile: async () => text }));
  }
  await assert.rejects(readProbeKey({ environment: {}, readKeyFile: async () => { throw Error(secret); } }));
  assert.equal(await readProbeKey({ environment: {}, readKeyFile: async () => `DATABASE_URL=unused\nOPENAI_API_KEY="${secret}"\nOTHER=unused` }), secret);
  assert.equal(await readProbeKey({ environment: { OPENAI_API_KEY: secret }, readKeyFile: async () => assert.fail("Must not read file") }), secret);
  assert.equal(FakeSocket.instances.length, before);
});
test("untyped option metadata never enters report; caller cannot mutate copied limits", async () => {
  const options = { ...base(), raw_credentials: secret }; const h = harness(options);
  options.maxRequests = 1; h.ready(); h.responseCreated(); h.done();
  const report = await h.promise; assert.equal(report.outcome, "PASS"); assert.equal(report.counts.requestUnits, 5);
  assert.doesNotMatch(JSON.stringify(report), /raw_credentials|SECRET/);
});
for (const data of [Buffer.from("not-json"), Buffer.alloc(65_537), "string-is-not-ws-buffer"]) {
  test(`adapter malformed frames close via owner ${data.length}`, () => {
    const transport = openLiveProbe(base(), secret, FakeSocket); const socket = FakeSocket.instances.at(-1)!;
    let failures = 0; transport.subscribe(() => assert.fail(), () => { failures++; transport.close(); });
    socket.emit("message", data, false); assert.equal(failures, 1); assert.equal(socket.terminated, 1);
  });
}
test("developer files emit no src/server runtime import; application contains no probe import", async () => {
  for (const file of ["scripts/realtime-probe.ts", "scripts/lib/realtime-probe.ts", "scripts/lib/realtime-probe-live.ts", "scripts/lib/realtime-probe-scripted.ts"]) {
    const source = await readFile(file, "utf8");
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    assert.doesNotMatch(emitted, /from ["'][^"']*src\//);
  }
  // Protected production admission remains fail-closed; no probe seam is added to it.
  for (const file of ["src/shared/priming-admission.ts", "src/shared/priming-controller.ts", "src/server/context/model-policy.ts", "src/server/context/model-measurement.ts"]) {
    assert.doesNotMatch(await readFile(file, "utf8"), /realtime-probe|07d/);
  }
});

after(async () => {
  assert.equal(externalAttempts, 0);
  await mkdir("artifacts/local/07d", { recursive: true });
  await writeFile("artifacts/local/07d/scripted-matrix.json", JSON.stringify({ environment: "local-scripted-only", liveResult: "NOT_RUN",
    recordedAt: new Date().toISOString(), externalAttempts, traces }, null, 2) + "\n");
});
