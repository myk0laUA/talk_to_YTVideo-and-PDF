import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "../recovery",
  testMatch: "*.spec.ts",
  outputDir: resolve(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/11b/browser-results`),
  fullyParallel: true, workers: 4, forbidOnly: true, retries: 0,
  reporter: [["list"], ["json", { outputFile: resolve(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/11b/browser-results.json`) }]],
  use: { baseURL: "http://127.0.0.1:3123", browserName: "chromium", trace: "on", video: "off" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "phone-viewport", use: { viewport: { width: 390, height: 844 } } },
    { name: "narrow-viewport", use: { viewport: { width: 320, height: 800 } } },
    { name: "tablet-viewport", use: { viewport: { width: 768, height: 1024 } } },
  ],
});

