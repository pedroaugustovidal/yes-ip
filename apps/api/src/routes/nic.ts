import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@yesip/db';
import { parseBasicAuth, verifyPassword } from '../lib/auth.js';
import { resolveClientIp } from '../lib/ip-detect.js';
import { formatNicResponse, type NicResponse } from '../lib/responses.js';

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

    const creds = parseBasicAuth(req.headers.authorization);
    if (!creds) {
      reply.header('WWW-Authenticate', 'Basic realm="ddns"');
      return send(reply, { code: 'badauth' }, req, null, null);
    }

    const hostnameRaw = req.query.hostname?.trim().toLowerCase();
    if (!hostnameRaw || !HOSTNAME_RE.test(hostnameRaw)) {
      return send(reply, { code: 'nohost' }, req, null, hostnameRaw ?? '');
    }

    const userRows = await app.db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${creds.username.toLowerCase()}`)
      .limit(1);
    const user = userRows[0];

    if (!user || user.status !== 'active') {
      return send(reply, { code: 'badauth' }, req, null, hostnameRaw);
    }

    const passwordOk = await verifyPassword(creds.password, user.passwordHash);
    if (!passwordOk) {
      return send(reply, { code: 'badauth' }, req, null, hostnameRaw);
    }

    const hostRows = await app.db
      .select()
      .from(schema.hosts)
      .where(and(eq(schema.hosts.hostname, hostnameRaw), eq(schema.hosts.userId, user.id)))
      .limit(1);
    const host = hostRows[0];

    if (!host) {
      return send(reply, { code: 'nohost' }, req, null, hostnameRaw);
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

    await app.db
      .update(schema.hosts)
      .set({ currentIp: newIp, lastUpdate: new Date(), updatedAt: new Date() })
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
