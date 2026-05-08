import { CloudflareClient, CloudflareError } from './cloudflare.js';

export interface DnsSyncInput {
  hostname: string;
  type: 'A' | 'AAAA';
  ip: string;
  ttl: number;
  proxied: boolean;
  existingRecordId: string | null;
}

export interface DnsSyncResult {
  recordId: string;
  created: boolean;
}

export async function pushDnsRecord(
  cf: CloudflareClient,
  input: DnsSyncInput,
): Promise<DnsSyncResult> {
  if (input.existingRecordId) {
    try {
      const updated = await cf.updateRecord(input.existingRecordId, {
        content: input.ip,
        ttl: input.ttl,
      });
      return { recordId: updated.id, created: false };
    } catch (err) {
      if (err instanceof CloudflareError && err.status === 404) {
        return reconcileByName(cf, input);
      }
      throw err;
    }
  }
  return reconcileByName(cf, input);
}

async function reconcileByName(
  cf: CloudflareClient,
  input: DnsSyncInput,
): Promise<DnsSyncResult> {
  const existing = await cf.listRecords(input.hostname, input.type);
  const match = existing[0];
  if (match) {
    const updated = await cf.updateRecord(match.id, {
      content: input.ip,
      ttl: input.ttl,
    });
    return { recordId: updated.id, created: false };
  }
  const created = await cf.createRecord({
    name: input.hostname,
    type: input.type,
    content: input.ip,
    ttl: input.ttl,
    proxied: input.proxied,
  });
  return { recordId: created.id, created: true };
}

export function isHostUnderBase(hostname: string, baseDomain: string | null): boolean {
  if (!baseDomain) return true;
  const base = baseDomain.toLowerCase().replace(/^\.+/, '');
  const host = hostname.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}
