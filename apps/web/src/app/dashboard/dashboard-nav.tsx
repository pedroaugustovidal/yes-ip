'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

interface Props {
  userEmail: string;
  userName: string;
}

export function DashboardNav({ userEmail, userName }: Props) {
  const router = useRouter();

  async function onSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            yes-ip
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Hosts
            </Link>
            <Link href="/dashboard/tokens" className="hover:text-foreground">
              Tokens
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{userName || userEmail}</span>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
