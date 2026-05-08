import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from './db';

const TOKEN_PREFIX = 'yip_';
const TOKEN_BODY_BYTES = 24;
const DISPLAY_PREFIX_LEN = TOKEN_PREFIX.length + 6;

export interface GeneratedToken {
  plain: string;
  hash: string;
  prefix: string;
}

export function generateToken(): GeneratedToken {
  const body = randomBytes(TOKEN_BODY_BYTES).toString('base64url');
  const plain = `${TOKEN_PREFIX}${body}`;
  return {
    plain,
    hash: hashToken(plain),
    prefix: plain.slice(0, DISPLAY_PREFIX_LEN),
  };
}

export function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export function isApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}

export async function getUserTokens(userId: string) {
  return db
    .select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, userId))
    .orderBy(desc(schema.apiTokens.createdAt));
}

export async function revokeUserToken(tokenId: string, userId: string) {
  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiTokens.id, tokenId), eq(schema.apiTokens.userId, userId)));
}
