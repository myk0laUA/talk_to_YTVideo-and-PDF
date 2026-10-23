import type { AdmissionRejection } from "../../shared/session-admission.ts";
import type { SourceResult } from "../../shared/source.ts";

/** Normal imports recover through a window reset or release; optional operator caps do not. */
export function sourceAdmissionFailure(admission: AdmissionRejection): Response {
  const message = admission.reason === "busy" ? "Another import is running. Try again after it finishes."
    : admission.reason === "window" ? "Import request limit reached. Retry after the indicated delay."
      : "Import capacity is unavailable. Site operator action is required.";
  const value: SourceResult = { ok: false, error: { code: "limit_reached", message, admission } };
  return Response.json(value, { status: 429, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    ...(admission.reason === "window" && admission.retryAfterSeconds
      ? { "Retry-After": String(admission.retryAfterSeconds) } : {}),
  } });
}
