'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { isValidHostname, isHostUnderBase } from '@/lib/validation';
import { isHostnameTaken } from '@/lib/hosts';
import { config } from '@/lib/web-config';

const createSchema = z.object({
  hostname: z
    .string()
    .min(1, 'Hostname is required')
    .max(253, 'Hostname is too long')
    .transform((v) => v.trim().toLowerCase()),
  type: z.enum(['A', 'AAAA']).default('A'),
  ttl: z.coerce.number().int().min(30).max(86400).default(60),
});

export interface CreateHostState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createHost(
  _prev: CreateHostState,
  formData: FormData,
): Promise<CreateHostState> {
  const session = await requireSession();
  const parsed = createSchema.safeParse({
    hostname: formData.get('hostname'),
    type: formData.get('type'),
    ttl: formData.get('ttl'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { hostname, type, ttl } = parsed.data;

  if (!isValidHostname(hostname)) {
    return { fieldErrors: { hostname: ['Invalid hostname format'] } };
  }
  if (!isHostUnderBase(hostname, config.baseDomain)) {
    return {
      fieldErrors: {
        hostname: [
          config.baseDomain
            ? `Hostname must be under .${config.baseDomain}`
            : 'Hostname is outside the allowed zone',
        ],
      },
    };
  }
  if (await isHostnameTaken(hostname)) {
    return { fieldErrors: { hostname: ['Hostname already taken'] } };
  }

  await db.insert(schema.hosts).values({
    userId: session.user.id,
    hostname,
    type,
    ttl,
  });

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteHost(hostId: string): Promise<void> {
  const session = await requireSession();
  await db
    .delete(schema.hosts)
    .where(and(eq(schema.hosts.id, hostId), eq(schema.hosts.userId, session.user.id)));
  revalidatePath('/dashboard');
}
