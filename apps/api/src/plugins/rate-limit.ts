import fp from 'fastify-plugin';
import { gt, sql } from 'drizzle-orm';
import { schema } from '@yesip/db';
import { IpRateLimiter, DEFAULT_RATE_LIMIT, type RateLimitConfig } from '../lib/rate-limit.js';

declare module 'fastify' {
  interface FastifyInstance {
    rateLimiter: IpRateLimiter;
    persistBan(ip: string, reason: string, untilMs: number): Promise<void>;
  }
}

export interface RateLimitPluginOptions {
  config?: Partial<RateLimitConfig>;
  gcIntervalMs?: number;
  banRefreshMs?: number;
}

export default fp<RateLimitPluginOptions>(
  async (app, opts) => {
    const cfg: RateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...opts.config };
    const limiter = new IpRateLimiter(cfg);
    app.decorate('rateLimiter', limiter);

    app.decorate('persistBan', async (ip: string, reason: string, untilMs: number) => {
      try {
        const bannedUntil = new Date(untilMs);
        await app.db
          .insert(schema.ipBans)
          .values({ ip, reason, bannedUntil, hits: 1 })
          .onConflictDoUpdate({
            target: schema.ipBans.ip,
            set: {
              reason,
              bannedUntil,
              hits: sql`${schema.ipBans.hits} + 1`,
              updatedAt: new Date(),
            },
          });
      } catch (err) {
        app.log.error({ err, ip }, 'failed to persist ip ban');
      }
    });

    const refreshBans = async () => {
      try {
        const rows = await app.db
          .select({ ip: schema.ipBans.ip, bannedUntil: schema.ipBans.bannedUntil })
          .from(schema.ipBans)
          .where(gt(schema.ipBans.bannedUntil, new Date()));
        limiter.loadBans(rows);
        app.log.debug({ count: rows.length }, 'ban cache refreshed');
      } catch (err) {
        app.log.error({ err }, 'failed to refresh ban cache');
      }
    };

    await refreshBans();

    const gcInterval = opts.gcIntervalMs ?? 60_000;
    const banInterval = opts.banRefreshMs ?? 30_000;
    const gcTimer = setInterval(() => limiter.gc(), gcInterval).unref();
    const banTimer = setInterval(() => void refreshBans(), banInterval).unref();

    app.addHook('onClose', async () => {
      clearInterval(gcTimer);
      clearInterval(banTimer);
    });
  },
  { name: 'rate-limit', dependencies: ['db'] },
);
