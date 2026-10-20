// Explicit test preload only. Production never imports this file.
/* eslint-disable @typescript-eslint/no-require-imports -- Explicit CommonJS --require test preload. */
const net = require('node:net'), tls = require('node:tls');
const allow = host => !host || ['localhost', '127.0.0.1', '::1'].includes(host);
const forbid = () => { process.send?.({ textTestForbidden: true }); throw new Error('External network disabled in 10D tests'); };
const socketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const a = Array.isArray(args[0]) ? args[0] : args;
  const option = a[0];
  const host = option && typeof option === 'object' ? option.host : typeof a[1] === 'string' ? a[1] : undefined;
  if (!allow(host)) return forbid();
  return socketConnect.apply(this, args);
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  const option = args.find(a => a && typeof a === 'object') ?? {};
  if (!allow(option.host ?? option.servername)) return forbid();
  return tlsConnect.apply(this, args);
};
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
  if (!allow(url.hostname)) { try { forbid(); } catch (e) { return Promise.reject(e); } }
  return original(input, init);
};
