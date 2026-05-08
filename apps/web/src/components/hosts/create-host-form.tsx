'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createHost, type CreateHostState } from '@/actions/hosts';

interface Props {
  baseDomain: string | null;
}

const initialState: CreateHostState = {};

export function CreateHostForm({ baseDomain }: Props) {
  const [state, formAction, pending] = useActionState(createHost, initialState);

  const hostnameSuffix = baseDomain ? `.${baseDomain}` : '';

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hostname">Hostname</Label>
        <div className="flex items-center gap-2">
          <Input
            id="hostname"
            name="hostname"
            placeholder={baseDomain ? `home${hostnameSuffix}` : 'home.example.com'}
            required
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {baseDomain ? (
          <p className="text-xs text-muted-foreground">
            Must be under <span className="font-mono">{baseDomain}</span>.
          </p>
        ) : null}
        {state.fieldErrors?.hostname?.[0] ? (
          <p className="text-sm text-destructive">{state.fieldErrors.hostname[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Record type</Label>
          <Select id="type" name="type" defaultValue="A">
            <option value="A">A (IPv4)</option>
            <option value="AAAA">AAAA (IPv6)</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ttl">TTL (seconds)</Label>
          <Input id="ttl" name="ttl" type="number" defaultValue={60} min={30} max={86400} />
          {state.fieldErrors?.ttl?.[0] ? (
            <p className="text-sm text-destructive">{state.fieldErrors.ttl[0]}</p>
          ) : null}
        </div>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create host'}
        </Button>
      </div>
    </form>
  );
}
