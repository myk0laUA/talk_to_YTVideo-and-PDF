// Process-local fixed-window admission. No secrets or raw IPs are stored here.
import type { AdmissionRejection } from "../../shared/session-admission.ts";
export type Limits = { visitor: number; ip: number; global: number; lifetime?: number; windowMs: number; concurrent: number };
export const proofLimits: Limits = { visitor: 6, ip: 20, global: 20, lifetime: 100, windowMs: 3600000, concurrent: 2 };
export const issuanceLimits: Limits = { visitor: 3, ip: 10, global: 20, lifetime: 50, windowMs: 3600000, concurrent: 2 };

export class Admission {
  private windowStart = 0;
  private total = 0;
  private lifetime = 0;
  private visitors = new Map<string, number>();
  private ips = new Map<string, number>();
  private active = new Set<string>();
  private limits: Limits;
  constructor(limits: Limits) { this.limits = limits; }

  acquire(visitor: string, ip: string, now: number): (() => void) | null {
    const result = this.attempt(visitor, ip, now);
    return "release" in result ? result.release : null;
  }
  attempt(visitor: string, ip: string, now: number): { release: () => void } | { rejection: AdmissionRejection } {
    if (now >= this.windowStart + this.limits.windowMs) {
      this.windowStart = now; this.total = 0; this.visitors.clear(); this.ips.clear();
    }
    const v = this.visitors.get(visitor) ?? 0;
    const i = this.ips.get(ip) ?? 0;
    // A lifetime ceiling never promises recovery through a window reset.
    if (this.limits.lifetime !== undefined && this.lifetime >= this.limits.lifetime) return { rejection: { reason: "capacity" } };
    if (this.active.has(visitor) || this.active.size >= this.limits.concurrent) return { rejection: { reason: "busy" } };
    if (v >= this.limits.visitor || i >= this.limits.ip || this.total >= this.limits.global)
      return { rejection: { reason: "window", retryAfterSeconds: Math.max(1, Math.min(3600, Math.ceil((this.windowStart + this.limits.windowMs - now) / 1000))) } };
    this.visitors.set(visitor, v + 1); this.ips.set(ip, i + 1);
    this.total++; this.lifetime++; this.active.add(visitor);
    return { release: () => { this.active.delete(visitor); } };
  }
}
