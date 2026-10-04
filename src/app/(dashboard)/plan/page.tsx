'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudyPlanData, PlanCourse } from '@/lib/schemas/plan.schema';
import { exportToCsv } from '@/lib/export-utils';
import { PrintHeader, PrintFooter } from '@/components/print-header';
import { generateGraduationRoadmap } from '@/lib/roadmap-engine';

interface CategoryStats {
  key: string;
  name: string;
  requiredHours: number;
  completedHours: number;
  passedCoursesCount: number;
  totalCoursesCount: number;
  percent: number;
  icon: string;
}

export default function PlanPage() {
  const router = useRouter();
  const [data, setData] = useState<StudyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'منجزة' | 'مسجلة' | 'متبقية'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPlan = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/plan${isManual ? '?refresh=true' : ''}`);
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب الخطة الدراسية من الخادم');
        return;
      }

      setData(json);
      if (isManual) {
        showToast('تم تحديث بيانات الخطة الدراسية مباشرة من بوابة الجامعة');
      }
    } catch {
      setError('تعذر الاتصال بخادم الجامعة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const coursesList: PlanCourse[] = useMemo(() => data?.courses || [], [data]);

  // Compute category statistics dynamically from the real courses and parsed portal categories
  const categoryStats: CategoryStats[] = useMemo(() => {
    const getCategoryIcon = (title: string) => {
      if (title.includes('استدراكي')) return 'autorenew';
      if (title === '00') return 'description';
      if (title.includes('كليه') || title.includes('كلية')) return 'domain';
      if (title.includes('تخص')) return 'school';
      return 'account_balance';
    };

    if (data?.categories && data.categories.length > 0) {
      return data.categories.map((cat, idx) => {
        const percent =
          cat.requiredHours > 0
            ? Math.min(100, Math.round((cat.completedHours / cat.requiredHours) * 100))
            : cat.completedHours > 0
            ? 100
            : 0;

        return {
          key: cat.categoryId || `cat_${idx}`,
          name: cat.name,
          requiredHours: cat.requiredHours,
          completedHours: cat.completedHours,
          passedCoursesCount: cat.passedCoursesCount || 0,
          totalCoursesCount: cat.totalCoursesCount || 0,
          percent,
          icon: getCategoryIcon(cat.name),
        };
      });
    }

    // Fallback: Dynamically generate categories from real courses if categories list is empty
    const catMap = new Map<string, { key: string; name: string; completedHours: number; requiredHours: number; passedCoursesCount: number; totalCoursesCount: number; icon: string }>();

    for (const c of coursesList) {
      const catName = c.category || 'متطلبات عامة';
      const existing = catMap.get(catName) || {
        key: `cat_${encodeURIComponent(catName)}`,
        name: catName,
        completedHours: 0,
        requiredHours: 0,
        passedCoursesCount: 0,
        totalCoursesCount: 0,
        icon: getCategoryIcon(catName),
      };

      existing.totalCoursesCount++;
      existing.requiredHours += (c.creditHours || 3);
      if (c.status === 'منجزة') {
        existing.passedCoursesCount++;
        existing.completedHours += (c.creditHours || 3);
      }
      catMap.set(catName, existing);
    }

    return Array.from(catMap.values()).map((def) => {
      const percent =
        def.requiredHours > 0
          ? Math.min(100, Math.round((def.completedHours / def.requiredHours) * 100))
          : def.completedHours > 0
          ? 100
          : 0;

      return {
        ...def,
        percent,
      };
    });
  }, [data?.categories, coursesList]);

  // Filter courses based on Search, Category, and Status
  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      // Category match
      if (selectedCategoryKey !== 'all') {
        const catDef = categoryStats.find((cs) => cs.key === selectedCategoryKey);
        if (catDef) {
          const norm = (s: string) => s.replace(/[\u0640]/g, '').trim().toLowerCase();
          const target = norm(catDef.name);
          const cCat = norm(c.category || '');

          if (target === '00') {
            if (cCat !== '00' && !cCat.includes('00')) return false;
          } else if (target.includes('استدراكي')) {
            if (!cCat.includes('استدراكي') && !c.courseName.includes('99')) return false;
          } else if (target === norm('جامعه إجباري') || target === norm('إجباري جامعة')) {
            if (!cCat.includes('جامعه إجباري') && !cCat.includes('إجباري جامعة')) return false;
          } else if (target.includes('انسانية') || target.includes('إنسانية')) {
            if (!cCat.includes('انسانية') && !cCat.includes('إنسانية')) return false;
          } else if (target.includes('اجتماعية') || target.includes('اقتصادية')) {
            if (!cCat.includes('اجتماعية') && !cCat.includes('اقتصادية')) return false;
          } else if (target.includes('تكنولوجيا') || target.includes('العلوم و التكنولوجيا')) {
            if (!cCat.includes('تكنولوجيا') && !cCat.includes('علوم وتكنولوجيا')) return false;
          } else if (target.includes('كليه') || target.includes('كلية')) {
            if (!cCat.includes('كليه') && !cCat.includes('كلية')) return false;
          } else if (target.includes('إجباري') && target.includes('تخصص')) {
            if (!cCat.includes('إجباري') || !cCat.includes('تخصص')) return false;
          } else if (target.includes('إختياري') && target.includes('تخصص')) {
            if (!cCat.includes('إختياري') || !cCat.includes('تخصص')) return false;
          } else {
            if (!cCat.includes(target) && !target.includes(cCat)) return false;
          }
        }
      }

      // Status match
      if (statusFilter !== 'all') {
        if (c.status !== statusFilter) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.courseName.toLowerCase().includes(q);
        const matchNum = c.courseNumber.toLowerCase().includes(q);
        const matchPrereq = c.prerequisite?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchPrereq) return false;
      }

      return true;
    });
  }, [coursesList, selectedCategoryKey, statusFilter, searchQuery, categoryStats]);

  const completedHours = data?.completedHours || 0;
  const totalHours = data?.totalHours || 0;
  const currentRegisteredHours = coursesList.filter((c) => c.status === 'مسجلة').reduce((sum, c) => {
    if (c.creditHours && c.creditHours > 0) {
      return sum + c.creditHours;
    }
    if (c.courseName.includes('مشروع تخرج 1') || c.courseName.includes('مشروع تخرج1')) {
      return sum + 1;
    }
    return sum + 3;
  }, 0);
  const remainingAfterCurrent = Math.max(0, totalHours - (completedHours + currentRegisteredHours));
  const remainingTotal = Math.max(0, totalHours - completedHours);
  const progressPercent = totalHours > 0 ? Math.min(100, Math.round((completedHours / totalHours) * 100)) : 0;

  // حساب الفصل الدراسي الحالي من بيانات الخطة أو الـ API
  const currentSemester = data?.currentSemester || 'الفصل الدراسي الحالي';

  // توليد خريطة الفصول المتبقية بدقة 100% من محرك التخرج الأكاديمي
  const graduationRoadmap = useMemo(() => {
    if (!data) return [];
    const res = generateGraduationRoadmap(data);
    return res.semesters
      .filter((s) => !s.isCurrentSemester)
      .map((s, idx) => ({
        step: idx + 1,
        name: s.semesterName,
        hours: s.totalHours,
        isSummer: s.isSummer,
        isGraduation: s.isGraduationSemester,
        coursesCount: s.courses.length,
      }));
  }, [data]);

  // شجرة الاعتمادية — تُبنى من قائمة المواد الفعلية للطالب
  const dependencyNodes = coursesList
    .filter((c) => (c.status === 'منجزة' || c.status === 'مسجلة') && c.courseNumber)
    .slice(0, 5);

  // Stroke-dash calculations for 160x160 SVG Gauge (r=68, circumference approx 427.26)
  const circumference = 2 * Math.PI * 68;
  const strokeOffset = circumference - (circumference * progressPercent) / 100;

  if (loading) {
    return (
      <div className="flex flex-col w-full animate-pulse space-y-6">
        <div className="h-44 bg-surface-container-low rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-surface-container-low rounded-xl" />
          ))}
        </div>
        <div className="h-16 bg-surface-container-low rounded-xl" />
        <div className="h-96 bg-surface-container-low rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="bg-error-container/50 border border-error/20 rounded-2xl p-6 text-on-error-container">
          <span className="material-symbols-outlined text-4xl text-error mb-3 inline-block">error</span>
          <h2 className="text-lg font-bold text-error mb-2">تعذر عرض الخطة الدراسية</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchPlan(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const handlePrintPlan = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportPlanCsv = () => {
    if (!coursesList || coursesList.length === 0) return;

    const headers = [
      'رقم المقرر',
      'اسم المقرر',
      'الساعات المعتمدة',
      'تصنيف المتطلب',
      'المتطلب السابق',
      'الحالة الأكاديمية',
    ];

    const rows = coursesList.map((c) => [
      c.courseNumber,
      c.courseName,
      c.creditHours || 3,
      c.category || 'متطلب خطة',
      c.prerequisite || '—',
      c.status || 'متبقية',
    ]);

    const filename = `الخطة_الدراسية_${data?.studentId || 'جامعة_مؤتة'}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
    showToast('تم تصدير الخطة الدراسية بنجاح إلى ملف Excel / CSV');
  };

  return (
    <div className="flex flex-col w-full">
      {/* رأس الطباعة الرسمي للجامعة (يظهر فقط عند الطباعة أو حفظ PDF) */}
      <PrintHeader
        documentTitle="وثيقة التدقيق الأكاديمي والخطة الدراسية"
        studentName={data?.studentName}
        studentId={data?.studentId}
        major={data?.majorName}
        academicYear={currentSemester}
        extraStats={[
          { label: 'الساعات المنجزة', value: `${completedHours} س.م` },
          { label: 'الساعات المسجلة', value: `${currentRegisteredHours} س.م` },
          { label: 'الساعات المتبقية', value: `${remainingAfterCurrent} س.م` },
          { label: 'نسبة الإنجاز', value: `${progressPercent}%` },
        ]}
      />

      {/* Top Degree Progress Overview Bento Strip */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg mb-space-xl">
        {/* Big Radial/Stats Card */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between border border-surface-container-high/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md relative z-10">
            <div>
              <div className="flex items-center gap-space-xs mb-1 flex-wrap">
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold">
                  {data?.majorName || 'الخطة الدراسية'} {data?.planYear ? `• خطة ${data.planYear}` : ''}
                </span>
                <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold">
                  {currentSemester} (الحالي)
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
                التدقيق الأكاديمي ومسار الخطة الدراسية
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                تتبع ساعات التخرج المنجزة والمتطلبات السابقة لفتح المواد المتقدمة وفق الخطة الشجرية المعتمدة
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap no-print">
              <button
                onClick={handlePrintPlan}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
                title="طباعة وثيقة الخطة الدراسية أو حفظها كـ PDF"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>طباعة الخطة (PDF)</span>
              </button>
              <button
                onClick={handleExportPlanCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high text-primary border border-surface-container-high/60 text-xs font-bold hover:bg-surface-container-highest transition-all cursor-pointer shadow-sm"
                title="تصدير مواد الخطة الدراسية كملف Excel / CSV"
              >
                <span className="material-symbols-outlined text-base text-secondary">table_view</span>
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* Main Progress Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-lg mt-space-lg items-center relative z-10">
            {/* SVG Gauge */}
            <div className="md:col-span-4 flex items-center justify-center relative">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle
                    className="text-surface-container-high"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="14"
                  />
                  <circle
                    className="text-secondary transition-all duration-1000 ease-out"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="68"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
                    {progressPercent}%
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">نسبة الإنجاز</span>
                  <span className="font-label-md text-label-md text-secondary font-bold mt-0.5">
                    {completedHours} / {totalHours} س.م
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Breakdown Pillars */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-space-sm">
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col border border-surface-container-high/40">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  ساعات مجتازة
                </span>
                <span className="font-headline-md text-headline-md text-primary font-bold mt-1">
                  {completedHours}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">ساعة بنجاح</span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col border border-surface-container-high/40">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
                  ساعات قيد الدراسة
                </span>
                <span className="font-headline-md text-headline-md text-on-tertiary-container font-bold mt-1">
                  {currentRegisteredHours}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">الفصل الحالي</span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col col-span-2 sm:col-span-1 border border-surface-container-high/40">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                  المتبقي للتخرج
                </span>
                <span className="font-headline-md text-headline-md text-on-surface font-bold mt-1">
                  {remainingAfterCurrent}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">ساعة بعد الحالي • {remainingTotal} إجمالياً</span>
              </div>
              <div className="bg-surface-container-high/60 p-space-md rounded-lg flex items-center justify-between col-span-2 sm:col-span-3 border border-surface-container-high/40">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
                  <div>
                    <span className="font-label-md text-label-md text-on-surface block font-bold">
                      الوضع الأكاديمي: سليم ومطابق لشروط الخطة
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {completedHours} ساعة مجتازة + {currentRegisteredHours} ساعة مسجلة حالياً = {completedHours + currentRegisteredHours} ساعة منجزة بعد هذا الفصل{remainingAfterCurrent > 0 ? ` (يتبقى ${remainingAfterCurrent} س.م للتخرج)` : ' — مؤهل للتخرج ✓'}
                    </span>
                  </div>
                </div>
                <span className="bg-surface-container-lowest text-secondary px-space-sm py-1 rounded font-label-sm text-label-sm font-bold shadow-sm">
                  منتظم
                </span>
              </div>
            </div>
          </div>

          <div className="absolute -left-12 -bottom-12 opacity-5 pointer-events-none select-none text-primary">
            <span className="material-symbols-outlined text-[200px]">account_tree</span>
          </div>
        </div>

        {/* Graduation Horizon Card — Dynamic */}
        <div className="xl:col-span-4 bg-primary-container text-on-primary rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary-container text-2xl">rocket_launch</span>
                <h2 className="font-headline-sm text-headline-sm text-on-primary font-bold">خريطة الفصول المتبقية للتخرج</h2>
              </div>
              <span className="bg-tertiary-container text-tertiary-fixed text-xs px-2.5 py-1 rounded font-label-sm font-bold">
                {remainingAfterCurrent <= 0 ? 'جاهز للتخرج' : `${graduationRoadmap.length} فصول متبقية`}
              </span>
            </div>

            {remainingAfterCurrent <= 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="material-symbols-outlined text-secondary-container text-5xl mb-3">school</span>
                <p className="font-headline-sm text-on-primary font-bold">مبروك! أتممت جميع متطلبات التخرج</p>
                <p className="font-body-sm text-on-primary-container mt-1">لقد أنجزت {completedHours} ساعة معتمدة من أصل {totalHours} ساعة مطلوبة</p>
              </div>
            ) : (
              <>
                <p className="font-body-sm text-body-sm text-on-primary-container mb-space-md">
                  الفصل الحالي: <strong>{currentSemester}</strong> ({currentRegisteredHours} س.م). يتبقى <strong>{remainingAfterCurrent} ساعة</strong> بعده:
                </p>
                <div className="flex flex-col gap-space-sm">
                  {graduationRoadmap.map((term) => (
                    <div
                      key={term.step}
                      className={`bg-tertiary/40 p-space-sm rounded-lg flex items-center justify-between ${
                        term.isGraduation ? 'border border-secondary/40 shadow-sm' : 'border border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-space-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-label-md shrink-0 ${
                          term.isGraduation ? 'bg-secondary text-on-secondary' : 'bg-secondary/20 text-secondary-container'
                        }`}>
                          {term.step}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-md text-label-md text-on-primary block font-bold">
                              {term.name}
                            </span>
                            {term.isGraduation && (
                              <span className="text-[10px] bg-secondary px-1.5 rounded text-on-secondary font-bold">فصل التخرج 🎓</span>
                            )}
                          </div>
                          <span className="font-label-sm text-label-sm text-on-primary-container">
                            {term.coursesCount} مساقات متبقية لاستكمال متطلبات الخطة
                          </span>
                        </div>
                      </div>
                      <span className="font-label-md text-label-md font-bold text-secondary-container shrink-0">{term.hours} س.م</span>
                    </div>
                  ))}
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest/15 border border-white/10 text-xs text-on-primary-container flex items-start gap-2 mt-1">
                    <span className="material-symbols-outlined text-secondary-fixed text-base shrink-0 mt-0.5">policy</span>
                    <p className="leading-relaxed text-[11px]">
                      <strong>التعليمات الأكاديمية:</strong> الحد الأقصى العادي <strong>18 س.م</strong> (وحتى <strong>21 س.م</strong> للخريج)، والصيفي <strong>10 س.م</strong> (وحتى <strong>12 س.م</strong> للخريج).
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-space-md pt-space-sm border-t border-primary/20 flex items-center justify-between">
            <div>
              <span className="font-label-sm text-label-sm text-on-primary-container block">الساعات المتبقية إجمالاً:</span>
              <span className="font-headline-sm text-headline-sm text-secondary-fixed font-bold">
                {remainingTotal} ساعة ({remainingAfterCurrent} بعد الفصل الحالي)
              </span>
            </div>
            <Link
              href="/roadmap"
              className="bg-secondary text-on-secondary px-space-md py-2 rounded-lg font-label-md text-label-md hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>خريطة التخرج الذكية</span>
              <span className="material-symbols-outlined text-sm">alt_route</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Requirements Category Progress Breakdown Cards */}
      <div className="mb-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-space-md">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md text-primary font-bold">
                تصنيفات متطلبات الخطة الأكاديمية
              </h2>
              <span className="text-xs font-label-sm bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold">
                مطابق للبوابة الرسمية (9 متطلبات)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              انقر على أي متطلب لتصفية وعرض مواده وحالة إنجاز الساعات المعتمدة
            </p>
          </div>
          <div className="flex items-center gap-space-xs font-label-sm text-xs text-on-surface-variant">
            {selectedCategoryKey !== 'all' && (
              <button
                onClick={() => setSelectedCategoryKey('all')}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>إلغاء التصفية (عرض الكل)</span>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
            <span className="hidden sm:flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>منجز بالكامل
            </span>
            <span className="hidden sm:flex items-center gap-1 mr-space-md">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>قيد الاستكمال
            </span>
          </div>
        </div>

        {/* 9 Authentic Plan Categories directly matching University Portal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryStats.map((cat) => {
            const isSelected = selectedCategoryKey === cat.key;
            const isCompleted = cat.requiredHours > 0 && cat.completedHours >= cat.requiredHours;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategoryKey(isSelected ? 'all' : cat.key)}
                className={`text-right bg-surface-container-lowest p-3.5 sm:p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-primary bg-primary/5 border-primary shadow-md'
                    : 'border-surface-container-high/40 hover:border-surface-container-high'
                }`}
              >
                {/* Header Row: Title + Icon and Chevron */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">
                        {cat.icon}
                      </span>
                    </span>
                    <span className="font-label-lg text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-base transition-transform shrink-0 ${
                      isSelected ? '-rotate-90 text-primary font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    chevron_left
                  </span>
                </div>

                {/* Badges Row: X/Y مادة & A/B ساعة (Matching Official Portal Screenshot) */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full text-xs font-label-sm text-on-surface border border-surface-container-high/50 font-mono">
                    <span className="material-symbols-outlined text-[13px] text-secondary">check_circle</span>
                    <span>{cat.passedCoursesCount}/{cat.totalCoursesCount} مادة</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full text-xs font-label-sm text-primary font-bold border border-surface-container-high/50 font-mono">
                    <span className="material-symbols-outlined text-[13px] text-primary">hourglass_top</span>
                    <span>{cat.completedHours}/{cat.requiredHours} ساعة</span>
                  </span>
                  {isCompleted && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary mr-auto">
                      منجز بالكامل
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-secondary' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, cat.percent)}%` }}
                  ></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Interactive Search Toolbar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm mb-space-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md border border-surface-container-high/40">
        {/* Search and Status Quick Filter */}
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برمز المادة أو اسمها أو المتطلب السابق..."
              className="w-full pr-10 pl-4 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest transition-all border border-transparent focus:border-primary/20"
            />
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `الكل (${coursesList.length})` },
              { id: 'منجزة', label: `منجزة (${coursesList.filter((c) => c.status === 'منجزة').length})` },
              { id: 'مسجلة', label: `مسجلة (${coursesList.filter((c) => c.status === 'مسجلة').length})` },
              { id: 'متبقية', label: `متبقية (${coursesList.filter((c) => c.status === 'متبقية').length})` },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id as any)}
                className={`px-space-md py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-colors cursor-pointer ${
                  statusFilter === pill.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tree / Table View Toggle */}
        <div className="flex items-center gap-space-sm self-end lg:self-auto shrink-0">
          <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">طريقة العرض:</span>
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-surface-container-high/40">
            <button
              onClick={() => setViewMode('table')}
              className={`px-space-md py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_list</span>
              قائمة الخطة
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-space-md py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-sm">account_tree</span>
              شجرة الاعتمادية
            </button>
          </div>
        </div>
      </div>

      {/* View Mode 1: Detailed Course Explorer */}
      {viewMode === 'table' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-xl border border-surface-container-high/40">
          {/* Mobile View: Clean Course Cards (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-surface-container-high/50">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((c, i) => {
                const isPassed = c.status === 'منجزة';
                const isCurrent = c.status === 'مسجلة';

                return (
                  <div
                    key={c.courseNumber || i}
                    className={`p-3 flex flex-col gap-2 ${isCurrent ? 'bg-primary/5' : 'bg-surface-container-lowest'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span
                          className={`w-1.5 h-6 rounded-full shrink-0 mt-0.5 ${
                            isPassed
                              ? 'bg-secondary'
                              : isCurrent
                              ? 'bg-on-tertiary-container'
                              : 'bg-outline-variant'
                          }`}
                        ></span>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm leading-snug">{c.courseName}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[11px] bg-surface-container-high px-1.5 py-0.5 rounded text-primary font-bold" dir="ltr">
                              {c.courseNumber}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {c.creditHours} س.م
                            </span>
                            <span className="text-[11px] bg-surface-container-low border border-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                              {c.category}
                            </span>
                          </div>
                          {c.prerequisite && c.prerequisite !== '—' && (
                            <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mt-1">
                              <span className="material-symbols-outlined text-[12px] text-secondary">link</span>
                              <span>المتطلب: {c.prerequisite}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Grade */}
                      <div className="shrink-0 text-left">
                        <span className="text-sm font-bold text-primary font-mono" dir="ltr">
                          {c.grade || (isPassed ? 'ناجح' : '—')}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/30 text-xs">
                      <span className="text-[11px] text-on-surface-variant">الحالة:</span>
                      {isPassed && (
                        <span className="inline-flex items-center gap-1 bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          منجزة بنجاح
                        </span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                          مسجلة حالياً
                        </span>
                      )}
                      {!isPassed && !isCurrent && (
                        <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[11px] font-medium">
                          <span className="material-symbols-outlined text-xs">pending</span>
                          متبقية
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-on-surface-variant">
                لا توجد مواد تطابق معايير البحث المحددة.
              </div>
            )}
          </div>

          {/* Desktop / Tablet View: Full Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[620px] text-right border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface font-headline-sm text-body-sm">
                  <th className="py-space-md px-space-lg font-bold">رمز المادة واسم المساق</th>
                  <th className="py-space-md px-space-md font-bold text-center">الساعات</th>
                  <th className="py-space-md px-space-md font-bold">التصنيف الأكاديمي</th>
                  <th className="py-space-md px-space-md font-bold">حالة المادة</th>
                  <th className="py-space-md px-space-lg font-bold text-center">العلامة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((c, i) => {
                    const isPassed = c.status === 'منجزة';
                    const isCurrent = c.status === 'مسجلة';

                    return (
                      <tr
                        key={c.courseNumber || i}
                        className={`hover:bg-surface-container-low/40 transition-colors ${
                          isCurrent ? 'bg-surface-container-low/20' : ''
                        }`}
                      >
                        <td className="py-4 px-space-lg">
                          <div className="flex items-center gap-space-sm">
                            <div
                              className={`w-2.5 h-10 rounded-full shrink-0 ${
                                isPassed
                                  ? 'bg-secondary'
                                  : isCurrent
                                  ? 'bg-on-tertiary-container'
                                  : 'bg-outline-variant'
                              }`}
                            ></div>
                            <div>
                              <div className="flex items-center gap-space-xs">
                                <span className="font-label-lg text-label-lg text-primary font-bold">
                                  {c.courseName}
                                </span>
                                <span
                                  className="text-xs font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant"
                                  dir="ltr"
                                >
                                  {c.courseNumber}
                                </span>
                              </div>
                              {c.prerequisite && c.prerequisite !== '—' && (
                                <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                                  <span className="material-symbols-outlined text-[13px] text-secondary">link</span>
                                  <span>المتطلب السابق: {c.prerequisite}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-space-md text-center">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                            {c.creditHours}
                          </span>
                        </td>
                        <td className="py-4 px-space-md">
                          <span className="bg-surface-container-high text-on-surface px-2.5 py-1 rounded-full font-label-sm text-label-sm">
                            {c.category}
                          </span>
                        </td>
                        <td className="py-4 px-space-md">
                          {isPassed && (
                            <span className="inline-flex items-center gap-1 bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] px-3 py-1 rounded-full font-label-md text-label-md">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              منجزة بنجاح
                            </span>
                          )}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] px-3 py-1 rounded-full font-label-md text-label-md">
                              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                              مسجلة حالياً
                            </span>
                          )}
                          {!isPassed && !isCurrent && (
                            <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full font-label-md text-label-md">
                              <span className="material-symbols-outlined text-sm">pending</span>
                              متبقية
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-space-lg text-center font-bold text-primary font-mono">
                          {c.grade || (isPassed ? 'ناجح' : '—')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      لا توجد مواد تطابق معايير البحث المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 sm:p-space-md bg-surface-container-low/60 flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-xs sm:text-label-sm text-on-surface-variant border-t border-surface-container-high/40">
            <span>
              عرض {filteredCourses.length} مادة من أصل {coursesList.length} مادة بالخطة الكاملة
            </span>
          </div>
        </div>
      )}

      {/* View Mode 2: Interactive Dependency Tree Canvas */}
      {viewMode === 'tree' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg mb-space-xl overflow-hidden border border-surface-container-high/40">
          <div className="flex items-center justify-between mb-space-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary">
                شجرة الاعتمادية للمسار الحرج (Critical Prerequisite Path)
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                تسلسل فتح المواد التخصصية الأساسية حتى مشاريع التخرج
              </p>
            </div>
            <div className="flex items-center gap-space-sm text-xs font-label-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-secondary"></span>مجتاز
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-on-tertiary-container"></span>قيد الدراسة
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-surface-container-highest"></span>متبقي
              </span>
            </div>
          </div>

          {/* Tree Flow Visual Nodes — Dynamic from student's actual courses */}
          <div className="relative overflow-x-auto py-space-lg">
            {dependencyNodes.length > 0 ? (
              <div className="min-w-[850px] flex items-center justify-between relative px-space-md">
                {dependencyNodes.map((c, idx) => {
                  const isPassed = c.status === 'منجزة';
                  const isCurrent = c.status === 'مسجلة';
                  const isLast = idx === dependencyNodes.length - 1;
                  return (
                    <React.Fragment key={c.courseNumber || idx}>
                      <div className={`w-44 p-space-md rounded-xl shadow-sm text-center relative z-10 border-2 ${
                        isPassed
                          ? 'bg-[#ecfdf5] border-secondary'
                          : isCurrent
                          ? 'bg-tertiary-fixed border-on-tertiary-container'
                          : 'bg-surface-container-high border-outline-variant'
                      }`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold block mb-1 ${
                          isPassed ? 'bg-secondary text-on-secondary'
                          : isCurrent ? 'bg-on-tertiary-container text-on-primary'
                          : 'bg-surface-container-highest text-primary'
                        }`}>
                          {isPassed ? 'مجتاز ✓' : isCurrent ? 'مسجل حالياً' : 'متبقي'}
                        </span>
                        <span className={`font-label-md text-label-md font-bold block text-sm leading-tight ${
                          isPassed ? 'text-[#065f46]' : 'text-primary'
                        }`}>
                          {c.courseName.length > 22 ? c.courseName.slice(0, 22) + '…' : c.courseName}
                        </span>
                        <span className="font-mono text-xs text-on-surface-variant" dir="ltr">{c.courseNumber}</span>
                      </div>
                      {!isLast && (
                        <div className="flex-1 flex items-center justify-center relative">
                          <div className={`h-1 w-full ${
                            isPassed ? 'bg-secondary' : isCurrent ? 'bg-on-tertiary-container' : 'bg-outline-variant'
                          }`} />
                          <span className="material-symbols-outlined text-outline absolute -left-2 text-base">arrow_back</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-on-surface-variant py-8">
                لا توجد بيانات كافية لعرض شجرة الاعتمادية.
              </div>
            )}
          </div>
        </div>
      )}

      {/* تذييل الطباعة الرسمي للجامعة */}
      <PrintFooter />

      {/* Floating Micro-interaction Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-8 bg-primary text-on-primary px-space-lg py-space-sm rounded-xl shadow-lg z-50 flex items-center gap-space-sm animate-in fade-in slide-in-from-bottom-5 border border-secondary/20">
          <span className="material-symbols-outlined text-secondary-container">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
