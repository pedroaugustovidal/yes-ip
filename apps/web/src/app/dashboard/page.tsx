import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { getUserHosts } from '@/lib/hosts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HostRow } from '@/components/hosts/host-row';

export default async function DashboardPage() {
  const session = await requireSession();
  const hosts = await getUserHosts(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hosts</h1>
          <p className="text-sm text-muted-foreground">
            Hostnames you manage. Updates pushed to Cloudflare on the first /nic/update call.
          </p>
        </div>
        <Link
          href="/dashboard/hosts/new"
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New host
        </Link>
      </div>

      {hosts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hosts yet</CardTitle>
            <CardDescription>
              Create your first hostname to start receiving DDNS updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/hosts/new"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              New host
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div>
            {hosts.map((h) => (
              <HostRow
                key={h.id}
                host={{
                  id: h.id,
                  hostname: h.hostname,
                  type: h.type,
                  currentIp: h.currentIp,
                  lastUpdate: h.lastUpdate,
                  ttl: h.ttl,
                }}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
