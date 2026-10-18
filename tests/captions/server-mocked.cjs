// Test-only Node preload. Not imported by application code. Never calls an external server.
const originalFetch = globalThis.fetch;
let polls = 0;
const transcript = { lang: "fr", content: [
  { text: "FIRST synthetic marker", offset: 1250.5, duration: 500.125, lang: "fr" },
  { text: "MIDDLE synthetic marker", offset: 25000, duration: 1000, lang: "fr" },
  { text: "LAST synthetic marker", offset: 50000, duration: 750.5, lang: "fr" },
] };
globalThis.fetch = async function (input, init) {
  const { default: assert } = await import("node:assert/strict");
  const url = new URL(typeof input === "string" ? input : input.url ?? input.toString());
  if (["127.0.0.1", "localhost"].includes(url.hostname)) return originalFetch(input, init);
  const emit = kind => process.send?.({ captionMock: kind });
  try {
    assert.equal(init?.redirect, "manual"); assert.equal(init?.credentials, "omit"); assert.equal(init?.cache, "no-store");
    const headers = new Headers(init?.headers);
    assert.equal(headers.has("cookie"), false);
    if (url.origin === "https://api.supadata.ai") {
      assert.equal(headers.get("x-api-key"), "synthetic-03b-http-key");
      assert.equal(url.href.includes("synthetic-03b-http-key"), false);
      assert.equal(init.method, "GET");
      if (url.pathname === "/v1/transcript") {
        assert.equal(url.searchParams.get("mode"), "native"); assert.equal(url.searchParams.get("text"), "false");
        assert.equal(url.searchParams.get("lang"), "en");
        assert.ok(["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=Ks-_Mh1QhMc"].includes(url.searchParams.get("url")));
        emit("supadata-initial");
        if (url.searchParams.get("url").endsWith("Ks-_Mh1QhMc")) return Response.json({ error: "limit-exceeded",
          details: "Plan usage limit was exceeded.", message: "RAW_PRIVATE", documentationUrl: "https://evil.invalid" }, { status: 429 });
        return process.env.CAPTION_MOCK_SCENARIO === "sync" ? Response.json(transcript)
          : Response.json({ jobId: "synthetic-job_1" }, { status: 202 });
      }
      assert.equal(url.pathname, "/v1/transcript/synthetic-job_1"); assert.equal(url.search, "");
      emit("supadata-poll"); polls++;
      if (process.env.CAPTION_MOCK_SCENARIO === "failed") return Response.json({ status: "failed", error: { message: "RAW_PRIVATE" } });
      if (process.env.CAPTION_MOCK_SCENARIO === "pending") return Response.json({ status: "active" });
      return Response.json(polls === 1 ? { status: "queued" } : polls === 2 ? { status: "active" } : { status: "completed", ...transcript });
    }
    assert.equal(url.origin, "https://www.youtube.com"); assert.equal(headers.has("x-api-key"), false);
    if (url.pathname === "/watch") { emit("direct-watch"); return new Response('"INNERTUBE_API_KEY":"synthetic-bootstrap"'); }
    if (url.pathname === "/youtubei/v1/player") {
      emit("direct-player");
      return Response.json({ playabilityStatus: { status: "OK" }, captions: { playerCaptionsTracklistRenderer: {
        captionTracks: [{ languageCode: "en", baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ" }],
      } } });
    }
    assert.equal(url.pathname, "/api/timedtext"); emit("direct-transcript");
    return new Response('<transcript><text start="1.25" dur="0.5">FIRST direct synthetic marker</text></transcript>');
  } catch {
    emit("contract-rejected");
    throw new Error("Mock upstream contract rejected");
  }
};
