'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { title: 'الرئيسية', href: '/dashboard', icon: 'dashboard' },
    { title: 'السجل والعلامات', href: '/grades', icon: 'fact_check' },
    { title: 'الجدول الأسبوعي', href: '/schedule', icon: 'calendar_month' },
    { title: 'الخطة الدراسية', href: '/plan', icon: 'account_tree' },
    { title: 'خريطة التخرج', href: '/roadmap', icon: 'alt_route' },
    { title: 'التسجيل الإلكتروني', href: '/registration', icon: 'app_registration' },
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
        className={`fixed right-0 top-0 h-full w-72 bg-surface-container-lowest border-l border-surface-container-high/40 z-50 flex flex-col select-none transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo & Brand */}
        <div className="h-16 px-space-lg flex items-center justify-between border-b border-surface-container-high/40">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shrink-0">
              <span className="material-symbols-outlined text-xl">school</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-on-surface">جامعة مؤتة</span>
              <span className="text-xs text-on-surface-variant">بوابة الطالب الأكاديمية</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-space-sm py-space-md flex flex-col gap-0.5 overflow-y-auto">
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
                className={`flex items-center gap-space-sm px-space-md py-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${isActive ? 'text-primary' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-space-md py-space-sm border-t border-surface-container-high/40">
          <p className="text-xs text-on-surface-variant text-center opacity-60">
            نظام معلومات الطالب — جامعة مؤتة
          </p>
        </div>
      </aside>
    </>
  );
}
