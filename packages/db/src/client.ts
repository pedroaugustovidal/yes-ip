import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDb>;

export interface CreateDbOptions {
  url: string;
  max?: number;
  ssl?: 'require' | 'prefer' | boolean;
}

export function createDb(opts: CreateDbOptions) {
  const sql = postgres(opts.url, {
    max: opts.max ?? 10,
    ssl: opts.ssl ?? false,
    prepare: false,
  });
  return drizzle(sql, { schema, casing: 'snake_case' });
}
