import "server-only";
import { parseCaptionConfig } from "./config.ts";
import { createCaptionHandler } from "./handler.ts";
import { createDirectCaptionProvider } from "./provider.ts";
import { createSupadataCaptionProvider } from "./supadata.ts";
import { createAutomaticCaptionProvider } from "./automatic.ts";
import type { Admission } from "../proof/admission.ts";

export function configuredCaptionProvider(network?: typeof fetch) {
  const direct = createDirectCaptionProvider({ fetch: network });
  return createAutomaticCaptionProvider({ direct,
    managed: config => createSupadataCaptionProvider({ apiKey: config.supadataApiKey, fetch: network }) });
}

// Proof parses forced selections only; automatic ingestion shares admission with it.
export function createConfiguredCaptionHandler(options: {
  env: () => Record<string, string | undefined>; fetch?: typeof fetch; admission?: Admission;
}) {
  return createCaptionHandler({
    config: () => parseCaptionConfig(options.env()),
    provider: configuredCaptionProvider(options.fetch), admission: options.admission,
  });
}
