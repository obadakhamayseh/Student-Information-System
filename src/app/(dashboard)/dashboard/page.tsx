'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  TrendingUp,
  Award,
  BookCheck,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { DashboardData } from '@/lib/schemas/student.schema';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawAttributes, setShowRawAttributes] = useState(false);

  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب بيانات لوحة التحكم من خادم الجامعة');
        return;
      }

      setData(json);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Loading Skeletons */}
        <div className="h-28 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse flex items-center px-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
          <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر جلب البيانات</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchDashboard(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const passedPercentage = Math.min(
    100,
    Math.round(((data?.passedHours || 0) / 132) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
      {/* بطاقة الترحيب العلوية */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً بك في بوابتك الجامعية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {data?.studentName || 'طالب مؤتة'}
            </h1>
            <p className="text-xs text-slate-400">
              {data?.major || 'التخصص الجامعي'} • {data?.college || 'جامعة مؤتة'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>بيانات حية من الخادم</span>
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              title="تحديث البيانات لحظياً"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* المؤشرات الأكاديمية الرئيسية (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* المعدل التراكمي */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/90 rounded-2xl p-5 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">المعدل التراكمي</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {data?.cumulativeGpa || '0.00'}
            </span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>السجل الأكاديمي الشامل</span>
          </div>
        </div>

        {/* المعدل الفصلي */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/90 rounded-2xl p-5 hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">المعدل الفصلي الأخير</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {data?.semesterGpa || '0.00'}
            </span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>{data?.currentSemester || 'الفصل الدراسي الأخير'}</span>
          </div>
        </div>

        {/* الساعات المقطوعة ونسبة الإنجاز */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/90 rounded-2xl p-5 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">الساعات المجتازة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BookCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {data?.passedHours || 0}
            </span>
            <span className="text-xs text-slate-500">ساعة</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${passedPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>نسبة الإنجاز</span>
              <span>{passedPercentage}%</span>
            </div>
          </div>
        </div>

        {/* الساعات المسجلة للفصل الحالي */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/90 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">الساعات المسجلة</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {data?.registeredHours || 0}
            </span>
            <span className="text-xs text-slate-500">ساعة هذا الفصل</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>الحالة: {data?.academicStatus || 'منتظم'}</span>
          </div>
        </div>
      </div>

      {/* تفاصيل الملف الأكاديمي والروابط السريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* معلومات الطالب الأكاديمية */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-400" />
            <span>بيانات القيد الأكاديمي</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">الرقم الجامعي</span>
              <span className="font-mono text-sm text-slate-200">{data?.studentId || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">اسم الطالب الكامل</span>
              <span className="text-sm font-medium text-slate-200">{data?.studentName || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">الكلية</span>
              <span className="text-sm text-slate-200">{data?.college || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">التخصص</span>
              <span className="text-sm text-slate-200">{data?.major || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">المرشد الأكاديمي</span>
              <span className="text-sm text-slate-200">{data?.advisor || '—'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">الحالة الأكاديمية</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
                {data?.academicStatus || 'منتظم'}
              </span>
            </div>
          </div>
        </div>

        {/* روابط سريعة للخدمات */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>الخدمات والأقسام</span>
          </h2>

          <div className="space-y-2.5">
            <Link
              href="/registration"
              className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 hover:from-blue-900/50 hover:to-indigo-900/50 border border-blue-500/30 text-slate-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">التسجيل الإلكتروني والخطة</div>
                  <div className="text-[10px] text-blue-300">تسجيل المواد وإسقاطها بالخطة</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            </Link>

            <Link
              href="/grades"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">كشف العلامات الفصلي والتراكمي</div>
                  <div className="text-[10px] text-slate-400">سجل الدرجات وتطور المعدل</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link
              href="/schedule"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">الجدول الدراسي والامتحانات</div>
                  <div className="text-[10px] text-slate-400">مواعيد القاعات والمحاضرات</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </Link>

            <Link
              href="/plan"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">الخطة الشجرية للمواد</div>
                  <div className="text-[10px] text-slate-400">المواد المتبقية وشجرة المتطلبات</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* مستكشف البيانات الأصلية المطابقة (Raw Data Parity Inspector) */}
      {data?.rawAttributes && Object.keys(data.rawAttributes).length > 0 && (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setShowRawAttributes(!showRawAttributes)}
            className="w-full p-4 flex items-center justify-between text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>مراجعة الحقول الأصلية المستخرجة مباشرة من البوابة ({Object.keys(data.rawAttributes).length} حقل)</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showRawAttributes ? 'rotate-180' : ''}`}
            />
          </button>

          {showRawAttributes && (
            <div className="p-4 pt-0 border-t border-slate-800/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-3">
                {Object.entries(data.rawAttributes).map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">{k}</span>
                    <span className="text-slate-200 font-mono text-[11px]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
