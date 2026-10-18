import "server-only";
import { parsePdfConfig } from "./config";
import { createPdfHandler } from "./handler";
import { parsePdf } from "./worker";
import { pdfAdmission } from "./admission";

const state = globalThis as unknown as { pdfProof04a?: ReturnType<typeof createPdfHandler> };
export const pdfProof = state.pdfProof04a ??= createPdfHandler({ config: () => parsePdfConfig(process.env), parse: parsePdf, admission: pdfAdmission });
