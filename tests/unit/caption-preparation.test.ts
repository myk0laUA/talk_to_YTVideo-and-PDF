import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { captionBoundary, oversizedCaptions } from "../context/caption-boundaries.ts";
import { pdfFixture } from "../context/fixtures.ts";
import { decodeCaptions } from "../priming/caption-decoder.ts";
import { createVisitor, visitorCookie } from "../../src/server/proof/visitor.ts";
import { captionRecord, uploadedRecord } from "../../src/server/sources/service.ts";
import { contextVariants, sourceContext } from "../../src/server/context/document.ts";
import { createProviderTextPreparation, createProviderVoicePreparation } from "../../src/server/context/model-measurement.ts";
import { bytes, encodeManifest, MAX_EVENT_BYTES, MAX_ITEMS, MAX_WIRE_BYTES } from "../../src/shared/priming-manifest.ts";
import { SourceSizeError, SOURCE_SIZE_MESSAGE } from "../../src/shared/priming-failure.ts";
import { ENGLISH_RESPONSE_INSTRUCTIONS, PROVIDER_TEXT_POLICY, PROVIDER_VOICE_POLICY } from "../../src/shared/priming-provider-policy.ts";
import { VoiceRegistry } from "../../src/server/voice/registry.ts";
import { createVoiceHandlers } from "../../src/server/voice/handlers.ts";
import { TextRegistry } from "../../src/server/text/registry.ts";
import { createTextHandlers } from "../../src/server/text/handlers.ts";
import type { TextRelaySnapshot } from "../../src/shared/text-relay.ts";

const at = Date.UTC(2030, 0, 1), config = { origin: "https://size.invalid", cookieSecret: "13".repeat(32), secure: true, apiKey: "synthetic" };
const visitor = createVisitor(config, at);
for (const mode of ["text", "voice"] as const) test(`13E prior ${mode} policy revision rejects before source access`, async () => {
  let reads = 0;
  const prepare = (mode === "voice" ? createProviderVoicePreparation : createProviderTextPreparation)({
    repository: { get: async () => { reads++; return null; } }, now: () => at });
  const result = await prepare({ visitor, sourceId: randomUUID(), signal: new AbortController().signal, model: "gpt-realtime-2.1", mode,
    policyVersion: mode === "text" ? "provider-text-full-source-default-2026-10-22-v3" : "provider-voice-full-source-default-2026-10-22-v7",
    runId: "stale13e", variant: "B" });
  assert.equal(result.status, "unavailable"); assert.equal(reads, 0);
});
for (const mode of ["text", "voice"] as const) {
  for (const count of [4096, 4097]) test(`13E ${mode} ${count} captions reconstruct full text/order/timing/locators below real outbound bounds`, () => {
    const row = captionRecord(captionBoundary(count), visitor), variant = contextVariants(sourceContext(row)).B;
    const m = encodeManifest(variant, "boundary13e", mode, undefined, mode === "voice" ? "voice" : true);
    assert.deepEqual(decodeCaptions(m), variant.source.sections);
    assert.equal(decodeCaptions(m).map(s => s.text).join("\n"), row.fullText);
    assert.ok(m.items.length < 100); assert.ok(m.items.length < MAX_ITEMS); assert.ok(m.bytes < MAX_WIRE_BYTES);
    for (const [i, event] of m.items.entries()) {
      assert.ok(bytes(JSON.stringify(event)) <= MAX_EVENT_BYTES);
      assert.equal(event.previous_item_id, i ? m.items[i - 1].item.id : undefined);
    }
  });
  test(`13E ${mode} multi-fragment Unicode captions preserve duplicates, empty captions and exact data`, () => {
    const row = captionRecord(captionBoundary(3), visitor), context = sourceContext(row);
    const texts = ["😀漢字\u2028<>&\"\n".repeat(3000), "", "same", "same"];
    const sections = texts.map((text, i) => ({ id: `segment-${i + 1}`, startSeconds: i / 3, durationSeconds: .123, text }));
    const v = contextVariants({ ...context, sections, fullText: texts.join("\n") }).B;
    const m = encodeManifest(v, "unicode13e", mode, 4096, mode === "voice" ? "voice" : true);
    assert.deepEqual(decodeCaptions(m), sections); assert.ok(m.items.length > sections.length);
    for (const e of m.items) { assert.ok(bytes(JSON.stringify(e)) <= 4096);
      for (const f of JSON.parse(e.item.content[0].text).fragments) {
        assert.ok(!/^[\uDC00-\uDFFF]/u.test(f.text)); assert.ok(!/[\uD800-\uDBFF]$/u.test(f.text));
      }
    }
  });
  test(`13E ${mode} exact English instructions for PDF and captions; PDF source item representation unchanged`, () => {
    for (const row of [uploadedRecord(pdfFixture, visitor), captionRecord(captionBoundary(3), visitor)]) {
      const v = contextVariants(sourceContext(row)).B;
      const m = encodeManifest(v, "english13e", mode, undefined, mode === "voice" ? "voice" : true);
      for (const stage of [m.configure, m.finalize]) {
        assert.equal(stage.session.instructions.split(ENGLISH_RESPONSE_INSTRUCTIONS).length, 2);
        assert.match(stage.session.instructions, /untrusted source material/);
        assert.equal(stage.session.max_output_tokens, 2048);
      }
      if (row.kind === "PDF") assert.deepEqual(m.items, encodeManifest(v, "english13e", mode).items);
    }
  });
}
test("13E real wire/item/event bounds remain finite and typed without truncation", () => {
  const row = captionRecord(oversizedCaptions(), visitor), v = contextVariants(sourceContext(row)).B;
  assert.ok(row.fullText.length <= 1_000_000);
  for (const mode of ["text", "voice"] as const) assert.throws(() => encodeManifest(v, "oversize", mode, undefined, mode === "voice" ? "voice" : true), SourceSizeError);
  const pdf = contextVariants(sourceContext(uploadedRecord(pdfFixture, visitor))).B;
  const sections = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ id: `page-${i + 1}`, pageNumber: i + 1, text: "a" }));
  assert.throws(() => encodeManifest({ ...pdf, source: { ...pdf.source, sections } }, "items", "text", undefined, true), SourceSizeError);
  assert.throws(() => encodeManifest(pdf, "settings", "voice", 2048, "voice"), SourceSizeError);
});
for (const mode of ["voice", "text"] as const) for (const state of ["owned", "foreign", "expired", "missing", "replaced-after-read", "cancelled"] as const)
  test(`13E ${mode} ${state} oversized preparation: typed only after fresh ownership and zero acquisitions`, async () => {
    const row = captionRecord(oversizedCaptions(), visitor); let reads = 0, acquisitions = 0;
    if (state === "foreign") row.ownerSessionHash = "foreign";
    if (state === "expired") row.expiresAt = new Date(at);
    const abort = new AbortController(); if (state === "cancelled") abort.abort();
    const repository = { get: async () => { reads++; return state === "missing" || state === "replaced-after-read" && reads > 1 ? null : row; } };
    const prepare = (mode === "voice" ? createProviderVoicePreparation : createProviderTextPreparation)({ repository, now: () => at });
    const policy = mode === "voice" ? PROVIDER_VOICE_POLICY : PROVIDER_TEXT_POLICY;
    const p = await prepare({ visitor, sourceId: row.id, signal: abort.signal, model: policy.model, mode,
      policyVersion: policy.policyVersion, runId: "authorized13e", variant: "B" });
    assert.equal(p.status, "unavailable");
    assert.equal(p.code, state === "owned" ? "source_too_large" : state === "cancelled" ? "cancelled" : "unavailable");
    reads = 0;
    const body = { sourceId: row.id, requestId: randomUUID() };
    const request = (path: string, method = "POST") => new Request(config.origin + path, { method, signal: abort.signal,
      headers: { origin: config.origin, cookie: visitorCookie(visitor, config, at).split(";", 1)[0], "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    if (mode === "voice") {
      const registry = new VoiceRegistry({ repository, now: () => at, mint: async () => { acquisitions++; throw Error("forbidden"); } });
      try {
        const r = await createVoiceHandlers({ config: () => config, registry, now: () => at }).prepare(request("/api/voice-preparations"));
        assert.equal(r.status, state === "owned" ? 413 : state === "cancelled" ? 400 : 404);
        const data = await r.json();
        assert.deepEqual(data, state === "owned" ? { error: SOURCE_SIZE_MESSAGE, code: "source_too_large" } : { error: "Voice preparation unavailable" });
        assert.equal(registry.resources.entries, 0); assert.equal(registry.resources.timers, 0);
      } finally { registry.dispose(); }
    } else {
      const registry = new TextRegistry({ repository, now: () => at, connect: async () => { acquisitions++; throw Error("forbidden"); } });
      try {
        const handlers = createTextHandlers({ config: () => config, registry, now: () => at });
        const r = await handlers.start(request("/api/text-sessions"));
        if (r.status === 201) {
          const { sessionId } = await r.json();
          const stream = await handlers.stream(request(`/api/text-sessions/${sessionId}/stream`, "GET"), sessionId);
          if (state === "replaced-after-read") assert.equal(stream.status, 404);
          else {
            const snapshots = (await stream.text()).trim().split("\n").map(s => JSON.parse(s) as TextRelaySnapshot);
            assert.equal(snapshots.at(-1)?.status.failure, state === "owned" ? "source_too_large" : "preparation");
          }
        } else { assert.equal(r.status, state === "cancelled" ? 400 : 404); }
        assert.equal(registry.size, 0);
      } finally { registry.dispose(); }
    }
    assert.equal(acquisitions, 0); assert.equal(row.fullText, oversizedCaptions().fullText);
  });
