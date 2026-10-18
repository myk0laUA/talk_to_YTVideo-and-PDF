import "server-only";
import { parseCaptionConfig } from "./config";
import { createCaptionHandler } from "./handler";
import { createDirectCaptionProvider } from "./provider";

const processState = globalThis as unknown as { captionProof03a?: ReturnType<typeof createCaptionHandler> };
export const captionProof = processState.captionProof03a ??= createCaptionHandler({
  config: () => parseCaptionConfig(process.env), provider: createDirectCaptionProvider(),
});
