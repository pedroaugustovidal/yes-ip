import fp from 'fastify-plugin';
import { createDb, type Database } from '@yesip/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export interface DbPluginOptions {
  url: string;
  ssl: boolean | 'require' | 'prefer';
  max?: number;
}

export default fp<DbPluginOptions>(
  async (app, opts) => {
    const db = createDb({ url: opts.url, ssl: opts.ssl, max: opts.max });
    app.decorate('db', db);
  },
  { name: 'db' },
);
