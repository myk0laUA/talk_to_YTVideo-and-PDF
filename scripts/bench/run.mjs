import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import pg from 'pg';

const mode = process.argv[2] ?? 'optimized';
assert.ok(['baseline', 'optimized', 'smoke'].includes(mode));
const outputRoot = path.resolve(process.env.BENCH_OUTPUT_DIR ?? 'benchmarks');
const memoryProfile = process.env.BENCH_MEMORY === 'true';
const root = path.resolve('artifacts/local/sre', `${mode}-${Date.now()}`);
await mkdir(root, { recursive: true }); await mkdir(path.join(outputRoot, 'raw'), { recursive: true });
const output = path.join(outputRoot, `${mode}.txt`);
let log = '';
async function emit(line) { const value = typeof line === 'string' ? line : JSON.stringify(line);
  log += value + '\n'; console.log(value); await writeFile(output, log); }
const pgBin = process.env.PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '/usr/lib/postgresql/17/bin');
const exe = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const k6 = process.env.K6_BIN ?? (process.platform === 'win32' ? path.resolve('.tools/k6/k6-v2.4.0-windows-amd64/k6.exe') : 'k6');
const env = { ...process.env, NODE_OPTIONS: '', OPERATIONAL_METRICS: 'true',
  BENCH_DATABASE_URL: 'postgresql://benchmark@127.0.0.1:55439/benchmark', OPENAI_API_KEY: '', SUPADATA_API_KEY: '', DATABASE_URL: '' };
async function run(program, args, options = {}) {
  const child = spawn(program, args, { windowsHide: true, env, ...options, stdio: ['ignore', 'pipe', 'pipe'] });
  let text = ''; child.stdout.on('data', x => { text += x; }); child.stderr.on('data', x => { text += x; });
  const timer = setTimeout(() => child.kill(), 120000);
  try { const [code] = await once(child, 'exit'); return { code, text }; }
  finally { clearTimeout(timer); }
}
const data = path.join(root, 'pgdata');
async function pgctl(action) {
  const args = ['-D', data, '-w', '-t', '20', ...(action === 'start' ? ['-l', path.join(root, 'postgres.log'), '-o', '-h 127.0.0.1 -p 55439 -c max_connections=20 -c shared_buffers=64MB'] : ['-m', 'fast']), action];
  const result = await run(exe('pg_ctl'), args); assert.equal(result.code, 0, result.text);
}
for (const port of [3149, 55439]) await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject); probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});
const baseline = await readFile('benchmarks/repository-baseline.txt');
await emit({ command: `node --conditions=react-server scripts/bench/run.mjs ${mode}`, at: new Date().toISOString(),
  outputRoot, memoryProfile, runtime: process.version, platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0].model,
  logicalCpus: os.cpus().length, systemMemoryBytes: os.totalmem(), k6: (await run(k6, ['version'])).text.trim(),
  postgres: (await run(exe('postgres'), ['--version'])).text.trim(), poolMax: 5, metricsSampleMs: 20,
  scope: 'production handler HTTP adapter + real local PostgreSQL; excludes Next routing and WebRTC; synthetic documents; captions/mint mocked',
  baselineRepositorySha256: createHash('sha256').update(baseline).digest('hex'),
  currentRepositorySha256: createHash('sha256').update(await readFile('src/server/sources/repository.ts')).digest('hex') });
let child, running = false;
const pending = new Map(); let sequence = 0;
const command = (command, extra = {}) => new Promise((resolve, reject) => {
  const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error(`IPC timeout: ${command}`)); }, 15000);
  pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); },
    reject: error => { clearTimeout(timer); reject(error); } });
  child.send({ id, command, ...extra });
});
try {
  const init = await run(exe('initdb'), ['-D', data, '-U', 'benchmark', '-A', 'trust', '--encoding=UTF8', '--locale=C']);
  assert.equal(init.code, 0, init.text); await pgctl('start'); running = true;
  const admin = new pg.Client({ connectionString: 'postgresql://benchmark@127.0.0.1:55439/postgres' });
  await admin.connect(); await admin.query('CREATE DATABASE benchmark'); await admin.end();
  const db = new pg.Client({ connectionString: env.BENCH_DATABASE_URL }); await db.connect();
  for (const name of (await readdir('prisma/migrations')).sort()) {
    if (name === 'migration_lock.toml') continue;
    await db.query(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
  }
  await db.end();
  if (mode === 'smoke') {
    const args = ['--conditions=react-server', 'tests/integration/verify-cleanup-postgres.ts'];
    const cleanup = await run(process.execPath, args, { env: { ...env,
      DATABASE_URL: 'postgresql://benchmark@127.0.0.1:55439/postgres',
      TEST_CLEANUP_DATABASE_URL: env.BENCH_DATABASE_URL, CLEANUP_DISPOSABLE_ACK: 'I_CONFIRM_EMPTY_DISPOSABLE_DATABASE' } });
    await emit({ command: `node ${args.join(' ')}`, scope: 'Two disposable local databases; no configured user database', exitCode: cleanup.code });
    await emit(cleanup.text); assert.equal(cleanup.code, 0, 'Real PostgreSQL cleanup regression');
  }
  const args = ['--conditions=react-server', ...(memoryProfile ? ['--expose-gc'] : []), ...(mode === 'baseline' ? ['--import', './scripts/bench/baseline-loader.mjs'] : []), 'scripts/bench/server.mjs'];
  child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let serverLog = ''; child.stdout.on('data', x => { serverLog += x; }); child.stderr.on('data', x => { serverLog += x; });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Server readiness timeout: ${serverLog}`)), 30000);
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Server exited ${code}: ${serverLog}`)); });
    child.on('message', message => {
      if (message.ready) { clearTimeout(timer); resolve(message.fixtures); }
      else if (pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id);
        if (message.error) item.reject(Error(message.error)); else item.resolve(message.result); }
    });
  });
  const fixtures = await ready;
  const fixtureFile = path.join(root, 'fixtures.json'); await writeFile(fixtureFile, JSON.stringify(fixtures));
  await emit({ input: { sources: fixtures.length, charactersEach: fixtures[0].characters, pagesEach: 8 },
    workload: memoryProfile ? '500 arrivals/s, 50 preallocated/max VUs; four 15s stages; 2s idle then forced GC outside load; no warmup' : 'closed-loop, zero think time on reads, one outstanding request per VU, fully consumed and checked JSON; 10s warmup' });
  async function load(vus, duration, label, workload = 'read') {
    await command('reset');
    const summary = path.join(outputRoot, `raw/${mode}-${label}.json`);
    const args = ['run', '--quiet', '--summary-export', summary, 'scripts/load-test.js'];
    await emit({ label, command: `k6 run --quiet --summary-export ${summary} scripts/load-test.js`,
      config: { VUS: vus, DURATION: duration, WORKLOAD: workload, RATE: memoryProfile ? 500 : undefined, timeout: '10s', BENCH_FIXTURES: '<ephemeral synthetic cookies; not committed>' } });
    const result = await run(k6, args, { env: { ...env, BENCH_FIXTURES: fixtureFile, VUS: String(vus), DURATION: duration, WORKLOAD: workload, RATE: memoryProfile ? '500' : '' } });
    await emit(result.text); await emit({ label, exitCode: result.code, resources: await command('snapshot') });
    // Preserve failures, continue matrix so saturation evidence is not hidden.
    return result.code;
  }
  const exits = [];
  if (memoryProfile) {
    await emit({ memory: 'initial', sample: await command('memory') });
    for (let repeat = 1; repeat <= 4; repeat++) {
      exits.push(await load(50, '15s', `memory-500-r${repeat}`));
      await emit({ memory: `loaded-${repeat}`, sample: await command('memory') });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await emit({ memory: `idle-${repeat}`, sample: await command('memory') });
      await emit({ memory: `collected-${repeat}`, sample: await command('memory', { collect: true }) });
    }
  } else {
    exits.push(await load(1, mode === 'smoke' ? '1s' : '10s', 'warmup'));
    for (const vus of mode === 'smoke' ? [5] : [1, 5, 10, 25, 50]) exits.push(await load(vus, '10s', `read-${vus}-r1`));
    if (mode !== 'smoke') {
      for (let repeat = 2; repeat <= 3; repeat++) for (const vus of [25, 50]) exits.push(await load(vus, '10s', `read-${vus}-r${repeat}`));
      exits.push(await load(10, '30s', 'sustained-10'));
      exits.push(await load(50, '5s', 'spike-50'));
      exits.push(await load(1, '10s', 'prepare-1', 'prepare'));
    }
  }
  const origin = 'http://127.0.0.1:3149';
  async function request(index, route, body, method = body === undefined ? 'GET' : 'POST') {
    const started = performance.now();
    const r = await fetch(origin + route, { method, redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { Cookie: fixtures[index].cookie, Origin: origin, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
    const dto = await r.json(); assert.doesNotMatch(JSON.stringify(dto), /ownerSessionHash|cookieSecret|postgresql:\/\//);
    return { status: r.status, dto, ms: performance.now() - started };
  }
  const get = () => request(0, `/api/sources/${fixtures[0].id}`);
  const failures = [];
  let r = await request(0, '/api/voice-preparations', '{'); assert.equal(r.status, 400);
  failures.push({ scenario: 'malformed JSON', status: r.status, ms: r.ms });
  r = await request(1, `/api/sources/${fixtures[0].id}`); assert.equal(r.status, 404);
  failures.push({ scenario: 'foreign source', status: r.status, ms: r.ms });
  // Real PostgreSQL lock contention, not an injected repository exception.
  const blocker = new pg.Client({ connectionString: env.BENCH_DATABASE_URL }); await blocker.connect();
  await blocker.query('BEGIN'); await blocker.query('LOCK TABLE "Source" IN ACCESS EXCLUSIVE MODE');
  try { r = await get(); assert.equal(r.status, 503); failures.push({ scenario: 'table lock timeout', status: r.status, ms: r.ms }); }
  finally { await blocker.query('ROLLBACK'); await blocker.end(); }
  r = await get(); assert.equal(r.status, 200); failures.push({ scenario: 'recovery after lock release', status: r.status, ms: r.ms });
  const preservedSource = JSON.stringify(r.dto);
  const serverPid = child.pid;
  await pgctl('stop'); running = false;
  r = await get(); assert.equal(r.status, 503); failures.push({ scenario: 'database stopped', status: r.status, ms: r.ms });
  const recoveryStart = performance.now(); await pgctl('start'); running = true;
  const readinessMs = performance.now() - recoveryStart;
  r = await get(); assert.equal(r.status, 200);
  assert.equal(JSON.stringify(r.dto), preservedSource, 'Full source unchanged across restart');
  assert.equal(child.pid, serverPid);
  failures.push({ readinessMs, sameProcess: true, fullSourcePreserved: true, scenario: 'database restart to first success (includes pg_ctl readiness)', ms: performance.now() - recoveryStart, requestMs: r.ms });
  for (const mode of ['timeout', 'upstream_failure', 'success']) {
    await command('provider', { mode }); r = await request(45, '/api/sources/youtube', { video: 'bbbbbbbbbbb' });
    assert.equal(r.status, mode === 'success' ? 201 : mode === 'timeout' ? 504 : 502);
    failures.push({ scenario: `mock caption ${mode}`, status: r.status, ms: r.ms });
  }
  const before = (await command('snapshot')).providerCalls;
  const imports = await Promise.all([40, 41, 42, 43, 44].map(i => request(i, '/api/sources/youtube', { video: 'ccccccccccc' })));
  assert.ok(imports.every(r => r.status === 201), JSON.stringify(imports.map(r => r.status)));
  const calls = (await command('snapshot')).providerCalls - before; assert.equal(calls, 1);
  failures.push({ scenario: 'five visitors same caption, real DB writes, mocked provider', statuses: imports.map(r => r.status), providerCalls: calls, maxMs: Math.max(...imports.map(r => r.ms)) });
  const concurrent = await Promise.all([0, 1].map(() => request(39, '/api/sources/youtube', { video: 'ddddddddddd' })));
  assert.equal(concurrent.filter(r => r.status === 201).length, 1);
  assert.ok(concurrent.some(r => [409, 429].includes(r.status)));
  failures.push({ scenario: 'same owner concurrent replacement admission', statuses: concurrent.map(r => r.status) });
  // Real parser/worker and DB persistence. Small, generated public-domain synthetic PDF.
  const pdf = syntheticPdf();
  const form = new FormData(); form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'synthetic.pdf');
  const pdfStart = performance.now();
  const uploaded = await fetch(origin + '/api/sources/pdf', { method: 'POST', headers: { Origin: origin, Cookie: fixtures[38].cookie }, body: form, signal: AbortSignal.timeout(20000) });
  const uploadedDto = await uploaded.json(); assert.equal(uploaded.status, 201, JSON.stringify(uploadedDto));
  failures.push({ scenario: 'real one-page PDF parse + persist', bytes: pdf.length, status: uploaded.status, ms: performance.now() - pdfStart });
  const saved = await request(38, `/api/sources/${uploadedDto.source.id}`); assert.equal(saved.status, 200);
  assert.match(saved.dto.source.fullText, /Synthetic reliability benchmark/);
  await emit({ failures, finalResources: await command('snapshot'), loadExitCodes: exits });
  await command('close'); child = undefined;
  await emit({ status: exits.every(code => code === 0) ? 'PASS' : 'LOAD_THRESHOLD_FAILED', serverLog });
  if (exits.some(code => code !== 0)) process.exitCode = 1;
} catch (error) { await emit({ status: 'FAIL', message: error.message, stack: error.stack }); process.exitCode = 1; }
finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit'); child.kill(); await exited;
  }
  if (running) await pgctl('stop');
}

function syntheticPdf() {
  const stream = 'BT /F1 14 Tf 50 750 Td (Synthetic reliability benchmark document.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(pdf + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
