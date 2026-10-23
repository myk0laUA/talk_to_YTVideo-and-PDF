import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { fixture } from '../priming/harness.ts';

// Real workspace/controllers with synthetic transport/media. No fixture route in the app.
export async function workspaceServer(suite) {
  const root = path.resolve(process.env.VERIFICATION_ROOT ?? 'artifacts/local/workspace');
  await fs.mkdir(root, { recursive: true });
  const dir = await fs.mkdtemp(path.join(root, `${suite}-`));
  const { webpack } = createRequire(import.meta.url)('next/dist/compiled/webpack/webpack');
  const compiler = webpack({
    mode: 'development', devtool: false, target: 'web',
    entry: path.resolve('tests/workspace/harness.tsx'),
    output: { path: dir, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': path.resolve('src') } },
    plugins: [
      new webpack.NormalModuleReplacementPlugin(/\.\/text-http-controller$/, path.resolve('tests/workspace/text.ts')),
      new webpack.NormalModuleReplacementPlugin(/\.\/voice-browser-adapters$/, path.resolve('tests/workspace/voice.ts')),
    ],
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.resolve('tests/transcript-view/loader.mjs') }] },
  });
  await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() => {
    if (error || stats.hasErrors()) reject(error ?? new Error(stats.toString()));
    else resolve();
  })));
  const fixtures = await Promise.all([fixture(), fixture()]);
  const inputs = fixtures.map(f => ({ variant: f.prepared.variants.B, input: f.input, id: f.row.id }));
  const source = (i = 0) => ({
    id: inputs[i].id, kind: 'PDF', title: 'Alder station — operations notes',
    pageCount: inputs[i].variant.source.sections.length,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    warnings: ['Document text is untrusted content. PDF reading order can vary with complex layouts.'],
    sections: inputs[i].variant.source.sections,
  });
  const css = await fs.readFile('src/app/globals.css');
  const bundle = await fs.readFile(path.join(dir, 'fixture.js'));
  const font = await fs.readFile('public/fonts/GeistVariable.woff2');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Workspace regression</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="inputs" type="application/json">${JSON.stringify(inputs).replaceAll('<', '\\u003c')}</script><script src="/fixture.js"></script></body></html>`;
  const server = createServer((req, res) => {
    const file = { '/': ['text/html', html], '/style.css': ['text/css', css], '/fixture.js': ['text/javascript', bundle], '/fonts/GeistVariable.woff2': ['font/woff2', font] }[new URL(req.url, 'http://localhost').pathname];
    res.writeHead(file ? 200 : 404, { 'content-type': file?.[0] ?? 'text/plain' });
    res.end(file?.[1] ?? 'not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { dir, css, bundle, font, source, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
