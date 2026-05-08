import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

export async function getSession() {
  const reqHeaders = await nextHeaders();
  return auth.api.getSession({ headers: reqHeaders });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
