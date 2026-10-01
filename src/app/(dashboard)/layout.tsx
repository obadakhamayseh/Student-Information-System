import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Navbar from '@/components/navbar';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar studentId={session.studentId} studentName={session.studentName} />
      <div className="flex-1 pb-16">{children}</div>
    </div>
  );
}
