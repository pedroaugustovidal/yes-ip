import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    status: userStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
