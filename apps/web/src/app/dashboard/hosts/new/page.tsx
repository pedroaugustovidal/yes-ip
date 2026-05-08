import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateHostForm } from '@/components/hosts/create-host-form';
import { config } from '@/lib/web-config';

export default async function NewHostPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to hosts
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New host</CardTitle>
          <CardDescription>
            Add a hostname your routers and clients can update via the No-IP DDNS protocol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateHostForm baseDomain={config.baseDomain} />
        </CardContent>
      </Card>
    </div>
  );
}
