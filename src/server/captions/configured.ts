import "server-only";
import { parseCaptionConfig } from "./config.ts";
import { createCaptionHandler } from "./handler.ts";
import { createDirectCaptionProvider } from "./provider.ts";
import { createSupadataCaptionProvider } from "./supadata.ts";

// One handler owns admission regardless of the selected adapter. No fallback chain.
export function createConfiguredCaptionHandler(options: {
  env: () => Record<string, string | undefined>; fetch?: typeof fetch;
}) {
  const direct = createDirectCaptionProvider({ fetch: options.fetch });
  return createCaptionHandler({
    config: () => parseCaptionConfig(options.env()),
    provider: (input, config) => config.provider === "direct" ? direct(input)
      : createSupadataCaptionProvider({ apiKey: config.supadataApiKey, fetch: options.fetch })(input),
  });
}
