/** Closed, data-free setup vocabulary. Never accept errors, responses or provider payloads. */
export const voiceSetupStages = ["preparation_http", "preparation_validation", "credential_http", "credential_validation",
  "peer_creation", "local_description", "sdp_http", "sdp_validation", "remote_description", "peer_channel_ready",
  "initial_settings_ack", "source_items_ack", "final_settings_ack", "microphone_request", "microphone_attach"] as const;
export type VoiceSetupStage = typeof voiceSetupStages[number];
const outcomes = ["pending", "ok", "http_error", "invalid", "unavailable", "timeout", "cancelled", "provider", "context_limit"] as const;
export type VoiceSetupOutcome = typeof outcomes[number];
export type VoiceSetupDiagnostic = Readonly<{ stage: VoiceSetupStage; outcome: VoiceSetupOutcome; elapsedMs: number; httpStatus?: number }>;
export type VoiceSetupReporter = (stage: VoiceSetupStage, outcome: VoiceSetupOutcome, httpStatus?: number) => void;

/** Per-attempt, bounded memory only. Explicit projection also rejects hostile runtime callers. */
export class VoiceSetupDiagnostics {
  private rows: readonly VoiceSetupDiagnostic[] = Object.freeze([]);
  private ended = false;
  private started: number;
  private now: () => number;
  constructor(now: () => number) { this.now = now; this.started = now(); }
  get snapshot() { return this.rows; }
  report: VoiceSetupReporter = (stage, outcome, httpStatus) => {
    if (this.ended || !voiceSetupStages.includes(stage) || !outcomes.includes(outcome)) return;
    const last = this.rows.at(-1);
    if (last?.stage === stage && last.outcome === outcome && last.httpStatus === httpStatus) return;
    const duration = this.now() - this.started;
    const row: VoiceSetupDiagnostic = Object.freeze({ stage, outcome,
      elapsedMs: Math.max(last?.elapsedMs ?? 0, Number.isFinite(duration) ? Math.min(600_000, Math.max(0, Math.round(duration))) : 0),
      ...(Number.isInteger(httpStatus) && httpStatus! >= 100 && httpStatus! <= 599 ? { httpStatus } : {}) });
    const replace = last?.stage === stage && last.outcome === "pending";
    this.rows = Object.freeze([...this.rows.slice(0, replace ? -1 : 31), row]);
  };
  finish(outcome: Exclude<VoiceSetupOutcome, "pending" | "ok">) {
    if (this.rows.at(-1)?.outcome === "pending") this.report(this.rows.at(-1)!.stage, outcome);
    this.ended = true;
  }
}
