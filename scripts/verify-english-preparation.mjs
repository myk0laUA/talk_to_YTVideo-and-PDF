// Task13E built route/UI regression. Synthetic storage; all external network denied.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { chromium, expect } from '@playwright/test';
import { createVisitor, visitorCookie } from '../src/server/proof/visitor.ts';
import { captionRecord, uploadedRecord, sourceDto } from '../src/server/sources/service.ts';
import { oversizedCaptions } from '../tests/context/caption-boundaries.ts';
import { pdfFixture } from '../tests/context/fixtures.ts';
import { SOURCE_SIZE_MESSAGE } from '../src/shared/priming-failure.ts';

const root = path.resolve(process.env.VERIFICATION_ROOT ?? 'artifacts/local/source-limits');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, 'run-'));
const port = 3139, origin = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(port, '127.0.0.1', () => s.close(resolve)); });
const config = { origin, secure: false, cookieSecret: randomBytes(32).toString('hex') };
const env = { ...process.env, NODE_OPTIONS: '', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', APP_ORIGIN: origin,
  VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic',
  OPENAI_API_KEY: 'sk-synthetic-no-provider', SUPADATA_API_KEY: '', SCRAPECREATORS_API_KEY: '',
  PDF_INGESTION_ENABLED: 'true', PDF_INGESTION_LOCAL_HTTP: 'true', YOUTUBE_INGESTION_ENABLED: 'true',
  YOUTUBE_INGESTION_LOCAL_HTTP: 'true', YOUTUBE_INGESTION_PROVIDER: 'direct', OWNED_SOURCE_TEXT_ENABLED: 'true', OWNED_SOURCE_VOICE_ENABLED: 'true',
  PROOF_ENABLED: 'false', REALTIME_ISSUANCE_ENABLED: 'false', TEXT_PROOF_ENABLED: 'false', PDF_PROOF_ENABLED: 'false', CAPTION_PROOF_ENABLED: 'false' };
const report = { build: (await readFile('.next/BUILD_ID', 'utf8')).trim(), node: process.version,
  context: 'Local production Next UI/routes; synthetic Prisma; provider/native media blocked; viewport emulation, not phone/audio proof',
  forbiddenNetwork: 0, checks: [] };
const server = spawn(process.execPath, ['--require', path.resolve('tests/text-relay/network.cjs'), '--import', pathToFileURL(path.resolve('tests/owned-voice/server.mjs')).href,
  'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
let log = '', sequence = 0, browser;
server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
server.on('message', m => { if (m.textTestForbidden) report.forbiddenNetwork++; });
const exited = new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal })));
const ipc = (voiceTestCommand, data = {}) => new Promise((resolve, reject) => {
  const requestId = ++sequence, timer = setTimeout(() => { server.off('message', listener); reject(Error('IPC timeout')); }, 5000);
  const listener = m => { if (m.voiceTestReply === requestId) { clearTimeout(timer); server.off('message', listener); resolve(m.snapshot); } };
  server.on('message', listener); server.send({ voiceTestCommand, requestId, ...data });
});
try {
  let ready = false;
  for (let i = 0; i < 200; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready, 'built server ready'); browser = await chromium.launch();
  for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
    const visitor = createVisitor(config, Date.now()), row = captionRecord(oversizedCaptions(), visitor);
    await ipc('seed', { row });
    const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce', viewport: { width, height: width === 390 ? 844 : 900 } });
    const cookie = visitorCookie(visitor, config, Date.now()).split(';', 1)[0];
    await context.addCookies([{ name: cookie.split('=')[0], value: cookie.slice(cookie.indexOf('=') + 1), url: origin }]);
    const page = await context.newPage(), errors = [], external = [], statuses = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (new URL(r.url()).pathname === '/api/voice-preparations') statuses.push(r.status()); });
    await page.addInitScript(() => {
      window.__native13e = 0;
      const blocked = () => { window.__native13e++; throw Error('Native acquisition forbidden'); };
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: blocked } });
      window.RTCPeerConnection = blocked; window.WebSocket = blocked; window.Audio = blocked;
    });
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) { external.push(u.origin); return route.abort(); }
      if (u.pathname === '/api/sources/youtube' && route.request().method() === 'POST')
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, source: sourceDto(row) }) });
      return route.continue();
    });
    const capture = async name => {
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const e = document.querySelector('.voice-session-status:not(.visually-hidden),.text-session-status:not(.visually-hidden)');
        if (!e) return { overflow: document.documentElement.scrollWidth > innerWidth };
        const r = e.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, x: r.x, y: r.y, right: r.right, bottom: r.bottom,
          clipped: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 };
      });
      assert.equal(geometry.overflow, false); if (geometry.clipped !== undefined) {
        assert.equal(geometry.clipped, false); assert.ok(geometry.y >= 0 && geometry.bottom <= (width === 390 ? 844 : 900));
      }
      await page.screenshot({ path: path.join(directory, `${name}-${theme}-${width}.png`) });
      report.checks.push({ name, theme, width, geometry });
    };
    await page.goto(origin);
    await expect(page.getByText('Text PDFs up to 25 MB, 500 pages and 2 million extracted characters.', { exact: true })).toBeVisible();
    await expect(page.getByText('Choose a document with selectable text.', { exact: true })).toBeVisible();
    await capture('pdf-helper');
    await page.getByLabel('YouTube URL', { exact: true }).fill(`https://www.youtube.com/watch?v=${oversizedCaptions().videoId}`);
    await page.getByRole('button', { name: 'Import YouTube video', exact: true }).click();
    await page.getByRole('button', { name: 'View source', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Voice mode', exact: true }).click();
    await page.getByRole('button', { name: 'Start voice', exact: true }).click();
    await expect(page.getByText(SOURCE_SIZE_MESSAGE, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Retry voice', exact: true })).toHaveCount(0);
    assert.deepEqual(statuses, [413]); await capture('voice-size');
    await page.getByRole('button', { name: 'Text mode', exact: true }).click();
    await page.getByRole('button', { name: 'Start chat', exact: true }).click();
    await expect(page.getByText(SOURCE_SIZE_MESSAGE, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Start chat', exact: true })).toHaveCount(0);
    await capture('text-size');
    await expect(page.getByRole('button', { name: 'View source', exact: true })).toBeEnabled();
    const read = await context.request.get(`${origin}/api/sources/${row.id}`);
    assert.equal(read.status(), 200); const content = (await read.json()).source;
    assert.equal(content.fullText, row.fullText); assert.equal(content.sections.length, 20_000);
    await page.getByRole('button', { name: 'Source actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Replace source', exact: true }).click();
    await expect(page.getByText('Text PDFs up to 25 MB, 500 pages and 2 million extracted characters.', { exact: true })).toBeVisible();
    await capture('replacement-helper');
    // A new source mount restores the explicit start action, without retrying old content.
    const smaller = uploadedRecord(pdfFixture, visitor); await ipc('seed', { row: smaller });
    await page.unroute('**/*');
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) { external.push(u.origin); return route.abort(); }
      if (u.pathname === '/api/sources/pdf' && route.request().method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, source: sourceDto(smaller) }) });
      return route.continue();
    });
    const replacement = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Replace PDF', exact: true }).click();
    await (await replacement).setFiles({ name: 'Smaller.pdf', mimeType: 'application/pdf', buffer: Buffer.from('seeded smaller source only') });
    await expect(page.getByRole('button', { name: 'Start chat', exact: true })).toBeEnabled();
    assert.equal(await page.evaluate(() => window.__native13e), 0);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    const resources = await ipc('snapshot'); assert.equal(resources.calls, 0); assert.equal(resources.registry.entries, 0); assert.equal(resources.registry.timers, 0);
    report.checks.push({ name: 'retained-full-preview-and-new-source-recovery', theme, width, nativeCalls: 0, providerMints: resources.calls });
    await context.close();
  }
  assert.equal(report.forbiddenNetwork, 0);
} finally {
  await browser?.close(); server.kill(); report.serverExit = await exited;
  await writeFile(path.join(directory, 'server.log'), log);
  await writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ checks: report.checks.length, build: report.build, forbiddenNetwork: report.forbiddenNetwork }));
