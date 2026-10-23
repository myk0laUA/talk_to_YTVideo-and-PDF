import type { AdmissionRejection } from "./session-admission.ts";

/** One workspace's memory, independent of source and mode; never persisted. */
export class VoiceRecovery {
  rejection?: AdmissionRejection;
  private until = 0;
  private now: () => number;
  constructor(now: () => number = () => performance.now()) { this.now = now; }
  remember(rejection: AdmissionRejection) {
    this.rejection = rejection;
    this.until = rejection.reason === "window" && rejection.retryAfterSeconds ? this.now() + rejection.retryAfterSeconds * 1000 : 0;
  }
  get seconds() { return Math.max(0, Math.ceil((this.until - this.now()) / 1000)); }
  clearForRetry() { if (this.seconds) return false; this.rejection = undefined; this.until = 0; return true; }
}
