import "server-only";
import { getDatabase } from "../db";
import { pdfAdmission } from "../pdf/admission";
import { parsePdf } from "../pdf/worker";
import { parseSourceConfig } from "./config";
import { createSourceHandlers } from "./handler";
import { createSourceRepository } from "./repository";

const state = globalThis as unknown as { sourceHandlers04b?: ReturnType<typeof createSourceHandlers> };
export const sourceHandlers = state.sourceHandlers04b ??= createSourceHandlers({ config: () => parseSourceConfig(process.env),
  repository: createSourceRepository(getDatabase), parse: parsePdf, admission: pdfAdmission });
