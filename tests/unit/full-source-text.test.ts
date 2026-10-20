import assert from "node:assert/strict";
import { test, after } from "node:test";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import { parseFullSourceArgs, fullSourceMain } from "../../scripts/full-source-text.ts";
import { MATRIX, runFullSource } from "../../scripts/lib/full-source-text.ts";
import { scriptedFullSource } from "../../scripts/lib/full-source-scripted.ts";

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
  assert.deepEqual(parseFullSourceArgs(["--live", "--allocation-07f-usd1"]), { live: true });
  for (const args of [["--live"], ["--model", "other"], ["--live", "--offline"], ["--env-file", ".env"]]) assert.throws(() => parseFullSourceArgs(args));
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
