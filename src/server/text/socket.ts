import "server-only";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PROVIDER_TEXT_POLICY } from "../../shared/priming-provider-policy.ts";
import type { TextConnection } from "../../shared/text-lifecycle.ts";

type Listener = (...args: unknown[]) => void;
export interface TextSocket {
  readyState: number; bufferedAmount: number;
  send(raw: string, callback: (error?: Error) => void): void; terminate(): void;
  on(type: string, listener: Listener): void; off(type: string, listener: Listener): void;
}
export type TextSocketConstructor = new (url: string, options: { headers: Record<string, string>;
  maxPayload: number; perMessageDeflate: false; followRedirects: false; handshakeTimeout: number }) => TextSocket;

/** Pinned Next 16.4.2's shipped ws, also used in 07D–F. No redirects or automatic retry.
 * Permanent authentication stays here. Native browser WebSocket cannot set this header.
 */
export function openTextSocket(apiKey: string, owner: string, signal: AbortSignal, Constructor?: TextSocketConstructor): Promise<TextConnection> {
  if (signal.aborted) return Promise.reject(new Error("Connection unavailable"));
  const WebSocket = Constructor ?? createRequire(import.meta.url)("next/dist/compiled/ws") as TextSocketConstructor;
  const socket = new WebSocket(`wss://api.openai.com/v1/realtime?model=${PROVIDER_TEXT_POLICY.model}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "OpenAI-Safety-Identifier": createHash("sha256").update(`text-relay-v1:${owner}`).digest("hex") },
    maxPayload: 80_000, perMessageDeflate: false, followRedirects: false, handshakeTimeout: 10_000,
  });
  return new Promise((resolve, reject) => {
    let closed = false, acquired = false, receive: ((e: unknown) => void) | undefined, lost: (() => void) | undefined;
    // Retain the quiet error sink until ws emits close after terminate, including failed handshakes.
    const error: Listener = () => { if (!acquired) reject(new Error("Connection unavailable")); else lost?.(); close(); };
    const end: Listener = () => { error(); detach(); socket.off("error", error); socket.off("close", end); };
    const message: Listener = (data, binary) => {
      if (closed) return;
      try {
        if (binary || !(data instanceof Buffer) || data.length > 80_000) throw new Error("Invalid event");
        receive?.(JSON.parse(data.toString("utf8")));
      } catch { error(); }
    };
    const detach = () => { signal.removeEventListener("abort", abort); socket.off("open", open); socket.off("message", message); receive = lost = undefined; };
    const close = () => { if (closed) return; closed = true; detach(); socket.terminate(); };
    const abort = () => { if (!acquired) reject(new Error("Connection unavailable")); close(); };
    const open: Listener = () => {
      if (closed || signal.aborted) { abort(); return; }
      acquired = true;
      resolve({ close, transport: {
        isOpen: () => !closed && socket.readyState === 1,
        send: raw => new Promise<void>((written, failed) => {
          if (closed || socket.readyState !== 1 || socket.bufferedAmount > 256_000 || Buffer.byteLength(raw) > 64_000) { failed(new Error("Connection unavailable")); close(); return; }
          socket.send(raw, cause => cause ? failed(new Error("Connection unavailable")) : written());
        }),
        subscribe: (next, onLost) => { receive = next; lost = onLost; return () => { receive = lost = undefined; }; }, close,
      } });
    };
    socket.on("error", error); socket.on("close", end); socket.on("message", message); socket.on("open", open);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
