// Safe regression suite: every integration below owns its local fixtures and mocks providers.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('artifacts/local/sre/verification'); await mkdir(root, { recursive: true });
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? process.env.Path ?? ''}`,
  NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1', VERIFICATION_ROOT: root,
  OPENAI_API_KEY: '', SUPADATA_API_KEY: '', SCRAPECREATORS_API_KEY: '',
  DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic',
  PROOF_ENABLED: 'false', TEXT_PROOF_ENABLED: 'false', REALTIME_ISSUANCE_ENABLED: 'false',
  PDF_PROOF_ENABLED: 'false', CAPTION_PROOF_ENABLED: 'false',
  PDF_INGESTION_ENABLED: 'false', YOUTUBE_INGESTION_ENABLED: 'false', OWNED_SOURCE_TEXT_ENABLED: 'false', OWNED_SOURCE_VOICE_ENABLED: 'false' };
const cases = [
  ['unit', ['--conditions=react-server', '--test', 'tests/unit/*.test.ts']],
  ['lint', ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['build', ['node_modules/next/dist/bin/next', 'build']],
  ['smoke', ['node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/config/playwright.smoke.config.ts']],
  ['text-proof-browser', ['node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/config/playwright.text.config.ts']],
  ['voice-proof-browser', ['node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/config/playwright.voice.config.ts']],
  ...['sources-http', 'youtube-sources-http', 'pdf-http', 'captions-mocked', 'caption-cache', 'caption-coalescing',
    'caption-fallback', 'owned-text', 'owned-voice', 'voice-preparation', 'voice-adapter', 'mode-switch', 'recovery',
    'workspace-flows', 'workspace-layout', 'english-preparation', 'caption-entities', 'boundaries',
    'text-session', 'voice-session', 'transcript-view', 'source-ui', 'youtube-ui']
    .map(name => [name, ['--conditions=react-server', `tests/integration/verify-${name}.mjs`]]),
];
const requested = process.argv.slice(2);
let output = await readFile('benchmarks/verification.txt', 'utf8').catch(() => '');
output += `\nRun: ${new Date().toISOString()}\nCommand: node scripts/verify-reliability.mjs ${requested.join(' ')}\nRuntime: ${process.version}\nProviders disabled/mocked; local fixture servers only.\n`;
let failures = 0;
for (const [name, args] of cases.filter(([name]) => !requested.length || requested.includes(name))) {
  const command = `node ${args.join(' ')}`; console.log(`Running ${name}: ${command}`);
  output += `\nCOMMAND ${command}\n`;
  const started = performance.now();
  const child = spawn(process.execPath, args, { windowsHide: true, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', x => { output += x; }); child.stderr.on('data', x => { output += x; });
  const timer = setTimeout(() => child.kill(), 600000);
  const [code] = await once(child, 'exit'); clearTimeout(timer);
  const result = { test: name, exitCode: code, elapsedMs: performance.now() - started };
  output += JSON.stringify(result) + '\n'; console.log(result);
  await writeFile(path.join(root, 'verification.txt'), output);
  await writeFile('benchmarks/verification.txt', output);
  if (code !== 0) { failures++; if (['build', 'typecheck'].includes(name)) break; }
}
if (failures) process.exitCode = 1;
