import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/voice-session",
  testMatch: "*.spec.ts",
  outputDir: `${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/08c/browser-results`,
  fullyParallel: true, workers: 4, forbidOnly: true, retries: 0,
  reporter: [["list"], ["json", { outputFile: `${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/08c/browser-results.json` }]],
  use: { baseURL: "http://127.0.0.1:3119", browserName: "chromium", trace: "on", video: "off" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "phone-viewport", use: { viewport: { width: 390, height: 844 } } },
    { name: "narrow-viewport", use: { viewport: { width: 320, height: 800 } } },
    { name: "tablet-viewport", use: { viewport: { width: 768, height: 1024 } } },
  ],
});

