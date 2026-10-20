// Loaded only by the explicit developer --live branch. Never import from src/.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { validateProbeOptions, MAX_INBOUND_BYTES, type ProbeOptions } from "./realtime-probe.ts";
import type { PrimingTransport } from "../../src/shared/priming-controller.ts";

type Listener = (...args: unknown[]) => void;
export interface ProbeSocket {
  readyState: number; send(text: string): void; terminate(): void;
  on(type: string, listener: Listener): void; off(type: string, listener: Listener): void;
}
export type SocketConstructor = new (url: string, options: { headers: Record<string, string>; maxPayload: number;
  perMessageDeflate: false; followRedirects: false; handshakeTimeout: number }) => ProbeSocket;

export function validateProbeKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || !/^sk-[A-Za-z0-9_-]{10,500}$/.test(key)) {
    throw new Error("Missing or invalid probe key. No connection attempted.");
  }
}

// This is never called in offline mode. No dotenv/config, process.env mutation or server env/DB import.
export async function readProbeKey(deps?: { environment: { OPENAI_API_KEY?: string }; readKeyFile: () => Promise<string> }): Promise<string> {
  let key = (deps?.environment ?? process.env).OPENAI_API_KEY;
  if (!key) {
    let text: string;
    try { text = await (deps?.readKeyFile ?? (() => readFile(new URL("../../.env", import.meta.url), "utf8")))(); }
    catch { throw new Error("Probe key unavailable. No connection attempted."); }
    const lines = text.split(/\r?\n/u).filter(line => /^\s*(?:export\s+)?OPENAI_API_KEY\s*=/u.test(line));
    if (lines.length !== 1) throw new Error("Probe key unavailable. No connection attempted.");
    key = parse(lines[0]).OPENAI_API_KEY;
  }
  validateProbeKey(key); return key;
}

/** One HTTP upgrade, no redirects/retries, bounded frame/handshake, hard socket teardown.
 * Reuses the ws copy already shipped with pinned Next 16.4.2; no new SDK/dependency.
 * Constructor injection is for offline adapter tests only; CLI offers no endpoint override.
 */
export function openLiveProbe(options: ProbeOptions, key: string, Constructor?: SocketConstructor): PrimingTransport {
  validateProbeOptions(options); validateProbeKey(key);
  const WebSocket = Constructor ?? createRequire(import.meta.url)("next/dist/compiled/ws") as SocketConstructor;
  const socket = new WebSocket(`wss://api.openai.com/v1/realtime?model=${options.model}`, {
    headers: { Authorization: `Bearer ${key}`, "OpenAI-Safety-Identifier": "developer-synthetic-07d" },
    maxPayload: MAX_INBOUND_BYTES, perMessageDeflate: false, followRedirects: false, handshakeTimeout: options.timeoutMs,
  });
  let closed = false, receiver: ((event: unknown) => void) | undefined, onClosed: (() => void) | undefined;
  const failure = () => { if (!closed) onClosed?.(); };
  const message: Listener = (data, binary) => {
    if (closed) return;
    try {
      if (binary || !(data instanceof Buffer) || data.length > MAX_INBOUND_BYTES) { failure(); return; }
      receiver?.(JSON.parse(data.toString("utf8")));
    } catch { failure(); }
  };
  const close = () => {
    failure();
    socket.off("message", message); socket.off("close", close); socket.off("error", failure);
    receiver = undefined; onClosed = undefined;
  };
  // Keep a non-logging error listener through terminate's asynchronous close/error to avoid an unhandled error.
  socket.on("error", failure); socket.on("close", close); socket.on("message", message);
  return {
    isOpen: () => !closed && socket.readyState === 1,
    send: text => { if (closed || socket.readyState !== 1) throw new Error("Probe transport unavailable."); socket.send(text); },
    subscribe: (receive, lost) => { receiver = receive; onClosed = lost; return () => { receiver = undefined; onClosed = undefined; socket.off("message", message); }; },
    close: () => { if (closed) return; closed = true; receiver = undefined; onClosed = undefined; socket.off("message", message); socket.terminate(); },
  };
}
