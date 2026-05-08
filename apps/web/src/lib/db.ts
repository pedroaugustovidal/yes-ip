import { createDb } from '@yesip/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sslEnv = process.env.DATABASE_SSL ?? (process.env.NODE_ENV === 'production' ? 'require' : 'false');
const ssl: boolean | 'require' | 'prefer' =
  sslEnv === 'true' ? true : sslEnv === 'false' ? false : (sslEnv as 'require' | 'prefer');

export const db = createDb({ url: databaseUrl, ssl });
export { schema } from '@yesip/db';
