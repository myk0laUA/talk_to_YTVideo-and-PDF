import { defineConfig } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "../text", fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  // Never retain request bodies, credentials or SDP in traces/videos.
  use: { baseURL: "http://127.0.0.1:3102", trace: "off", video: "off", screenshot: "off", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    cwd: process.cwd(),
    command: "npm run start -- --hostname 127.0.0.1 --port 3102", url: "http://127.0.0.1:3102", reuseExistingServer: false,
    env: { YOUTUBE_INGESTION_ENABLED: "false", PDF_INGESTION_ENABLED: "false", PDF_PROOF_ENABLED: "false", CAPTION_PROOF_ENABLED: "false", PROOF_ENABLED: "true", TEXT_PROOF_ENABLED: "true", REALTIME_ISSUANCE_ENABLED: "true", APP_ORIGIN: "https://proof.invalid",
      VISITOR_COOKIE_SECRET: "a".repeat(64), OPENAI_API_KEY: "synthetic-server-key-never-send", OPENAI_REALTIME_MODEL: "gpt-realtime",
      DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/synthetic?connect_timeout=1",
      NODE_OPTIONS: `--require "${path.resolve("tests/voice/server-no-provider.cjs").replaceAll("\\", "/")}"` },
    timeout: 60000,
  },
});

