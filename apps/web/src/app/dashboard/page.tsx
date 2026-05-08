import { requireSession } from '@/lib/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name || session.user.email}</h1>
        <p className="text-muted-foreground">Manage your dynamic DNS hostnames.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Hosts</CardTitle>
          <CardDescription>You have no hostnames yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Hostname management is coming in the next phase.
        </CardContent>
      </Card>
    </div>
  );
}
