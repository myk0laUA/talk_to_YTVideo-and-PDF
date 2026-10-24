import assert from "node:assert/strict";
import { test } from "node:test";
import { Admission } from "../../src/server/proof/admission.ts";
import { pdfLimits } from "../../src/server/pdf/handler.ts";
import { CaptionAdmission, captionLimits } from "../../src/server/captions/admission.ts";
import { sourceAdmissionFailure } from "../../src/server/sources/admission.ts";

for (const kind of ["PDF", "captions"] as const) test(`${kind}: repeated imports allow 120 attempts per visitor and recover next hour`, () => {
  const limits = kind === "PDF" ? pdfLimits : captionLimits;
  const admission = kind === "PDF" ? new Admission(limits) : new CaptionAdmission(limits);
  const now = 1_800_000_000_000;
  for (let i = 0; i < 120; i++) {
    const release = admission.acquire("same-browser", "unverified-network", now);
    assert.ok(release, `attempt ${i + 1}`); release();
  }
  assert.equal(admission.acquire("same-browser", "unverified-network", now), null);
  const other = admission.acquire("another-browser", "unverified-network", now);
  assert.ok(other); other();
  const recovered = admission.acquire("same-browser", "unverified-network", now + limits.windowMs);
  assert.ok(recovered); recovered();
});

for (const kind of ["PDF", "captions"] as const) test(`${kind}: window recovery survives old lifetime ceiling and 30 days without restart`, () => {
  const limits = kind === "PDF" ? pdfLimits : captionLimits;
  const admission = kind === "PDF" ? new Admission(limits) : new CaptionAdmission(limits);
  const start = 1_800_000_000_000;
  // Every admitted attempt is charged, including ones whose bodies will prove invalid.
  for (let window = 0; window < 10; window++) {
    const now = start + window * limits.windowMs;
    for (let i = 0; i < limits.global; i++) {
      const release = admission.acquire(`${window}-${i}`, "network", now);
      assert.ok(release, `window ${window}, attempt ${i}`); release();
    }
    assert.equal(admission.acquire("extra", "network", now), null);
  }
  const recovered = admission.acquire("new-visitor", "network", start + 30 * 86400000);
  assert.ok(recovered); recovered();
});

test("caption admission honors injected budgets and distinguishes busy from timed limits", () => {
  const limits = { ...captionLimits, visitor: 1, global: 2, ip: 2 };
  const admission = new CaptionAdmission(limits), now = 1_800_000_000_000;
  const first = admission.attemptImport("a", "network", now); assert.ok("lease" in first);
  assert.deepEqual(admission.attemptImport("a", "network", now), { rejection: { reason: "busy" } });
  first.lease.release();
  assert.deepEqual(admission.attemptImport("a", "network", now + 1000), { rejection: { reason: "window", retryAfterSeconds: 3599 } });
  const second = admission.attemptImport("b", "network", now); assert.ok("lease" in second); second.lease.release();
  assert.deepEqual(admission.attemptImport("c", "network", now + 1000), { rejection: { reason: "window", retryAfterSeconds: 3599 } });
  const next = admission.attemptImport("a", "network", now + limits.windowMs); assert.ok("lease" in next); next.lease.release();
});

test("import rejection exposes reset timing only for window limits", async () => {
  for (const reason of ["window", "busy", "capacity"] as const) {
    const response = sourceAdmissionFailure({ reason, ...(reason === "window" ? { retryAfterSeconds: 17 } : {}) });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), reason === "window" ? "17" : null);
    const body = await response.json(); assert.equal(body.error.admission.reason, reason);
    assert.equal(body.error.code, "limit_reached");
    if (reason === "capacity") assert.match(body.error.message, /operator action/);
  }
});
