// Explicit test preload only. No application import, env selector or live network.
let mode = "success";
const waiting = new Set();
process.on("message", message => {
  if (!message?.captionTestCommand) return;
  mode = message.captionTestCommand;
  if (mode !== "hold") { for (const resolve of waiting) resolve(); waiting.clear(); }
  process.send?.({ captionTestReply: message.requestId });
});
const segments = [{ text: " FIRST synthetic marker ", start: 1.2505, duration: 0.500125 },
  { text: "MIDDLE synthetic marker", start: 25, duration: 0 }, { text: "LAST synthetic marker", start: 50.125, duration: 3.75 }];
globalThis.fetch = async (input, init) => {
  const { default: assert } = await import("node:assert/strict");
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  const known = url.origin === "https://www.youtube.com" && ["/watch", "/youtubei/v1/player", "/api/timedtext"].includes(url.pathname)
    || url.origin === "https://api.supadata.ai" && url.pathname === "/v1/transcript";
  if (!known) { process.send?.({ forbiddenNetwork: true }); throw new Error("All other server fetch blocked"); }
  assert.equal(init.redirect, "manual"); assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "omit");
  assert.ok(init.signal); assert.equal(new Headers(init.headers).has("cookie"), false);
  const stage = url.hostname === "api.supadata.ai" ? "supadata" : url.pathname.slice(1);
  process.send?.({ captionUpstream: stage });
  if (mode === "hold") await new Promise((resolve, reject) => {
    const finish = () => { waiting.delete(finish); init.signal.removeEventListener("abort", abort); resolve(); };
    const abort = () => { waiting.delete(finish); reject(new Error("Synthetic request cancelled")); };
    waiting.add(finish); init.signal.addEventListener("abort", abort, { once: true });
    if (init.signal.aborted) abort();
  });
  init.signal.throwIfAborted();
  if (mode === "blocked") return new Response("PRIVATE upstream response", { status: 403 });
  if (stage === "supadata") {
    assert.equal(new Headers(init.headers).get("x-api-key"), "synthetic-03c-key");
    assert.equal(url.searchParams.get("mode"), "native"); assert.equal(url.searchParams.get("text"), "false");
    return Response.json({ lang: "en", content: mode === "malformed" ? [] : segments.map(s => ({ text: s.text, offset: s.start * 1000, duration: s.duration * 1000, lang: "en" })) });
  }
  assert.equal(new Headers(init.headers).has("x-api-key"), false);
  if (stage === "watch") return new Response('"INNERTUBE_API_KEY":"synthetic-bootstrap"');
  if (stage === "youtubei/v1/player") return Response.json({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [
    { languageCode: "en", kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ" },
  ] } } });
  return new Response(mode === "malformed" ? "<transcript></transcript>"
    : `<transcript>${segments.map(s => `<text start="${s.start}" dur="${s.duration}">${s.text}</text>`).join("")}</transcript>`);
};
