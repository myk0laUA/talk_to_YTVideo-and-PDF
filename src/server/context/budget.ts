import "server-only";
import type { ContextVariant } from "./document.ts";
import { guardedAwait } from "./await.ts";

export type MeasurementBinding = Readonly<{
  model: string; tokenizer: string; verification: "unverified" | "synthetic" | "verified";
  unit: "tokens" | "synthetic-units";
}>;
export type BudgetPolicy = Readonly<{
  version: string; binding: MeasurementBinding; capacity: number;
  historyAllowance: number; outputReserve: number; framingAllowance: number;
}>;
export type ContextMeasurement = Readonly<{
  binding: MeasurementBinding;
  measure(text: string, component: "instructions" | "source" | "complete_variant", signal: AbortSignal): Promise<number>;
}>;
export type BudgetAccounting = Readonly<{
  policyVersion: string; binding: MeasurementBinding; capacity: number;
  instructions: number; serializedSource: number; completeVariant: number;
  // Tokenization need not be additive across JSON boundaries. The whole variant is authoritative.
  serializationAdjustment: number; historyAllowance: number; outputReserve: number;
  framingAllowance: number; total: number; remaining: number;
}>;
export type BudgetResult = Readonly<
  { status: "budget_unavailable"; reason: "missing_or_unverified_policy" | "invalid_policy" | "measurement_failed" }
  | { status: "offline_fit" | "measured_fit" | "context_too_large"; accounting: BudgetAccounting; message: string }
>;
const count = (value: number) => Number.isSafeInteger(value) && value >= 0;
const sum = (values: number[]) => values.reduce((a, b) => a + BigInt(b), 0n);
const validBinding = (b: MeasurementBinding) => b && typeof b.model === "string" && !!b.model.trim()
  && typeof b.tokenizer === "string" && !!b.tokenizer.trim()
  && (b.verification === "synthetic" && b.unit === "synthetic-units" || b.verification === "verified" && b.unit === "tokens");

export async function measureBudget(variant: ContextVariant, policy: BudgetPolicy | undefined,
  measurement: ContextMeasurement | undefined, signal: AbortSignal, guard: () => void): Promise<BudgetResult> {
  const unavailable = (reason: "missing_or_unverified_policy" | "invalid_policy" | "measurement_failed"): BudgetResult =>
    Object.freeze({ status: "budget_unavailable", reason });
  guard();
  if (!policy || !measurement || policy.binding?.verification === "unverified" || measurement.binding?.verification === "unverified") {
    return unavailable("missing_or_unverified_policy");
  }
  // Copy the injected policy/binding before awaiting any external measurement.
  const p = { ...policy, binding: { ...policy.binding } };
  if (!validBinding(p.binding) || !validBinding(measurement.binding)
    || p.binding.model !== measurement.binding.model || p.binding.tokenizer !== measurement.binding.tokenizer
    || p.binding.verification !== measurement.binding.verification || p.binding.unit !== measurement.binding.unit
    || typeof p.version !== "string" || !p.version.trim()
    || ![p.capacity, p.historyAllowance, p.outputReserve, p.framingAllowance].every(count)
    || p.capacity === 0 || sum([p.historyAllowance, p.outputReserve, p.framingAllowance]) > BigInt(Number.MAX_SAFE_INTEGER)) {
    return unavailable("invalid_policy");
  }
  const values: number[] = [];
  for (const [component, text] of [["instructions", variant.serializedInstructions], ["source", variant.serializedSource],
    ["complete_variant", variant.serialized]] as const) {
    let value: number;
    try { value = await guardedAwait(() => measurement.measure(text, component, signal), signal, guard); }
    catch { guard(); return unavailable("measurement_failed"); }
    guard();
    if (!count(value) || value === 0) return unavailable("measurement_failed");
    values.push(value);
  }
  const [instructions, serializedSource, completeVariant] = values;
  const total = sum([completeVariant, p.historyAllowance, p.outputReserve, p.framingAllowance]);
  const adjustment = BigInt(completeVariant) - BigInt(instructions) - BigInt(serializedSource);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || adjustment < -BigInt(Number.MAX_SAFE_INTEGER)) return unavailable("measurement_failed");
  const accounting = Object.freeze({ policyVersion: p.version, binding: Object.freeze(p.binding), capacity: p.capacity,
    instructions, serializedSource, completeVariant, serializationAdjustment: Number(adjustment),
    historyAllowance: p.historyAllowance, outputReserve: p.outputReserve, framingAllowance: p.framingAllowance,
    total: Number(total), remaining: p.capacity - Number(total) });
  return Object.freeze(total > BigInt(p.capacity)
    ? { status: "context_too_large", accounting, message: "This complete source exceeds the selected context budget. The stored source and full preview are unchanged." }
    : { status: p.binding.verification === "synthetic" ? "offline_fit" : "measured_fit", accounting,
      message: "Preparation only. Revalidate source ownership and expiry at issuance; provider context acceptance is still required." });
}
