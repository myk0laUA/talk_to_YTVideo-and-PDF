import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PROVIDER_VOICE_POLICY as policy } from "../../shared/priming-provider-policy.ts";
import type { ProviderPrimingInput } from "../../shared/priming-admission.ts";
import { createProviderVoicePreparation, matchesProviderPreparation } from "../context/model-measurement.ts";
import { contextVariants, sourceContext } from "../context/document.ts";
import { guardedAwait } from "../context/await.ts";
import { requireLive, requireOwned, type SourceRepository } from "../sources/service.ts";
import { onSourceChange } from "../sources/invalidation.ts";
import { Admission, issuanceLimits, proofLimits, type Limits } from "../proof/admission.ts";
import type { Visitor } from "../proof/visitor.ts";
import { validVoiceCredential, type VoiceMint } from "./provider.ts";

export class VoiceError extends Error {
  readonly status: number;
  constructor(status = 404) { super("Voice preparation unavailable"); this.status = status; }
}
export const VOICE_LIMITS = Object.freeze({ ticketMs: 30_000, preparationMs: 5000, acquisitionMs: 10_000,
  entries: 4, replayEntries: 100 });
type Entry = { id: string; requestId: string; sourceId: string; visitor: Visitor; runId: string;
  expires: number; abort: AbortController; timer: ReturnType<typeof setTimeout>; input?: ProviderPrimingInput; consumed: boolean };
type Deps = { repository: Pick<SourceRepository, "get">; mint: VoiceMint; now?: () => number;
  limits?: Partial<{ [K in keyof typeof VOICE_LIMITS]: number }>; issuance?: Limits; preparations?: Limits };

/** Process-local, bounded single-use preparation. No credential cache or automatic retry. */
export class VoiceRegistry {
  private entries = new Map<string, Entry>();
  private owners = new Map<string, Entry>();
  private seen = new Set<string>(); // Bounded process-lifetime tombstones; never expire into replayability.
  private starts: Admission;
  private issuance: Admission;
  private pendingMints = 0;
  private now: () => number;
  private limits: { [K in keyof typeof VOICE_LIMITS]: number };
  private deps: Deps;
  private unsubscribe: () => void;
  constructor(deps: Deps) {
    this.deps = deps; this.now = deps.now ?? Date.now; this.limits = { ...VOICE_LIMITS, ...deps.limits };
    this.starts = new Admission(deps.preparations ?? proofLimits); this.issuance = new Admission(deps.issuance ?? issuanceLimits);
    this.unsubscribe = onSourceChange(owner => { const e = this.owners.get(owner); if (e) this.close(e); });
  }
  get resources() { return { entries: this.entries.size, timers: this.entries.size, replayEntries: this.seen.size, pendingMints: this.pendingMints }; }
  private close(e: Entry) {
    if (this.entries.get(e.id) !== e) return;
    this.entries.delete(e.id); if (this.owners.get(e.visitor.owner) === e) this.owners.delete(e.visitor.owner);
    clearTimeout(e.timer); e.abort.abort(); e.input = undefined;
  }
  private guard(e: Entry, freshVisitor: () => void) {
    freshVisitor(); requireLive(e.visitor, e.abort.signal, this.now());
    if (this.entries.get(e.id) !== e || !Number.isFinite(this.now()) || this.now() >= e.expires) throw new VoiceError();
    if (e.input && !matchesProviderPreparation(e.input, { model: policy.model, mode: "voice", policyVersion: policy.policyVersion,
      sourceId: e.sourceId, runId: e.runId }, this.now())) throw new VoiceError();
  }
  private async authorize(e: Entry, freshVisitor: () => void) {
    const guard = () => this.guard(e, freshVisitor); guard();
    const row = await guardedAwait(() => this.deps.repository.get(e.sourceId, e.visitor.owner, new Date(this.now())), e.abort.signal, guard);
    guard(); requireOwned(row, e.visitor, this.now());
    if (row.id !== e.sourceId || (e.input && contextVariants(sourceContext(row)).B.serialized !== e.input.variant.serialized)) throw new VoiceError();
    if (!Number.isFinite(row.expiresAt.getTime()) || row.expiresAt.getTime() <= this.now()) throw new VoiceError();
    if (row.expiresAt.getTime() < e.expires) this.deadline(e, row.expiresAt.getTime());
    guard();
  }
  private deadline(e: Entry, at: number) {
    e.expires = at; clearTimeout(e.timer);
    e.timer = setTimeout(() => this.close(e), Math.max(1, at - this.now()));
  }
  async prepare(visitor: Visitor, sourceId: string, requestId: string, signal: AbortSignal, freshVisitor: () => void) {
    const key = `${visitor.owner}:${requestId}`;
    if (this.seen.has(key) || this.owners.has(visitor.owner)) throw new VoiceError(409);
    if (this.entries.size >= this.limits.entries || this.seen.size >= this.limits.replayEntries) throw new VoiceError(429);
    const release = this.starts.acquire(visitor.owner, "unverified-network", this.now());
    if (!release) throw new VoiceError(429);
    this.seen.add(key);
    const e: Entry = { id: randomBytes(32).toString("base64url"), sourceId, requestId, runId: randomUUID(),
      visitor: { owner: visitor.owner, expiresAt: visitor.expiresAt, token: "" }, abort: new AbortController(), consumed: false,
      expires: Math.min(this.now() + this.limits.preparationMs, visitor.expiresAt * 1000), timer: setTimeout(() => {}, 0) };
    this.entries.set(e.id, e); this.owners.set(visitor.owner, e); this.deadline(e, e.expires);
    const cancel = () => this.close(e); signal.addEventListener("abort", cancel, { once: true });
    try {
      if (signal.aborted) throw new VoiceError();
      await this.authorize(e, freshVisitor);
      const prepare = createProviderVoicePreparation({ repository: this.deps.repository, now: this.now });
      const result = await guardedAwait(() => prepare({ visitor: e.visitor, sourceId, signal: e.abort.signal, model: policy.model,
        mode: "voice", policyVersion: policy.policyVersion, runId: e.runId, variant: "B" }), e.abort.signal, () => this.guard(e, freshVisitor));
      if (result.status !== "prepared") throw new VoiceError();
      e.input = result.input; await this.authorize(e, freshVisitor); this.guard(e, freshVisitor);
      this.deadline(e, Math.min(this.now() + this.limits.ticketMs, visitor.expiresAt * 1000, Date.parse(e.input.variant.source.expiresAt)));
      this.guard(e, freshVisitor);
      return { preparationId: e.id, requestId, expiresAt: e.expires, conversationReady: false, providerConfirmed: false, input: e.input };
    } catch { this.close(e); throw new VoiceError(); }
    finally { signal.removeEventListener("abort", cancel); release(); }
  }
  async credential(visitor: Visitor, sourceId: string, requestId: string, preparationId: string, signal: AbortSignal,
    freshVisitor: () => void, apiKey: string) {
    const e = this.entries.get(preparationId);
    if (!e || e.visitor.owner !== visitor.owner || e.sourceId !== sourceId || e.requestId !== requestId || e.consumed || !e.input) throw new VoiceError();
    e.consumed = true; // Claim before any await. Every failed acquisition consumes the ticket.
    const cancel = () => this.close(e); signal.addEventListener("abort", cancel, { once: true });
    let release: (() => void) | undefined;
    try {
      if (signal.aborted) throw new VoiceError();
      this.guard(e, freshVisitor); this.deadline(e, Math.min(e.expires, this.now() + this.limits.acquisitionMs));
      release = this.issuance.acquire(visitor.owner, "unverified-network", this.now()) ?? undefined;
      if (!release) throw new VoiceError(429);
      await this.authorize(e, freshVisitor); this.guard(e, freshVisitor);
      const safetyIdentifier = createHash("sha256").update(`owned-voice-safety-v1:${visitor.owner}`).digest("hex");
      this.pendingMints++;
      const free = release; release = undefined;
      // Keep acquisition admission until even a noncooperating injected mint settles.
      const mint = Promise.resolve().then(() => { this.guard(e, freshVisitor); return this.deps.mint({ apiKey, safetyIdentifier, signal: e.abort.signal }); })
        .finally(() => { this.pendingMints--; free(); });
      const result = await guardedAwait(() => mint, e.abort.signal, () => this.guard(e, freshVisitor));
      await this.authorize(e, freshVisitor); this.guard(e, freshVisitor);
      if (signal.aborted || !validVoiceCredential(result, this.now())) throw new VoiceError();
      // Explicit projection: a provider injection cannot append raw session fields to the response.
      return { preparationId, clientSecret: result.clientSecret, expiresAt: result.expiresAt };
    } catch (error) { throw error instanceof VoiceError ? error : new VoiceError(); }
    finally { signal.removeEventListener("abort", cancel); release?.(); this.close(e); }
  }
  dispose() { for (const e of this.entries.values()) this.close(e); this.unsubscribe(); }
}
