import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import DashboardShell from '@/components/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <DashboardShell
      studentId={session.studentId}
      studentName={session.studentName}
    >
      {children}
    </DashboardShell>
  );
}
