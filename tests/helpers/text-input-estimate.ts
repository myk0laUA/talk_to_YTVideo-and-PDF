import "server-only";
import { Tiktoken } from "js-tiktoken/lite";
import ranks from "js-tiktoken/ranks/o200k_base";
import { freeze, type Manifest } from "../../src/shared/priming-manifest.ts";
export const TEXT_MEASUREMENT_VERSION = "realtime-content-estimate-v1";
export const TEXT_ESTIMATOR = "js-tiktoken@1.0.21/o200k_base";
export type TextInputMeasurement = Readonly<{ basis: "estimated_tokens" | "unknown";
  version: typeof TEXT_MEASUREMENT_VERSION; tokenizer: typeof TEXT_ESTIMATOR | null;
  instructions: number | null; sourceMessages: readonly number[] | null; inputSize: number | null }>;
export const unknownTextMeasurement = (): TextInputMeasurement => freeze({ basis: "unknown",
  version: TEXT_MEASUREMENT_VERSION, tokenizer: null, instructions: null, sourceMessages: null, inputSize: null });


const encoder = new Tiktoken(ranks);
/** Explicit surrogate encoding, NOT a verified Realtime model binding or provider token count.
 * Encode every full input_text string separately, including JSON metadata/escaped Unicode.
 * Treat special-token-looking source strings as ordinary text. No fetch, source mutation or capacity gate. */
export function countTextInput(manifest: Manifest): TextInputMeasurement {
  try {
    const count = (text: string) => encoder.encode(text, [], []).length;
    // Updates replace instructions: peak of two alternatives, never their sum.
    const instructions = Math.max(count(manifest.configure.session.instructions), count(manifest.finalize.session.instructions));
    const sourceMessages = manifest.items.map(item => item.item.content.reduce((sum, part) => sum + count(part.text), 0));
    const inputSize = instructions + sourceMessages.reduce((sum, n) => sum + n, 0);
    if (!Number.isSafeInteger(inputSize)) return unknownTextMeasurement();
    return freeze({ basis: "estimated_tokens", version: TEXT_MEASUREMENT_VERSION, tokenizer: TEXT_ESTIMATOR,
      instructions, sourceMessages, inputSize });
  } catch { return unknownTextMeasurement(); }
}

/** Offline diagnostic only; no model selection or capacity authorization. */
export async function estimateTextInput(manifest: Manifest): Promise<TextInputMeasurement> { return countTextInput(manifest); }
