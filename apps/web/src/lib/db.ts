import { createDb } from '@yesip/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const db = createDb({ url: databaseUrl, ssl: false });
export { schema } from '@yesip/db';
