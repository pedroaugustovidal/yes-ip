import bcrypt from 'bcryptjs';

export interface BasicCredentials {
  username: string;
  password: string;
}

export function parseBasicAuth(headerValue: string | undefined): BasicCredentials | null {
  if (!headerValue) return null;
  const [scheme, encoded] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const sep = decoded.indexOf(':');
  if (sep < 0) return null;

  const username = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  if (!username || !password) return null;

  return { username, password };
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
