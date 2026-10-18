import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**", "next-env.d.ts", "src/generated/**", ".agents/**",
    ".tools/**", "test-results/**", "playwright-report/**", ".playwright-cli/**",
    ".playwright/**", ".impeccable/**", "artifacts/**",
  ]),
]);
