'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { revokeApiToken } from '@/actions/api-tokens';

export function RevokeTokenButton({ tokenId, label }: { tokenId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await revokeApiToken(tokenId);
      setConfirming(false);
    });
  }

  return (
    <Button
      variant={confirming ? 'destructive' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Revoke token ${label}`}
    >
      <Trash2 className="h-4 w-4" />
      {confirming ? 'Confirm?' : null}
    </Button>
  );
}
