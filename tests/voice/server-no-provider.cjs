// Loaded only by the isolated mocked browser server, never by application code.
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    return Promise.reject(new Error("External fetch blocked by voice test harness"));
  }
  return originalFetch(input, init);
};
