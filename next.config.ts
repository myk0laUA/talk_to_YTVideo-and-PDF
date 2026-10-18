import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/proof-pdf": ["./src/server/pdf/parse-worker.mjs", "./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/**/*", "./node_modules/@napi-rs/canvas*/**/*"],
  },
};

export default nextConfig;
