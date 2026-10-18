import type { BudgetResult } from "../server/context/budget.ts";
import type { PreparationResult } from "../server/context/service.ts";
import { encodeManifest, freeze, type Manifest, type Mode } from "./priming-manifest.ts";

export type WireBudget = Readonly<{ status: "measured_fit" | "offline_fit"; verification: "verified" | "synthetic"; unit: "tokens" | "synthetic-units";
  model: string; tokenizer: string; policyVersion: string; representation: string;
  measured: number; capacity: number; historyAllowance: number; outputReserve: number; framingAllowance: number }>;
export type PrimingInput = Readonly<{ manifest: Manifest; preparedBudget: BudgetResult; wireBudget: WireBudget }>;
const count = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Structural admission only. Trusted server issuance must establish/revalidate ownership separately. */
export function validateAdmission(input: PrimingInput): boolean {
  try {
  const b = input?.preparedBudget, w = input?.wireBudget, m = input?.manifest;
  if (!m || !b || b.status !== "measured_fit" || !w || w.status !== "measured_fit"
    || w.verification !== "verified" || w.unit !== "tokens" || b.accounting.binding.verification !== "verified"
    || b.accounting.binding.unit !== "tokens" || !w.model?.trim() || !w.tokenizer?.trim() || !w.policyVersion?.trim()
    || w.model !== b.accounting.binding.model || w.tokenizer !== b.accounting.binding.tokenizer
    || w.policyVersion !== b.accounting.policyVersion || w.representation !== m.representation) return false;
  const a = b.accounting;
  if (![a.capacity, a.instructions, a.serializedSource, a.completeVariant, a.historyAllowance, a.outputReserve,
    a.framingAllowance, a.total, a.remaining, w.measured, w.capacity, w.historyAllowance, w.outputReserve, w.framingAllowance].every(count)
    || !a.capacity || !a.instructions || !a.serializedSource || !a.completeVariant || !w.measured || !w.capacity || a.total > a.capacity
    || !Number.isSafeInteger(a.serializationAdjustment)
    || BigInt(a.serializationAdjustment) !== BigInt(a.completeVariant) - BigInt(a.instructions) - BigInt(a.serializedSource)
    || a.remaining !== a.capacity - a.total || a.capacity !== w.capacity
    || a.historyAllowance !== w.historyAllowance || a.outputReserve !== w.outputReserve || a.framingAllowance !== w.framingAllowance) return false;
  return BigInt(a.total) === BigInt(a.completeVariant) + BigInt(a.historyAllowance) + BigInt(a.outputReserve) + BigInt(a.framingAllowance)
    && BigInt(w.measured) + BigInt(w.historyAllowance) + BigInt(w.outputReserve) + BigInt(w.framingAllowance) <= BigInt(w.capacity);
  } catch { return false; }
}

/** Future server caller supplies measurement of this exact manifest; 07A alone never admits a run. */
export function preparePrimingInput(prepared: PreparationResult, variant: "A" | "B", runId: string, mode: Mode,
  wireBudget: WireBudget, maxEventBytes?: number): PrimingInput {
  if (prepared.status !== "prepared") throw new Error("Source context unavailable.");
  const input = freeze({ manifest: encodeManifest(prepared.variants[variant], runId, mode, maxEventBytes),
    preparedBudget: structuredClone(prepared.budgets[variant]), wireBudget: structuredClone(wireBudget) });
  if (!validateAdmission(input)) throw new Error("Verified transport budget required.");
  return input;
}
