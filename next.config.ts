import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  // Also cover framework-generated method errors/OPTIONS, before handlers run.
  headers: async () => [{ source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }],
  // Keep the pinned server WebSocket implementation in Node (also permits explicit test-process injection).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "next/dist/compiled/ws"],
  outputFileTracingIncludes: {
    "/api/sources/pdf": ["./src/server/pdf/parse-worker.mjs", "./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/**/*", "./node_modules/@napi-rs/canvas*/**/*"],
    "/api/proof-pdf": ["./src/server/pdf/parse-worker.mjs", "./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/**/*", "./node_modules/@napi-rs/canvas*/**/*"],
  },
};

export default nextConfig;
