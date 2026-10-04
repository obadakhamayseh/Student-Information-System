'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ScheduleData } from '@/lib/schemas/schedule.schema';
import type { CourseItem } from '@/lib/schemas/student.schema';
import { exportToCsv } from '@/lib/export-utils';
import { PrintHeader, PrintFooter } from '@/components/print-header';

export default function SchedulePage() {
  const router = useRouter();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchSchedule = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/schedule${isManual ? '?refresh=true' : ''}`);
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب جدول المحاضرات');
        return;
      }

      setData(json);
    } catch {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('list');
    }
  }, []);

  const scheduleList: CourseItem[] = useMemo(() => data?.weeklySchedule || [], [data]);

  const courseCount = scheduleList.length;
  const totalCreditHours =
    data?.totalRegisteredHours ||
    scheduleList.reduce((sum, c) => {
      if (c.creditHours && c.creditHours > 0) {
        return sum + c.creditHours;
      }
      if (c.courseName.includes('مشروع تخرج 1') || c.courseName.includes('مشروع تخرج1')) {
        return sum + 1;
      }
      return sum + 3;
    }, 0);

  // Trigger iCal Download with real student courses
  const triggerDownloadICal = () => {
    if (!scheduleList.length) return;

    const icsEvents = scheduleList.map((c) => `BEGIN:VEVENT
SUMMARY:${c.courseName} (${c.courseNumber})
DESCRIPTION:شعبة ${c.section || '1'} - مدرس المساق: ${c.instructor || 'هيئة التدريس'} - ${c.days || 'أيام المحاضرة'} - ${c.time || ''}
LOCATION:جامعة مؤتة - ${c.room || 'الحرم الجامعي'}
STATUS:CONFIRMED
END:VEVENT`).join('\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mutah University//Weekly SIS Schedule//AR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:جدول جامعة مؤتة
X-WR-TIMEZONE:Asia/Amman
${icsEvents}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Mutah_Weekly_Schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const handleExportCsv = () => {
    if (!scheduleList.length) return;

    const headers = [
      'رقم المقرر',
      'اسم المقرر',
      'الشعبة',
      'الساعات المعتمدة',
      'أيام المحاضرة',
      'الوقت',
      'القاعة',
      'مدرس المساق',
    ];

    const rows = scheduleList.map((c) => [
      c.courseNumber,
      c.courseName,
      c.section || '—',
      c.creditHours || 3,
      c.days || '—',
      c.time || '—',
      c.room || '—',
      c.instructor || 'هيئة تدريسية',
    ]);

    const filename = `الجدول_الدراسي_${data?.studentId || 'جامعة_مؤتة'}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
    setShowExportModal(false);
  };

  // Helper to test if course meets on a specific day:
  // Sun: ح or أ
  // Mon: ن
  // Tue: ث
  // Wed: ر
  // Thu: خ
  const doesMeetOn = (course: CourseItem, dayKey: 'sun' | 'mon' | 'tue' | 'wed' | 'thu') => {
    const d = course.days || '';
    if (dayKey === 'sun') return d.includes('أ') || d.includes('ح');
    if (dayKey === 'mon') return d.includes('ن');
    if (dayKey === 'tue') return d.includes('ث');
    if (dayKey === 'wed') return d.includes('ر');
    if (dayKey === 'thu') return d.includes('خ');
    return false;
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-44 bg-surface-container-low rounded-xl" />
        <div className="h-16 bg-surface-container-low rounded-xl" />
        <div className="h-96 bg-surface-container-low rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center">
        <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-on-surface">
          <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر عرض الجدول</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchSchedule(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* رأس الطباعة الرسمي للجامعة (يظهر فقط عند الطباعة أو حفظ PDF) */}
      <PrintHeader
        documentTitle="الجدول الدراسي الأسبوعي المعتمد"
        studentName={data?.studentName}
        studentId={data?.studentId}
        major={data?.major}
        academicYear={data?.currentSemester}
        extraStats={[
          { label: 'عدد المساقات المسجلة', value: `${courseCount} مواد` },
          { label: 'مجموع الساعات المعتمدة', value: `${totalCreditHours} س.م` },
          { label: 'حالة الجدول', value: 'معتمد ومثبت' },
        ]}
      />

      {/* جدول المساقات المنظم للطباعة الرسمية (يظهر فقط في الطباعة/PDF) */}
      <div className="hidden print:block w-full">
        <h3 className="text-sm font-bold text-gray-900 mb-2 border-b pb-1">
          تفاصيل المساقات المسجلة والقاعات التدريسية:
        </h3>
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">رقم المساق</th>
              <th className="border p-2">اسم المساق</th>
              <th className="border p-2">الشعبة</th>
              <th className="border p-2">س.م</th>
              <th className="border p-2">الأيام</th>
              <th className="border p-2">الوقت</th>
              <th className="border p-2">القاعة / المبنى</th>
              <th className="border p-2">مدرس المساق</th>
            </tr>
          </thead>
          <tbody>
            {scheduleList.map((c, idx) => (
              <tr key={idx} className="border-b">
                <td className="border p-2 font-mono font-bold">{c.courseNumber}</td>
                <td className="border p-2 font-bold">{c.courseName}</td>
                <td className="border p-2 font-mono text-center">{c.section || '1'}</td>
                <td className="border p-2 text-center">{c.creditHours || 3}</td>
                <td className="border p-2">{c.days || '—'}</td>
                <td className="border p-2 font-mono" dir="ltr">{c.time || '—'}</td>
                <td className="border p-2">{c.room || '—'}</td>
                <td className="border p-2">{c.instructor || 'هيئة تدريسية'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Header Metric Overview / Bento Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary p-space-lg shadow-sm border border-secondary/20 no-print">
        <div className="absolute -left-12 -bottom-16 w-64 h-64 rounded-full bg-secondary/15 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 -top-12 w-48 h-48 rounded-full bg-tertiary-fixed/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Titles & Meta */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="bg-secondary/20 text-secondary-container px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                {data?.currentSemester || 'الفصل الدراسي الحالي'}
              </span>
              <span className="bg-surface-container-highest/20 text-tertiary-fixed px-2 py-0.5 rounded font-label-sm text-label-sm">
                المساقات المسجلة رسمياً
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-primary tracking-tight">
              الجدول الدراسي الأسبوعي
            </h1>
            <p className="font-body-md text-body-md text-on-primary-container max-w-2xl">
              توزيع المحاضرات الأسبوعية الرسمية، المختبرات، ومعلومات القاعات المعتمدة لدى عمادة القبول والتسجيل.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="flex items-center gap-1.5 bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-on-primary px-3 py-2 rounded-lg transition-all text-xs font-semibold cursor-pointer"
              onClick={() => window.print()}
              title="طباعة أو حفظ PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              className="flex items-center gap-1.5 bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-on-primary px-3 py-2 rounded-lg transition-all text-xs font-semibold cursor-pointer"
              onClick={handleExportCsv}
              title="تصدير Excel"
            >
              <span className="material-symbols-outlined text-base text-secondary-container">table_view</span>
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/90 text-on-secondary px-3 py-2 rounded-lg transition-all text-xs font-semibold cursor-pointer"
              onClick={() => setShowExportModal(true)}
              title="إضافة للتقويم"
            >
              <span className="material-symbols-outlined text-base">calendar_add_on</span>
              <span className="hidden sm:inline">التقويم</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-lg pt-space-md bg-surface-container-lowest/5 rounded-lg p-space-sm border border-surface-container-lowest/10">
          <div className="flex items-center gap-space-sm p-space-xs">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center text-secondary-fixed">
              <span className="material-symbols-outlined text-xl">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-primary-container">عدد المساقات</span>
              <span className="font-headline-md text-headline-md font-bold text-on-primary">
                {courseCount} مواد
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm p-space-xs">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center text-primary-fixed">
              <span className="material-symbols-outlined text-xl">timelapse</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-primary-container">الساعات المسجلة</span>
              <span className="font-headline-md text-headline-md font-bold text-on-primary">
                {totalCreditHours} ساعة
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm p-space-xs">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center text-secondary-fixed">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-primary-container">حالة التسجيل</span>
              <span className="font-headline-sm text-headline-sm font-bold text-secondary-fixed">
                مثبت ومعتمد
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher Controls */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md border border-surface-container-high/40">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
          </span>
          <div>
            <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">
              الجدول الأكاديمي المعتمد
            </h2>
            <span className="text-xs text-on-surface-variant font-label-sm">
              {courseCount} مساقات مسجلة • {totalCreditHours} ساعة معتمدة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-high/40">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-label-md transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">grid_view</span>
            <span>الشبكة الأسبوعية</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-label-md transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
            <span>القائمة التفصيلية</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Grid Timetable View */}
      {viewMode === 'grid' && (
            <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container-high/40">
              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  {/* Days Header */}
                  <div className="grid grid-cols-6 bg-surface-container-low text-on-surface text-center font-headline-sm text-headline-sm py-3 px-space-sm border-b border-surface-container-high/40">
                    <div className="flex items-center justify-center text-on-surface-variant font-label-md text-label-md">
                      <span className="material-symbols-outlined text-sm ml-1">schedule</span>
                      اليوم / الفترة
                    </div>
                    <div className="flex flex-col items-center">
                      <span>الأحد</span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">أ / ح</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>الإثنين</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">ن</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>الثلاثاء</span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">ث</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>الأربعاء</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">ر</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>الخميس</span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">خ</span>
                    </div>
                  </div>

                  {/* Dynamic Day Grid Columns */}
                  <div className="grid grid-cols-6 p-2 gap-2 min-h-[380px] text-sm">
                    {/* Time Column Labels */}
                    <div className="flex flex-col gap-2 justify-around bg-surface-container-low/50 rounded-lg p-2 text-center text-xs font-label-sm text-on-surface-variant">
                      <div className="p-2 rounded bg-surface-container-lowest shadow-sm">
                        <span className="font-bold text-primary block">الفترة الصباحية</span>
                        <span>08:30 - 11:30</span>
                      </div>
                      <div className="p-2 rounded bg-surface-container-lowest shadow-sm">
                        <span className="font-bold text-primary block">فترة الظهيرة</span>
                        <span>11:30 - 02:30</span>
                      </div>
                    </div>

                    {/* 5 Days Columns: Sunday to Thursday */}
                    {(['sun', 'mon', 'tue', 'wed', 'thu'] as const).map((dayKey) => {
                      const dayCourses = scheduleList.filter((c) => doesMeetOn(c, dayKey));

                      return (
                        <div
                          key={dayKey}
                          className="flex flex-col gap-2 p-1 bg-surface-container-low/20 rounded-lg min-h-[340px]"
                        >
                          {dayCourses.length > 0 ? (
                            dayCourses.map((c, i) => (
                              <div
                                key={c.courseNumber || i}
                                className="relative bg-surface-container-lowest hover:bg-surface-container-low text-on-surface rounded-lg p-2.5 shadow-sm border border-surface-container-high/60 flex flex-col justify-between transition-all group"
                              >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-secondary rounded-r-lg"></div>
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-primary">
                                    <span>{c.courseNumber}</span>
                                    <span className="bg-surface-container px-1 rounded text-on-surface-variant">
                                      ش{c.section || '1'}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-xs text-primary leading-tight mt-1 line-clamp-2">
                                    {c.courseName}
                                  </h4>
                                </div>
                                <div className="mt-2 pt-1 border-t border-surface-container-high/40 text-[11px] text-on-surface-variant flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1 font-semibold text-secondary" dir="ltr">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    {c.time || '—'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                    {c.room || '—'}
                                  </span>
                                  {c.instructor && (
                                    <span className="flex items-center gap-1 text-[10px] text-primary font-medium truncate pt-0.5">
                                      <span className="material-symbols-outlined text-[12px] text-secondary">person</span>
                                      <span className="truncate">{c.instructor}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-on-surface-variant/40">
                              <span>لا توجد محاضرات</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Detailed Course List View */}
          {viewMode === 'list' && (
            <div className="flex flex-col gap-space-md">
              {scheduleList.length > 0 ? (
                scheduleList.map((c, idx) => (
                  <div
                    key={c.courseNumber || idx}
                    className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border border-surface-container-high/40"
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                    <div className="flex items-start gap-space-md pr-space-xs">
                      <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">menu_book</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-2 py-0.5 rounded font-mono font-bold">
                            {c.courseNumber}
                          </span>
                          <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">
                            الشعبة: {c.section || '1'}
                          </span>
                          <span className="font-label-sm text-label-sm bg-surface-container-highest text-primary font-bold px-2 py-0.5 rounded">
                            {c.creditHours || 3} ساعات معتمدة
                          </span>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-primary mt-1">
                          {c.courseName}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="material-symbols-outlined text-sm text-secondary">person</span>
                          <span className="font-medium text-primary">{c.instructor || 'هيئة التدريس • جامعة مؤتة'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-lg flex-wrap self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-space-sm lg:pt-0 border-surface-container-high/60">
                      <div className="flex flex-col text-right">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">الأيام والتوقيت</span>
                        <span className="font-label-md text-label-md font-bold text-primary" dir="ltr">
                          {c.days ? `[${c.days}] ` : ''}{c.time || '—'}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">القاعة والمبنى</span>
                        <span className="font-label-md text-label-md font-bold text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {c.room || 'تحدد لاحقاً'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-surface-container-lowest p-8 rounded-xl text-center text-on-surface-variant border border-surface-container-high/40">
                  لا توجد مساقات مسجلة في الفصل الحالي.
                </div>
              )}
            </div>
          )}

      {/* Export Modal matching Page2.html */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-xl p-space-lg flex flex-col gap-space-md border border-surface-container-high/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined">event_available</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">تصدير الجدول الدراسي</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              اختر وسيلة التصدير المناسبة لإضافة مواعيد محاضراتك وقاعاتها الأسبوعية إلى تقويم هاتفك تلقائياً:
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportCsv}
                className="w-full flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary">table_view</span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface">ملف إكسل (Microsoft Excel / CSV)</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">تحميل جدول الشعب والقاعات والمواعيد كجدول بيانات</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">download</span>
              </button>
              <button
                onClick={triggerDownloadICal}
                className="w-full flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary">file_download</span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Apple Calendar & Outlook (.ics)</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">ملف متكامل يدعم المنبهات الذكية وتحديد القاعات</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">download</span>
              </button>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary">event</span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface">تقويم جوجل (Google Calendar)</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">ربط مباشر مع حساب Gmail الجامعي</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">open_in_new</span>
              </a>
            </div>
            <div className="flex justify-end pt-space-xs">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md cursor-pointer hover:bg-surface-variant transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تذييل الطباعة الرسمي للجامعة */}
      <PrintFooter />
    </div>
  );
}
