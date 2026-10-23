// 13F actual production browser/import/read with synthetic upstream and Prisma.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { chromium, expect } from '@playwright/test';
import { entityCases, entityXml, entityVideoId } from '../captions/entities.ts';

const root = path.resolve(process.env.VERIFICATION_ROOT ?? 'artifacts/local/caption-entities');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, 'run-'));
await writeFile(path.join(directory, 'upstream.xml'), entityXml());
const port = 3140, origin = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(port, '127.0.0.1', () => s.close(resolve)); });
const env = { ...process.env, NODE_OPTIONS: '', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', APP_ORIGIN: origin,
  VISITOR_COOKIE_SECRET: randomBytes(32).toString('hex'), DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic',
  OPENAI_API_KEY: '', SUPADATA_API_KEY: '', SCRAPECREATORS_API_KEY: '',
  YOUTUBE_INGESTION_ENABLED: 'true', YOUTUBE_INGESTION_LOCAL_HTTP: 'true', YOUTUBE_INGESTION_PROVIDER: 'direct', YOUTUBE_CAPTION_CACHE_BYPASS: 'false',
  PDF_INGESTION_ENABLED: 'false', OWNED_SOURCE_TEXT_ENABLED: 'false', OWNED_SOURCE_VOICE_ENABLED: 'false',
  PROOF_ENABLED: 'false', REALTIME_ISSUANCE_ENABLED: 'false', TEXT_PROOF_ENABLED: 'false', PDF_PROOF_ENABLED: 'false', CAPTION_PROOF_ENABLED: 'false',
  CAPTION_ENTITY_TEST_XML: path.join(directory, 'upstream.xml') };
const report = { build: (await readFile('.next/BUILD_ID', 'utf8')).trim(), node: process.version,
  context: 'Local production UI/routes/parser/cache/repository, injected upstream and in-memory Prisma; no live DB/provider/phone',
  forbiddenNetwork: 0, upstream: [], checks: [] };
const server = spawn(process.execPath, ['--import', pathToFileURL(path.resolve('tests/captions/server.mjs')).href,
  'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
let log = '', sequence = 0, browser;
server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
server.on('message', m => { if (m.textTestForbidden) report.forbiddenNetwork++; if (m.captionEntityStage) report.upstream.push(m.captionEntityStage); });
const exited = new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal })));
const snapshot = () => new Promise((resolve, reject) => {
  const requestId = ++sequence, timer = setTimeout(() => { server.off('message', listener); reject(Error('IPC timeout')); }, 5000);
  const listener = m => { if (m.sourceTestReply === requestId) { clearTimeout(timer); server.off('message', listener); resolve(m.snapshot); } };
  server.on('message', listener); server.send({ sourceTestCommand: 'snapshot', requestId });
});
try {
  let ready = false;
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(500) })).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw Error('Server exited before ready');
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready); browser = await chromium.launch();
  let first;
  for (const [index, width] of [390, 1440].entries()) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await page.goto(origin);
    const created = page.waitForResponse(r => r.url().endsWith('/api/sources/youtube') && r.status() === 201);
    await page.getByLabel('YouTube URL', { exact: true }).fill(`https://youtu.be/${entityVideoId}`);
    await page.getByRole('button', { name: 'Import YouTube video', exact: true }).click();
    const metadata = (await (await created).json()).source;
    await page.getByRole('button', { name: 'View source', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'YouTube caption text', exact: true })).toBeVisible();
    assert.deepEqual(await page.locator('.page-text').allTextContents(), entityCases.map(c => c[2]));
    const contentResponse = await context.request.get(`${origin}/api/sources/${metadata.id}`);
    assert.equal(contentResponse.status(), 200); const content = (await contentResponse.json()).source;
    assert.equal(content.fullText, entityCases.map(c => c[2]).join('\n'));
    assert.deepEqual(content.sections.map(s => s.text), entityCases.map(c => c[2]));
    assert.equal(metadata.characterCount, content.fullText.length);
    assert.equal(metadata.wordCount, content.fullText.trim().split(/\s+/u).filter(Boolean).length);
    assert.equal(metadata.language, 'en-GB'); assert.equal(metadata.trackType, 'automatic');
    await expect(page.locator('#source-segment-1 h3')).toHaveText('0:01.25 · duration 0.125 s');
    await page.screenshot({ path: path.join(directory, `preview-${width}.png`) });
    const last = page.locator(`#source-segment-${entityCases.length} .page-text`);
    await last.scrollIntoViewIfNeeded(); await expect(last).toBeInViewport();
    await expect(last).toHaveText(entityCases.at(-1)[2]);
    assert.equal(await page.locator('#source-text script, #source-text img, #source-text iframe').count(), 0);
    assert.equal(await page.evaluate(() => window.__captionExecuted), undefined);
    assert.equal(await page.locator('.page-text').evaluateAll(nodes => nodes.reduce((n, el) => n + el.children.length, 0)), 0);
    await page.screenshot({ path: path.join(directory, `inert-markup-${width}.png`) });
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    const resources = await snapshot(); assert.equal(resources.cacheWrites, 1); assert.equal(report.upstream.length, 3);
    if (index) { assert.notEqual(metadata.id, first.id); assert.equal(content.fullText, first.fullText); assert.deepEqual(content.sections, first.sections); }
    else first = content;
    report.checks.push({ path: index ? 'cache-hit' : 'fresh-import', width, sourceId: metadata.id, characters: metadata.characterCount,
      words: metadata.wordCount, segments: content.sections.length, external, errors, cacheWrites: resources.cacheWrites, plainTextChildren: 0 });
    await context.close();
  }
  assert.equal(report.forbiddenNetwork, 0); report.status = 'PASS';
} finally {
  await browser?.close(); server.kill(); report.serverExit = await exited;
  await writeFile(path.join(directory, 'server.log'), log);
  await writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
