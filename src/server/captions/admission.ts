import "server-only";
import { Admission } from "../proof/admission.ts";

export const captionLimits = { visitor: 4, ip: 8, global: 8, lifetime: 16, windowMs: 3600000, concurrent: 1 };
export type CaptionLease = { bind(key: string | symbol): boolean; release(): void };

// Caption-only distinction: eight admitted requests, but one compatible extraction slot.
// Reserve before reading bodies so slow/invalid requests still consume the existing quotas.
export class CaptionAdmission extends Admission {
  private requests = new Admission({ ...captionLimits, concurrent: 8 });
  private participants = new Set<symbol>();
  private slot?: string | symbol;
  private exclusive = false;

  override acquire(visitor: string, ip: string, now: number): (() => void) | null {
    if (this.participants.size) return null;
    const lease = this.acquireImport(visitor, ip, now);
    if (!lease) return null;
    this.exclusive = true;
    return lease.release;
  }

  acquireImport(visitor: string, ip: string, now: number): CaptionLease | null {
    if (this.exclusive) return null;
    const release = this.requests.acquire(visitor, ip, now);
    if (!release) return null;
    const token = Symbol();
    this.participants.add(token);
    return {
      bind: key => {
        if (!this.participants.has(token) || (this.slot !== undefined && this.slot !== key)) return false;
        this.slot = key;
        return true;
      },
      release: () => {
        if (!this.participants.delete(token)) return;
        release();
        if (!this.participants.size) { this.slot = undefined; this.exclusive = false; }
      },
    };
  }
}
// Shared across separately bundled Next routes in this process. Not a distributed quota.
const state = globalThis as unknown as { captionAdmission06b?: CaptionAdmission };
export const captionAdmission = state.captionAdmission06b ??= new CaptionAdmission(captionLimits);
