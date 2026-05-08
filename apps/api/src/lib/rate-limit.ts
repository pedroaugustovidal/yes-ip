export interface IpHitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxPerWindow: number;
  banMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxPerWindow: 60,
  banMs: 60 * 60_000,
};

export type CheckResult = 'ok' | 'banned' | 'just_banned';

export class IpRateLimiter {
  private hits = new Map<string, IpHitEntry>();
  private banCache = new Map<string, number>();

  constructor(
    private cfg: RateLimitConfig,
    private now: () => number = Date.now,
  ) {}

  check(ip: string): CheckResult {
    const t = this.now();
    const banUntil = this.banCache.get(ip);
    if (banUntil && banUntil > t) return 'banned';
    if (banUntil && banUntil <= t) this.banCache.delete(ip);

    const entry = this.hits.get(ip);
    if (!entry || entry.resetAt <= t) {
      this.hits.set(ip, { count: 1, resetAt: t + this.cfg.windowMs });
      return 'ok';
    }

    entry.count++;
    if (entry.count > this.cfg.maxPerWindow) {
      const until = t + this.cfg.banMs;
      this.banCache.set(ip, until);
      this.hits.delete(ip);
      return 'just_banned';
    }
    return 'ok';
  }

  isBanned(ip: string): boolean {
    const t = this.now();
    const banUntil = this.banCache.get(ip);
    if (!banUntil) return false;
    if (banUntil <= t) {
      this.banCache.delete(ip);
      return false;
    }
    return true;
  }

  setBan(ip: string, untilMs: number): void {
    this.banCache.set(ip, untilMs);
  }

  loadBans(rows: Array<{ ip: string; bannedUntil: Date }>): void {
    this.banCache.clear();
    for (const r of rows) this.banCache.set(r.ip, r.bannedUntil.getTime());
  }

  gc(): void {
    const t = this.now();
    for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
    for (const [k, v] of this.banCache) if (v <= t) this.banCache.delete(k);
  }

  stats() {
    return { hits: this.hits.size, bans: this.banCache.size };
  }
}
