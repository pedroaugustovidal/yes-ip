export const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isValidHostname(value: string): boolean {
  return HOSTNAME_RE.test(value);
}

export function isHostUnderBase(hostname: string, baseDomain: string | null): boolean {
  if (!baseDomain) return true;
  const base = baseDomain.toLowerCase().replace(/^\.+/, '');
  const host = hostname.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}
