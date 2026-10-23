import "server-only";

const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeLayer(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#(?:[0-9]+|x[0-9a-fA-F]+));/g, reference => {
    const body = reference.slice(1, -1);
    if (body[0] !== "#") return named[body];
    const code = body[1] === "x" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
    // XML 1.0 character ranges: preserve invalid references verbatim, including
    // NUL, forbidden controls, surrogates, FFFE/FFFF and out-of-range numbers.
    if (!(code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xD7FF)
      || (code >= 0xE000 && code <= 0xFFFD) || (code >= 0x10000 && code <= 0x10FFFF))) return reference;
    return String.fromCodePoint(code);
  });
}

/** Direct XML boundary only: exactly two simultaneous entity passes over RAW
 * text (XML escaping plus one observed extra layer). Never decode to stability.
 * Literal intent is ambiguous: &amp;#39; becomes ', but &amp;amp;#39; stays &#39;.
 * Do not call on package-decoded text, JSON providers, cache, sources or renderers.
 */
export function canonicalDirectCaptionText(rawXmlText: string): string {
  return decodeLayer(decodeLayer(rawXmlText));
}
