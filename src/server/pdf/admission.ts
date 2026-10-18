import "server-only";
import { Admission } from "../proof/admission.ts";
import { pdfLimits } from "./handler.ts";

const state = globalThis as unknown as { pdfWorkAdmission04?: Admission };
// Both runtime route bundles share upload + extraction capacity and quotas.
export const pdfAdmission = state.pdfWorkAdmission04 ??= new Admission(pdfLimits);
