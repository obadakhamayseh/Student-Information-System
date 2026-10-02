'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

interface DashboardShellProps {
  studentId?: string;
  studentName?: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  studentId,
  studentName,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const mobileNavItems = [
    { title: 'الرئيسية', href: '/dashboard', icon: 'dashboard' },
    { title: 'العلامات', href: '/grades', icon: 'fact_check' },
    { title: 'الجدول', href: '/schedule', icon: 'calendar_month' },
    { title: 'الخطة', href: '/plan', icon: 'account_tree' },
    { title: 'التسجيل', href: '/registration', icon: 'app_registration' },
  ];

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pr-72 min-h-screen flex flex-col">
        <Header
          studentId={studentId}
          studentName={studentName}
          onOpenMobileSidebar={() => setSidebarOpen(true)}
        />
        <main className="w-full pt-20 sm:pt-28 pb-24 lg:pb-16 px-3 sm:px-4 lg:px-space-lg bg-background min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Ultra-responsive for phone screens) */}
      <nav
        aria-label="التنقل السريع للهاتف"
        className="lg:hidden fixed bottom-0 right-0 left-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high/60 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-1 sm:px-3 py-1 flex items-center justify-around safe-area-pb"
      >
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary-container text-on-primary-container' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[21px]">
                  {item.icon}
                </span>
              </div>
              <span className="text-[10.5px] leading-tight mt-0.5">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
