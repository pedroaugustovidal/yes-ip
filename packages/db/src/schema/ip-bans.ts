import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { inet } from '../columns/inet.js';

export const ipBans = pgTable(
  'ip_bans',
  {
    ip: inet('ip').primaryKey(),
    reason: varchar('reason', { length: 128 }).notNull(),
    hits: integer('hits').notNull().default(1),
    bannedUntil: timestamp('banned_until', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ip_bans_banned_until_idx').on(t.bannedUntil)],
);

export type IpBan = typeof ipBans.$inferSelect;
export type NewIpBan = typeof ipBans.$inferInsert;
