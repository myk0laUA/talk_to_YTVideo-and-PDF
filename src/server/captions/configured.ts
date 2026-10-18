import "server-only";
import { parseCaptionConfig } from "./config.ts";
import { createCaptionHandler } from "./handler.ts";
import { createDirectCaptionProvider } from "./provider.ts";
import { createSupadataCaptionProvider } from "./supadata.ts";
import type { CaptionConfig } from "./config.ts";
import type { Admission } from "../proof/admission.ts";

export function configuredCaptionProvider(network?: typeof fetch) {
  const direct = createDirectCaptionProvider({ fetch: network });
  return (input: Parameters<typeof direct>[0], config: CaptionConfig) => config.provider === "direct" ? direct(input)
    : createSupadataCaptionProvider({ apiKey: config.supadataApiKey, fetch: network })(input);
}

// One handler owns admission regardless of the selected adapter. No fallback chain.
export function createConfiguredCaptionHandler(options: {
  env: () => Record<string, string | undefined>; fetch?: typeof fetch; admission?: Admission;
}) {
  return createCaptionHandler({
    config: () => parseCaptionConfig(options.env()),
    provider: configuredCaptionProvider(options.fetch), admission: options.admission,
  });
}
