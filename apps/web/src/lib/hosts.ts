import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from './db';

export async function getUserHosts(userId: string) {
  return db
    .select()
    .from(schema.hosts)
    .where(eq(schema.hosts.userId, userId))
    .orderBy(desc(schema.hosts.createdAt));
}

export async function getHostByIdAndUser(hostId: string, userId: string) {
  const rows = await db
    .select()
    .from(schema.hosts)
    .where(and(eq(schema.hosts.id, hostId), eq(schema.hosts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function isHostnameTaken(hostname: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.hosts.id })
    .from(schema.hosts)
    .where(eq(schema.hosts.hostname, hostname.toLowerCase()))
    .limit(1);
  return rows.length > 0;
}
