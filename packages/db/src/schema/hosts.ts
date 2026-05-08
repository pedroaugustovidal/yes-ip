import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { inet } from '../columns/inet.js';
import { users } from './users.js';

export const hostType = pgEnum('host_type', ['A', 'AAAA']);

export const hosts = pgTable(
  'hosts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hostname: varchar('hostname', { length: 253 }).notNull(),
    type: hostType('type').notNull().default('A'),
    currentIp: inet('current_ip'),
    ttl: integer('ttl').notNull().default(60),
    cloudflareRecordId: varchar('cloudflare_record_id', { length: 64 }),
    lastUpdate: timestamp('last_update', { withTimezone: true }),
    updateCount: integer('update_count').notNull().default(0),
    windowStart: timestamp('window_start', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('hosts_hostname_idx').on(t.hostname),
    index('hosts_user_idx').on(t.userId),
  ],
);

export type Host = typeof hosts.$inferSelect;
export type NewHost = typeof hosts.$inferInsert;
