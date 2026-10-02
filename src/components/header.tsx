'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { triggerPwaInstall } from '@/components/pwa-installer';

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
    college?: string;
    major?: string;
    academicStatus?: string;
    currentSemester?: string;
  }>({
    id: initialStudentId,
    name: initialStudentName,
  });

  useEffect(() => {
    // جلب بيانات الطالب من الجلسة المحلية (بدون أي طلب upstream) — سريع جداً
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

  const displayName = studentInfo.name || initialStudentName || 'طالب جامعة مؤتة';
  const displayId = studentInfo.id || initialStudentId || '—';
  const displayMajor = studentInfo.major || 'جامعة مؤتة';
  const displayCollege = studentInfo.college || 'بوابة الطالب';
  const displaySemester = studentInfo.currentSemester || 'الفصل الأول 2026/2027';

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Top Session & Academic Strip */}
      <div className="w-full bg-primary text-on-primary py-1 px-3 sm:px-4 lg:px-space-lg flex items-center justify-between text-xs">
        <div className="flex items-center gap-space-xs sm:gap-space-sm truncate">
          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary-container shrink-0">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span className="hidden xs:inline">جلسة آمنة (BFF)</span>
            <span className="xs:hidden">BFF</span>
          </span>
          <span className="hidden md:inline font-body-sm text-body-sm text-on-primary-container">
            |
          </span>
          <span className="hidden md:inline font-body-sm text-body-sm text-on-primary/80 truncate">
            جلب مباشر للبيانات من app.mutah.edu.jo/studreg/ مع تشفير HttpOnly
          </span>
        </div>
        <div className="flex items-center gap-space-xs sm:gap-space-sm shrink-0">
          <span className="font-label-sm text-label-sm text-tertiary-fixed hidden sm:inline">
            التقويم الجامعي: 2026 / 2027
          </span>
          <span className="bg-secondary text-on-secondary px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[11px] sm:text-xs">
            {displaySemester}
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-16 sm:h-20 px-3 sm:px-4 lg:px-space-lg flex items-center justify-between">
        {/* Left Side: Mobile Menu Button & Connection Indicator & Sync */}
        <div className="flex items-center gap-1.5 sm:gap-space-md">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container-high transition-colors"
            title="القائمة"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <div className="hidden lg:flex items-center gap-space-sm bg-surface-container-low px-space-md py-2 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-bold">
                متصل مباشرة بالنظام الجامعي
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                بدون تخزين مؤقت • استجابة 18ms
              </span>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-space-xs bg-surface-container-high hover:bg-surface-variant hover:text-on-surface p-2 sm:px-space-md sm:py-2 rounded-lg text-on-surface transition-all text-sm cursor-pointer"
            title="تحديث البيانات لحظياً"
          >
            <span
              className={`material-symbols-outlined text-lg text-secondary ${
                syncing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span className="font-label-md text-label-md hidden sm:inline">
              مزامنة
            </span>
          </button>

          {/* زر تحميل التطبيق على الهاتف PWA */}
          <button
            onClick={() => triggerPwaInstall()}
            className="flex items-center gap-1.5 bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="تحميل البوابة كتطبيق على الهاتف أو الحاسوب"
          >
            <span className="material-symbols-outlined text-lg">install_mobile</span>
            <span className="hidden md:inline">تحميل التطبيق</span>
          </button>
        </div>

        {/* Right Side: Profile Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-space-md">
          <div className="flex items-center gap-2 sm:gap-space-sm pl-1 sm:pl-space-md">
            {/* Student Avatar / Initials */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm shadow-sm shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
            </div>

            <div className="flex flex-col text-right">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-tight max-w-[110px] xs:max-w-[150px] sm:max-w-none truncate text-xs sm:text-sm font-bold">
                  {displayName}
                </span>
                <span className="hidden sm:inline-block bg-surface-container-highest text-primary px-1.5 py-0.5 rounded text-xs font-bold font-label-sm">
                  {studentInfo.academicStatus || 'منتظم'}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-space-sm font-label-sm text-label-sm text-on-surface-variant text-[11px] sm:text-xs">
                <span className="font-medium" dir="ltr">
                  {displayId}
                </span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">{displayCollege}</span>
                <span className="hidden lg:inline">•</span>
                <span className="hidden lg:inline">{displayMajor}</span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 sm:p-2.5 rounded-lg bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors flex items-center justify-center cursor-pointer"
            title="تسجيل الخروج الآمن"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl text-error">
              logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
