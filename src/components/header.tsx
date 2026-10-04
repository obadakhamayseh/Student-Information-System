'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  studentId?: string;
  studentName?: string;
  onOpenMobileSidebar?: () => void;
}

export default function Header({
  studentId: initialStudentId,
  studentName: initialStudentName,
  onOpenMobileSidebar,
}: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [studentInfo, setStudentInfo] = useState<{
    id?: string;
    name?: string;
    academicStatus?: string;
    currentSemester?: string;
  }>({
    id: initialStudentId,
    name: initialStudentName,
  });

  useEffect(() => {
    async function fetchHeaderMeta() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setStudentInfo((prev) => ({
            ...prev,
            id: json.studentId || initialStudentId,
            name: json.studentName || initialStudentName,
          }));
        }
      } catch {
        // fallback to initial
      }
    }
    fetchHeaderMeta();
  }, [initialStudentId, initialStudentName]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const handleSync = () => {
    setSyncing(true);
    router.refresh();
    setTimeout(() => setSyncing(false), 800);
  };

  const displayName = studentInfo.name || initialStudentName || 'طالب';
  const displayId = studentInfo.id || initialStudentId || '—';
  const displaySemester = studentInfo.currentSemester || 'الفصل الأول 2026/2027';

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-container-high/40 shadow-sm">
      <div className="h-16 px-3 sm:px-4 lg:px-space-lg flex items-center justify-between">

        {/* Left: Mobile Menu + Semester Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="القائمة"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
            {displaySemester}
          </span>
        </div>

        {/* Right: Profile + Actions */}
        <div className="flex items-center gap-2">
          {/* Student Info */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right">
              <span className="font-bold text-sm text-on-surface leading-tight max-w-[130px] sm:max-w-none truncate">
                {displayName}
              </span>
              <span className="text-xs text-on-surface-variant" dir="ltr">
                {displayId}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-lg">person</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-surface-container-high mx-1 hidden sm:block" />

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
            title="تحديث البيانات"
          >
            <span className={`material-symbols-outlined text-xl ${syncing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
            title="تسجيل الخروج"
          >
            <span className="material-symbols-outlined text-xl text-error">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
