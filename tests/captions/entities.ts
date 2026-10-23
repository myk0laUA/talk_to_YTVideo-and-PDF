import { createDirectCaptionProvider } from "../../src/server/captions/provider.ts";

// Columns: upstream XML text, installed 2.0.3 single-pass output, canonical text.
export const entityCases = [
  ["don&#39;t", "don't", "don't"],
  ["don&amp;#39;t", "don&#39;t", "don't"],
  ["don&#x27;t", "don&#x27;t", "don't"],
  ["A &amp; B", "A & B", "A & B"],
  ["&amp;lt;script&amp;gt;", "&lt;script&gt;", "<script>"],
  ["&amp;amp;", "&amp;", "&"],
  ["&#128512; &#x1F600; &#233; &#x6F22;", "&#128512; &#x1F600; &#233; &#x6F22;", "😀 😀 é 漢"],
  ["&lt;&gt;&quot;&apos;&amp;", '<>"\'&', '<>"\'&'],
  ["&#38;#39; &#x26;#x27;", "&#38;#39; &#x26;#x27;", "' '"],
  ["&amp;amp;#39;", "&amp;#39;", "&#39;"],
  ["literal &amp;#39; example", "literal &#39; example", "literal ' example"],
  ["literal &amp;amp;#39; example", "literal &amp;#39; example", "literal &#39; example"],
  ["&unknown; &nbsp; &#xZZ; &#; &#-1; &#39 &#X27; &AMP;", "&unknown; &nbsp; &#xZZ; &#; &#-1; &#39 &#X27; &AMP;", "&unknown; &nbsp; &#xZZ; &#; &#-1; &#39 &#X27; &AMP;"],
  ["&#0; &#1; &#xD800; &#55296; &#xFFFF; &#xFFFE; &#1114112; &#999999999999999999999999999999;", "&#0; &#1; &#xD800; &#55296; &#xFFFF; &#xFFFE; &#1114112; &#999999999999999999999999999999;", "&#0; &#1; &#xD800; &#55296; &#xFFFF; &#xFFFE; &#1114112; &#999999999999999999999999999999;"],
  ["&#9;a&#10;b&#13;c", "&#9;a&#10;b&#13;c", "\ta\nb\rc"],
  ["  don't café 😀 é\t\n same  ", "  don't café 😀 é\t\n same  ", "  don't café 😀 é\t\n same  "],
  ["same", "same", "same"], ["same", "same", "same"],
  ['&lt;script id=&quot;caption-inert&quot;&gt;window.__captionExecuted=1&lt;/script&gt;&lt;img src=&quot;https://caption.invalid/probe&quot; onerror=&quot;window.__captionExecuted=2&quot;&gt;', '<script id="caption-inert">window.__captionExecuted=1</script><img src="https://caption.invalid/probe" onerror="window.__captionExecuted=2">', '<script id="caption-inert">window.__captionExecuted=1</script><img src="https://caption.invalid/probe" onerror="window.__captionExecuted=2">'],
] as const;
export const entityVideoId = "Entity13F01";
export const entityXml = (texts: readonly string[] = entityCases.map(c => c[0])) =>
  `<transcript>${texts.map((text, i) => `<text start="${i % 2 ? 0 : i + 1.25}" dur="0.125">${text}</text>`).join("")}</transcript>`;
export function entityNetwork(xml = entityXml()) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async url => {
    const u = new URL(String(url)); calls.push(u.pathname);
    if (u.pathname === "/watch") return new Response('"INNERTUBE_API_KEY":"synthetic"');
    if (u.pathname === "/youtubei/v1/player") return Response.json({ captions: { playerCaptionsTracklistRenderer: {
      captionTracks: ["ar", "en-GB"].map(languageCode => ({ languageCode, kind: "asr",
        baseUrl: `https://www.youtube.com/api/timedtext?lang=${languageCode}` })) } } });
    if (u.pathname === "/api/timedtext") return new Response(xml);
    throw Error("Unexpected injected upstream request");
  };
  return { calls, fetcher, provider: createDirectCaptionProvider({ fetch: fetcher }) };
}
export async function entityTranscript() {
  const result = await entityNetwork().provider({ videoId: entityVideoId, language: "en", signal: new AbortController().signal });
  if (!result.ok) throw Error(result.error.code);
  return result.transcript;
}
