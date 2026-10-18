import "server-only";
import { Admission } from "../proof/admission.ts";

export const captionLimits = { visitor: 4, ip: 8, global: 8, lifetime: 16, windowMs: 3600000, concurrent: 1 };
// Shared across separately bundled Next routes in this process. Not a distributed quota.
const state = globalThis as unknown as { captionAdmission03c?: Admission };
export const captionAdmission = state.captionAdmission03c ??= new Admission(captionLimits);
