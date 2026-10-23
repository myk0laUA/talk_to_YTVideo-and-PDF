import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "../text-session",
  testMatch: "*.spec.ts",
  outputDir: resolve("artifacts/local/12e-correction/regression/10b/browser-results"),
  fullyParallel: true, forbidOnly: true, retries: 0,
  reporter: [["list"], ["json", { outputFile: resolve("artifacts/local/12e-correction/regression/10b/browser-results.json") }]],
  use: { baseURL: "http://127.0.0.1:3117", browserName: "chromium", trace: "on", video: "off" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "phone-viewport", use: { viewport: { width: 390, height: 844 } } },
    { name: "narrow-viewport", use: { viewport: { width: 320, height: 800 } } },
    { name: "tablet-viewport", use: { viewport: { width: 768, height: 1024 } } },
  ],
});
