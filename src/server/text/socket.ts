import "server-only";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PROVIDER_TEXT_POLICY } from "../../shared/priming-provider-policy.ts";
import type { TextConnection } from "../../shared/text-lifecycle.ts";
import { MAX_ITEMS, MAX_WIRE_BYTES } from "../../shared/priming-manifest.ts";

// A complete admitted manifest (4096 items plus configuration/finalization), not
// an unbounded producer queue. Limits include the in-flight native write.
export const TEXT_SEND_LIMITS = Object.freeze({ bytes: MAX_WIRE_BYTES, commands: MAX_ITEMS + 2,
  frameBytes: 64_000, nativeBytes: 256_000, lifetimeMs: 25_000 });

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
    type Write = { raw: string; bytes: number; expires: number; valid?: () => boolean;
      written: () => void; failed: (error: Error) => void };
    const queue: Write[] = [];
    let queueBytes = 0, active: Write | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let closeReason = "closed";
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
    const close = () => {
      if (closed) return;
      closed = true; clearTimeout(timer); timer = undefined;
      const pending = queue.splice(0); queueBytes = 0; active = undefined;
      for (const write of pending) write.failed(new Error("Connection unavailable", { cause: closeReason }));
      detach(); socket.terminate();
    };
    const failWrite = (reason: string) => { closeReason = reason; close(); };
    const arm = () => {
      clearTimeout(timer); timer = undefined;
      if (queue.length) timer = setTimeout(() => failWrite("write_timeout"), Math.max(1, queue[0].expires - Date.now()));
    };
    const pump = () => {
      if (closed || active || !queue.length) return;
      const write = queue[0];
      // Guard immediately before native send, including after every delayed callback.
      if (signal.aborted || socket.readyState !== 1) { failWrite("closed_or_aborted"); return; }
      if (Date.now() >= write.expires) { failWrite("write_timeout"); return; }
      if (socket.bufferedAmount > TEXT_SEND_LIMITS.nativeBytes) { failWrite("native_overflow"); return; }
      try {
        if (write.valid && !write.valid()) {
          queue.shift(); queueBytes -= write.bytes; write.written(); arm(); queueMicrotask(pump); return;
        }
        active = write;
        socket.send(write.raw, cause => {
          // A callback may arrive twice or after abort/Stop/replacement. It owns
          // only this connection and this exact in-flight write.
          if (closed || active !== write) return;
          if (cause) { failWrite("native_write_failed"); return; }
          active = undefined; queue.shift(); queueBytes -= write.bytes;
          write.written(); arm(); queueMicrotask(pump);
        });
      } catch { failWrite("native_write_failed"); }
    };
    const abort = () => { if (!acquired) reject(new Error("Connection unavailable")); close(); };
    const open: Listener = () => {
      if (closed || signal.aborted) { abort(); return; }
      acquired = true;
      resolve({ close, transport: {
        isOpen: () => !closed && socket.readyState === 1,
        send: (raw, valid) => new Promise<void>((written, failed) => {
          const size = Buffer.byteLength(raw);
          if (closed || signal.aborted || socket.readyState !== 1 || size > TEXT_SEND_LIMITS.frameBytes
            || queue.length >= TEXT_SEND_LIMITS.commands || queueBytes + size > TEXT_SEND_LIMITS.bytes) {
            failed(new Error("Connection unavailable")); failWrite("queue_or_frame_limit"); return;
          }
          queue.push({ raw, bytes: size, expires: Date.now() + TEXT_SEND_LIMITS.lifetimeMs, valid, written, failed });
          queueBytes += size; if (queue.length === 1) arm(); pump();
        }),
        subscribe: (next, onLost) => { receive = next; lost = onLost; return () => { receive = lost = undefined; }; }, close,
      } });
    };
    socket.on("error", error); socket.on("close", end); socket.on("message", message); socket.on("open", open);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
