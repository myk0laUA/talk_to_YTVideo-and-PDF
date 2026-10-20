import assert from "node:assert/strict";
import { test, after } from "node:test";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import { parseFullSourceArgs, fullSourceMain, validateOriginalAttempt, validateManualReview } from "../../scripts/full-source-text.ts";
import { MATRIX, runFullSource } from "../../scripts/lib/full-source-text.ts";
import { scriptedFullSource } from "../../scripts/lib/full-source-scripted.ts";
import { evaluateQuantities } from "../../scripts/lib/full-source-facts.ts";

let externalAttempts = 0;
const blocked = () => { externalAttempts++; throw new Error("Network disabled"); };
const originals = { fetch: globalThis.fetch, ws: globalThis.WebSocket, connect: net.connect, tls: tls.connect,
  http: http.request, https: https.request, socket: net.Socket.prototype.connect };
globalThis.fetch = blocked; globalThis.WebSocket = class { constructor() { blocked(); } } as unknown as typeof WebSocket;
net.connect = blocked as typeof net.connect; tls.connect = blocked as typeof tls.connect;
http.request = blocked as typeof http.request; https.request = blocked as typeof https.request;
net.Socket.prototype.connect = blocked as typeof net.Socket.prototype.connect;
after(() => { globalThis.fetch = originals.fetch; globalThis.WebSocket = originals.ws; net.connect = originals.connect;
  tls.connect = originals.tls; http.request = originals.http; https.request = originals.https;
  net.Socket.prototype.connect = originals.socket; assert.equal(externalAttempts, 0); });

test("07F explicit opt-in only; unknown flags cannot open anything", () => {
  assert.deepEqual(parseFullSourceArgs([]), { live: false });
  assert.deepEqual(parseFullSourceArgs(["--offline"]), { live: false });
  assert.deepEqual(parseFullSourceArgs(["--live", "--correction-07f-1"]), { live: true });
  for (const args of [["--live"], ["--live", "--allocation-07f-usd1"], ["--model", "other"], ["--live", "--offline"], ["--env-file", ".env"]]) assert.throws(() => parseFullSourceArgs(args));
});
test("07F default CLI runs only scripted matrix with network forbidden", async () => {
  const result = await fullSourceMain([]);
  assert.equal(result.outcome, "PASS"); assert.equal(result.reports.length, 4);
  assert.ok(result.reports.every(r => r.environment === "offline-scripted"));
});
for (const [kind, variant] of MATRIX) test(`07F full default modules ${kind}/${variant}, two questions, ACKs, hashes, retained transcript`, async () => {
  const r = await runFullSource(kind, variant, { environment: "offline-scripted", open: () => scriptedFullSource(kind) });
  assert.equal(r.outcome, "PASS", JSON.stringify(r)); assert.equal(r.exactReconstruction, true); assert.equal(r.provenance, true);
  assert.equal(r.sourceSha256Utf16, r.reconstructedSha256Utf16); assert.equal(r.counts.connections, 1);
  assert.equal(r.counts.responseRequests, 2); assert.equal(r.counts.closes, 1); assert.equal(r.counts.unsubscribes, 1);
  assert.equal(r.acknowledgments.effectiveUpdates, 2); assert.equal(r.acknowledgments.sourceItemDone, r.counts.sourceItems);
  assert.ok(r.facts.every(f => f.matches.every(Boolean))); assert.equal(r.transcript.retainedAfterStop, true);
  assert.equal(r.liveOverflow, "NOT_RUN"); assert.equal(r.productionReady, false);
  assert.ok(!JSON.stringify(r).includes("east cedar gate"));
});
for (const scenario of ["missing", "error", "disconnect"] as const) test(`07F ${scenario} cleanup and no response`, async () => {
  const r = await runFullSource("PDF", "B", { environment: "offline-scripted", timeoutMs: 50, open: () => scriptedFullSource("PDF", scenario) });
  assert.equal(r.outcome, "FAIL"); assert.equal(r.counts.responseRequests, 0); assert.equal(r.counts.closes, 1);
  assert.equal(r.counts.unsubscribes, 1); assert.ok(!JSON.stringify(r).includes("NEVER_REPORT_PROVIDER_BODY"));
});
test("07F cancellation before acquisition opens nothing", async () => {
  const a = new AbortController(); a.abort();
  const r = await runFullSource("PDF", "A", { environment: "offline-scripted", signal: a.signal, open: () => { throw new Error("Must not open"); } });
  assert.equal(r.failure, "cancelled"); assert.equal(r.counts.connections, 0);
  assert.equal(r.transcript.sampled, false); assert.equal(r.transcript.beforeStop, null);
  assert.equal(r.transcript.afterStop, null); assert.equal(r.transcript.userTurns, null);
});

const examples = {
  PDF: {
    pass: ["Trial A: 0.4 kWh/crate; Trial B: 0.3 kWh/crate.", "A: 0.400 kWh per crate; B: 0,300 kWh per crate.",
      "Trial A: 2/5 kWh/crate; Trial B: 3/10 kWh/crate.", "A: ⅖ kWh/crate; B: 9/30 kWh/crate.",
      "**Trial B:** 0.30 kWh/crate; **Trial A:** .40 kWh/crate.",
      "Trial A used 12 kWh for 30 crates = 0.4 kWh/crate; Trial B used 9 kWh for 30 crates = 0.3 kWh/crate."],
    reject: ["Trial A: 0.3 kWh/crate; Trial B: 0.4 kWh/crate.", "A: 0.5 kWh/crate; B: 0.3 kWh/crate.",
      "A: 0.4 kWh/crate and 0.3 kWh/crate; B: 0.3 kWh/crate.", "A: 4 kWh/crate; B: 3 kWh/crate.",
      "A: 0.4 minutes/crate; B: 0.3 minutes/crate.", "A: 0.4; B: 0.3. Unrelated 9 kWh/crate.",
      "0.4 kWh/crate, 0.3 kWh/crate. Trials A and B.", "Trial A: -0.4 kWh/crate; Trial B: +0.3 kWh/crate.",
      "Trial A: 0.4 kWh/crate. Trial A: 0.7 kWh/crate. Trial B: 0.3 kWh/crate.",
      "A: 2/0 kWh/crate; B: 3/10 kWh/crate.", "A: 10.4 kWh/crate; B: 20.3 kWh/crate.",
      "A: 0.3 is not 0.4 kWh/crate; B: 0.3 kWh/crate.", "A: 7 goats; weather: 0.4 kWh/crate; B: 0.3 kWh/crate."],
  },
  YOUTUBE: {
    pass: ["Method A: 6 minutes/lamp; Method B: 4 minutes/lamp.", "A: 6.00 minutes per lamp; B: 4,00 minutes per lamp.",
      "Method A: 18/3 minutes/lamp; Method B: 12/3 minutes/lamp.", "**Method B:** 4 min/lamp; **Method A:** 6.0 mins/lamp."],
    reject: ["Method A: 4 minutes/lamp; Method B: 6 minutes/lamp.", "A: 7 minutes/lamp; B: 4 minutes/lamp.",
      "A: 6 minutes/lamp and 5 minutes/lamp; B: 4 minutes/lamp.", "A: 6 lamps/minute; B: 4 lamps/minute.",
      "A: 6; B: 4. Unrelated 10 minutes/lamp.", "6 minutes/lamp, 4 minutes/lamp. Methods A and B.",
      "Method A: 6 minutes/lamp. Method A: 8 minutes/lamp. Method B: 4 minutes/lamp.",
      "A: 18 minutes/lamp; B: 12 minutes/lamp.", "A: -6 minutes/lamp; B: +4 minutes/lamp.",
      "A: 60 minutes/lamp; B: 40 minutes/lamp.", "A: not 6 minutes/lamp; B: 4 minutes/lamp.",
      "A: 9 goats; weather: 6 minutes/lamp; B: 4 minutes/lamp."],
  },
} as const;
for (const kind of ["PDF", "YOUTUBE"] as const) {
  for (const [i, answer] of examples[kind].pass.entries()) test(`07F evaluator ${kind} equivalent positive ${i + 1}`, () => {
    assert.ok(evaluateQuantities(kind, answer).every(q => q.status === "PASS"));
  });
  for (const [i, answer] of examples[kind].reject.entries()) test(`07F evaluator ${kind} negative ${i + 1}`, () => {
    assert.ok(evaluateQuantities(kind, answer).some(q => q.status !== "PASS"));
  });
  test(`07F evaluator ${kind} swapped labels and contradiction are definite failures`, () => {
    assert.ok(evaluateQuantities(kind, examples[kind].reject[0]).every(q => q.status === "FAIL"));
    assert.equal(evaluateQuantities(kind, examples[kind].reject[2])[0].status, "FAIL");
  });
}
test("07F correction preserves original allocation and binds manual review to retained evidence", () => {
  const original = { totalSessions: 1, totalResponses: 2, estimatedTextCostUsd: 0.00100752 };
  validateOriginalAttempt(original);
  for (const bad of [null, {}, { ...original, totalSessions: 0 }, { ...original, totalResponses: 8 }, { ...original, estimatedTextCostUsd: 0 }]) assert.throws(() => validateOriginalAttempt(bad));
  const review = { runId: "run", evidenceSha256Utf16: "hash", reviewedBy: "worker", classification: "PASS",
    rationaleCode: "synthetic_fixture_comparison", coverageAndFollowUp: true, labelValueUnits: true, stopRetention: true };
  assert.equal(validateManualReview(review, "run", "hash").classification, "PASS");
  for (const bad of [null, {}, { ...review, runId: "other" }, { ...review, evidenceSha256Utf16: "other" },
    { ...review, classification: "automatic" }, { ...review, labelValueUnits: false }]) assert.throws(() => validateManualReview(bad, "run", "hash"));
});
test("07F value-first scope and mixed units require review rather than guessed label binding", () => {
  for (const answer of ["0.4 kWh/crate for Trial A; 0.3 kWh/crate for Trial B.",
    "Trial A: 0.4 kWh/crate and 0.9 minutes/crate; Trial B: 0.3 kWh/crate."]) {
    assert.ok(evaluateQuantities("PDF", answer).every(q => q.status === "REVIEW_REQUIRED"));
  }
  for (const answer of ["A: - 0.4 kWh/crate; B: 0.3 kWh/crate.", "A: 1 2/5 kWh/crate; B: 0.3 kWh/crate."]) {
    assert.equal(evaluateQuantities("PDF", answer)[0].status, "REVIEW_REQUIRED");
  }
  for (const answer of ["A: - 6 minutes/lamp; B: 4 minutes/lamp.", "A: 1 18/3 minutes/lamp; B: 4 minutes/lamp."]) {
    assert.equal(evaluateQuantities("YOUTUBE", answer)[0].status, "REVIEW_REQUIRED");
  }
});
test("07F quantity equivalence is exact, including beyond binary floating-point precision", () => {
  for (const [kind, answer] of [
    ["PDF", "A: 0.4000000000005 kWh/crate; B: 0.3 kWh/crate."],
    ["PDF", "A: 400000000000000000001/1000000000000000000000 kWh/crate; B: 0.3 kWh/crate."],
    ["YOUTUBE", "A: 6.0000000000005 minutes/lamp; B: 4 minutes/lamp."],
    ["YOUTUBE", "A: 180000000000000000001/30000000000000000000 minutes/lamp; B: 4 minutes/lamp."],
  ] as const) assert.equal(evaluateQuantities(kind, answer)[0].status, "FAIL");
  assert.equal(evaluateQuantities("YOUTUBE", "A: 6,000 minutes/lamp; B: 4 minutes/lamp.")[0].status, "REVIEW_REQUIRED");
  for (const kind of ["PDF", "YOUTUBE"] as const) {
    const answer = kind === "PDF" ? "A: 400000000000000000000/1000000000000000000000 kWh/crate; B: 0.30000000000000000000 kWh/crate."
      : "A: 180000000000000000000/30000000000000000000 minutes/lamp; B: 4.00000000000000000000 minutes/lamp.";
    assert.ok(evaluateQuantities(kind, answer).every(q => q.status === "PASS"));
  }
});
for (const [name, second, expected] of [
  ["equivalent", "Trial A: 2/5 kWh/crate; Trial B: 0.300 kWh/crate; Zoë.", "PASS"],
  ["ambiguous", "0.4 kWh/crate, 0.3 kWh/crate respectively for A and B. Zoë.", "REVIEW_REQUIRED"],
  ["wrong", "A: 0.3 kWh/crate; B: 0.4 kWh/crate; Zoë.", "FAIL"],
] as const) test(`07F ${name} retains actual pre/post Stop text separately from safe summary`, async () => {
  let saved: import("../../scripts/lib/full-source-text.ts").SyntheticEvidence | undefined;
  const r = await runFullSource("PDF", "B", { environment: "offline-scripted",
    open: () => scriptedFullSource("PDF", "success", ["06:15; Iris; east cedar gate.", second]),
    retainSyntheticEvidence: async e => { saved = e; } });
  assert.equal(r.outcome, expected); assert.ok(saved?.beforeStop); assert.ok(saved?.afterStop);
  assert.deepEqual(saved.beforeStop.turns, saved.afterStop.turns); assert.equal(saved.beforeStop.turns.length, 4);
  assert.equal(saved.beforeStop.turns[3].text, second); assert.equal(saved.sourceSha256Utf16, r.sourceSha256Utf16);
  assert.equal(r.transcript.beforeStop?.userTurns, 2); assert.equal(r.transcript.afterStop?.assistantTurns, 2);
  assert.equal(r.transcript.afterStop?.phase, "ended"); assert.equal(r.counts.closes, 1);
  assert.ok(!JSON.stringify(r).includes(second));
});
test("07F failed evidence persistence fails closed", async () => {
  const r = await runFullSource("PDF", "A", { environment: "offline-scripted", open: () => scriptedFullSource("PDF"),
    retainSyntheticEvidence: async () => { throw Error("NEVER_REPORT_STORAGE_BODY"); } });
  assert.equal(r.outcome, "FAIL"); assert.equal(r.failure, "evidence_write_failed");
  assert.ok(!JSON.stringify(r).includes("NEVER_REPORT_STORAGE_BODY"));
});
test("07F fact mismatch stops after two responses and samples failure transcript without answer text", async () => {
  const r = await runFullSource("PDF", "A", { environment: "offline-scripted", open: () => scriptedFullSource("PDF", "fact-mismatch") });
  assert.equal(r.failure, "fact_mismatch"); assert.equal(r.counts.responseRequests, 2); assert.equal(r.usageComplete, true);
  assert.equal(r.transcript.sampled, true); assert.equal(r.transcript.assistantTurns, 2);
  assert.equal(r.transcript.retainedAfterStop, true); assert.equal(r.counts.closes, 1);
});
test("07F cancellation/late event cannot revive or generate", async () => {
  const a = new AbortController(); let stale: ((e: unknown) => void) | undefined;
  const r = await runFullSource("PDF", "B", { environment: "offline-scripted", signal: a.signal, open: () => ({
    isOpen: () => true, send: () => { queueMicrotask(() => a.abort()); }, close: () => {},
    subscribe: receive => { stale = receive; return () => {}; },
  }) });
  const counts = structuredClone(r.counts); stale?.({ type: "session.updated", event_id: "late" });
  assert.equal(r.failure, "cancelled"); assert.equal(r.counts.closes, 1); assert.equal(r.counts.responseRequests, 0);
  assert.deepEqual(r.counts, counts);
});
