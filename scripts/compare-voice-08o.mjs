// PM-only live driver. Default validates authored inputs and exits WITHOUT a browser/network.
// Actual app upload/preparation/credential/WebRTC path; Chromium file-backed synthetic microphone.
import assert from 'node:assert/strict';
import { readFile, writeFile, open, mkdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const sha = b => createHash('sha256').update(b).digest('hex');
const inputs = path.resolve('artifacts/local/08o/inputs');
const identity = JSON.parse(await readFile(path.join(inputs, 'identity.json'), 'utf8'));
assert.equal(sha(await readFile(path.join(inputs, 'comparison.wav'))), identity.waveSha256);
assert.equal(sha(await readFile(path.join(inputs, 'trail.pdf'))), identity.pdfSha256);
assert.equal(identity.durationSeconds, 70);
if (process.argv[2] !== '--run') { console.log('08O preflight PASS; no browser, provider or ledger use.'); process.exit(0); }
const [originArg, ledgerArg, variant] = process.argv.slice(3);
const url = new URL(originArg);
assert.ok(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/'); assert.equal(url.search, ''); assert.equal(url.username + url.password, '');
assert.ok(['v5', 'v6'].includes(variant));
const ledgerPath = path.resolve(ledgerArg), ledgerRaw = await readFile(ledgerPath, 'utf8'), ledger = JSON.parse(ledgerRaw);
assert.equal(ledger.task, '08O'); assert.equal(ledger.approvedByPM, true);
assert.equal(ledger.maxEstimatedUsd, 1); assert.equal(ledger.maxAttempts, 2);
assert.ok(typeof ledger.pricingCheckedAt === 'string' && ledger.pricingCheckedAt.length >= 10);
assert.ok(ledger.reservePerAttemptUsd > 0 && ledger.reservePerAttemptUsd <= 0.5);
assert.ok(Array.isArray(ledger.attempts) && ledger.attempts.length < 2 && !ledger.attempts.some(a => a.variant === variant));
assert.ok((ledger.attempts.length + 1) * ledger.reservePerAttemptUsd <= 1);
const output = path.join(path.dirname(ledgerPath), variant); await mkdir(output, { recursive: true });
// Exclusive lock: a crashed/failed attempt is consumed, never automatically retried.
const activeLock = await open(`${ledgerPath}.active.lock`, 'wx'); await activeLock.close();
assert.equal(await readFile(ledgerPath, 'utf8'), ledgerRaw, 'Ledger changed during reservation');
const lock = await open(`${ledgerPath}.${variant}.lock`, 'wx'); await lock.close();
ledger.attempts.push({ variant, reservedAt: new Date().toISOString(), reservedUsd: ledger.reservePerAttemptUsd, status: 'CONSUMED' });
const ledgerFile = await open(ledgerPath, 'w'); await ledgerFile.writeFile(JSON.stringify(ledger, null, 2)); await ledgerFile.sync(); await ledgerFile.close();
const { chromium } = await import('@playwright/test');
let browser, context, page, timer, preparation, sourceId, credentialRequests = 0, stopped = false, observerLoop;
let observe = true;
const report = { variant, startedAt: new Date().toISOString(), inputIdentity: identity, environment: 'native Chromium WebRTC, authored file-backed microphone; human audio observation separate', observations: [], outcome: 'INCOMPLETE' };
const save = () => writeFile(path.join(output, 'safe-report.json'), JSON.stringify(report, null, 2));
async function stop(reason) {
  if (stopped) return; stopped = true; report.stopReason = reason;
  try { await page.getByRole('button', { name: 'Stop session', exact: true }).click({ timeout: 1500 }); } catch { report.stopClickUnavailable = true; }
}
try {
  browser = await chromium.launch({ headless: false, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--use-file-for-fake-audio-capture=' + path.join(inputs, 'comparison.wav') + '%noloop'] });
  context = await browser.newContext({ permissions: ['microphone'] }); page = await context.newPage();
  page.setDefaultTimeout(8000);
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (![url.origin, 'https://api.openai.com'].includes(u.origin)) return route.abort();
    if (u.pathname === '/api/voice-preparations/credential' && route.request().method() === 'POST') {
      if (++credentialRequests > 1) { void stop('duplicate credential'); return route.abort(); }
      timer = setTimeout(() => { void stop('85 second credential deadline'); setTimeout(() => void context.close(), 2000); }, 85000);
    }
    return route.continue();
  });
  const jobs = [];
  page.on('response', response => {
    const u = new URL(response.url()); if (u.origin !== url.origin || response.status() !== 201) return;
    if (u.pathname === '/api/sources/pdf') jobs.push(response.json().then(v => { sourceId = v.source.id; }));
    if (u.pathname === '/api/voice-preparations') jobs.push(response.json().then(async v => {
      preparation = v.input;
      assert.equal(preparation.policy.policyVersion, `provider-voice-full-source-2026-10-21-${variant}`);
      report.policy = preparation.policy.policyVersion;
      report.instructionsSha256 = sha(preparation.manifest.finalize.session.instructions);
      report.manifestSha256 = sha(preparation.manifest.representation);
      report.sourceItemCount = preparation.manifest.items.length;
      report.finalSettings = { maxOutputTokens: preparation.manifest.finalize.session.max_output_tokens,
        turnDetection: preparation.manifest.finalize.session.audio.input.turn_detection };
      await page.evaluate(m => { window.__comparison08O.expected = m; }, preparation.manifest);
    }).catch(() => { report.preparationMismatch = true; void stop('preparation mismatch'); }));
  });
  await page.goto(url.origin);
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Upload a PDF', exact: true }).click();
  await (await chooser).setFiles(path.join(inputs, 'trail.pdf'));
  await page.getByRole('button', { name: 'Inspect extracted text', exact: true }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Voice mode', exact: true }).click();
  // Reuse 08F's passive CDP object discovery technique, with a smaller allowlist projection.
  // No protocol injection, sender replacement, credential inspection or raw-event storage.
  await page.evaluate(() => {
    const seen = new WeakSet();
    window.__comparison08O = { expected: null, acks: [], sourceAcks: new Set(), jobs: [], channels: 0 };
    window.__comparison08O.observe = channels => {
      for (const channel of channels) {
        if (seen.has(channel)) continue; seen.add(channel); window.__comparison08O.channels++;
        channel.addEventListener('message', e => {
          let v; try { v = JSON.parse(e.data); } catch { return; }
          const state = window.__comparison08O, m = state.expected;
          if (!m) return;
          if (v.type === 'conversation.item.done') {
            const item = m.items.find(x => x.item.id === v.item?.id);
            if (item && JSON.stringify(v.item.content) === JSON.stringify(item.item.content)) state.sourceAcks.add(item.item.id);
          }
          if (v.type === 'session.updated' && state.acks.length < 4) {
            const s = v.session, final = s?.instructions === m.finalize.session.instructions;
            const target = final ? m.finalize.session : m.configure.session;
            const safe = { final, instructionsMatch: s?.instructions === target.instructions,
              maxOutputMatch: s?.max_output_tokens === target.max_output_tokens,
              observedAtMs: Math.round(performance.now()),
              turnMatch: target.audio.input.turn_detection === null ? s?.audio?.input?.turn_detection === null
                : Object.entries(target.audio.input.turn_detection).every(([k, value]) => s?.audio?.input?.turn_detection?.[k] === value),
              sourceAcks: state.sourceAcks.size, expectedSourceAcks: m.items.length };
            state.acks.push(safe);
            state.jobs.push(crypto.subtle.digest('SHA-256', new TextEncoder().encode(s?.instructions ?? '')).then(b => {
              safe.instructionsSha256 = Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
            }));
          }
        });
      }
    };
  });
  const cdp = await context.newCDPSession(page);
  observerLoop = (async () => {
    while (observe) {
      try {
        const proto = await cdp.send('Runtime.evaluate', { expression: 'RTCDataChannel.prototype' });
        const objects = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
        await cdp.send('Runtime.callFunctionOn', { objectId: objects.objects.objectId,
          functionDeclaration: 'function(){window.__comparison08O.observe(this)}' });
        await cdp.send('Runtime.releaseObject', { objectId: objects.objects.objectId });
        await cdp.send('Runtime.releaseObject', { objectId: proto.result.objectId });
      } catch { if (observe) { report.observerGap = true; void stop('passive observer failed'); } }
      await delay(25);
    }
  })();
  await page.getByRole('button', { name: 'Start voice session', exact: true }).click();
  const details = page.locator('details').filter({ has: page.getByText('Voice setup details', { exact: true }) });
  let enabled = false, attachedAt, previous = '', lastTrace;
  const started = Date.now();
  while (!stopped && Date.now() - started < 90000) {
    if (await details.count()) {
      // The app deliberately refreshes its bounded recorder when details is toggled.
      if (await details.getAttribute('open') !== null) await details.locator('summary').click();
      await details.locator('summary').click();
      const pre = details.locator('pre');
      if (await pre.count()) {
        const raw = await pre.innerText();
        if (raw !== previous) {
          const trace = JSON.parse(raw); previous = raw; lastTrace = trace;
          // Existing production allowlist recorder; never capture raw provider payloads or text.
          if (trace.limited) { await stop('safe recorder limit; incomplete trace'); break; }
          report.trace = trace;
          const attached = trace.rows.find(r => r.stage === 'microphone_attached');
          if (attached && !attachedAt) {
            attachedAt = Date.now(); report.ackValidation = 'application strict configure/all-source/final barrier passed before microphone attachment';
            report.setupStages = await details.locator('ol').innerText();
          }
          const ord = trace.responseOrdinals;
          if (ord !== report.responseOrdinals) { report.responseOrdinals = ord; console.log(`Observed response ordinal ${ord}; human should annotate audible content separately.`); }
          if (ord > 4) { await stop('unexpected fifth response'); break; }
          await save();
        }
      }
    }
    const playback = page.getByRole('button', { name: 'Enable speaker playback', exact: true });
    if (!enabled && await playback.isEnabled().catch(() => false)) { await playback.click(); enabled = true; }
    if (attachedAt && Date.now() - attachedAt >= 60000 && !report.mutedControlAt) {
      await page.getByRole('button', { name: 'Mute microphone', exact: true }).click();
      report.mutedControlAt = new Date().toISOString();
    }
    if (attachedAt && Date.now() - attachedAt >= 71000) { await stop('authored sequence complete'); break; }
    await delay(250);
  }
  await stop('driver deadline'); await Promise.all(jobs);
  report.ackIdentity = await page.evaluate(async () => {
    const s = window.__comparison08O; await Promise.all(s.jobs); return { channels: s.channels, acks: s.acks };
  });
  if (await details.count()) {
    if (await details.getAttribute('open') !== null) await details.locator('summary').click();
    await details.locator('summary').click();
    if (await details.locator('pre').count()) report.trace = JSON.parse(await details.locator('pre').innerText());
  }
  assert.ok(preparation && !report.preparationMismatch && lastTrace && !lastTrace.limited && attachedAt);
  assert.ok(!report.observerGap && report.ackIdentity.channels === 1 && report.ackIdentity.acks.some(a =>
    a.final && a.instructionsMatch && a.maxOutputMatch && a.turnMatch && a.instructionsSha256 === report.instructionsSha256 && a.sourceAcks === a.expectedSourceAcks));
  report.outcome = 'CAPTURED_NOT_BEHAVIORALLY_ACCEPTED';
} catch { report.outcome = 'FAILED_OR_CAPTURE_BLOCKED'; await stop('first driver failure'); process.exitCode = 1;
} finally {
  clearTimeout(timer); report.credentialRequests = credentialRequests;
  observe = false; await observerLoop;
  // Owned delete only, using the just-uploaded source in this fresh browser context.
  if (sourceId && context) {
    try { report.cleanupStatus = (await context.request.delete(`${url.origin}/api/sources/${sourceId}`, { headers: { Origin: url.origin } })).status(); }
    catch { report.cleanupStatus = 'NOT_CONFIRMED'; }
  }
  await context?.close().catch(() => {}); await browser?.close().catch(() => {});
  preparation = undefined; sourceId = undefined; report.endedAt = new Date().toISOString(); await save();
  await unlink(`${ledgerPath}.active.lock`);
}
