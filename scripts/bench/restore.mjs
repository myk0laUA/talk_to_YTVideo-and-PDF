import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { historyEvents, VoiceHistoryRestore } from '../../src/shared/conversation-restore.ts';
import { parseHistory } from '../../src/shared/conversation-history.ts';

const history = parseHistory({ sourceId: 'synthetic-source', turns: Array.from({ length: 128 }, (_, i) => ({
  role: i % 2 ? 'assistant' : 'user', text: `${i}: Synthetic dialogue. ${'Public fixture text. '.repeat(8)}` })) }, 'synthetic-source');
const record = { command: 'node scripts/bench/restore.mjs', runtime: process.version,
  scope: 'production history serializer and ACK barrier only; deterministic 1ms async ACK per event; NO WebRTC/browser/DB/provider or connection setup',
  turns: history.turns.length, characters: history.turns.reduce((n, t) => n + t.text.length, 0), trials: [] };
async function restore(id, interrupt = false) {
  const start = performance.now();
  const events = historyEvents(history, `synthetic_${id}`, 'last_source', 90000);
  assert.equal(events.length, 129); // 128 dialogue items plus continuation instruction.
  const barrier = new VoiceHistoryRestore(events);
  const done = interrupt ? assert.rejects(barrier.done, /restoration failed/) : barrier.done;
  let sent = 0;
  await barrier.send(async raw => {
    const event = JSON.parse(raw); sent++;
    await delay(1);
    if (interrupt && sent === 64) { barrier.stop(); return; }
    barrier.receive({ ...event, type: 'conversation.item.done', item: { ...event.item, status: 'completed' } });
  });
  await done;
  assert.equal(sent, interrupt ? 64 : events.length);
  return performance.now() - start;
}
for (const concurrency of [1, 5, 10]) for (let repeat = 1; repeat <= 3; repeat++) {
  const durations = await Promise.all(Array.from({ length: concurrency }, (_, i) => restore(`${concurrency}_${repeat}_${i}`)));
  record.trials.push({ concurrency, repeat, durationsMs: durations });
}
record.interruptedAttemptMs = await restore('interrupted', true);
record.freshRestoreAfterInterruptionMs = await restore('recovered');
record.status = 'PASS';
const outputRoot = process.env.BENCH_OUTPUT_DIR ?? 'benchmarks';
await mkdir(outputRoot, { recursive: true });
const text = JSON.stringify(record, null, 2) + '\n';
await writeFile(`${outputRoot}/restoration.txt`, text); console.log(text);
