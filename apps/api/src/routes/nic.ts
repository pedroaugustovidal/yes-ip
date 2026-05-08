import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@yesip/db';
import { parseBasicAuth, verifyPassword } from '../lib/auth.js';
import { resolveClientIp } from '../lib/ip-detect.js';
import { formatNicResponse, type NicResponse } from '../lib/responses.js';
import { checkHostLimit } from '../lib/host-rate-limit.js';
import { pushDnsRecord, isHostUnderBase } from '../lib/dns-sync.js';
import { isApiTokenValue, verifyApiToken } from '../lib/api-token-auth.js';

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

interface NicQuery {
  hostname?: string;
  myip?: string;
}

export async function nicRoutes(app: FastifyInstance) {
  const handler = async (req: FastifyRequest<{ Querystring: NicQuery }>, reply: FastifyReply) => {
    reply.type('text/plain; charset=utf-8');

    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length < 3) {
      return send(reply, { code: 'badagent' }, req, null, null);
    }

    const ipCheck = app.rateLimiter.check(req.ip);
    if (ipCheck !== 'ok') {
      if (ipCheck === 'just_banned') {
        const until = Date.now() + 60 * 60_000;
        void app.persistBan(req.ip, 'ip rate limit exceeded', until);
      }
      return send(reply, { code: 'abuse' }, req, null, null);
    }

    const creds = parseBasicAuth(req.headers.authorization);
    if (!creds) {
      reply.header('WWW-Authenticate', 'Basic realm="ddns"');
      return send(reply, { code: 'badauth' }, req, null, null);
    }

    const hostnameRaw = req.query.hostname?.trim().toLowerCase();
    if (!hostnameRaw || !HOSTNAME_RE.test(hostnameRaw)) {
      return send(reply, { code: 'nohost' }, req, null, hostnameRaw ?? '');
    }

    let userId: string | null = null;

    if (isApiTokenValue(creds.password)) {
      const tokenResult = await verifyApiToken(app.db, creds.username, creds.password);
      if (!tokenResult) {
        return send(reply, { code: 'badauth' }, req, null, hostnameRaw);
      }
      userId = tokenResult.userId;
    } else {
      const userRows = await app.db
        .select({
          id: schema.users.id,
          status: schema.users.status,
          password: schema.accounts.password,
        })
        .from(schema.users)
        .leftJoin(
          schema.accounts,
          and(
            eq(schema.accounts.userId, schema.users.id),
            eq(schema.accounts.providerId, 'credential'),
          ),
        )
        .where(sql`lower(${schema.users.email}) = ${creds.username.toLowerCase()}`)
        .limit(1);
      const user = userRows[0];
      if (!user || user.status !== 'active' || !user.password) {
        return send(reply, { code: 'badauth' }, req, null, hostnameRaw);
      }
      const passwordOk = await verifyPassword(creds.password, user.password);
      if (!passwordOk) {
        return send(reply, { code: 'badauth' }, req, null, hostnameRaw);
      }
      userId = user.id;
    }

    const hostRows = await app.db
      .select()
      .from(schema.hosts)
      .where(and(eq(schema.hosts.hostname, hostnameRaw), eq(schema.hosts.userId, userId)))
      .limit(1);
    const host = hostRows[0];

    if (!host) {
      return send(reply, { code: 'nohost' }, req, null, hostnameRaw);
    }

    const hostLimit = await checkHostLimit(app.db, host.id);
    if (!hostLimit.allowed) {
      return send(reply, { code: 'abuse' }, req, host.id, hostnameRaw);
    }

    const newIp = resolveClientIp({
      myipParam: req.query.myip,
      socketIp: req.ip,
      hostType: host.type,
    });

    if (!newIp) {
      return send(reply, { code: 'nohost' }, req, host.id, hostnameRaw);
    }

    if (host.currentIp === newIp) {
      return send(reply, { code: 'nochg', ip: newIp }, req, host.id, hostnameRaw);
    }

    let cfRecordId: string | null = host.cloudflareRecordId;
    if (app.cf) {
      if (!isHostUnderBase(hostnameRaw, app.cfBaseDomain)) {
        app.log.warn(
          { hostname: hostnameRaw, base: app.cfBaseDomain },
          'host not under cloudflare base domain',
        );
        return send(reply, { code: 'nohost' }, req, host.id, hostnameRaw);
      }
      try {
        const result = await pushDnsRecord(app.cf, {
          hostname: hostnameRaw,
          type: host.type,
          ip: newIp,
          ttl: host.ttl,
          proxied: app.cfProxied,
          existingRecordId: host.cloudflareRecordId,
        });
        cfRecordId = result.recordId;
      } catch (err) {
        app.log.error({ err, hostname: hostnameRaw }, 'cloudflare DNS push failed');
        return send(reply, { code: '911' }, req, host.id, hostnameRaw);
      }
    }

    await app.db
      .update(schema.hosts)
      .set({
        currentIp: newIp,
        cloudflareRecordId: cfRecordId,
        lastUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.hosts.id, host.id));

    return send(reply, { code: 'good', ip: newIp }, req, host.id, hostnameRaw);
  };

  app.get('/nic/update', handler);
  app.get('/v3/update', handler);
}

async function send(
  reply: FastifyReply,
  res: NicResponse,
  req: FastifyRequest,
  hostId: string | null,
  requestedHostname: string | null,
) {
  const app = reply.server;
  const userAgent = req.headers['user-agent'] ?? null;
  const sourceIp = req.ip ?? null;

  app.db
    .insert(schema.updateLogs)
    .values({
      hostId: hostId,
      requestedHostname: requestedHostname ?? '',
      ip: res.ip ?? null,
      sourceIp: sourceIp,
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      result: res.code,
    })
    .catch((err) => app.log.error({ err }, 'failed to insert update_log'));

  return reply.send(formatNicResponse(res));
}
