import "server-only";
import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import { bytes, encodeManifest, freeze, MAX_WIRE_BYTES, type Manifest, type Mode } from "../../shared/priming-manifest.ts";
import type { Visitor } from "../proof/visitor.ts";
import { requireLive, requireOwned, SourceError, type SourceRepository } from "../sources/service.ts";
import { guardedAwait } from "./await.ts";
import { contextVariants, sourceContext, serializeData, type ContextVariant } from "./document.ts";
import { createContextService } from "./service.ts";
import { MODEL_POLICY_VERSION, resolveModelPolicy } from "./model-policy.ts";

const hash = (text: string) => createHash("sha256").update(text, "utf16le").digest("hex");
const size = (text: string) => freeze({ utf16CodeUnits: text.length, utf8Bytes: bytes(text) });
export type MeasurementIdentity = Readonly<{ model: string; policyVersion: string; mode: Mode }>;

/** Byte diagnostics are not tokens or an upper bound on separately tokenized model content.
 * Re-encoding rejects a stale projection, mode, fragment bound, event or serialized representation.
 */
export function diagnoseManifest(variant: ContextVariant, manifest: Manifest, expected: MeasurementIdentity) {
  const resolved = resolveModelPolicy(expected.model, expected.policyVersion);
  if (resolved.status !== "known_limits_unbound" || manifest.mode !== expected.mode
    || variant.serializedInstructions !== serializeData(variant.instructions)
    || variant.serializedSource !== serializeData(variant.source)
    || variant.serialized !== serializeData({ contextVersion: variant.contextVersion, promptVersion: variant.promptVersion,
      variant: variant.id, instructions: variant.instructions, source: variant.source })
    || JSON.stringify(manifest) !== JSON.stringify(encodeManifest(variant, manifest.runId, expected.mode, manifest.maxEventBytes))
    || [variant.serialized, variant.serializedSource, variant.serializedInstructions].some(v => bytes(v) > MAX_WIRE_BYTES)) {
    throw new Error("Measurement representation unavailable.");
  }
  const items = manifest.items.map(event => {
    const text = event.item.content[0].text;
    const data = JSON.parse(text);
    // Includes repeated protocol/source/locator/part metadata in every model-visible fragment.
    const { text: sourceText, ...metadata } = data;
    return freeze({ content: size(text), sourceText: size(sourceText), metadataJson: size(JSON.stringify(metadata)) });
  });
  return freeze({ basis: "diagnostic_bytes_only", verification: "unverified", tokenCounts: null,
    model: expected.model, policyVersion: expected.policyVersion, mode: expected.mode, variant: variant.id,
    variantHash: hash(variant.serialized), representationHash: hash(manifest.representation), hashEncoding: "utf16le",
    variantRepresentation: size(variant.serialized), variantInstructions: size(variant.serializedInstructions),
    variantSource: size(variant.serializedSource), outboundRepresentation: size(manifest.representation),
    modelVisible: { configureInstructions: size(manifest.configure.session.instructions),
      finalizeInstructions: size(manifest.finalize.session.instructions), items,
      itemContentBytes: items.reduce((sum, i) => sum + i.content.utf8Bytes, 0),
      metadataJsonBytes: items.reduce((sum, i) => sum + i.metadataJson.utf8Bytes, 0),
      // Session updates replace instructions: future token accounting must use the peak, not their sum.
      peakInstructionBytes: Math.max(bytes(manifest.configure.session.instructions), bytes(manifest.finalize.session.instructions)) },
    framing: { itemCount: items.length, tokenUpperBound: null },
  } as const);
}

export function matchesDiagnostic(diagnostic: ReturnType<typeof diagnoseManifest>, variant: ContextVariant,
  manifest: Manifest, expected: MeasurementIdentity): boolean {
  try { return JSON.stringify(diagnostic) === JSON.stringify(diagnoseManifest(variant, manifest, expected)); }
  catch { return false; }
}

const preparationOnly = freeze({ conversationReady: false, providerConfirmed: false, productionReady: false,
  issuanceRequiresRevalidation: true } as const);

/** Offline server coordinator. Never accepts injected capacities, tokenizer mappings or verified flags.
 * No route calls this adapter. Even known model limits cannot produce measured_fit without a binding.
 */
export function createModelBudgetPreparation(deps: { repository: Pick<SourceRepository, "get">; now?: () => number }) {
  const now = deps.now ?? Date.now;
  const prepare = createContextService(deps);
  return async (input: { visitor: Visitor; sourceId: string; signal: AbortSignal; model: string;
    policyVersion?: string; runId: string; maxEventBytes?: number }) => {
    const { sourceId, signal, model, runId, maxEventBytes } = input;
    const policyVersion = input.policyVersion ?? MODEL_POLICY_VERSION;
    const visitor = { ...input.visitor };
    const guard = () => {
      requireLive(visitor, signal, now());
      if (!Number.isFinite(visitor.expiresAt) || !Number.isFinite(now())) throw new SourceError("unavailable");
    };
    try {
      guard();
      const prepared = await prepare({ visitor, sourceId, signal });
      guard();
      if (prepared.status !== "prepared") return freeze({ ...preparationOnly, status: "unavailable", code: prepared.code } as const);
      const live = () => { guard(); if (now() >= Date.parse(prepared.context.source.expiresAt)) throw new SourceError("unavailable"); };
      live();
      const resolved = resolveModelPolicy(model, policyVersion);
      const measurements = [];
      if (resolved.status === "known_limits_unbound") {
        for (const variant of ["A", "B"] as const) for (const mode of ["voice", "text"] as const) {
          // Yield between bounded local projections so pending cancellation can be observed.
          await guardedAwait(() => setImmediate(undefined, { signal }), signal, live);
          const manifest = encodeManifest(prepared.variants[variant], runId, mode, maxEventBytes);
          const diagnostic = diagnoseManifest(prepared.variants[variant], manifest, { model, policyVersion, mode });
          live();
          measurements.push(freeze({ status: "budget_unavailable", reason: "unsupported_tokenizer_and_framing",
            manifest, diagnostic } as const));
        }
      }
      // Retain 07A's authorization guarantee after ALL local measurement, including replacement/expiry.
      const current = await guardedAwait(() => deps.repository.get(sourceId, visitor.owner, new Date(now())), signal, live);
      live(); requireOwned(current, visitor, now());
      if (current.id !== sourceId || contextVariants(sourceContext(current)).B.serialized !== prepared.variants.B.serialized) {
        throw new SourceError("unavailable");
      }
      live();
      return freeze({ ...preparationOnly, status: "budget_unavailable",
        reason: resolved.status === "known_limits_unbound" ? "unsupported_tokenizer_and_framing" : resolved.reason,
        policy: resolved.status === "known_limits_unbound" ? resolved.policy : null,
        prepared, sourceHash: hash(prepared.context.fullText), hashEncoding: "utf16le", measurements } as const);
    } catch (error) {
      try { guard(); } catch (guardError) { error = guardError; }
      const code = signal.aborted ? "cancelled" : error instanceof SourceError && ["unavailable", "visitor_required"].includes(error.code)
        ? "unavailable" : "measurement_failed";
      return freeze({ ...preparationOnly, status: "unavailable", code } as const);
    }
  };
}
