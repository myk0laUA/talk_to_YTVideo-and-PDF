/** Safe public categories; no visitor, bucket, source or provider details. */
export type AdmissionRejection = Readonly<{ reason: "window" | "busy" | "capacity"; retryAfterSeconds?: number }>;
export class SessionAdmissionError extends Error {
  readonly rejection: AdmissionRejection;
  constructor(rejection: AdmissionRejection) { super("Session admission rejected"); this.rejection = rejection; }
}

/** Only a bounded delta-seconds header paired with our window category is a cooldown. */
export function parseAdmissionRejection(value: unknown, retryAfter: string | null): AdmissionRejection | undefined {
  if (!value || typeof value !== "object" || !("code" in value) || value.code !== "session_admission"
    || !("reason" in value) || !["window", "busy", "capacity"].includes(String(value.reason))) return;
  const reason = value.reason as AdmissionRejection["reason"];
  const seconds = retryAfter && /^\d{1,4}$/.test(retryAfter) ? Number(retryAfter) : NaN;
  return reason === "window" && Number.isInteger(seconds) && seconds >= 1 && seconds <= 3600
    ? { reason, retryAfterSeconds: seconds } : { reason };
}
