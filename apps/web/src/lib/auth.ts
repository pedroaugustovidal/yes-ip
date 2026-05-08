import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { schema } from '@yesip/db';

const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error('BETTER_AUTH_SECRET is required');
}

export const auth = betterAuth({
  baseURL: baseUrl,
  secret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type Auth = typeof auth;
