'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteHost } from '@/actions/hosts';

interface Props {
  hostId: string;
  hostname: string;
}

export function DeleteHostButton({ hostId, hostname }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteHost(hostId);
      setConfirming(false);
    });
  }

  return (
    <Button
      variant={confirming ? 'destructive' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Delete ${hostname}`}
    >
      <Trash2 className="h-4 w-4" />
      {confirming ? 'Confirm?' : null}
    </Button>
  );
}
