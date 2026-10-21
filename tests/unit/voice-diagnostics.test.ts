import assert from "node:assert/strict";
import { test } from "node:test";
import { VoiceSetupDiagnostics, preparationRejections, type VoiceSetupReporter } from "../../src/shared/voice-diagnostics.ts";

test("08G diagnostics project a closed vocabulary and bounded numeric fields; no payload/error serialization", () => {
  let at = 100;
  const d = new VoiceSetupDiagnostics(() => at), runtime = d.report as (...args: unknown[]) => void;
  const secret = { toString() { throw new Error("No coercion"); }, toJSON() { throw new Error("No serialization"); } };
  runtime(secret, "invalid", secret); runtime("credential_http", secret, secret);
  runtime("credential_http", "http_error", secret, { apiKey: "sk-private", cookie: "private", owner: "private", sdp: "v=0", source: "private" });
  assert.deepEqual(d.snapshot, [{ stage: "credential_http", outcome: "http_error", elapsedMs: 0 }]);
  at = Infinity; d.report("sdp_http", "pending", NaN); at = -100; d.report("sdp_http", "ok", 999);
  assert.deepEqual(d.snapshot.at(-1), { stage: "sdp_http", outcome: "ok", elapsedMs: 0 });
  at = 1_000_000; for (let i = 0; i < 200; i++) d.report("source_items_ack", i % 2 ? "ok" : "pending");
  assert.ok(d.snapshot.length <= 32 && d.snapshot.every(r => r.elapsedMs <= 600_000));
  d.report("microphone_request", "pending"); d.finish("timeout"); const terminal = d.snapshot;
  assert.equal(terminal.at(-1)!.outcome, "timeout"); d.report("microphone_request", "ok");
  assert.equal(d.snapshot, terminal); assert.ok(Object.isFrozen(d.snapshot));
  const reporter: VoiceSetupReporter = d.report; reporter("sdp_http", "ok", 200);
  assert.equal(d.snapshot, terminal);
});

test("08I rejection reasons are closed, bounded, data-free and only attached to preparation invalid", () => {
  const d = new VoiceSetupDiagnostics(() => 100), runtime = d.report as (...args: unknown[]) => void;
  for (const reason of preparationRejections) {
    d.report("preparation_validation", "invalid", undefined, reason);
    assert.equal(d.snapshot.at(-1)!.reason, reason);
  }
  const hostile = { toJSON() { throw new Error("PRIVATE_SENTINEL"); }, toString() { throw new Error("PRIVATE_SENTINEL"); } };
  for (const value of [hostile, "PRIVATE_SENTINEL", "<script>PRIVATE_SENTINEL</script>", null, 123]) {
    runtime("preparation_validation", "invalid", undefined, value);
    assert.equal(d.snapshot.at(-1)!.reason, "unknown");
  }
  runtime("credential_validation", "invalid", undefined, "policy");
  assert.equal(d.snapshot.at(-1)!.reason, undefined);
  runtime("preparation_validation", "ok", undefined, "policy");
  assert.equal(d.snapshot.at(-1)!.reason, undefined);
  for (let i = 0; i < 200; i++) d.report("preparation_validation", "invalid", undefined, i % 2 ? "policy" : "envelope");
  assert.ok(d.snapshot.length <= 32);
  assert.doesNotMatch(JSON.stringify(d.snapshot), /PRIVATE_SENTINEL|script|cookie|owner|sourceId/);
  d.finish("invalid"); const rows = d.snapshot;
  d.report("preparation_validation", "invalid", undefined, "ticket_expired");
  assert.equal(d.snapshot, rows);
});
