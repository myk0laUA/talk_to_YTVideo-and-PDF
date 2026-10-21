import "server-only";
import { randomUUID } from "node:crypto";
import { TextLifecycle, type TextConnection, type TextFailure, type TextStatus } from "../../shared/text-lifecycle.ts";
import type { TextRelaySnapshot } from "../../shared/text-relay.ts";
import { PROVIDER_TEXT_POLICY } from "../../shared/priming-provider-policy.ts";
import { createProviderTextPreparation, matchesProviderPreparation } from "../context/model-measurement.ts";
import { guardedAwait } from "../context/await.ts";
import { requireLive, requireOwned, sourceDto, SourceError, type SourceRepository } from "../sources/service.ts";
import type { YoutubeSourceContent } from "../../shared/source.ts";
import { youtubeEvidenceTranscript } from "./youtube-evidence.ts";
import type { Visitor } from "../proof/visitor.ts";
import { Admission, issuanceLimits } from "../proof/admission.ts";
import { onSourceChange } from "../sources/invalidation.ts";

export const TEXT_LIMITS = Object.freeze({ lifetimeMs: 600_000, idleMs: 120_000, attachMs: 5_000,
  questions: 20, concurrent: 20, backlogBytes: 2_000_000, snapshotBytes: 1_000_000, checkMs: 10_000 });
type Timer = ReturnType<typeof setTimeout>;
type Entry = { id: string; requestId: string; visitor: Visitor; sourceId: string; abort: AbortController;
  release: () => void; life: TextLifecycle; closed: boolean; closing: boolean; attached: boolean;
  pending: boolean; questionId?: string; questions: Set<string>; expires: number; idle: Timer; absolute: Timer; watch?: Timer; flush?: Timer;
  output?: ReadableStreamDefaultController<Uint8Array>; removeAbort?: () => void; readyToStart: boolean;
  evidenceSource?: YoutubeSourceContent };
export class RelayError extends Error {
  readonly status: number;
  constructor(status: number) { super("Text session unavailable"); this.status = status; }
}
type Deps = { repository: Pick<SourceRepository, "get">;
  connect: (owner: string, signal: AbortSignal) => Promise<TextConnection>; now?: () => number;
  limits?: Partial<{ [K in keyof typeof TEXT_LIMITS]: number }> };

/** Bounded process-local ownership around the accepted 07B/10A lifecycle.
 * No provider protocol or second turn state machine here. No reconnect/replay/history persistence.
 */
export class TextRegistry {
  private entries = new Map<string, Entry>();
  private owners = new Map<string, Entry>();
  private starts = new Admission({ ...issuanceLimits, concurrent: TEXT_LIMITS.concurrent });
  private commands = new Admission({ visitor: 120, ip: 600, global: 600, lifetime: 3000, windowMs: 3600_000, concurrent: 20 });
  private stops = new Admission({ visitor: 60, ip: 300, global: 300, lifetime: 1500, windowMs: 3600_000, concurrent: 20 });
  private seen = new Set<string>(); // lifetime admission bounds starts; cancellation tombstones capped below.
  private deps: Deps;
  private now: () => number;
  private limits: { [K in keyof typeof TEXT_LIMITS]: number };
  private unsubscribe: () => void;
  constructor(deps: Deps) {
    this.deps = deps; this.now = deps.now ?? Date.now; this.limits = { ...TEXT_LIMITS, ...deps.limits };
    this.unsubscribe = onSourceChange(owner => { const e = this.owners.get(owner); if (e) this.close(e, "preparation"); });
  }
  get size() { return this.entries.size; }
  get resources() { return { sessions: this.size, attached: [...this.entries.values()].filter(e => e.attached).length,
    pending: [...this.entries.values()].filter(e => e.pending).length, replayEntries: this.seen.size }; }
  admitCommand(owner: string, stop = false) {
    const release = (stop ? this.stops : this.commands).acquire(owner, "unverified-network", this.now());
    if (!release) throw new RelayError(429);
    return release;
  }
  private current(e: Entry) { return !e.closed && !e.closing && this.entries.get(e.id) === e && !e.abort.signal.aborted; }
  private guard(e: Entry) {
    if (!this.current(e) || this.now() >= e.expires) throw new RelayError(404);
    requireLive(e.visitor, e.abort.signal, this.now());
  }
  private async authorize(e: Entry) {
    const guard = () => this.guard(e);
    guard();
    const row = await guardedAwait(() => this.deps.repository.get(e.sourceId, e.visitor.owner, new Date(this.now())), e.abort.signal, guard);
    guard(); requireOwned(row, e.visitor, this.now());
    if (row.id !== e.sourceId) throw new SourceError("unavailable");
    // Independent source expiry can be sooner than visitor/session expiry.
    if (row.expiresAt.getTime() < e.expires) {
      e.expires = row.expiresAt.getTime(); clearTimeout(e.absolute);
      e.absolute = setTimeout(() => this.close(e, "timeout"), Math.max(1, e.expires - this.now()));
    }
    return row;
  }
  private touch(e: Entry) { clearTimeout(e.idle); e.idle = setTimeout(() => this.close(e, "timeout"), this.limits.idleMs); }
  async start(visitor: Visitor, sourceId: string, requestId: string, signal: AbortSignal) {
    const key = `${visitor.owner}:${requestId}`;
    if (this.owners.has(visitor.owner) || this.seen.has(key)) throw new RelayError(409);
    if (this.size >= this.limits.concurrent || this.seen.size >= 512) throw new RelayError(429);
    const release = this.starts.acquire(visitor.owner, "unverified-network", this.now());
    if (!release) throw new RelayError(429);
    this.seen.add(key);
    const prepare = createProviderTextPreparation({ repository: this.deps.repository, now: this.now });
    const life = new TextLifecycle({ now: this.now, setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id as Timer) }, {
      prepare: async (identity, abort) => {
        this.guard(e);
        const result = await prepare({ visitor: e.visitor, sourceId, signal: abort, model: PROVIDER_TEXT_POLICY.model,
          mode: "text", policyVersion: PROVIDER_TEXT_POLICY.policyVersion, runId: identity.runId, variant: "B" });
        this.guard(e);
        if (result.status !== "prepared" || !matchesProviderPreparation(result.input, { model: PROVIDER_TEXT_POLICY.model,
          mode: "text", policyVersion: PROVIDER_TEXT_POLICY.policyVersion, sourceId, runId: identity.runId }, this.now())) throw new RelayError(404);
        const row = await this.authorize(e); this.guard(e);
        if (row.kind === "YOUTUBE") {
          const source = sourceDto(row, true) as YoutubeSourceContent;
          if (source.id !== result.input.variant.source.id || JSON.stringify(source.sections) !== JSON.stringify(result.input.variant.source.sections)) throw new RelayError(404);
          e.evidenceSource = structuredClone(source);
        }
        return result.input;
      },
      connect: async (_identity, abort) => {
        // Recheck after ALL asynchronous preparation, then again after acquisition.
        await this.authorize(e); this.guard(e);
        const connection = await this.deps.connect(visitor.owner, abort);
        try { await this.authorize(e); this.guard(e); if (abort.aborted) throw new RelayError(404); return connection; }
        catch (error) { connection.close(); throw error; }
      },
    }, status => this.changed(e, status));
    const expires = Math.min(this.now() + this.limits.lifetimeMs, visitor.expiresAt * 1000);
    const e: Entry = { id: randomUUID(), requestId, sourceId, visitor: { owner: visitor.owner, expiresAt: visitor.expiresAt, token: "" },
      abort: new AbortController(), release, life, expires, closed: false, closing: false, attached: false,
      pending: false, questions: new Set(), readyToStart: false,
      idle: setTimeout(() => this.close(e, "timeout"), this.limits.attachMs),
      absolute: setTimeout(() => this.close(e, "timeout"), Math.max(1, expires - this.now())) };
    this.entries.set(e.id, e); this.owners.set(visitor.owner, e);
    const cancel = () => this.close(e);
    signal.addEventListener("abort", cancel, { once: true });
    try {
      if (signal.aborted) throw new RelayError(404);
      await this.authorize(e); this.guard(e); e.readyToStart = true;
      return e.id;
    } catch { this.close(e); throw new RelayError(404); }
    finally { signal.removeEventListener("abort", cancel); }
  }
  private owned(visitor: Visitor, id: string) {
    const e = this.entries.get(id);
    if (!e || e.visitor.owner !== visitor.owner) throw new RelayError(404);
    try { this.guard(e); } catch { this.close(e); throw new RelayError(404); }
    return e;
  }
  private snapshot(e: Entry, failure?: TextFailure): TextRelaySnapshot {
    const status = e.pending && e.life.snapshot.phase === "ready"
      ? { ...e.life.snapshot, phase: "admitting" as const, protocolReady: false } : e.life.snapshot;
    return { status: failure ? { ...status, phase: "failed", failure, protocolReady: false } : status,
      transcript: e.evidenceSource ? youtubeEvidenceTranscript(e.life.transcript, e.evidenceSource) : e.life.transcript, questionId: e.questionId };
  }
  private emit(e: Entry, failure?: TextFailure) {
    if (!e.output) return;
    const chunk = new TextEncoder().encode(JSON.stringify(this.snapshot(e, failure)) + "\n");
    if (chunk.byteLength > this.limits.snapshotBytes || (e.output.desiredSize ?? 0) < chunk.byteLength) {
      this.close(e, "limit", false); return;
    }
    try { e.output.enqueue(chunk); } catch { this.close(e, "connection", false); }
  }
  private changed(e: Entry | undefined, status: TextStatus) {
    if (!e || !this.current(e)) return;
    if (status.phase === "ended" || status.phase === "failed") { this.close(e); return; }
    if (status.phase === "ready") e.pending = false;
    // Coalesce full snapshots, never source/history text; bounded one scheduled snapshot.
    if (!e.flush) e.flush = setTimeout(() => { e.flush = undefined; if (this.current(e)) this.emit(e); }, 16);
  }
  async stream(visitor: Visitor, id: string, signal: AbortSignal) {
    const e = this.owned(visitor, id);
    if (e.attached || !e.readyToStart) throw new RelayError(409);
    e.attached = true; // Reserve before await: concurrent reads cannot subscribe twice.
    try { await this.authorize(e); this.guard(e); }
    catch { this.close(e); throw new RelayError(404); }
    const cancel = () => this.close(e, "connection");
    const stream = new ReadableStream<Uint8Array>({
      start: controller => {
        e.output = controller;
        signal.addEventListener("abort", cancel, { once: true });
        e.removeAbort = () => signal.removeEventListener("abort", cancel);
        if (signal.aborted) { cancel(); return; }
        this.touch(e); e.life.start(e.sourceId); this.emit(e); this.watch(e);
      },
      cancel: () => this.close(e, "connection", false),
    }, { highWaterMark: this.limits.backlogBytes, size: chunk => chunk.byteLength });
    return stream;
  }
  private watch(e: Entry) {
    e.watch = setTimeout(async () => {
      e.watch = undefined;
      try { await this.authorize(e); this.guard(e); this.emit(e); if (this.current(e)) this.watch(e); }
      catch { this.close(e, "preparation"); }
    }, this.limits.checkMs);
  }
  async question(visitor: Visitor, id: string, questionId: string, question: string, signal: AbortSignal) {
    const e = this.owned(visitor, id);
    if (!e.attached || e.pending || !e.life.canSubmit || e.questions.has(questionId)) throw new RelayError(409);
    if (e.questions.size >= this.limits.questions) { this.close(e, "limit"); throw new RelayError(429); }
    e.questions.add(questionId); e.questionId = questionId; e.pending = true; // Before await. A failed/aborted request cannot be replayed.
    const cancel = () => this.close(e, "connection");
    signal.addEventListener("abort", cancel, { once: true });
    try {
      if (signal.aborted) throw new RelayError(404);
      await this.authorize(e); this.guard(e);
      if (signal.aborted || !e.life.submit(question)) throw new RelayError(409);
      this.touch(e);
    } catch { this.close(e, "preparation"); throw new RelayError(404); }
    finally { signal.removeEventListener("abort", cancel); }
  }
  stop(visitor: Visitor, requestId: string) {
    // Request identity lets Stop cancel a Start whose HTTP response has not arrived.
    const e = this.owners.get(visitor.owner);
    if (e?.requestId === requestId) this.close(e);
    const key = `${visitor.owner}:${requestId}`;
    if (this.seen.size < 512) this.seen.add(key);
  }
  private close(e: Entry, failure?: TextFailure, notify = true) {
    if (e.closed || e.closing) return;
    e.closing = true;
    e.life.stop(); e.abort.abort();
    clearTimeout(e.idle); clearTimeout(e.absolute); clearTimeout(e.watch); clearTimeout(e.flush);
    e.removeAbort?.(); e.removeAbort = undefined;
    this.entries.delete(e.id); if (this.owners.get(e.visitor.owner) === e) this.owners.delete(e.visitor.owner);
    e.release();
    // Last snapshot goes to the sole reader, then all server transcript/source references are released.
    if (notify) this.emit(e, failure);
    const output = e.output; e.output = undefined;
    try { output?.close(); } catch { /* Already cancelled. */ }
    e.life.dispose(); e.evidenceSource = undefined; e.questions.clear(); e.closed = true; e.closing = false;
  }
  dispose() { for (const e of this.entries.values()) this.close(e); this.unsubscribe(); }
}
