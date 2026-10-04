'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DashboardData } from '@/lib/schemas/student.schema';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatusText, setSyncStatusText] = useState<string>('تحديث المطابقة اللحظية');
  const [currentDateString, setCurrentDateString] = useState<string>('جارٍ التحميل...');

  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard${isManualRefresh ? '?refresh=true' : ''}`);
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
    try {
      const now = new Date();
      const formatted = now.toLocaleDateString('ar-JO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setCurrentDateString(formatted);
    } catch {
      setCurrentDateString('اليوم');
    }
  }, []);

  const handleManualSync = async () => {
    setRefreshing(true);
    setSyncStatusText('جارٍ المطابقة...');
    await fetchDashboard(true);
    setSyncStatusText('تم التحديث بنجاح');
    setTimeout(() => {
      setSyncStatusText('تحديث المطابقة اللحظية');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-32 bg-surface-container-low rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-space-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-36 bg-surface-container-low rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-8 h-80 bg-surface-container-low rounded-xl" />
          <div className="lg:col-span-4 h-80 bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center">
        <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-on-surface">
          <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر جلب البيانات</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchDashboard(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const passedHrs = Number(data?.passedHours) || 0;
  const passedPercentage = Math.min(100, Math.round((passedHrs / 132) * 100));
  const remainingHrs = Math.max(0, 132 - passedHrs);
  const regHrs = Number(data?.registeredHours) || 0;
  const coursesList = data?.courses || [];

  const cumGpaNum = parseFloat(data?.cumulativeGpa || '0');
  const isOutOf100 = cumGpaNum > 4;
  const cumRating = isOutOf100
    ? cumGpaNum >= 84
      ? 'ممتاز'
      : cumGpaNum >= 76
      ? 'جيد جداً'
      : cumGpaNum >= 68
      ? 'جيد'
      : cumGpaNum >= 60
      ? 'مقبول'
      : 'ضعيف'
    : cumGpaNum >= 3.65
    ? 'ممتاز'
    : cumGpaNum >= 3.0
    ? 'جيد جداً'
    : cumGpaNum >= 2.5
    ? 'جيد'
    : cumGpaNum >= 2.0
    ? 'مقبول'
    : '—';

  const semGpaNum = parseFloat(data?.semesterGpa || '0');
  const semRating = isOutOf100
    ? semGpaNum >= 84
      ? 'ممتاز'
      : semGpaNum >= 76
      ? 'جيد جداً'
      : semGpaNum >= 68
      ? 'جيد'
      : semGpaNum >= 60
      ? 'مقبول'
      : '—'
    : semGpaNum >= 3.65
    ? 'ممتاز'
    : semGpaNum >= 3.0
    ? 'جيد جداً'
    : semGpaNum >= 2.5
    ? 'جيد'
    : semGpaNum >= 2.0
    ? 'مقبول'
    : '—';

  return (
    <div className="flex flex-col w-full">
      {/* Top Greeting */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-space-lg bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
            مرحباً، {data?.studentName?.split(' ')[0] || 'طالب'} 👋
          </h2>
          <p className="text-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-base">today</span>
            <span>{currentDateString}</span>
            <span>•</span>
            <span>{data?.college || 'جامعة مؤتة'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/roadmap"
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm font-semibold text-sm"
          >
            <span className="material-symbols-outlined text-lg">alt_route</span>
            <span>خريطة التخرج</span>
          </Link>
          <button
            className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors disabled:opacity-60 cursor-pointer"
            onClick={handleManualSync}
            disabled={refreshing}
            title="تحديث البيانات"
          >
            <span className={`material-symbols-outlined text-xl ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </section>

      {/* 5 Stat Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-space-md mb-space-lg sm:mb-space-xl">
        {/* Stat 1: Cumulative GPA */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">المعدل التراكمي (CGPA)</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">workspace_premium</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-primary" dir="ltr">
              {data?.cumulativeGpa || '0.00'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              / {isOutOf100 ? '100' : '4.00'}
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs bg-surface-container-low px-2 py-1.5 rounded">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              التقدير: {cumRating}
            </span>
            <span className="font-label-sm text-label-sm text-secondary font-bold">معتمد</span>
          </div>
        </div>

        {/* Stat 2: Semester GPA */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-secondary"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">المعدل الفصلي</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-secondary" dir="ltr">
              {data?.semesterGpa || '0.00'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              / {isOutOf100 ? '100' : '4.00'}
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs bg-surface-container-low px-2 py-1.5 rounded">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              التقدير: {semRating}
            </span>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {data?.lastSemesterName || 'الفصل الصيفي 2025/2026'}
            </span>
          </div>
        </div>

        {/* Stat 3: Study Hours Progress */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary-container"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">ساعات النجاح المنجزة</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">school</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-primary">{passedHrs}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">ساعة معتمدة</span>
          </div>
          <div className="mt-space-sm flex flex-col gap-1.5">
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-700"
                style={{ width: `${passedPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center font-label-sm text-label-sm text-on-surface-variant">
              <span>التقدم: {passedPercentage}%</span>
              <span>متبقي {remainingHrs} س.م</span>
            </div>
          </div>
        </div>

        {/* Stat 4: Financial Status */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-secondary"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">الرصيد المالي الحالي</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface" dir="ltr">
              {data?.financialBalance || '0.00 د.أ'}
            </span>
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs bg-surface-container-low px-2 py-1.5 rounded">
            <span className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              مدفوع: {data?.paidHours || 0} س
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {data?.financialBalance?.includes('-') ? 'مستحق للدفع' : 'رصيد سليم'}
            </span>
          </div>
        </div>

        {/* Stat 5: Registered Courses */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-on-tertiary-container"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">المساقات المسجلة</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">menu_book</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-primary">
              {coursesList.length}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">مواد دراسية</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs bg-surface-container-low px-2 py-1.5 rounded">
            <span className="font-label-sm text-label-sm text-on-surface">{regHrs} ساعة معتمدة</span>
            <span className="font-label-sm text-label-sm bg-surface-container-highest text-primary px-2 py-0.5 rounded font-bold">
              حالة: مثبتة
            </span>
          </div>
        </div>
      </section>

      {/* Main Bento Section: Lectures & Academic Standing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-xl">
        {/* Right Panel (8 Cols): Today's Schedule Table */}
        <section className="lg:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm p-space-lg border border-surface-container-high/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-space-md gap-2 border-b border-surface-container-high/40">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">
                  المواد المسجلة في الفصل الحالي
                </h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  الجدول الأكاديمي المعتمد والمثبت في سجل الطالب
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg text-primary font-label-md">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span>{coursesList.length} مساقات مسجلة</span>
            </div>
          </div>

          {/* Mobile View: High-clarity Course Cards (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-surface-container-high/50 mt-space-sm">
            {coursesList.length > 0 ? (
              coursesList.map((course, idx) => (
                <div key={course.courseNumber || idx} className="p-3 flex flex-col gap-1.5 bg-surface-container-lowest">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-primary text-sm">{course.courseName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant" dir="ltr">
                          {course.courseNumber}
                        </span>
                        <span className="bg-surface-container-high text-primary px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          شعبة {course.section || '1'}
                        </span>
                      </div>
                    </div>
                    <span className="font-label-md text-xs font-semibold text-primary font-mono shrink-0" dir="ltr">
                      {course.time || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-surface-container-high/30">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
                      <span>{course.room || 'تُحدد لاحقاً'}</span>
                    </span>
                    <span className="text-[11px] font-medium text-secondary">
                      {course.days || '—'}
                    </span>
                  </div>
                  {course.instructor && (
                    <div className="flex items-center gap-1 text-[11px] text-primary/80 font-medium pt-0.5">
                      <span className="material-symbols-outlined text-secondary text-xs">person</span>
                      <span>{course.instructor}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-on-surface-variant">
                لا توجد مواد مسجلة حالياً في جدول الفصل.
              </div>
            )}
          </div>

          {/* Schedule Table (Desktop & Scrollable) */}
          <div className="hidden sm:block overflow-x-auto w-full mt-space-sm">
            <table className="w-full min-w-[640px] text-right border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-primary font-label-md">
                  <th className="py-3 px-space-md rounded-r-lg">المساق والرمز</th>
                  <th className="py-3 px-space-md">مدرس المساق</th>
                  <th className="py-3 px-space-md">القاعة والمبنى</th>
                  <th className="py-3 px-space-md">التوقيت</th>
                  <th className="py-3 px-space-md">الأيام</th>
                  <th className="py-3 px-space-md rounded-l-lg text-center">الشعبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 text-on-surface font-body-md">
                {coursesList.length > 0 ? (
                  coursesList.map((course, idx) => (
                    <tr
                      key={course.courseNumber || idx}
                      className="hover:bg-surface-container-low/70 transition-colors"
                    >
                      <td className="py-3.5 px-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg font-bold text-primary">
                            {course.courseName}
                          </span>
                          <span
                            className="font-label-sm text-label-sm text-on-surface-variant font-mono"
                            dir="ltr"
                          >
                            {course.courseNumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-1.5 text-on-surface">
                          <span className="material-symbols-outlined text-secondary text-base">
                            person
                          </span>
                          <span className="font-medium text-primary text-xs">
                            {course.instructor || 'هيئة تدريس'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-1.5 text-on-surface">
                          <span className="material-symbols-outlined text-secondary text-base">
                            location_on
                          </span>
                          <span>{course.room || 'تُحدد لاحقاً'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md font-label-md font-semibold text-primary" dir="ltr">
                        {course.time || '—'}
                      </td>
                      <td className="py-3.5 px-space-md text-on-surface-variant font-label-sm">
                        {course.days || '—'}
                      </td>
                      <td className="py-3.5 px-space-md text-center">
                        <span className="bg-surface-container-high text-primary px-2.5 py-1 rounded-full font-label-sm font-semibold">
                          شعبة {course.section || '1'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      لا توجد مواد مسجلة حالياً في جدول الفصل.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Micro-bar inside schedule */}
          <div className="mt-auto pt-space-md flex flex-wrap items-center justify-between text-xs text-on-surface-variant border-t border-surface-container-high/40">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">info</span>
              بيانات الحضور والغياب يتم احتسابها تلقائياً عبر نظام البوابة المركزية.
            </span>
            <Link
              className="text-secondary font-label-md hover:underline flex items-center gap-0.5 cursor-pointer"
              href="/schedule"
            >
              عرض جدول الأسبوع كاملاً
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Link>
          </div>
        </section>

        {/* Left Panel (4 Cols): Academic Standing & Warnings Card */}
        <section className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Status Box */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-4 h-full border border-surface-container-high/40">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <span className="font-semibold text-sm text-on-surface">الملف الأكاديمي</span>
              <span className="flex items-center gap-1 text-xs text-secondary font-semibold">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {data?.academicStatus || 'منتظم'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Military Service - only if has value */}
              {(data?.militaryStatus || data?.militaryExpireDate) && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                  <span className="text-xs text-on-surface-variant">خدمة العلم</span>
                  <span className="text-secondary font-bold text-xs">
                    {data?.militaryStatus || `ينتهي: ${data?.militaryExpireDate}`}
                  </span>
                </div>
              )}

              {/* Acceptance Notes - only if > 0 */}
              {(data?.acceptanceNotesCount ?? 0) > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-warning-container/30">
                  <span className="text-xs text-on-surface-variant">ملاحظات القبول</span>
                  <span className="bg-warning text-on-warning font-bold px-2 py-0.5 rounded text-xs">
                    {data?.acceptanceNotesCount} ملاحظات
                  </span>
                </div>
              )}

              {/* Financial Notes - only if > 0 */}
              {(data?.financialNotesCount ?? 0) > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-error-container/30">
                  <span className="text-xs text-on-surface-variant">ملاحظات مالية</span>
                  <span className="bg-error text-on-error font-bold px-2 py-0.5 rounded text-xs">
                    {data?.financialNotesCount} ملاحظات
                  </span>
                </div>
              )}

              {/* Advisor */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                <span className="text-xs text-on-surface-variant">المرشد الأكاديمي</span>
                <span className="text-primary font-semibold text-xs">
                  {data?.advisor && data.advisor !== '—' ? data.advisor : 'عمادة الكلية'}
                </span>
              </div>

              {/* No issues state */}
              {(data?.acceptanceNotesCount ?? 0) === 0 && (data?.financialNotesCount ?? 0) === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 text-secondary">
                  <span className="material-symbols-outlined text-lg">task_alt</span>
                  <span className="text-xs font-semibold">لا توجد ملاحظات أو تنبيهات</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
