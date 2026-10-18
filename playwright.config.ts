import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
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
    // Smoke checks must never opt into a real database write or provider request.
    env: { PROOF_ENABLED: "false", TEXT_PROOF_ENABLED: "false", REALTIME_ISSUANCE_ENABLED: "false" },
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
