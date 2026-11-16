// Recalculate historical claims without rewriting captured evidence.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.env.BENCH_OUTPUT_DIR ?? 'benchmarks/audit');
await mkdir(root, { recursive: true });
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const median = values => [...values].sort((a, b) => a - b)[1];
const comparison = await json('benchmarks/comparison.json');
const result = { command: 'node scripts/bench/audit.mjs', modes: {} };
for (const mode of ['baseline', 'optimized']) {
  const records = (await readFile(`benchmarks/${mode}.txt`, 'utf8')).split('\n')
    .filter(line => line.startsWith('{')).map(line => JSON.parse(line));
  const rows = [];
  for (let repeat = 1; repeat <= 3; repeat++) {
    const label = `read-50-r${repeat}`;
    const { metrics: m } = await json(`benchmarks/raw/${mode}-${label}.json`);
    const resource = records.find(r => r.label === label && r.resources).resources;
    assert.equal(m.http_req_failed.value, 0);
    assert.equal(m.request_timeouts.value, 0);
    assert.equal(m.checks.value, 1);
    assert.equal(m.checks.passes, m.http_reqs.count, 'Every read must have a passing semantic check');
    rows.push({ throughput: m.http_reqs.rate, requests: m.http_reqs.count,
      p95: m.http_req_duration['p(95)'], peakMiB: resource.peakRssBytes / 1048576 });
  }
  for (const key of Object.keys(rows[0])) assert.equal(median(rows.map(r => r[key])), comparison[50][mode].median[key]);
  result.modes[mode] = { rows, metadata: records[0] };
}
const b = comparison[50].baseline.median, a = comparison[50].optimized.median;
result.changesPercent = { throughputIncrease: (a.throughput / b.throughput - 1) * 100,
  p95Reduction: (1 - a.p95 / b.p95) * 100, rssIncrease: (a.peakMiB / b.peakMiB - 1) * 100 };
const archive = (await readFile('benchmarks/repository-baseline.txt', 'utf8')).replaceAll('\r\n', '\n');
const original = execFileSync('git', ['show', 'b786404^:src/server/sources/repository.ts'], { encoding: 'utf8' });
const withoutMetrics = archive.replace('import { measured } from "../observability.ts";\n', '')
  .replace('measured("db.source.get", () => transaction(async tx => {', 'transaction(async tx => {')
  .replace('    })),\n    remove:', '    }),\n    remove:');
assert.equal(withoutMetrics, original);
result.archivedRepositoryMatchesParentExceptTimingWrapper = true;
result.recovery = [];
for (const file of ['pilot/smoke.txt', 'baseline.txt', 'optimized.txt', 'smoke.txt']) {
  for (const line of (await readFile(`benchmarks/${file}`, 'utf8')).split('\n').filter(line => line.startsWith('{'))) {
    for (const failure of JSON.parse(line).failures ?? []) {
      if (failure.scenario.startsWith('database restart')) result.recovery.push({ file, ...failure });
    }
  }
}
assert.equal(result.recovery.length, 4);
result.status = 'PASS';
const text = JSON.stringify(result, null, 2) + '\n';
await writeFile(path.join(root, 'claims.json'), text);
console.log(text);

// Optional bounded memory experiment; natural and forced collections are both
// included in the cumulative GC counters. Do not compare these to normal runs.
const memoryRoot = path.join(root, 'memory');
const memoryLog = await readFile(path.join(memoryRoot, 'baseline.txt'), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (memoryLog !== null) {
  const summary = {};
  for (const mode of ['baseline', 'optimized']) {
    const records = (await readFile(path.join(memoryRoot, `${mode}.txt`), 'utf8')).split('\n')
      .filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    assert.ok(records.some(r => r.status === 'PASS'));
    summary[mode] = [];
    for (let repeat = 1; repeat <= 4; repeat++) {
      const label = `memory-500-r${repeat}`;
      const { metrics: m } = await json(path.join(memoryRoot, 'raw', `${mode}-${label}.json`));
      assert.equal(m.http_req_failed.value, 0);
      assert.equal(m.checks.value, 1);
      assert.equal(m.checks.passes, m.http_reqs.count);
      assert.equal(m.dropped_iterations.count, 0);
      const resource = records.find(r => r.label === label && r.resources).resources;
      const row = { repeat, requests: m.http_reqs.count, rate: m.http_reqs.rate,
        peakRssMiB: resource.peakRssBytes / 1048576, peakConnections: resource.peakConnections };
      for (const stage of ['loaded', 'idle', 'collected']) {
        const sample = records.find(r => r.memory === `${stage}-${repeat}`).sample;
        row[stage] = Object.fromEntries(['rss', 'heapUsed', 'heapTotal', 'external', 'arrayBuffers']
          .map(key => [key, sample[key] / 1048576]));
        row[stage].gcCount = sample.gcCount;
        row[stage].gcDurationMs = sample.gcDurationMs;
      }
      summary[mode].push(row);
    }
  }
  await writeFile(path.join(memoryRoot, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('Equal-rate memory summaries verified and regenerated. Byte fields reported in MiB.');
}
