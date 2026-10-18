import "server-only";
import type { Visitor } from "../proof/visitor.ts";
import { requireLive, requireOwned, SourceError, type SourceRepository, type UploadedSource } from "../sources/service.ts";
import { contextVariants, sourceContext, type SourceContext, type ContextVariant } from "./document.ts";
import { measureBudget, type BudgetPolicy, type BudgetResult, type ContextMeasurement } from "./budget.ts";
import { guardedAwait } from "./await.ts";

const preparationOnly = Object.freeze({ conversationReady: false, providerConfirmed: false, issuanceRequiresRevalidation: true } as const);
export type PreparationResult = Readonly<typeof preparationOnly & (
  { status: "unavailable"; code: "unavailable" | "cancelled" | "storage_unavailable"; message: string }
  | { status: "prepared"; context: SourceContext; variants: Readonly<{ A: ContextVariant; B: ContextVariant }>;
    budgets: Readonly<{ A: BudgetResult; B: BudgetResult }> }
)>;
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);

/** Server-established Visitor only. No cookie parsing, credentials, provider calls or persistence here. */
export function createContextService(deps: { repository: Pick<SourceRepository, "get">; now?: () => number }) {
  const now = deps.now ?? Date.now;
  return async (input: { visitor: Visitor; sourceId: string; signal: AbortSignal;
    policy?: BudgetPolicy; measurement?: ContextMeasurement }): Promise<PreparationResult> => {
    // Do not retain a caller-mutable visitor or policy across awaits.
    const visitor = { ...input.visitor };
    const { sourceId, signal, measurement } = input;
    const policy = input.policy ? { ...input.policy, binding: { ...input.policy.binding } } : undefined;
    let record: UploadedSource | undefined;
    const guard = () => {
      const at = now();
      requireLive(visitor, signal, at);
      if (!Number.isFinite(visitor.expiresAt) || !Number.isFinite(at)) throw new SourceError("unavailable");
      if (record) {
        requireOwned(record, visitor, at);
        if (!Number.isFinite(record.expiresAt.getTime())) throw new SourceError("storage_unavailable");
      }
    };
    try {
      guard();
      if (typeof sourceId !== "string" || !validId(sourceId)) throw new SourceError("unavailable");
      const loaded = await guardedAwait(() => deps.repository.get(sourceId, visitor.owner, new Date(now())), signal, guard);
      guard(); requireOwned(loaded, visitor, now());
      if (loaded.id !== sourceId) throw new SourceError("unavailable");
      record = loaded;
      guard();
      const context = sourceContext(record), variants = contextVariants(context);
      const A = await measureBudget(variants.A, policy, measurement, signal, guard);
      guard();
      const B = await measureBudget(variants.B, policy, measurement, signal, guard);
      guard();
      // A Source can be removed/replaced while an injected measurer is awaiting work.
      const current = await guardedAwait(() => deps.repository.get(sourceId, visitor.owner, new Date(now())), signal, guard);
      guard(); requireOwned(current, visitor, now());
      if (current.id !== sourceId || variants.B.serialized !== contextVariants(sourceContext(current)).B.serialized) {
        throw new SourceError("unavailable");
      }
      guard();
      return Object.freeze({ ...preparationOnly, status: "prepared", context, variants, budgets: Object.freeze({ A, B }) });
    } catch (error) {
      // Apply cancellation/expiry priority to rejected awaits too, without exposing their error text.
      try { guard(); } catch (guardError) { error = guardError; }
      const code = error instanceof SourceError && error.code === "cancelled" ? "cancelled"
        : error instanceof SourceError && ["unavailable", "visitor_required"].includes(error.code) ? "unavailable" : "storage_unavailable";
      return Object.freeze({ ...preparationOnly, status: "unavailable", code,
        message: code === "cancelled" ? "Context preparation cancelled." : code === "unavailable" ? "Source unavailable."
          : "Source context is unavailable; try again later." });
    }
  };
}
