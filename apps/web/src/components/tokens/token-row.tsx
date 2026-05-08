import { Badge } from '@/components/ui/badge';
import { RevokeTokenButton } from './revoke-token-button';

interface TokenRowProps {
  token: {
    id: string;
    label: string;
    tokenPrefix: string;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  };
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function TokenRow({ token }: TokenRowProps) {
  const revoked = token.revokedAt !== null;
  return (
    <div className="flex items-center justify-between border-t px-6 py-4 first:border-t-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{token.label}</span>
          {revoked ? <Badge variant="destructive">revoked</Badge> : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <code className="font-mono">{token.tokenPrefix}…</code>
          <span>created {formatRelative(token.createdAt)}</span>
          {token.lastUsedAt ? <span>last used {formatRelative(token.lastUsedAt)}</span> : null}
        </div>
      </div>
      {!revoked ? <RevokeTokenButton tokenId={token.id} label={token.label} /> : null}
    </div>
  );
}
