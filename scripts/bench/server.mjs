// Isolated HTTP adapter around production handlers, not a Next.js routing benchmark.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { randomBytes, randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay, PerformanceObserver } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { createDatabaseClient } from '../../src/server/database-client.ts';
import { createSourceRepository } from '../../src/server/sources/repository.ts';
import { createSourceHandlers } from '../../src/server/sources/handler.ts';
import { createYoutubeSourceHandler } from '../../src/server/sources/youtube.ts';
import { createCaptionCache } from '../../src/server/captions/cache.ts';
import { createVisitor } from '../../src/server/proof/visitor.ts';
import { parsePdf } from '../../src/server/pdf/worker.ts';
import { VoiceRegistry } from '../../src/server/voice/registry.ts';
import { createVoiceHandlers } from '../../src/server/voice/handlers.ts';
import { instrument, measured, metricSnapshot } from '../../src/server/observability.ts';

if (process.env.BENCH_DATABASE_URL !== 'postgresql://benchmark@127.0.0.1:55439/benchmark') throw Error('Dedicated local benchmark DB required');
// External providers are never constructed. Fail closed on accidental fetch/WebSocket use.
globalThis.fetch = async () => { throw Error('External network forbidden in benchmark server'); };
globalThis.WebSocket = class { constructor() { throw Error('WebSocket forbidden in benchmark server'); } };
const { database, pool } = createDatabaseClient(process.env.BENCH_DATABASE_URL);
const repository = createSourceRepository(() => database);
const config = { origin: 'http://127.0.0.1:3149', secure: false, cookieSecret: randomBytes(32).toString('hex'), apiKey: 'synthetic-unused' };
const handlers = createSourceHandlers({ config: () => config, repository,
  parse: (...args) => measured('pdf.parse', () => parsePdf(...args)) });
let providerMode = 'success', providerCalls = 0;
const youtube = createYoutubeSourceHandler({ config: () => ({ ...config, provider: 'direct' }), repository,
  cache: createCaptionCache(() => database), provider: async ({ videoId, signal }) => {
    providerCalls++;
    await delay(50, undefined, { signal });
    if (providerMode !== 'success') return { ok: false, error: { code: providerMode, message: 'Synthetic provider failure' } };
    const segments = Array.from({ length: 100 }, (_, i) => ({ startSeconds: i * 2, durationSeconds: 2, text: `Synthetic public caption number ${i}.` }));
    return { ok: true, transcript: { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      language: 'en', provider: 'youtube-transcript-plus@2.0.3', fullText: segments.map(s => s.text).join('\n'), segments } };
  } });
const registry = new VoiceRegistry({ repository, mint: async ({ signal }) => {
  await delay(25, undefined, { signal });
  return { clientSecret: 'ek_synthetic_benchmark_only', expiresAt: Math.floor(Date.now() / 1000) + 60 };
} });
const voice = createVoiceHandlers({ config: () => config, registry });
const routes = {
  'POST /api/sources/pdf': instrument('http.source.upload', handlers.upload),
  'POST /api/sources/youtube': instrument('http.youtube', youtube),
  'POST /api/voice-preparations': instrument('http.voice.prepare', voice.prepare),
  'POST /api/voice-preparations/credential': instrument('http.voice.credential', voice.credential),
  'POST /api/voice-preparations/cancel': instrument('http.voice.cancel', voice.cancel),
};
const read = instrument('http.source.read', handlers.read), remove = instrument('http.source.remove', handlers.remove);
const fixtures = [];
for (let i = 0; i < 50; i++) {
  const visitor = createVisitor(config, Date.now());
  const text = 'Synthetic source for repeatable reliability measurement. '.repeat(100);
  const sections = Array.from({ length: 8 }, (_, n) => ({ id: `page-${n + 1}`, pageNumber: n + 1, text }));
  const fullText = sections.map(s => s.text).join('\n\n');
  const row = { id: randomUUID(), ownerSessionHash: visitor.owner, activeSourceOwner: visitor.owner,
    kind: 'PDF', extractionStatus: 'READY', canonicalOrigin: null, provider: 'pdf-parse@2.4.5', title: 'Synthetic benchmark',
    fullText, sections, pageCount: 8, language: null, characterCount: fullText.length,
    wordCount: fullText.trim().split(/\s+/u).length, warnings: [], expiresAt: new Date(visitor.expiresAt * 1000) };
  await repository.replace(row, () => {});
  fixtures.push({ id: row.id, cookie: `td-visitor=${visitor.token}`, characters: row.characterCount });
}
const server = createServer(async (req, res) => {
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  try {
    const url = new URL(req.url, config.origin);
    const request = new Request(url, { method: req.method, headers: req.headers, signal: controller.signal,
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
    const source = /^\/api\/sources\/([^/]+)$/.exec(url.pathname);
    const route = routes[`${req.method} ${url.pathname}`];
    const response = route ? await route(request) : source && req.method === 'GET' ? await read(request, source[1])
      : source && req.method === 'DELETE' ? await remove(request, source[1]) : new Response(null, { status: 404 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { if (!res.destroyed) { res.writeHead(500); res.end('Benchmark adapter failure'); } }
});
server.requestTimeout = 20000;
server.headersTimeout = 5000;
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3149, '127.0.0.1', resolve); });
let gcCount = 0, gcDurationMs = 0;
const gcObserver = new PerformanceObserver(list => { for (const entry of list.getEntries()) { gcCount++; gcDurationMs += entry.duration; } });
if (process.env.BENCH_MEMORY === 'true') gcObserver.observe({ entryTypes: ['gc'] });
const lag = monitorEventLoopDelay({ resolution: 10 }); lag.enable();
let peakRss = 0, peakConnections = 0, peakWaiting = 0, cpu, started;
function reset() { metricSnapshot(true); peakRss = process.memoryUsage().rss; peakConnections = 0; peakWaiting = 0;
  cpu = process.cpuUsage(); started = performance.now(); lag.reset(); }
reset();
const sampler = setInterval(() => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  peakConnections = Math.max(peakConnections, pool.totalCount);
  peakWaiting = Math.max(peakWaiting, pool.waitingCount);
}, 20);
process.on('message', async message => {
  const { id, command } = message;
  try {
    let result;
    if (command === 'reset') { reset(); result = true; }
    else if (command === 'memory') {
      if (message.collect) { if (!globalThis.gc) throw Error('GC unavailable'); globalThis.gc(); await delay(20); }
      result = { ...process.memoryUsage(), gcCount, gcDurationMs, connections: pool.totalCount, waiting: pool.waitingCount };
    }
    else if (command === 'snapshot') {
      const usage = process.cpuUsage(cpu), elapsedMs = performance.now() - started;
      result = { elapsedMs, cpuCorePercent: (usage.user + usage.system) / (elapsedMs * 10), peakRssBytes: peakRss,
        peakConnections, peakWaiting, currentConnections: pool.totalCount, idleConnections: pool.idleCount,
        eventLoopP99Ms: lag.percentile(99) / 1e6, providerCalls, voiceResources: registry.resources, ...metricSnapshot() };
    } else if (command === 'provider') { providerMode = message.mode; result = true; }
    else if (command === 'close') {
      clearInterval(sampler); lag.disable(); gcObserver.disconnect(); registry.dispose();
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      await database.$disconnect();
      if (!pool.ended) throw Error('Benchmark pool not released');
      process.send({ id, result: true }); process.disconnect(); return;
    } else throw Error('Unknown command');
    process.send({ id, result });
  } catch { process.send({ id, error: 'Benchmark command failed' }); }
});
process.send({ ready: true, fixtures });
