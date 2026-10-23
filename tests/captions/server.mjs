// Explicit test preload only: actual built routes/parser/cache/repository;
// authored upstream XML and in-memory Prisma boundary. No live provider/DB.
import '../text-relay/network.cjs';
import '../sources/server-repository.mjs';
import { readFileSync } from 'node:fs';
const xml = readFileSync(process.env.CAPTION_ENTITY_TEST_XML, 'utf8');
globalThis.fetch = async input => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
  if (url.origin !== 'https://www.youtube.com' || !['/watch', '/youtubei/v1/player', '/api/timedtext'].includes(url.pathname)) {
    process.send?.({ textTestForbidden: true }); throw Error('Unexpected test upstream');
  }
  process.send?.({ captionEntityStage: url.pathname });
  if (url.pathname === '/watch') return new Response('"INNERTUBE_API_KEY":"synthetic"');
  if (url.pathname === '/youtubei/v1/player') return Response.json({ captions: { playerCaptionsTracklistRenderer: {
    captionTracks: ['ar', 'en-GB'].map(languageCode => ({ languageCode, kind: 'asr',
      baseUrl: `https://www.youtube.com/api/timedtext?lang=${languageCode}` })) } } });
  return new Response(xml);
};
