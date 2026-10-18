import "server-only";
import { createConfiguredCaptionHandler } from "./configured";
import { captionAdmission } from "./admission";

const processState = globalThis as unknown as { captionProof03b?: ReturnType<typeof createConfiguredCaptionHandler> };
export const captionProof = processState.captionProof03b ??= createConfiguredCaptionHandler({ env: () => process.env, admission: captionAdmission });
