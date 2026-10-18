import "server-only";
import { getDatabase } from "../db";
import { pdfAdmission } from "../pdf/admission";
import { parsePdf } from "../pdf/worker";
import { parseSourceConfig, parseSourceReadConfig, parseYoutubeSourceConfig } from "./config";
import { captionAdmission } from "../captions/admission";
import { createCaptionCache } from "../captions/cache";
import { CaptionCoordinator } from "../captions/coordinator";
import { configuredCaptionProvider } from "../captions/configured";
import { createYoutubeSourceHandler } from "./youtube";
import { createSourceHandlers } from "./handler";
import { createSourceRepository } from "./repository";

const state = globalThis as unknown as { sourceHandlers03c?: ReturnType<typeof createSourceHandlers>; youtubeSource06b?: ReturnType<typeof createYoutubeSourceHandler>; captionCoordinator06b?: CaptionCoordinator };
export const sourceHandlers = state.sourceHandlers03c ??= createSourceHandlers({ config: () => parseSourceConfig(process.env), readConfig: () => parseSourceReadConfig(process.env),
  repository: createSourceRepository(getDatabase), parse: parsePdf, admission: pdfAdmission });
export const youtubeSource = state.youtubeSource06b ??= createYoutubeSourceHandler({ config: () => parseYoutubeSourceConfig(process.env),
  repository: createSourceRepository(getDatabase), cache: createCaptionCache(getDatabase), provider: configuredCaptionProvider(), admission: captionAdmission,
  coordinator: state.captionCoordinator06b ??= new CaptionCoordinator() });
