'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  Award,
  Calendar,
  BookOpen,
  LogOut,
  Sparkles,
  Maximize2,
  Route,
} from 'lucide-react';

interface NavbarProps {
  studentId?: string;
  studentName?: string;
}

export default function Navbar({ studentId, studentName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/registration', label: 'التسجيل الإلكتروني', icon: Sparkles },
    { href: '/registration/expansion', label: 'توسعة الشعب', icon: Maximize2 },
    { href: '/grades', label: 'العلامات والسجل', icon: Award },
    { href: '/schedule', label: 'الجدول والامتحانات', icon: Calendar },
    { href: '/plan', label: 'الخطة الشجرية', icon: BookOpen },
    { href: '/roadmap', label: 'خريطة التخرج', icon: Route },
  ];

  const isCurrentLink = (linkHref: string) => {
    if (linkHref === '/dashboard') return pathname === '/dashboard';
    if (linkHref === '/registration/expansion') return pathname === '/registration/expansion' || pathname === '/expansion';
    if (linkHref === '/registration') return pathname === '/registration' || pathname === '/registration/plan';
    return pathname === linkHref || (linkHref !== '/dashboard' && pathname.startsWith(linkHref));
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* الشعار واسم النظام */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight">بوابة الطالب الذكية</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  مؤتة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">نظام معلومات الطلبة الحديث</p>
            </div>
          </div>

          {/* روابط التنقل الرئيسية للشاشات الكبيرة */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isCurrentLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* معلومات الطالب وزر تسجيل الخروج */}
          <div className="flex items-center gap-3">
            {studentId && (
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200">{studentName || 'طالب مؤتة'}</span>
                <span className="text-[11px] font-mono text-slate-400">{studentId}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* شريط التنقل السفلي للموبايل */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-900/95 py-2 px-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = isCurrentLink(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
