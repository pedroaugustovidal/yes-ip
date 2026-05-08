import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from './db';
import type { ResultCode } from './result-codes';

export type { ResultCode } from './result-codes';
export { RESULT_CODES, isResultCode } from './result-codes';

export interface ListLogsParams {
  hostId: string;
  result?: ResultCode | null;
  page?: number;
  pageSize?: number;
}

export interface LogPage {
  rows: Array<typeof schema.updateLogs.$inferSelect>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listHostLogs(params: ListLogsParams): Promise<LogPage> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const where = params.result
    ? and(eq(schema.updateLogs.hostId, params.hostId), eq(schema.updateLogs.result, params.result))
    : eq(schema.updateLogs.hostId, params.hostId);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.updateLogs)
    .where(where);
  const count = countRows[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(schema.updateLogs)
    .where(where)
    .orderBy(desc(schema.updateLogs.ts))
    .limit(pageSize)
    .offset(offset);

  return {
    rows,
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}
