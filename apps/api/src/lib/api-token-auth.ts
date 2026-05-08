import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@yesip/db';
import type { Database } from '@yesip/db';

const TOKEN_PREFIX = 'yip_';

export function isApiTokenValue(password: string): boolean {
  return password.startsWith(TOKEN_PREFIX);
}

function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export interface TokenAuthResult {
  userId: string;
  tokenId: string;
}

export async function verifyApiToken(
  db: Database,
  email: string,
  token: string,
): Promise<TokenAuthResult | null> {
  const hash = hashToken(token);
  const rows = await db
    .select({
      tokenId: schema.apiTokens.id,
      userId: schema.users.id,
      userStatus: schema.users.status,
    })
    .from(schema.apiTokens)
    .innerJoin(schema.users, eq(schema.users.id, schema.apiTokens.userId))
    .where(
      and(
        eq(schema.apiTokens.tokenHash, hash),
        isNull(schema.apiTokens.revokedAt),
        sql`lower(${schema.users.email}) = ${email.toLowerCase()}`,
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.userStatus !== 'active') return null;

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, row.tokenId));

  return { userId: row.userId, tokenId: row.tokenId };
}
