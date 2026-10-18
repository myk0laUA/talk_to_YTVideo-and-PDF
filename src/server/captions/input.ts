const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
export const validLanguage = (value: unknown): value is string => typeof value === "string"
  && value.length <= 35 && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value);

// HTTPS only: youtube.com (www/m) watch, shorts, embed, live; youtu.be/<id>.
// Query/fragment playback context is discarded. Duplicate v parameters are rejected.
export function normalizeVideo(value: unknown): { videoId: string; canonicalUrl: string } | null {
  if (typeof value !== "string" || value.length > 400) return null;
  let id = value;
  if (!videoIdPattern.test(id)) {
    if (!/^https:\/\/(?:www\.youtube\.com|m\.youtube\.com|youtube\.com|youtu\.be)\//i.test(value) || /[\s\\]/.test(value)) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
      if (url.hostname === "youtu.be") id = url.pathname.slice(1);
      else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
        if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v")!;
        else {
          const match = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})$/.exec(url.pathname);
          if (!match) return null;
          id = match[1];
        }
      } else return null;
    } catch { return null; }
  }
  return videoIdPattern.test(id) ? { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` } : null;
}
