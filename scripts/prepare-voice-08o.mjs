// Offline fixture builder. No environment loading, browser, network or provider calls.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out = 'artifacts/local/08o/inputs';
await mkdir(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const lines = ['Cedar Loop trail guide', 'Cedar Loop is a two kilometre trail. Start at the north gate.',
  'Follow blue markers to the pond. The west bridge is closed;', 'use the east boardwalk. Bring water and return before dusk.'];
const content = 'BT /F1 12 Tf 50 750 Td ' + lines.map((s, i) => `${i ? '0 -20 Td ' : ''}(${s}) Tj`).join('\n') + ' ET';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [4 0 R] >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
let pdf = '%PDF-1.4\n'; const offsets = [0];
objects.forEach((s, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${s}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await writeFile(`${out}/trail.pdf`, pdf);
function pcm(b) {
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); let format;
  for (let p = 12; p + 8 <= b.length;) {
    const n = b.readUInt32LE(p + 4), tag = b.toString('ascii', p, p + 4);
    if (tag === 'fmt ') format = { codec: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (tag === 'data') { assert.deepEqual(format, { codec: 1, channels: 1, rate: 48000, bits: 16 }); return b.subarray(p + 8, p + 8 + n); }
    p += 8 + n + n % 2;
  }
  throw Error('Missing PCM');
}
const data = Buffer.alloc(70 * 96000), clips = [];
for (const [name, start] of [['summary', 3], ['stop', 12], ['continue', 27], ['question', 47]]) {
  const b = pcm(await readFile(`${out}/${name}.wav`)); assert.ok(b.length > 0 && b.length < 8 * 96000);
  b.copy(data, start * 96000); clips.push({ name, startSeconds: start, endSeconds: start + b.length / 96000, sha256: sha(b) });
}
// Exact zero samples after Stop, before Continue, and after final question.
for (const [a, b] of [[20, 27], [55, 70]]) assert.ok(data.subarray(a * 96000, b * 96000).every(n => n === 0));
const header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(48000, 24);
header.writeUInt32LE(96000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
const wave = Buffer.concat([header, data]); await writeFile(`${out}/comparison.wav`, wave);
await writeFile(`${out}/identity.json`, JSON.stringify({ authored: true, synthetic: true, durationSeconds: 70,
  pdfSha256: sha(pdf), waveSha256: sha(wave), clips, exactZeroIntervalsSeconds: [[20, 27], [55, 70]],
  timingBasis: 'file offsets, not heard-word or provider event times' }, null, 2));
console.log('08O authored PDF/PCM ready; no provider calls.');
