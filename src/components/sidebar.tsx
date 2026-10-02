'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerPwaInstall } from '@/components/pwa-installer';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'الرئيسية ونظرة عامة',
      href: '/dashboard',
      icon: 'dashboard',
    },
    {
      title: 'السجل والعلامات الأكاديمية',
      href: '/grades',
      icon: 'fact_check',
    },
    {
      title: 'الجدول الدراسي الأسبوعي',
      href: '/schedule',
      icon: 'calendar_month',
    },
    {
      title: 'الخطة الدراسية والإرشاد',
      href: '/plan',
      icon: 'account_tree',
    },
    {
      title: 'التسجيل الإلكتروني',
      href: '/registration',
      icon: 'app_registration',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header Brand */}
          <div className="h-20 px-space-lg flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-space-sm">
              <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm shrink-0">
                <span className="material-symbols-outlined text-2xl">school</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                  جامعة مؤتة
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  بوابة الطالب الأكاديمية (SIS)
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Connection Status Pill */}
          <div className="px-space-md py-space-sm">
            <div className="p-space-sm rounded-lg bg-surface-container-high/60 flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-secondary font-bold">
                  اتصال مباشر وآمن
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                v4.2 BFF
              </span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex-1 px-space-md py-space-xs flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-space-sm px-space-md py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-headline-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {item.icon}
                  </span>
                  <span className="font-label-lg text-label-lg">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PWA Install App Widget */}
        <div className="px-space-md py-space-xs">
          <div className="p-space-sm rounded-xl bg-gradient-to-br from-primary/10 to-secondary/15 border border-secondary/30 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">install_mobile</span>
              </span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-xs font-bold text-primary">
                  تطبيق بوابة مؤتة
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  تثبيت سريع على هاتفك
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                triggerPwaInstall();
                onClose?.();
              }}
              className="w-full bg-secondary hover:opacity-95 text-on-secondary py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>تحميل التطبيق</span>
            </button>
          </div>
        </div>

        {/* Bottom Support Widget */}
        <div className="p-space-md bg-surface-container-low">
          <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                مركز الدعم الفني
              </span>
              <span className="material-symbols-outlined text-secondary text-sm">
                support_agent
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface font-semibold">
              عمادة القبول والتسجيل
            </span>
            <div className="flex items-center gap-space-xs text-secondary">
              <span className="material-symbols-outlined text-xs">call</span>
              <span className="font-label-sm text-label-sm" dir="ltr">
                +962 3 2372380
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
