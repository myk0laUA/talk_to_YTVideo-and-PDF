import "server-only";
import { freeze } from "../../shared/priming-manifest.ts";

export const MODEL_POLICY_VERSION = "realtime-budget-evidence-2026-10-18-v1";
const evidence = freeze({ checkedOn: "2026-10-18", urls: {
  legacyModel: "https://developers.openai.com/api/docs/models/gpt-realtime",
  currentModel: "https://developers.openai.com/api/docs/models/gpt-realtime-2.1",
  legacyNotes: "https://developers.openai.com/blog/realtime-api",
  counting: "https://developers.openai.com/api/docs/guides/token-counting",
} });
function policy(model: "gpt-realtime" | "gpt-realtime-2.1") {
  const legacy = model === "gpt-realtime";
  return freeze({ version: MODEL_POLICY_VERSION, model, evidence,
    documented: { total: legacy ? 32_000 : 128_000, maxOutput: legacy ? 4096 : 32_000, deprecated: legacy,
      // Historical notes are separate evidence, not silently substituted for the model page.
      historical: legacy ? { total: 32_768, input: 28_672, instructionsAndTools: 16_384 } : null },
    application: { total: legacy ? 32_000 : 128_000,
      inputCeiling: legacy ? 27_904 : 123_904, instructionsAndToolsCeiling: legacy ? 16_384 : null,
      historyReserve: 4096, outputReserve: 4096,
      // Provisional application headroom, NOT an established upper bound on hidden framing.
      framingBaseReserve: 1024, framingPerItemReserve: 32 },
    tokenizer: { identity: null, version: null, encoding: null, verification: "unresolved" },
    framing: { verification: "unresolved", basis: null },
    unresolved: ["exact_model_encoding_and_revision", "realtime_hidden_framing_upper_bound",
      "account_access_and_provider_acceptance"],
  } as const);
}
export type ModelPolicy = ReturnType<typeof policy>;
const policies = new Map<string, ModelPolicy>(["gpt-realtime", "gpt-realtime-2.1"].map(model => {
  const p = policy(model as "gpt-realtime" | "gpt-realtime-2.1"); return [model, p];
}));
export type PolicyResolution = Readonly<{ status: "known_limits_unbound"; policy: ModelPolicy }
  | { status: "budget_unavailable"; reason: "unknown_model" | "unsupported_policy_revision" }>;

/** Exact server configuration only. No capacities, verification flags, aliases or prefix inference. */
export function resolveModelPolicy(model: string, revision = MODEL_POLICY_VERSION): PolicyResolution {
  if (revision !== MODEL_POLICY_VERSION) return freeze({ status: "budget_unavailable", reason: "unsupported_policy_revision" });
  const p = policies.get(model);
  return p ? freeze({ status: "known_limits_unbound", policy: p })
    : freeze({ status: "budget_unavailable", reason: "unknown_model" });
}
export function isTrustedPolicy(p: ModelPolicy): boolean { return policies.get(p?.model) === p; }

export type HypotheticalCounts = Readonly<{ configureInstructions: number; finalizeInstructions: number;
  items: readonly number[] }>;
const count = (n: number) => Number.isSafeInteger(n) && n >= 0;
/** Arithmetic verification ONLY. Callers cannot turn hypothetical counts into a token binding. */
export function evaluateHypotheticalAccounting(p: ModelPolicy, counts: HypotheticalCounts) {
  const invalid = () => freeze({ status: "invalid_accounting", authorizing: false } as const);
  if (!isTrustedPolicy(p) || !counts || !Array.isArray(counts.items) || !counts.items.length
    || counts.items.length > 4096 || ![counts.configureInstructions, counts.finalizeInstructions, ...counts.items].every(count)) return invalid();
  const a = p.application;
  if (![a.total, a.inputCeiling, a.historyReserve, a.outputReserve, a.framingBaseReserve, a.framingPerItemReserve].every(count)
    || a.total <= 0 || a.outputReserve <= 0 || a.outputReserve > p.documented.maxOutput
    || a.total > p.documented.total || a.inputCeiling > a.total - a.outputReserve
    || a.instructionsAndToolsCeiling !== null && !count(a.instructionsAndToolsCeiling)) return invalid();
  const instructions = BigInt(Math.max(counts.configureInstructions, counts.finalizeInstructions));
  const itemContents = counts.items.reduce((sum, n) => sum + BigInt(n), 0n);
  const framing = BigInt(a.framingBaseReserve) + BigInt(a.framingPerItemReserve) * BigInt(counts.items.length);
  const input = instructions + itemContents + framing + BigInt(a.historyReserve);
  const total = input + BigInt(a.outputReserve);
  const instructionLoad = instructions + BigInt(a.framingBaseReserve);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return invalid();
  return freeze({ status: input <= BigInt(a.inputCeiling) && total <= BigInt(a.total)
    && (a.instructionsAndToolsCeiling === null || instructionLoad <= BigInt(a.instructionsAndToolsCeiling))
    ? "diagnostic_fit" : "diagnostic_over_limit", authorizing: false, basis: "hypothetical_counts_only",
    instructions: Number(instructions), itemContents: Number(itemContents), framing: Number(framing),
    history: a.historyReserve, output: a.outputReserve, input: Number(input), total: Number(total),
    instructionLoad: Number(instructionLoad) } as const);
}
