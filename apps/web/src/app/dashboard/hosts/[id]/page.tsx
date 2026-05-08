import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { getHostByIdAndUser } from '@/lib/hosts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteHostButton } from '@/components/hosts/delete-host-button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HostDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  const host = await getHostByIdAndUser(id, session.user.id);
  if (!host) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to hosts
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{host.hostname}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{host.type}</Badge>
            <span className="text-sm text-muted-foreground">TTL {host.ttl}s</span>
          </div>
        </div>
        <DeleteHostButton hostId={host.id} hostname={host.hostname} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current state</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Current IP</dt>
              <dd className="font-mono">
                {host.currentIp ?? <span className="text-muted-foreground">never updated</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last update</dt>
              <dd>{host.lastUpdate ? host.lastUpdate.toISOString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cloudflare record</dt>
              <dd className="font-mono">
                {host.cloudflareRecordId ?? (
                  <span className="text-muted-foreground">not yet pushed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{host.createdAt.toISOString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
