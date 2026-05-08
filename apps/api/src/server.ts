import Fastify from 'fastify';
import dbPlugin from './plugins/db.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { healthRoutes } from './routes/health.js';
import { nicRoutes } from './routes/nic.js';
import type { Env } from './env.js';

export async function buildServer(env: Env) {
  const loggerOptions: Record<string, unknown> = { level: env.LOG_LEVEL };
  if (env.NODE_ENV === 'development') {
    loggerOptions['transport'] = {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  }

  const app = Fastify({
    logger: loggerOptions,
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(dbPlugin, { url: env.DATABASE_URL, ssl: env.DATABASE_SSL });
  await app.register(rateLimitPlugin, {});
  await app.register(healthRoutes);
  await app.register(nicRoutes);

  return app;
}
