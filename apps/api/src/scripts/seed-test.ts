import bcrypt from 'bcryptjs';
import { createDb, schema } from '@yesip/db';

const db = createDb({ url: process.env['DATABASE_URL']!, ssl: false });
const password = 'test_password_123';
const hash = await bcrypt.hash(password, 10);

const [user] = await db
  .insert(schema.users)
  .values({ email: 'alice@test.local', name: 'alice', emailVerified: true })
  .returning();
if (!user) throw new Error('user insert failed');

await db.insert(schema.accounts).values({
  userId: user.id,
  accountId: 'alice@test.local',
  providerId: 'credential',
  password: hash,
});

await db.insert(schema.hosts).values({
  userId: user.id,
  hostname: 'home.test.local',
  type: 'A',
});

console.log('seeded user', user.id, 'host home.test.local password', password);
process.exit(0);
