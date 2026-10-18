// Test process preload only. Every upstream request terminates here, never on the network.
let direct = "blocked", managed = "success", polls = 0;
const waiting = new Set();
process.on("message", message => {
  if (!message?.captionTestCommand) return;
  direct = message.direct ?? direct; managed = message.managed ?? managed;
  for (const entry of waiting) if ((entry.managed ? managed : direct) !== "hold") entry.finish();
  process.send?.({ captionTestReply: message.requestId });
});
const segments = [{ text: " FIRST synthetic marker ", start: 1.2505, duration: 0.500125 },
  { text: "MIDDLE synthetic marker", start: 25, duration: 0 }, { text: "LAST synthetic marker", start: 50.125, duration: 3.75 }];
globalThis.fetch = async (input, init) => {
  const { default: assert } = await import("node:assert/strict");
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  const isManaged = url.origin === "https://api.supadata.ai";
  const poll = isManaged && url.pathname === "/v1/transcript/synthetic-job";
  const known = url.origin === "https://www.youtube.com" && ["/watch", "/youtubei/v1/player", "/api/timedtext"].includes(url.pathname)
    || isManaged && (url.pathname === "/v1/transcript" || poll);
  if (!known) { process.send?.({ forbiddenNetwork: true }); throw new Error("Nonfixture fetch blocked"); }
  assert.equal(init.redirect, "manual"); assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "omit");
  assert.ok(init.signal); assert.equal(new Headers(init.headers).has("cookie"), false);
  const stage = isManaged ? poll ? "poll" : "submit" : url.pathname.slice(1);
  process.send?.({ captionUpstream: stage });
  if (isManaged) {
    assert.equal(new Headers(init.headers).get("x-api-key"), "synthetic-03c-key");
    if (!poll) { assert.equal(url.searchParams.get("mode"), "native"); assert.equal(url.searchParams.get("text"), "false"); }
  } else assert.equal(new Headers(init.headers).has("x-api-key"), false);
  if ((isManaged ? managed : direct) === "hold") await new Promise((resolve, reject) => {
    const entry = { managed: isManaged, finish: () => { waiting.delete(entry); init.signal.removeEventListener("abort", abort); resolve(); } };
    const abort = () => { waiting.delete(entry); init.signal.removeEventListener("abort", abort);
      process.send?.({ captionAbort: stage }); reject(new Error("Synthetic abort")); };
    waiting.add(entry); init.signal.addEventListener("abort", abort, { once: true }); if (init.signal.aborted) abort();
  });
  init.signal.throwIfAborted();
  if (isManaged) {
    if (["rate", "quota", "limited"].includes(managed)) return Response.json({ error: "limit-exceeded", details:
      managed === "rate" ? "Global request rate limit was exceeded." : managed === "quota" ? "Plan usage limit was exceeded." : "Unknown synthetic limit" }, { status: 429 });
    if (managed === "auth") return new Response(null, { status: 401 });
    if (managed === "pending" || managed === "polls") {
      if (!poll) return Response.json({ jobId: "synthetic-job" }, { status: 202 });
      polls++;
      if (managed === "pending" || polls < 2) return Response.json({ status: "active" });
    }
    return Response.json({ ...(poll ? { status: "completed" } : {}), lang: "en", content: managed === "malformed" ? [{ text: "partial" }] : segments.map(s => ({
      text: s.text, offset: s.start * 1000, duration: s.duration * 1000, lang: "en" })) });
  }
  if (direct === "blocked") return new Response(null, { status: 403 });
  if (direct === "rate") return new Response(null, { status: 429 });
  if (direct === "upstream") return new Response(null, { status: 500 });
  if (direct === "unavailable") return new Response(null, { status: 404 });
  if (direct === "large") return new Response("synthetic", { headers: { "content-length": String(5 * 1024 * 1024) } });
  if (stage === "watch") return new Response('"INNERTUBE_API_KEY":"synthetic-bootstrap"');
  if (stage === "youtubei/v1/player") return Response.json({ captions: { playerCaptionsTracklistRenderer: { captionTracks: direct === "no-captions" ? [] : [
    { languageCode: "en", kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?v=Cache06c001" },
  ] } } });
  return new Response(direct === "malformed" ? "<transcript><unsupported/></transcript>"
    : `<transcript>${segments.map(s => `<text start="${s.start}" dur="${s.duration}">${s.text}</text>`).join("")}</transcript>`);
};
