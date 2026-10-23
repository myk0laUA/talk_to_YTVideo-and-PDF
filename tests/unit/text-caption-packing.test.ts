import { decodeCaptions } from "../priming/caption-decoder.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { contextVariants } from "../../src/server/context/document.ts";
import { bytes, encodeManifest, MAX_EVENT_BYTES, MAX_ITEMS, MAX_WIRE_BYTES } from "../../src/shared/priming-manifest.ts";
import { validateProviderAdmission } from "../../src/shared/priming-admission.ts";
import { PrimingController } from "../../src/shared/priming-controller.ts";
import { PROVIDER_TEXT_POLICY } from "../../src/shared/priming-provider-policy.ts";
import { FakeClock, flush } from "../priming/harness.ts";
import { manySections } from "../priming/many-sections.ts";

function source(texts: string[]) {
  const sections = texts.map((text, i) => ({ id: `segment-${i + 1}`, startSeconds: i * 2.123456789,
    durationSeconds: 0.987654321, text }));
  return contextVariants({ contextVersion: "source-context-v1", promptVersion: "source-grounding-v1",
    source: { id: "12345678-1234-4234-8234-123456789abc", kind: "YOUTUBE", expiresAt: "2030-01-01T01:00:00.000Z" },
    separator: "\n", sections, fullText: texts.join("\n") });
}
for (const limit of [2048, 4096, MAX_EVENT_BYTES]) test(`03D lossless text caption packing at ${limit} bytes`, () => {
  const variants = source(["", "a\n\nb", "😀é漢字\u2028\u2029<>&\\\"".repeat(2000), "", "last"]);
  const v = variants.B, m = encodeManifest(v, "text_1", "text", limit, true);
  const restored = v.source.sections!.map(s => ({ ...s, text: "" }));
  const parts = new Map<string, number>(); let previousSection = 0, sawBound = false;
  for (const [i, e] of m.items.entries()) {
    const size = bytes(JSON.stringify(e)); assert.ok(size <= limit); if (size >= limit - 15) sawBound = true;
    assert.equal(e.previous_item_id, i ? m.items[i - 1].item.id : undefined);
    const data = JSON.parse(e.item.content[0].text);
    assert.deepEqual(data.source, { id: v.source.id, kind: "YOUTUBE", expiresAt: v.source.expiresAt, separator: "\n" });
    for (const f of data.fragments) {
      assert.equal(Object.hasOwn(f, "sectionIndex"), false);
      const index = restored.findIndex(s => "id" in s && s.id === f.locator.id);
      assert.ok(index === previousSection || index === previousSection + 1); previousSection = index;
      assert.equal(f.sectionCount, restored.length); assert.equal(f.part, parts.get(f.locator.id) ?? 0);
      parts.set(f.locator.id, f.part + 1);
      const target = restored[index], original = v.source.sections![index];
      const { text: originalText, ...locator } = original;
      assert.deepEqual(f.locator, locator); assert.equal(f.offset, target.text.length);
      assert.ok(!/^[\uDC00-\uDFFF]/u.test(f.text)); assert.ok(!/[\uD800-\uDBFF]$/u.test(f.text));
      target.text += f.text; assert.equal(f.last, target.text.length === originalText.length);
    }
  }
  assert.deepEqual(decodeCaptions(m), v.source.sections);
  assert.deepEqual(restored, v.source.sections); assert.equal(restored.map(s => s.text).join("\n"), variants.A.source.fullText);
  assert.ok(sawBound); assert.ok(m.bytes <= MAX_WIRE_BYTES); assert.ok(m.items.length <= MAX_ITEMS);
  assert.equal(m.bytes, bytes(m.representation));
  assert.ok(validateProviderAdmission({ basis: "provider_enforced", variant: v, policy: PROVIDER_TEXT_POLICY, manifest: m }));
  assert.match(m.configure.session.instructions, /untrusted/); assert.match(m.configure.session.instructions, /fragments array/);
});

test("03D 428 captions use bounded groups; stale content, timing, order, source and policy are rejected", () => {
  const input = manySections("text_1", 428, "YOUTUBE");
  assert.ok(input.manifest.items.length < 20);
  assert.equal(input.manifest.items.flatMap(e => JSON.parse(e.item.content[0].text).fragments).filter(f => f.last).length, 428);
  for (const change of ["text", "timing", "order", "source", "policy", "manifest"] as const) {
    const altered = structuredClone(input);
    const v = altered.variant, first = v.source.sections![0];
    if (change === "text") Object.assign(first, { text: "changed" });
    if (change === "timing") Object.assign(first, { startSeconds: 99 });
    if (change === "order") Object.assign(v.source, { sections: [...v.source.sections!].reverse() });
    if (change === "source") Object.assign(v.source, { id: "other" });
    if (change === "policy") Object.assign(altered.policy, { maxOutputTokens: 4096 });
    if (change === "manifest") Object.assign(altered.manifest, { items: altered.manifest.items.slice(1) });
    assert.equal(validateProviderAdmission(altered), false, change);
  }
});

for (const bad of ["identity", "content", "previous"] as const) test(`03D packed ACK ${bad} cannot establish readiness`, async () => {
  const input = manySections("text_1", 428, "YOUTUBE"), m = input.manifest, clock = new FakeClock();
  let emit: (e: unknown) => void = () => {}, closes = 0;
  const controller = new PrimingController(clock, () => {}, () => {});
  controller.start({ runId: "text_1", connectionId: "conn" }, input, { isOpen: () => closes === 0,
    send: () => {}, close: () => { closes++; }, subscribe: next => { emit = next; return () => {}; } });
  emit({ type: "session.updated", event_id: "config_ack", session: { ...m.configure.session, id: "session",
    object: "realtime.session", model: input.policy.model } }); await flush();
  for (const [i, e] of m.items.entries()) emit({ type: "conversation.item.done", event_id: `ack_${i}`,
    previous_item_id: bad === "previous" ? "wrong" : e.previous_item_id ?? null,
    item: { ...e.item, status: "completed", ...(bad === "identity" ? { id: `other_${i}` } : {}),
      ...(bad === "content" ? { content: [{ type: "input_text", text: e.item.content[0].text + " " }] } : {}) } });
  await flush(); assert.equal(controller.canSendQuestions, false);
  if (bad === "identity") { assert.equal(controller.snapshot.acknowledged, 0); clock.tick(25_000); }
  assert.equal(controller.snapshot.failure, bad === "identity" ? "timeout" : "protocol");
  controller.stop(); assert.equal(closes, 1);
});

test("13E owned voice uses the exact shared packed caption format and English instructions", () => {
  const v = source(["First 😀", "Second\nline", ""]).B;
  const m = encodeManifest(v, "text_1", "voice", undefined, "voice");
  assert.deepEqual(decodeCaptions(m), v.source.sections);
  assert.equal(createHash("sha256").update(m.representation).digest("hex"), "48055200597e9a596e91512dc6b7c73ba17a81a3343b9788142b67c0a2b15b93");
});

