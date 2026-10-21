// 08I: native Chromium reader + REAL adapter + JSON-serialized server projection.
// Only authored sources, synthetic repository and denied credentials/media/provider.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from '@playwright/test';
import { VoiceRegistry } from '../src/server/voice/registry.ts';
import { createVoiceHandlers } from '../src/server/voice/handlers.ts';
import { createVisitor, visitorCookie } from '../src/server/proof/visitor.ts';
import { uploadedRecord } from '../src/server/sources/service.ts';
import { parsePdf } from '../src/server/pdf/worker.ts';
import { pdfFixture } from '../tests/context/fixtures.ts';
import { encodeManifest, serializeData } from '../src/shared/priming-manifest.ts';

const out = path.resolve('artifacts/local/08i'); await mkdir(out, { recursive: true });
const report = { startedUtc: new Date().toISOString(), runtime: process.version,
  environment: 'local native Chromium; transpiled real adapter; actual handlers/registry; synthetic repository; no provider/media',
  scenarios: [], forbidden: 0, credentials: 0, provider: 0, cancels: 0 };
// Small authored valid PDF files; extraction uses the existing isolated parser.
function pdf(pages) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for (let i = 0; i < pages; i++) {
    const text = `BT /F1 12 Tf 50 750 Td (Authored page ${i + 1}: Iris ferry, 120 litres; end.) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`, `<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  let raw = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((s, i) => { offsets.push(Buffer.byteLength(raw)); raw += `${i + 1} 0 obj\n${s}\nendobj\n`; });
  const start = Buffer.byteLength(raw);
  raw += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(raw + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
const extractions = [];
for (const pages of [1, 3]) {
  const data = pdf(pages); await writeFile(path.join(out, `authored-${pages}.pdf`), data);
  const extraction = await parsePdf(new Uint8Array(data), new AbortController().signal);
  assert.equal(extraction.pageCount, pages); extractions.push(extraction);
}
extractions.push(pdfFixture); // Unicode, combining marks, punctuation, empty page and CR/LF.
let active, registry, handlers, cookie, sourceId;
const origin = 'http://127.0.0.1:3141';
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname === '/') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><title>08I offline preparation only</title>'); }
    if (/^\/src\/(app|shared)\/[a-z0-9-]+\.ts$/.test(url.pathname)) {
      const source = await readFile(path.resolve('.' + url.pathname), 'utf8');
      res.setHeader('content-type', 'text/javascript');
      return res.end(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
    }
    if (!['/api/voice-preparations', '/api/voice-preparations/cancel'].includes(url.pathname)) {
      report.forbidden++; if (url.pathname.endsWith('/credential')) report.credentials++;
      res.writeHead(403); return res.end();
    }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, { method: 'POST', headers: { ...req.headers, cookie, origin }, body: Buffer.concat(chunks) });
    if (url.pathname.endsWith('/cancel')) {
      report.cancels++; const response = await handlers.cancel(request); res.writeHead(response.status); return res.end(await response.text());
    }
    const response = await handlers.prepare(request); assert.equal(response.status, 201);
    const data = await response.json(); active.mutate?.(data);
    let body = Buffer.from(JSON.stringify(data));
    if (active.fault === 'json') body = Buffer.from('{');
    if (active.fault === 'utf8') body = Buffer.from([0xc3, 0x28]);
    if (active.fault === 'size') body = Buffer.alloc(24_500_001, 32);
    res.writeHead(201, { 'content-type': active.fault === 'mime' ? 'text/plain' : 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  } catch { report.forbidden++; res.writeHead(500); res.end(); }
});
const repair = d => {
  const v = d.input.variant;
  v.serializedSource = serializeData(v.source);
  v.serialized = serializeData({ contextVersion: v.contextVersion, promptVersion: v.promptVersion, variant: v.id, instructions: v.instructions, source: v.source });
  d.input.manifest = encodeManifest(v, d.input.manifest.runId, 'voice', undefined, 'voice');
};
const cases = [
  ...extractions.map((extraction, i) => ({ name: `serialized-source-${i}`, extraction })),
  ...[-60_000, -1000, 1000, 31_000, 60_000].map(offset => ({ name: `client-offset-${offset}`, offset, expected: offset < 0 ? 'ticket_future' : offset >= 30_000 ? 'ticket_expired' : undefined })),
  ...['mime', 'json', 'utf8', 'size'].map(fault => ({ name: fault, fault, expected: `response_${fault}` })),
  { name: 'envelope', mutate: d => { d.extra = 'PRIVATE_SENTINEL'; }, expected: 'envelope' },
  { name: 'request', mutate: d => { d.requestId = 'PRIVATE_SENTINEL'; }, expected: 'request_identity' },
  { name: 'ticket', mutate: d => { d.preparationId = 'PRIVATE_SENTINEL'; }, expected: 'ticket_identity' },
  { name: 'time', mutate: d => { d.expiresAt = 'PRIVATE_SENTINEL'; }, expected: 'ticket_time' },
  { name: 'expired', mutate: d => { d.expiresAt = 1; }, expected: 'ticket_expired' },
  { name: 'future', mutate: d => { d.expiresAt += 60_000; }, expected: 'ticket_future' },
  { name: 'shape', mutate: d => { d.input.basis = 'PRIVATE_SENTINEL'; }, expected: 'admission_shape' },
  { name: 'policy', mutate: d => { d.input.policy.model = 'PRIVATE_SENTINEL'; }, expected: 'policy' },
  { name: 'serialization', mutate: d => { d.input.variant.serialized += 'PRIVATE_SENTINEL'; }, expected: 'source_serialization' },
  { name: 'manifest', mutate: d => { d.input.manifest.bytes++; }, expected: 'manifest_fidelity' },
  { name: 'missing', mutate: d => { d.input.variant = null; }, expected: 'admission_unknown' },
  { name: 'source', mutate: d => { d.input.variant.source.id = 'PRIVATE_SENTINEL'; repair(d); }, expected: 'source_identity' },
  { name: 'kind', mutate: d => { d.input.variant.source.kind = 'PRIVATE_SENTINEL'; repair(d); }, expected: 'source_kind' },
  { name: 'source-expired', mutate: d => { d.input.variant.source.expiresAt = new Date(1).toISOString(); repair(d); }, expected: 'source_expiry' },
  { name: 'source-ticket', mutate: d => { d.input.variant.source.expiresAt = new Date(Date.now() + 10_000).toISOString(); repair(d); }, expected: 'ticket_source_expiry' },
  { name: 'run', mutate: d => { d.input.manifest.runId = 'not-a-uuid'; repair(d); }, expected: 'run_identity' },
];
let browser;
try {
  await new Promise(resolve => server.listen(3141, '127.0.0.1', resolve));
  browser = await chromium.launch(); report.browser = browser.version();
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.forbidden++; return route.abort();
  });
  const page = await context.newPage(); await page.goto(origin);
  for (const scenario of cases) {
    active = scenario;
    // Fixed server time makes clock-offset cases deterministic, independent of test latency.
    const at = Date.now(), config = { origin, secure: false, cookieSecret: '08'.repeat(32), apiKey: 'sk-synthetic-never-used' };
    const visitor = createVisitor(config, at), row = uploadedRecord(scenario.extraction ?? pdfFixture, visitor);
    sourceId = row.id; cookie = visitorCookie(visitor, config, at).split(';', 1)[0];
    registry = new VoiceRegistry({ now: () => at, repository: { get: async (id, owner) => id === row.id && owner === visitor.owner ? row : null },
      mint: async () => { report.provider++; throw new Error('Forbidden provider'); } });
    handlers = createVoiceHandlers({ config: () => config, registry, now: () => at });
    const result = await page.evaluate(async ({ sourceId, at, offset }) => {
      const { browserVoiceAdapters } = await import('/src/app/voice-browser-adapters.ts');
      const { VoiceSetupDiagnostics } = await import('/src/shared/voice-diagnostics.ts');
      let forbidden = 0, cancels = 0; const cancelWork = [], abort = new AbortController();
      const deny = () => { forbidden++; throw new Error('Forbidden acquisition'); };
      const diagnostics = new VoiceSetupDiagnostics(() => performance.now());
      const adapters = browserVoiceAdapters({ now: () => at + offset, uuid: () => crypto.randomUUID(), peer: deny, audio: deny, stream: deny, media: deny,
        fetch: (url, init) => {
          if (!['/api/voice-preparations', '/api/voice-preparations/cancel'].includes(url)) return deny();
          const promise = fetch(url, init);
          if (url.endsWith('/cancel')) { cancels++; cancelWork.push(promise); } return promise;
        } });
      let ok = false, fidelity = false;
      try {
        const prepared = await adapters.prepare({ sourceId, connectionId: 'offline-08i', runId: 'pending' }, abort.signal, diagnostics.report);
        ok = true;
        const v = prepared.input.variant, parts = prepared.input.manifest.items.map(i => JSON.parse(i.item.content[0].text));
        fidelity = v.source.sections.every((s, i) => parts.filter(p => p.sectionIndex === i).map(p => p.text).join('') === s.text);
      } catch { /* Return only projected categories, never errors/payload. */ }
      finally { abort.abort(); await new Promise(r => setTimeout(r, 0)); await Promise.all(cancelWork); }
      return { ok, fidelity, forbidden, cancels, rows: diagnostics.snapshot };
    }, { sourceId, at, offset: scenario.offset ?? 0 });
    assert.equal(result.forbidden, 0); assert.equal(result.cancels, 1); assert.equal(registry.resources.entries, 0);
    assert.equal(result.ok, scenario.expected === undefined, scenario.name);
    assert.equal(result.rows.at(-1).reason, scenario.expected, scenario.name);
    if (result.ok) { assert.equal(result.fidelity, true); assert.equal(result.rows.at(-1).outcome, 'ok'); }
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|sk-|ek_|td-visitor|sourceId|input_text/);
    report.scenarios.push({ name: scenario.name, expected: scenario.expected ?? 'ok', ...result });
    registry.dispose(); registry = undefined;
  }
  assert.equal(report.forbidden + report.credentials + report.provider, 0);
} finally {
  registry?.dispose(); await browser?.close(); await new Promise(resolve => server.close(resolve));
  report.endedUtc = new Date().toISOString(); await writeFile(path.join(out, 'preparation-results.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ scenarios: report.scenarios.length, forbidden: report.forbidden, credentials: report.credentials, provider: report.provider, cancels: report.cancels }));
