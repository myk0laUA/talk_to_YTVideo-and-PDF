// Process-local fixed-window admission. No secrets or raw IPs are stored here.
export type Limits = { visitor: number; ip: number; global: number; lifetime: number; windowMs: number; concurrent: number };
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
    if (now >= this.windowStart + this.limits.windowMs) {
      this.windowStart = now; this.total = 0; this.visitors.clear(); this.ips.clear();
    }
    const v = this.visitors.get(visitor) ?? 0;
    const i = this.ips.get(ip) ?? 0;
    if (this.active.has(visitor) || this.active.size >= this.limits.concurrent
      || v >= this.limits.visitor || i >= this.limits.ip || this.total >= this.limits.global
      || this.lifetime >= this.limits.lifetime) return null;
    this.visitors.set(visitor, v + 1); this.ips.set(ip, i + 1);
    this.total++; this.lifetime++; this.active.add(visitor);
    return () => { this.active.delete(visitor); };
  }
}
