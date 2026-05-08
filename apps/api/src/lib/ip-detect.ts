import { isIP } from 'node:net';

const RFC1918 = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

export function isPublicIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  if (ip.startsWith('127.') || ip.startsWith('169.254.')) return false;
  if (RFC1918.some((re) => re.test(ip))) return false;
  return true;
}

export function isValidIPForType(ip: string, type: 'A' | 'AAAA'): boolean {
  const v = isIP(ip);
  if (type === 'A') return v === 4;
  if (type === 'AAAA') return v === 6;
  return false;
}

export interface ResolveIpInput {
  myipParam: string | undefined;
  socketIp: string | undefined;
  hostType: 'A' | 'AAAA';
}

export function resolveClientIp(input: ResolveIpInput): string | null {
  const { myipParam, socketIp, hostType } = input;
  if (myipParam && isValidIPForType(myipParam, hostType)) return myipParam;
  if (socketIp && isValidIPForType(socketIp, hostType)) return socketIp;
  return null;
}
