import bcrypt from 'bcryptjs';
import { createDb, schema } from '@yesip/db';

interface MockCall {
  method: string;
  url: string;
  body: unknown;
}
const calls: MockCall[] = [];
let mode: 'happy' | 'fail' = 'happy';
let createdRecordId = 'rec_abc123';

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!url.startsWith('https://api.cloudflare.com')) {
    return originalFetch(input, init);
  }
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  calls.push({ method, url, body });

  if (mode === 'fail') {
    return new Response(
      JSON.stringify({ success: false, errors: [{ code: 1003, message: 'mock failure' }], messages: [], result: null }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  if (method === 'POST') {
    const result = { id: createdRecordId, type: body.type, name: body.name, content: body.content, ttl: body.ttl, proxied: body.proxied };
    return new Response(JSON.stringify({ success: true, errors: [], messages: [], result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (method === 'PATCH') {
    const idMatch = /dns_records\/([^/?]+)/.exec(url);
    const id = idMatch?.[1] ?? 'unknown';
    const result = { id, type: 'A', name: 'home.test.local', content: body.content, ttl: body.ttl, proxied: false };
    return new Response(JSON.stringify({ success: true, errors: [], messages: [], result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (method === 'GET') {
    return new Response(JSON.stringify({ success: true, errors: [], messages: [], result: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response('{}', { status: 200 });
}) as typeof fetch;

process.env['CLOUDFLARE_API_TOKEN'] = 'mock_token';
process.env['CLOUDFLARE_ZONE_ID'] = 'mock_zone';
process.env['CLOUDFLARE_BASE_DOMAIN'] = 'test.local';

const { loadEnv } = await import('../env.js');
const { buildServer } = await import('../server.js');

const db = createDb({ url: process.env['DATABASE_URL']!, ssl: false });
await db.delete(schema.updateLogs);
await db.delete(schema.hosts);
await db.delete(schema.accounts);
await db.delete(schema.sessions);
await db.delete(schema.users);
const hash = await bcrypt.hash('test_password_123', 10);
const [user] = await db
  .insert(schema.users)
  .values({ email: 'alice@test.local', name: 'alice', emailVerified: true })
  .returning();
if (!user) throw new Error('seed failed');
await db.insert(schema.accounts).values({
  userId: user.id,
  accountId: 'alice@test.local',
  providerId: 'credential',
  password: hash,
});
await db.insert(schema.hosts).values({ userId: user.id, hostname: 'home.test.local', type: 'A' });

const env = loadEnv();
const app = await buildServer(env);
await app.ready();

async function hit(myip: string): Promise<string> {
  const auth = Buffer.from('alice@test.local:test_password_123').toString('base64');
  const res = await app.inject({
    method: 'GET',
    url: `/nic/update?hostname=home.test.local&myip=${myip}`,
    headers: { authorization: `Basic ${auth}`, 'user-agent': 'test/1.0' },
  });
  return res.body;
}

console.log('--- happy: first update (POST expected) ---');
console.log('response:', await hit('8.8.8.8'));
console.log('calls so far:', calls.map((c) => `${c.method} ${c.url.split('/').slice(-1)[0]}`));

console.log('--- happy: second update (PATCH expected) ---');
calls.length = 0;
console.log('response:', await hit('1.1.1.1'));
console.log('calls so far:', calls.map((c) => `${c.method} ${c.url.split('/').slice(-1)[0]}`));

console.log('--- nochg: same IP (no CF call) ---');
calls.length = 0;
console.log('response:', await hit('1.1.1.1'));
console.log('calls so far:', calls.length);

console.log('--- failure: CF returns error → 911 ---');
mode = 'fail';
calls.length = 0;
console.log('response:', await hit('2.2.2.2'));
console.log('cf calls:', calls.length, '(>0 means push attempted)');

console.log('--- DB host state ---');
const rows = await db.select().from(schema.hosts);
console.log(JSON.stringify(rows.map((r) => ({ hostname: r.hostname, currentIp: r.currentIp, cfId: r.cloudflareRecordId })), null, 2));

await app.close();
process.exit(0);
