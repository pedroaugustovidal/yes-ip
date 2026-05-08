import { requireSession } from '@/lib/session';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen">
      <DashboardNav userEmail={session.user.email} userName={session.user.name} />
      <main className="container py-8">{children}</main>
    </div>
  );
}
