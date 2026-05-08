'use client';

import { useActionState, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createApiToken, type CreateTokenState } from '@/actions/api-tokens';

const initial: CreateTokenState = {};

export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(createApiToken, initial);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [state.newToken?.plain]);

  if (state.newToken) {
    return (
      <div className="space-y-4 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-4">
        <div>
          <p className="text-sm font-medium">Token created</p>
          <p className="text-xs text-muted-foreground">
            Copy this token now. It won&apos;t be shown again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded border bg-background px-3 py-2 font-mono text-sm">
            {state.newToken.plain}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(state.newToken!.plain);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          placeholder="e.g. home-router"
          required
          maxLength={64}
          autoComplete="off"
        />
        {state.fieldErrors?.label?.[0] ? (
          <p className="text-sm text-destructive">{state.fieldErrors.label[0]}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Generating…' : 'Generate token'}
      </Button>
    </form>
  );
}
