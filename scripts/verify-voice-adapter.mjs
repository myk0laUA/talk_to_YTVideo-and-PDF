// Real built application + dedicated owned routes. All provider/SQL/native media are injected offline.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { createVisitor } from '../src/server/proof/visitor.ts';
import { uploadedRecord, captionRecord, sourceDto } from '../src/server/sources/service.ts';
import { pdfFixture, captionFixture } from '../tests/context/fixtures.ts';
import { fakeBrowserVoice } from '../tests/voice-adapter/fakes.mjs';

const directory = path.resolve('artifacts/local/08d'); await mkdir(directory, { recursive: true });
const port = 3129, origin = `http://127.0.0.1:${port}`;
const report = { startedUtc: new Date().toISOString(), buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), runtime: process.version,
  environment: 'local built Next application/owned HTTP routes; synthetic sources/Prisma/fake client-secret, SDP, peer, channel and media; no physical audio/provider/database',
  checks: [], scenarios: [], forbiddenNetwork: 0, sdpExchanges: 0 };
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push({ name, pass: true }); };
const until = async fn => { for (let i = 0; i < 500; i++) { if (await fn()) return; await delay(10); } assert.fail('condition deadline'); };
await new Promise((resolve, reject) => { const p = net.createServer(); p.once('error', reject); p.listen(port, '127.0.0.1', () => p.close(resolve)); });
let browser;
try {
  browser = await chromium.launch();
  for (const group of ['clock-skew', 'preparation-rejection', 'flow', 'setup-races', 'active-races', 'failures', 'transcription-settings']) {
    const config = { origin, secure: false, cookieSecret: randomBytes(32).toString('hex') };
    const env = { ...process.env, NODE_OPTIONS: '', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', APP_ORIGIN: origin,
      VISITOR_COOKIE_SECRET: config.cookieSecret, DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic',
      OWNED_SOURCE_VOICE_ENABLED: 'true', OWNED_SOURCE_TEXT_ENABLED: 'true', OPENAI_API_KEY: 'sk-synthetic10d-no-live-contact',
      PDF_INGESTION_ENABLED: 'true', PDF_INGESTION_LOCAL_HTTP: 'true', YOUTUBE_INGESTION_ENABLED: 'true', YOUTUBE_INGESTION_LOCAL_HTTP: 'true', YOUTUBE_INGESTION_PROVIDER: 'direct',
      SUPADATA_API_KEY: '', SCRAPECREATORS_API_KEY: '', PROOF_ENABLED: 'false', REALTIME_ISSUANCE_ENABLED: 'false', TEXT_PROOF_ENABLED: 'false', PDF_PROOF_ENABLED: 'false', CAPTION_PROOF_ENABLED: 'false' };
    const server = spawn(process.execPath, ['--require', path.resolve('tests/text-relay/network.cjs'),
      '--import', pathToFileURL(path.resolve('tests/text-relay/server.mjs')).href,
      '--import', pathToFileURL(path.resolve('tests/owned-voice/server.mjs')).href,
      'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let log = '', sequence = 0; server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
    server.on('message', m => { if (m.textTestForbidden) report.forbiddenNetwork++; });
    const exited = new Promise(resolve => server.once('exit', resolve));
    const ipc = (command, data = {}, kind = 'voice') => new Promise((resolve, reject) => {
      const requestId = ++sequence, timer = setTimeout(() => { server.off('message', listener); reject(new Error('IPC deadline')); }, 5000);
      const listener = m => { if (m[kind + 'TestReply'] === requestId) { clearTimeout(timer); server.off('message', listener); resolve(m.snapshot); } };
      server.on('message', listener); server.send({ [kind + 'TestCommand']: command, requestId, ...data });
    });
    const open = async (kind = 'PDF', width = 1440, expiry) => {
      const visitor = createVisitor(config, Date.now());
      const row = kind === 'PDF' ? uploadedRecord(pdfFixture, visitor) : captionRecord(captionFixture, visitor);
      if (expiry) row.expiresAt = new Date(Date.now() + expiry);
      await ipc('seed', { row }); await ipc('seed', { row }, 'text');
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies([{ name: 'td-visitor', value: visitor.token, url: origin, httpOnly: true, sameSite: 'Strict' }]);
      const page = await context.newPage();
      await page.addInitScript('(' + fakeBrowserVoice.toString() + ')(globalThis, true)');
      let sdpFault = '', heldSdp;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.href === 'https://api.openai.com/v1/realtime/calls') {
          report.sdpExchanges++;
          const req = route.request();
          check('SDP POST content type', req.headers()['content-type'], 'application/sdp');
          check('only ephemeral authorization used', /^Bearer ek_[A-Za-z0-9_-]+$/.test(req.headers().authorization));
          check('SDP exchange has no source/key/URL query', req.postData().startsWith('v=0') && !url.search);
          const reply = () => route.fulfill({ status: sdpFault === 'status' ? 502 : 201, contentType: sdpFault === 'mime' ? 'application/json' : 'application/sdp',
            body: sdpFault === 'body' ? 'bad' : 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' }).catch(() => {});
          if (sdpFault === 'hold') heldSdp = reply; else await reply();
          return;
        }
        report.forbiddenNetwork++; return route.abort();
      });
      await page.route(`**/api/sources/${kind === 'PDF' ? 'pdf' : 'youtube'}`, route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, source: sourceDto(row) }) }));
      await page.goto(origin);
      const upload = async () => {
        if (kind === 'PDF') { const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: /Upload a PDF|Replace PDF/, exact: true }).click();
          await (await chooser).setFiles({ name: 'Synthetic08D.pdf', mimeType: 'application/pdf', buffer: Buffer.from('seeded-owned-source-acquisition') });
        } else { await page.getByLabel('YouTube URL', { exact: true }).fill('https://www.youtube.com/watch?v=Context07A1'); await page.getByRole('button', { name: 'Import YouTube video', exact: true }).click(); }
        await page.getByRole('button', { name: 'Inspect extracted text', exact: true }).waitFor();
      };
      await upload(); await page.getByRole('button', { name: 'Voice mode', exact: true }).click();
      const snap = () => page.evaluate(() => window.__voice08d.snapshot());
      const control = data => page.evaluate(data => Object.assign(window.__voice08d.control, data), data);
      const start = () => page.getByRole('button', { name: /Start.*voice session/, exact: true }).click();
      const ready = () => page.getByRole('button', { name: 'Mute microphone', exact: true }).waitFor({ state: 'visible' }).then(() => expect(page.getByRole('button', { name: 'Mute microphone', exact: true })).toBeEnabled());
      const clean = async label => {
        await until(async () => (await snap()).counts.peerCloses === (await snap()).counts.peers);
        const s = await snap(); check(label + ' listeners released', s.counts.listeners, 0);
        check(label + ' channels closed once', s.counts.channelCloses, s.counts.channels);
        check(label + ' audio released once', s.counts.releases, s.counts.audio);
        check(label + ' no live tracks', s.liveTracks, 0); check(label + ' source/media barrier', s.counts.violations, 0);
        report.scenarios.push({ label, ...s });
      };
      return { page, context, row, visitor, upload, snap, control, start, ready, clean, sdpFault: v => { sdpFault = v; }, releaseSdp: () => heldSdp?.() };
    };
    try {
      await until(async () => { try { return (await fetch(origin)).ok; } catch { return false; } });
      if (group === 'clock-skew') {
        for (const offset of [-300_000, -60_000, -1000, 1000, 60_000, 300_000]) {
          const f = await open('PDF');
          await f.page.evaluate(offset => { const wall = Date.now.bind(Date); Date.now = () => wall() + offset; }, offset);
          await f.control({ hold: 'offer' }); await f.start();
          await until(async () => (await f.snap()).pending > 0);
          check('08J skew passed preparation and credential ' + offset, (await f.snap()).counts.peers, 1);
          // Jump the calendar clock in the opposite direction DURING negotiation.
          await f.page.evaluate(offset => { const wall = Date.now.bind(Date); Date.now = () => wall() - offset * 2; }, offset);
          await f.page.evaluate(() => window.__voice08d.release('offer')); await f.ready();
          check('08J skew reaches ACK-gated microphone ' + offset, (await f.snap()).counts.media, 1);
          await f.page.getByRole('button', { name: 'Stop session', exact: true }).click();
          await f.clean('08J skew and wall jump ' + offset); await f.context.close();
        }
        const f = await open('PDF', 1440, 1800), exchanges = report.sdpExchanges;
        await f.control({ hold: 'offer' }); await f.start();
        await until(async () => (await f.snap()).pending > 0);
        await f.page.evaluate(() => { const wall = Date.now.bind(Date); Date.now = () => wall() - 3600_000; });
        await delay(1850); await f.page.evaluate(() => window.__voice08d.release('offer'));
        await expect(f.page.getByRole('button', { name: 'Start a fresh voice session', exact: true })).toBeEnabled();
        check('08J backward clock jump cannot extend source validity: no SDP', report.sdpExchanges, exchanges);
        check('08J backward clock jump cannot extend source validity: no microphone', (await f.snap()).counts.media, 0);
        await f.clean('08J expired source after backward wall jump'); await f.context.close();
      }
      if (group === 'preparation-rejection') {
        const f = await open('PDF', 390); let credentials = 0;
        await f.page.route('**/api/voice-preparations/credential', route => { credentials++; return route.abort(); });
        await f.page.route('**/api/voice-preparations', async route => {
          const response = await route.fetch(), data = await response.json();
          check('08I actual preparation succeeds before injected failure', response.status(), 201);
          data.expiresAt += 60_000;
          await route.fulfill({ response, body: JSON.stringify(data) });
        });
        await f.start(); await expect(f.page.getByRole('button', { name: 'Start a fresh voice session', exact: true })).toBeEnabled();
        await f.page.getByText('Voice setup details', { exact: true }).click();
        await expect(f.page.locator('.voice-session details')).toContainText('preparation_validation: invalid (ticket_future)');
        check('08I no credentials requested', credentials, 0);
        check('08I no native acquisitions', (await f.snap()).counts.peers + (await f.snap()).counts.media, 0);
        check('08I no synthetic provider calls', (await ipc('snapshot')).calls, 0);
        const target = path.resolve('artifacts/local/08i'); await mkdir(target, { recursive: true });
        await f.page.screenshot({ path: path.join(target, 'preparation-rejection.png'), fullPage: true });
        await f.clean('08I preparation rejection'); await f.context.close();
      }
      if (group === 'flow') {
        await ipc('gate', { field: 'OWNED_SOURCE_VOICE_ENABLED', value: 'false' });
        const off = await open('PDF', 390); const before = await ipc('snapshot');
        await expect(off.page.getByRole('button', { name: 'Start voice session', exact: true })).toBeDisabled();
        check('gate off zero native acquisitions', (await off.snap()).counts.peers + (await off.snap()).counts.media, 0);
        check('gate off zero provider calls', (await ipc('snapshot')).calls, before.calls);
        await off.page.screenshot({ path: path.join(directory, 'gate-off-390.png'), fullPage: true }); await off.context.close();
        await ipc('gate', { field: 'OWNED_SOURCE_VOICE_ENABLED', value: 'true' });
        for (const [kind, width] of [['PDF', 1440], ['YOUTUBE', 390]]) {
          const f = await open(kind, width), { page } = f;
          check('mount/source/mode has zero native calls', (await f.snap()).counts.peers + (await f.snap()).counts.media, 0);
          await f.control({ hold: 'final' }); await f.start(); await until(async () => (await f.snap()).pending > 0);
          check(kind + ' final ACK withheld: no media', (await f.snap()).counts.media, 0);
          await page.evaluate(() => window.__voice08d.release('final')); await f.ready();
          const s = await f.snap(); check(kind + ' one peer/channel/media/attach', [s.counts.peers, s.counts.channels, s.counts.media, s.counts.attached], [1, 1, 1, 1]);
          check(kind + ' 08L factory requests optional echo/noise processing', s.captureRequest,
            { audio: { echoCancellation: { ideal: true }, noiseSuppression: { ideal: true } } });
          check(kind + ' 08L capture succeeds without processing support or retry',
            [await page.evaluate(() => navigator.mediaDevices.getSupportedConstraints()), s.counts.media, s.enabledTracks], [{}, 1, 1]);
          check(kind + ' full ordered source section count', s.counts.items, kind === 'PDF' ? pdfFixture.sections.length : captionFixture.segments.length);
          const reconstruction = await page.evaluate(() => { const parts = window.__voice08d.sourceParts, sections = new Map();
            for (const p of parts) { if (!sections.has(p.sectionIndex)) sections.set(p.sectionIndex, []); sections.get(p.sectionIndex).push(p.text); }
            return [...sections.values()].map(p => p.join('')).join(parts[0].source.separator);
          });
          check(kind + ' full source reconstructed before microphone', reconstruction === f.row.fullText);
          await page.getByRole('button', { name: 'Mute microphone', exact: true }).click(); check('mute disables outgoing track', (await f.snap()).enabledTracks, 0);
          await page.getByRole('button', { name: 'Unmute microphone', exact: true }).click(); check('unmute enables outgoing track', (await f.snap()).enabledTracks, 1);
          await f.control({ blockedPlayback: true }); await page.getByRole('button', { name: 'Enable speaker playback', exact: true }).click();
          await page.getByRole('button', { name: 'Try speaker playback', exact: true }).waitFor();
          await f.control({ blockedPlayback: false }); await page.getByRole('button', { name: 'Try speaker playback', exact: true }).click();
          await page.getByText('Playback enabled. This does not confirm what you heard.', { exact: true }).waitFor();
          await page.evaluate(() => { const f = window.__voice08d;
            // Real documented event shapes through the application's sole transcript store.
            f.emit({ type: 'input_audio_buffer.committed', item_id: 'question09c', previous_item_id: null });
            f.emit({ type: 'conversation.item.added', previous_item_id: null, item: { id: 'question09c', type: 'message', role: 'user', content: [{ type: 'input_audio' }] } });
            const delta = { type: 'conversation.item.input_audio_transcription.delta', event_id: 'delta09c', item_id: 'question09c', content_index: 0, delta: 'Synthetic09C partial question.' };
            f.emit(delta); f.emit(delta);
            f.emit({ type: 'response.created', response: { id: 'response08d', conversation_id: 'conversation08d', status: 'in_progress' } });
            f.emit({ type: 'response.output_item.added', response_id: 'response08d', output_index: 0, item: { id: 'answer08d', type: 'message', role: 'assistant', status: 'in_progress', content: [] } });
            f.emit({ type: 'conversation.item.added', previous_item_id: 'question09c', item: { id: 'answer08d', type: 'message', role: 'assistant', content: [] } });
            f.emit({ type: 'response.output_audio_transcript.delta', response_id: 'response08d', item_id: 'answer08d', output_index: 0, content_index: 0, delta: 'Synthetic08D assistant speech text.' });
            f.emit({ type: 'output_audio_buffer.started', response_id: 'response08d' });
          });
          await expect(page.locator('.transcript')).toContainText('Synthetic09C partial question.');
          await expect(page.locator('.transcript')).toContainText('Text updating…');
          await page.screenshot({ path: path.join(directory, `${kind.toLowerCase()}-${width}-partial.png`), fullPage: true });
          await page.getByRole('button', { name: 'Interrupt answer', exact: true }).click();
          await expect(page.locator('.voice-media-announcement')).toContainText('Interruption confirmed');
          await page.evaluate(() => { const f = window.__voice08d;
            f.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'question09c', content_index: 0, transcript: 'Synthetic09C final question.' });
            f.emit({ type: 'conversation.item.input_audio_transcription.delta', item_id: 'question09c', content_index: 0, delta: 'late words ignored' });
            f.emit({ type: 'input_audio_buffer.committed', item_id: 'failed09c', previous_item_id: 'answer08d' });
            f.emit({ type: 'conversation.item.input_audio_transcription.delta', item_id: 'failed09c', content_index: 0, delta: 'Synthetic09C unfinished words.' });
            f.emit({ type: 'conversation.item.input_audio_transcription.failed', item_id: 'failed09c', content_index: 0, error: { code: 'transcription_failed', message: 'PRIVATE09C' } });
          });
          await expect(page.locator('.transcript')).toContainText('Speech could not be transcribed.');
          check('09C ordered speakers and one bubble per item', await page.locator('.transcript-turn h4').allTextContents(), ['You', 'Assistant', 'You']);
          check('09C late delta and private errors absent', !/late words ignored|PRIVATE09C/.test(await page.locator('.transcript').textContent()));
          await page.screenshot({ path: path.join(directory, `${kind.toLowerCase()}-${width}-ready.png`), fullPage: true });
          const retained = await page.locator('.transcript-text').allTextContents();
          await page.getByRole('button', { name: 'Stop session', exact: true }).click(); await f.clean(kind + ' Stop');
          check('09C both speakers retained on Stop', await page.locator('.transcript-text').allTextContents(), retained);
          await page.screenshot({ path: path.join(directory, `${kind.toLowerCase()}-${width}-stopped.png`), fullPage: true });
          check('assistant speech transcript retained on Stop', (await page.locator('.transcript').textContent()).includes('Synthetic08D assistant speech text.'));
          check('only injected provider words rendered', await page.locator('.transcript-turn').count(), 3);
          await page.getByRole('button', { name: 'Inspect extracted text', exact: true }).click();
          check('source preview retained after Stop', await page.locator('.source-reader .page-text').count(), kind === 'PDF' ? pdfFixture.sections.length : captionFixture.segments.length);
          await page.getByRole('button', { name: 'Close text and return', exact: true }).first().click();
          await f.control({ hold: '' }); await f.start(); await f.ready();
          check('09C new voice session clears transcript', await page.locator('.transcript-turn').count(), 0);
          await page.getByRole('button', { name: 'Text mode', exact: true }).click(); await f.clean(kind + ' mode switch');
          check('mode switch clears conversation', await page.locator('.transcript-turn').count(), 0);
          await page.getByRole('button', { name: 'Start text session', exact: true }).click(); await page.getByText('Ready for your question.', { exact: true }).waitFor();
          await page.getByLabel('Your question', { exact: true }).fill('Synthetic follow-up in text mode'); await page.getByRole('button', { name: 'Send question', exact: true }).click();
          await expect(page.locator('.transcript')).toContainText('All source markers preserved.');
          check('text mode acquires no new microphone', (await f.snap()).counts.media, 2);
          await page.getByRole('button', { name: 'Stop text session', exact: true }).click(); await f.context.close();
        }
      }
      if (group === 'setup-races' || group === 'active-races') {
        for (const phase of group === 'setup-races' ? ['offer', 'local', 'remote', 'config', 'items', 'final', 'media', 'attach', 'sdp'] : ['departure', 'removal', 'offline', 'expiry', 'replacement', 'disconnect']) {
          const f = await open('PDF', 390, phase === 'expiry' ? 1800 : undefined);
          if (phase === 'sdp') f.sdpFault('hold');
          else if (group === 'setup-races') await f.control({ hold: phase });
          await f.start();
          if (phase === 'sdp') await until(async () => (await f.snap()).counts.local > 0);
          else if (group === 'active-races') await f.ready();
          else await until(async () => (await f.snap()).pending > 0);
          if (phase === 'departure') await f.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
          else if (phase === 'removal') { await f.page.getByRole('button', { name: 'Remove', exact: true }).click(); await f.page.getByRole('button', { name: 'Confirm remove', exact: true }).click(); }
          else if (phase === 'offline') await f.page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); window.dispatchEvent(new Event('offline')); });
          else if (phase === 'disconnect') await f.page.evaluate(() => { const p = window.__voice08d.peers.at(-1); p.connectionState = 'disconnected'; p.dispatchEvent(new Event('connectionstatechange')); });
          else if (phase === 'replacement') {
            const row = uploadedRecord(pdfFixture, f.visitor); await ipc('seed', { row }); await ipc('seed', { row }, 'text');
            await f.page.route('**/api/sources/pdf', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, source: sourceDto(row) }) }));
            await f.upload();
          }
          else if (phase !== 'expiry') await f.page.getByRole('button', { name: 'Stop session', exact: true }).click();
          await f.page.evaluate(() => window.__voice08d.release()); await f.releaseSdp(); await f.clean(phase);
          await f.context.close();
        }
      }
      if (group === 'failures' || group === 'transcription-settings') {
        // Separate injected process keeps each scenario group within real issuance limits.
        for (const fault of group === 'transcription-settings' ? ['transcription-missing', 'transcription-wrong'] : ['settings', 'item', 'provider', 'context', 'malformed', 'oversized', 'sdp-mime', 'sdp-body', 'denied']) {
          const f = await open('PDF', fault === 'denied' ? 390 : 1440);
          if (fault.startsWith('sdp-')) f.sdpFault(fault.slice(4)); else await f.control(fault === 'denied' ? { denied: true } : { fault });
          await f.start(); await expect(f.page.getByRole('button', { name: 'Start a fresh voice session', exact: true })).toBeEnabled();
          await f.page.getByText('Voice setup details', { exact: true }).click();
          const details = f.page.locator('.voice-session details');
          const stage = fault.startsWith('transcription-') ? 'final_settings_ack' : fault === 'settings' || fault === 'provider' || fault === 'context'
            ? 'initial_settings_ack' : fault === 'item' ? 'source_items_ack' : fault.startsWith('sdp-') ? 'sdp_validation' : fault === 'denied' ? 'microphone_request' : 'initial_settings_ack';
          await expect(details).toContainText(stage);
          check(fault + ' diagnostics exclude raw or private fields', !/ek_|sk-|PRIVATE09C|PRIVATE02D|ownerSessionHash|clientSecret|input_text|v=0/.test(await details.innerText()));
          if (fault === 'settings') await f.page.screenshot({ path: path.join(directory, 'setup-details-08g.png'), fullPage: true });
          check(fault + ' no audio attachment', (await f.snap()).counts.attached, 0);
          await f.clean(fault);
          if (fault === 'denied') {
            await expect(f.page.locator('#voice-session-guidance')).toContainText('Text mode is a separate next step');
            await f.page.screenshot({ path: path.join(directory, 'denied-390.png'), fullPage: true });
            check('denied media leaves explicit mode choice', await f.page.getByRole('button', { name: 'Text mode', exact: true }).isEnabled());
          }
          await f.context.close();
        }
      }
      await until(async () => (await ipc('snapshot')).registry.pendingMints === 0);
      const snapshot = await ipc('snapshot'); check(group + ' ticket entries/timers released', [snapshot.registry.entries, snapshot.registry.timers], [0, 0]);
      check(group + ' provider attempts bounded', snapshot.calls <= 20); report.scenarios.push({ group, server: snapshot });
    } finally {
      server.kill(); await exited;
      check('no credential/owner/raw marker in safe server log', !['ek_', config.cookieSecret, env.OPENAI_API_KEY, 'ownerSessionHash', 'PRIVATE02D'].some(v => log.includes(v)));
      await writeFile(path.join(directory, `${group}-server.log`), log);
    }
  }
  let chunks = 0;
  const audit = async (dir, client) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name); if (e.isDirectory()) await audit(p, client);
      else if (client && e.name.endsWith('.js')) {
        chunks++; const s = await readFile(p, 'utf8');
        for (const marker of ['Synthetic09C', 'PRIVATE09C', 'fakeBrowserVoice', '__voice08d', 'sk-synthetic', 'SyntheticSourceDatabase', 'ownerSessionHash', 'VoiceRegistry', 'OWNED_SOURCE_VOICE_ENABLED']) check('client excludes ' + marker, !s.includes(marker));
      } else if (!client && e.name.endsWith('.nft.json')) check('production trace excludes fixtures', JSON.parse(await readFile(p, 'utf8')).files.every(f => !/(?:^|[/\\])(tests|scripts|artifacts)(?:[/\\])/.test(f)));
    }
  };
  await audit('.next/static', true); await audit('.next/server', false); report.clientChunks = chunks;
  check('outbound provider denial violations', report.forbiddenNetwork, 0);
  report.exit = 0;
} catch (error) { report.exit = 1; throw error; }
finally {
  await browser?.close(); report.endedUtc = new Date().toISOString();
  await writeFile(path.join(directory, 'built-application.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, checks: report.checks.length, scenarios: report.scenarios.length }));
}
