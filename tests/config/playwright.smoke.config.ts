import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "../smoke",
  outputDir: resolve(process.env.VERIFICATION_ROOT ? `${process.env.VERIFICATION_ROOT}/smoke` : "test-results"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "off", video: "off" },
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-viewport-chromium", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    cwd: process.cwd(),
    // Smoke checks must never opt into a real database write or provider request.
    env: { OWNED_SOURCE_TEXT_ENABLED: "false", YOUTUBE_INGESTION_ENABLED: "false", PDF_INGESTION_ENABLED: "false", PROOF_ENABLED: "false", TEXT_PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false", CAPTION_PROOF_ENABLED: "false", PDF_PROOF_ENABLED: "false" },
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
