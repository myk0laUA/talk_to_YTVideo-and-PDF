// Test-only production-server observer/injector. Application has no test env hook.
// Report only process memory and worker lifecycle, never bytes/filenames/cookies.
const send = value => { if (process.connected) process.send(value); };
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) { send({ forbiddenNetwork: true }); return Promise.reject(new Error("External fetch blocked")); }
  return originalFetch(input, init);
};
(async () => {
  const { default: threads } = await import("node:worker_threads");
  const { syncBuiltinESMExports } = await import("node:module");
  const { resolve } = await import("node:path");
  const OriginalWorker = threads.Worker;
  let count = 0;
  threads.Worker = class extends OriginalWorker {
    constructor(filename, options) {
      const workerFile = String(filename).replaceAll("\\", "/");
      const isPdf = workerFile.endsWith("/src/server/pdf/parse-worker.mjs") || workerFile.includes("src_server_pdf_parse-worker_mjs_");
      const id = isPdf ? ++count : null;
      const slow = id === 1 && ["timeout", "disconnect"].includes(process.env.PDF_HTTP_SCENARIO);
      super(slow ? resolve("tests/pdf/slow-worker.mjs") : filename, options);
      if (isPdf) {
        send({ pdfWorker: "created", id, syntheticSlow: slow });
        this.once("online", () => send({ pdfWorker: "online", id }));
        this.once("exit", code => send({ pdfWorker: "exit", id, code }));
      }
    }
  };
  syncBuiltinESMExports();
})();
let peak = 0;
setInterval(() => {
  const rss = process.memoryUsage().rss;
  if (rss > peak) { peak = rss; send({ rssBytes: rss }); }
}, 10).unref();
