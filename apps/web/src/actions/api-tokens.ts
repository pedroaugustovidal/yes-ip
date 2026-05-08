'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { generateToken, revokeUserToken } from '@/lib/api-tokens';

const createSchema = z.object({
  label: z
    .string()
    .min(1, 'Label is required')
    .max(64, 'Label is too long')
    .transform((v) => v.trim()),
});

export interface CreateTokenState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  newToken?: { plain: string; prefix: string; label: string };
}

export async function createApiToken(
  _prev: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  const session = await requireSession();
  const parsed = createSchema.safeParse({ label: formData.get('label') });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const token = generateToken();
  await db.insert(schema.apiTokens).values({
    userId: session.user.id,
    label: parsed.data.label,
    tokenHash: token.hash,
    tokenPrefix: token.prefix,
  });

  revalidatePath('/dashboard/tokens');
  return {
    newToken: { plain: token.plain, prefix: token.prefix, label: parsed.data.label },
  };
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  const session = await requireSession();
  await revokeUserToken(tokenId, session.user.id);
  revalidatePath('/dashboard/tokens');
}
