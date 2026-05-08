import fp from 'fastify-plugin';
import { CloudflareClient } from '../lib/cloudflare.js';

declare module 'fastify' {
  interface FastifyInstance {
    cf: CloudflareClient | null;
    cfBaseDomain: string | null;
    cfProxied: boolean;
  }
}

export interface CloudflarePluginOptions {
  token?: string;
  zoneId?: string;
  baseDomain?: string;
  proxied?: boolean;
}

export default fp<CloudflarePluginOptions>(
  async (app, opts) => {
    let client: CloudflareClient | null = null;
    if (opts.token && opts.zoneId) {
      client = new CloudflareClient({ token: opts.token, zoneId: opts.zoneId });
      app.log.info(
        { zoneId: opts.zoneId, baseDomain: opts.baseDomain ?? null },
        'cloudflare DNS push enabled',
      );
    } else {
      app.log.warn('cloudflare DNS push disabled (token or zone id missing)');
    }
    app.decorate('cf', client);
    app.decorate('cfBaseDomain', opts.baseDomain ?? null);
    app.decorate('cfProxied', opts.proxied ?? false);
  },
  { name: 'cloudflare' },
);
