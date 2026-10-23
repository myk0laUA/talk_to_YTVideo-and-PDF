import "server-only";
import { createHash } from "node:crypto";
import type { CaptionResult } from "../../shared/captions.ts";
import { validSupadataKey, type CaptionSelectionConfig } from "./config.ts";
import type { CaptionProvider } from "./provider.ts";
import { validatedTranscript } from "./validated.ts";
import { matchesCaptionLanguage } from "./input.ts";

export const automaticBounds = { deadlineMs: 15000, cooldownMs: 5 * 60 * 1000 } as const;
const eligible = new Set(["blocked", "rate_limited", "timeout", "upstream_failure"]);
const failure = (code: "disabled" | "cancelled" | "rate_limited" | "malformed"): CaptionResult => ({
  ok: false, error: { code, message: code === "rate_limited" ? "Caption provider rate limit reached; try again later"
    : code === "disabled" ? "Caption service configuration unavailable"
    : code === "cancelled" ? "Caption request cancelled" : "Caption provider returned invalid or incomplete captions" },
});

// One bounded policy cell, never an entry per video. No expiry timers or persistent state.
// Reconfiguration replaces the cell; process restart resets it; hosts do not coordinate.
export function createAutomaticCaptionProvider(options: {
  direct: CaptionProvider; managed: (config: CaptionSelectionConfig) => CaptionProvider; now?: () => number;
}) {
  const now = options.now ?? (() => performance.now());
  let policy = "", directUntil = 0, managedUntil = 0, streak = 0;
  return async (input: Parameters<CaptionProvider>[0], config: CaptionSelectionConfig): Promise<CaptionResult> => {
    // Forced calls neither consult nor alter automatic cooldowns, including forced proof.
    if (config.provider !== "auto") return config.provider === "direct" ? options.direct(input) : options.managed(config)(input);
    if (!validSupadataKey(config.supadataApiKey)) return failure("disabled");
    const identity = createHash("sha256").update(JSON.stringify([config.supadataApiKey, config.directFirst === true])).digest("hex");
    if (policy !== identity) { policy = identity; directUntil = managedUntil = streak = 0; }
    const current = identity;
    const validate = (result: CaptionResult, provider: "youtube-transcript-plus@2.0.3" | "supadata"): CaptionResult => {
      if (!result.ok) return result;
      try {
        const transcript = validatedTranscript(result.transcript);
        if (transcript.provider !== provider || transcript.videoId !== input.videoId
          || !matchesCaptionLanguage(transcript.language, input.language)) return failure("malformed");
        return { ok: true, transcript };
      } catch { return failure("malformed"); }
    };
    if (input.signal.aborted) return failure("cancelled");
    // Cache lookup precedes this function, so valid cached success remains usable.
    if (managedUntil > now()) return failure("rate_limited");
    if (config.directFirst === true && directUntil <= now()) {
      const result = validate(await options.direct(input), "youtube-transcript-plus@2.0.3");
      if (input.signal.aborted) return failure("cancelled");
      if (policy === current) {
        if (result.ok) { streak = 0; directUntil = 0; }
        else if (result.error.code === "blocked" || result.error.code === "rate_limited") {
          streak = 0; directUntil = now() + automaticBounds.cooldownMs;
        } else if (result.error.code === "timeout" || result.error.code === "upstream_failure") {
          if (++streak >= 2) { streak = 0; directUntil = now() + automaticBounds.cooldownMs; }
        } else { streak = 0; }
      }
      if (result.ok || !eligible.has(result.error.code)) return result;
    }
    // The job's original deadline signal covers lookup, direct, submission and polls.
    // There is exactly one managed submission; polling belongs solely to its adapter.
    if (input.signal.aborted) return failure("cancelled");
    const result = validate(await options.managed(config)(input), "supadata");
    if (input.signal.aborted) return failure("cancelled");
    if (policy === current && !result.ok && result.error.code === "rate_limited") managedUntil = now() + automaticBounds.cooldownMs;
    return result;
  };
}
