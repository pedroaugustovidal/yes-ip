import bcrypt from 'bcryptjs';
import { createDb, schema } from '@yesip/db';

const db = createDb({ url: process.env['DATABASE_URL']!, ssl: false });
const hash = await bcrypt.hash('test_password_123', 10);
const [user] = await db
  .insert(schema.users)
  .values({ email: 'alice@test.local', passwordHash: hash })
  .returning();
if (!user) throw new Error('user insert failed');

await db.insert(schema.hosts).values({
  userId: user.id,
  hostname: 'home.test.local',
  type: 'A',
});

console.log('seeded user', user.id, 'host home.test.local');
process.exit(0);
