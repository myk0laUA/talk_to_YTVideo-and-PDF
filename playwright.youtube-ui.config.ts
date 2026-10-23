import { defineConfig } from "@playwright/test";

// Production server + test-only upstream/repository lifecycle is owned by the script.
export default defineConfig({
  testDir: "./tests/youtube-ui", fullyParallel: false, workers: 1, retries: 0,
  outputDir: "artifacts/local/12e/regression/05b/test-results",
  reporter: [["list"], ["json", { outputFile: "artifacts/local/12e/regression/05b/browser-results.json" }]],
  use: { baseURL: "http://127.0.0.1:3109", trace: "off", video: "off", screenshot: "off", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile390", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
    { name: "narrow360", use: { browserName: "chromium", viewport: { width: 360, height: 780 } } },
  ],
});
