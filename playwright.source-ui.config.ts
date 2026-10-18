import { defineConfig } from "@playwright/test";

// Server lifecycle belongs to verify-source-ui.mjs (test-only repository preload).
export default defineConfig({
  testDir: "./tests/source-ui", fullyParallel: false, workers: 1, retries: 0,
  reporter: [["list"], ["json", { outputFile: "artifacts/local/05a/browser-results.json" }]],
  use: { baseURL: "http://127.0.0.1:3107", trace: "off", video: "off", screenshot: "off", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile390", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
    { name: "narrow360", use: { browserName: "chromium", viewport: { width: 360, height: 780 } } },
  ],
});
