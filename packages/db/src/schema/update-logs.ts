import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { inet } from '../columns/inet.js';
import { hosts } from './hosts.js';

export const updateResult = pgEnum('update_result', [
  'good',
  'nochg',
  'nohost',
  'badauth',
  'badagent',
  'abuse',
  '!donator',
  '911',
]);

export const updateLogs = pgTable(
  'update_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }),
    requestedHostname: varchar('requested_hostname', { length: 253 }).notNull(),
    ip: inet('ip'),
    sourceIp: inet('source_ip'),
    userAgent: varchar('user_agent', { length: 255 }),
    result: updateResult('result').notNull(),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('update_logs_host_ts_idx').on(t.hostId, t.ts),
    index('update_logs_ts_idx').on(t.ts),
  ],
);

export type UpdateLog = typeof updateLogs.$inferSelect;
export type NewUpdateLog = typeof updateLogs.$inferInsert;
