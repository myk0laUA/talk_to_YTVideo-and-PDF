// Preload for the isolated production-root check. Never imported by application code.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    process.send?.({ forbiddenProviderCall: true });
    throw new Error("External provider calls forbidden in 09B");
  }
  return originalFetch(input, init);
};
