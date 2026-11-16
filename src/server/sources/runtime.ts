import "server-only";
import { instrument, measured } from "../observability";
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
const rawSourceHandlers = state.sourceHandlers03c ??= createSourceHandlers({ config: () => parseSourceConfig(process.env), readConfig: () => parseSourceReadConfig(process.env),
  repository: createSourceRepository(getDatabase), parse: (...args) => measured("pdf.parse", () => parsePdf(...args)), admission: pdfAdmission });
export const sourceHandlers = { upload: instrument("http.source.upload", rawSourceHandlers.upload),
  read: instrument("http.source.read", rawSourceHandlers.read), remove: instrument("http.source.remove", rawSourceHandlers.remove) };
const rawYoutubeSource = state.youtubeSource06b ??= createYoutubeSourceHandler({ config: () => parseYoutubeSourceConfig(process.env),
  repository: createSourceRepository(getDatabase), cache: createCaptionCache(getDatabase), provider: configuredCaptionProvider(), admission: captionAdmission,
  coordinator: state.captionCoordinator06b ??= new CaptionCoordinator() });
export const youtubeSource = instrument("http.youtube", rawYoutubeSource);
