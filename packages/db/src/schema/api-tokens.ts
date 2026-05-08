import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 64 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    tokenPrefix: varchar('token_prefix', { length: 12 }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('api_tokens_hash_idx').on(t.tokenHash),
    index('api_tokens_user_idx').on(t.userId),
  ],
);

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
