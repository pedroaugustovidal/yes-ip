import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { DeleteHostButton } from './delete-host-button';

interface Host {
  id: string;
  hostname: string;
  type: 'A' | 'AAAA';
  currentIp: string | null;
  lastUpdate: Date | null;
  ttl: number;
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function HostRow({ host }: { host: Host }) {
  return (
    <div className="flex items-center justify-between border-t px-6 py-4 first:border-t-0">
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/hosts/${host.id}`}
          className="font-medium hover:underline"
        >
          {host.hostname}
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{host.type}</Badge>
          <span>TTL {host.ttl}s</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-sm">
            {host.currentIp ?? <span className="text-muted-foreground">never updated</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {host.lastUpdate ? formatRelative(host.lastUpdate) : '—'}
          </div>
        </div>
        <DeleteHostButton hostId={host.id} hostname={host.hostname} />
      </div>
    </div>
  );
}
