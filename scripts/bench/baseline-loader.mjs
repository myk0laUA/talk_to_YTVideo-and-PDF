// Test-only loader: replay the measured pre-optimization repository at its original URL.
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
const target = new URL('../../src/server/sources/repository.ts', import.meta.url).href;
const source = readFileSync(new URL('../../benchmarks/repository-baseline.txt', import.meta.url), 'utf8');
registerHooks({ load(url, context, nextLoad) {
  if (url === target) return { format: 'module-typescript', source, shortCircuit: true };
  return nextLoad(url, context);
} });
