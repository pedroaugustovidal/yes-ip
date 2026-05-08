import { sql } from 'drizzle-orm';
import type { Database } from '@yesip/db';

export interface HostRateLimitConfig {
  windowSeconds: number;
  maxPerWindow: number;
}

export const DEFAULT_HOST_LIMIT: HostRateLimitConfig = {
  windowSeconds: 60,
  maxPerWindow: 6,
};

export interface HostLimitResult {
  allowed: boolean;
  count: number;
}

export async function checkHostLimit(
  db: Database,
  hostId: string,
  cfg: HostRateLimitConfig = DEFAULT_HOST_LIMIT,
): Promise<HostLimitResult> {
  const interval = sql.raw(`'${cfg.windowSeconds} seconds'::interval`);
  const rows = await db.execute<{ update_count: number }>(sql`
    UPDATE hosts
    SET update_count = CASE
          WHEN window_start IS NULL OR window_start < NOW() - ${interval} THEN 1
          ELSE update_count + 1
        END,
        window_start = CASE
          WHEN window_start IS NULL OR window_start < NOW() - ${interval} THEN NOW()
          ELSE window_start
        END
    WHERE id = ${hostId}::uuid
    RETURNING update_count
  `);

  const count = Number(rows[0]?.update_count ?? 0);
  return { allowed: count <= cfg.maxPerWindow, count };
}
