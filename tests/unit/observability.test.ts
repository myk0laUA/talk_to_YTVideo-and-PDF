import assert from "node:assert/strict";
import { test } from "node:test";
import { instrument, measured, metricSnapshot, observe } from "../../src/server/observability.ts";

test("operational metrics are opt-in, bounded, resettable and retain no request/error data", async () => {
  const previous = process.env.OPERATIONAL_METRICS;
  try {
    process.env.OPERATIONAL_METRICS = "false";
    metricSnapshot(true); observe("db.query", 1);
    assert.deepEqual(metricSnapshot().operations, {});
    process.env.OPERATIONAL_METRICS = "true";
    observe("db.query", NaN); observe("db.query", -1);
    observe("db.query", 5); observe("db.query", 10001, true);
    const request = new Request("https://private.invalid/secret", { headers: { cookie: "PRIVATE_COOKIE" } });
    const handler = instrument("http.source.read", async (request: Request) => {
      assert.equal(request.headers.get("cookie"), "PRIVATE_COOKIE");
      return Response.json({ secret: "PRIVATE_DOCUMENT" }, { status: 503 });
    });
    assert.equal((await handler(request)).status, 503);
    const error = Error("PRIVATE_ERROR");
    await assert.rejects(measured("db.source.get", async () => { throw error; }), e => e === error);
    const snapshot = metricSnapshot(true);
    assert.equal(snapshot.operations["db.query"].count, 2);
    assert.equal(snapshot.operations["db.query"].errors, 1);
    assert.equal(snapshot.operations["db.query"].buckets.reduce((a, b) => a + b, 0), 2);
    assert.equal(snapshot.operations["http.source.read"].errors, 1);
    assert.equal(snapshot.operations["db.source.get"].errors, 1);
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE|private.invalid|cookie/);
    assert.deepEqual(metricSnapshot().operations, {});
  } finally { if (previous === undefined) delete process.env.OPERATIONAL_METRICS; else process.env.OPERATIONAL_METRICS = previous; }
});
