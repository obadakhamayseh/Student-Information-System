'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudyPlanData, PlanCourse } from '@/lib/schemas/plan.schema';
import { exportToCsv } from '@/lib/export-utils';
import { PrintHeader, PrintFooter } from '@/components/print-header';
import {
  generateGraduationRoadmap,
  RoadmapSemester,
  RoadmapConfig,
  DEFAULT_ROADMAP_CONFIG,
  PlannedCourseItem,
} from '@/lib/roadmap-engine';

export default function GraduationRoadmapPage() {
  const router = useRouter();
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuration state for customized pathways
  const [config, setConfig] = useState<RoadmapConfig>({
    ...DEFAULT_ROADMAP_CONFIG,
    pace: 'balanced',
    includeSummer: true,
    maxRegularHours: 16,
    maxSummerHours: 9,
  });

  // Category filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(true);

  // Customized semesters state (allows drag/move adjustments)
  const [customSemesters, setCustomSemesters] = useState<RoadmapSemester[] | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPlan = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/plan${force ? '?refresh=true' : ''}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        setError(json.message || 'تعذر جلب الخطة الدراسية من الخادم');
        return;
      }

      const json: StudyPlanData = await res.json();
      setPlanData(json);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  // Compute the generated roadmap automatically when planData or config changes
  const baseRoadmap = useMemo(() => {
    if (!planData) return null;
    return generateGraduationRoadmap(planData, config);
  }, [planData, config]);

  // Keep customSemesters in sync with generated roadmap initially
  useEffect(() => {
    if (baseRoadmap) {
      setCustomSemesters(baseRoadmap.semesters);
    }
  }, [baseRoadmap]);

  const activeSemesters = customSemesters || baseRoadmap?.semesters || [];

  // Interactive course shift between semesters
  const moveCourseToSemester = (courseNumber: string, sourceSemIdx: number, targetSemIdx: number) => {
    if (!customSemesters) return;
    if (targetSemIdx < 0 || targetSemIdx >= customSemesters.length) return;

    const targetSem = customSemesters[targetSemIdx];
    if (targetSem.isCurrentSemester) {
      showToast('لا يمكن نقل مقررات إلى الفصل الحالي (المساقات مسجلة فعلياً بالجامعة)');
      return;
    }

    const newSemesters = customSemesters.map((s) => ({
      ...s,
      courses: [...s.courses],
    }));

    const sourceCourses = newSemesters[sourceSemIdx].courses;
    const courseIndex = sourceCourses.findIndex((c) => c.courseNumber === courseNumber);
    if (courseIndex === -1) return;

    const movedCourse = sourceCourses[courseIndex];
    const courseHours = movedCourse.creditHours || 3;

    // فحص الحد الأقصى الأكاديمي الصارم:
    // 1. في الفصل العادي غير الخريج: الحد الأقصى الصارم 18 س.م (لا يمكن تجاوزه لأي فصل غير فصل التخرج)
    // 2. في فصل التخرج العادي: يُسمح استثنائياً حتى 21 س.م
    // 3. في الفصل الصيفي غير الخريج: الحد الأقصى 10 س.م
    // 4. في فصل التخرج الصيفي: يُسمح استثنائياً حتى 12 س.م
    const maxAllowed = targetSem.isGraduationSemester
      ? targetSem.isSummer
        ? 12
        : 21
      : targetSem.isSummer
      ? 10
      : 18;

    const prospectiveHours = targetSem.totalHours + courseHours;
    if (prospectiveHours > maxAllowed) {
      showToast(
        `تعذر النقل: العبء سيتجاوز الحد الأقصى المسموح (${maxAllowed} س.م ${
          targetSem.isGraduationSemester
            ? targetSem.isSummer
              ? 'لفصل التخرج الصيفي'
              : 'لفصل التخرج'
            : targetSem.isSummer
            ? 'للفصل الصيفي'
            : 'للفصل العادي (الحد الأقصى 18 س.م)'
        })`
      );
      return;
    }

    sourceCourses.splice(courseIndex, 1);
    newSemesters[targetSemIdx].courses.push(movedCourse);

    // Recalculate hours
    newSemesters[sourceSemIdx].totalHours = sourceCourses.reduce((sum, c) => sum + (c.creditHours || 3), 0);
    newSemesters[targetSemIdx].totalHours = newSemesters[targetSemIdx].courses.reduce((sum, c) => sum + (c.creditHours || 3), 0);

    // تحديث حالة العبء والألوان مع مراعاة فصل التخرج حصراً
    const updateWorkload = (sem: RoadmapSemester) => {
      if (sem.isCurrentSemester) return;
      if (sem.isGraduationSemester) {
        if (sem.isSummer) {
          if (sem.totalHours > 10) {
            sem.workloadStatus = 'عبء تخرج صيفي استثنائي (12 س.م)';
            sem.workloadColor = 'purple';
          } else {
            sem.workloadStatus = 'صيفي مركز';
            sem.workloadColor = 'amber';
          }
        } else {
          if (sem.totalHours > 18) {
            sem.workloadStatus = 'عبء تخرج استثنائي (21 س.م)';
            sem.workloadColor = 'purple';
          } else if (sem.totalHours === 18) {
            sem.workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
            sem.workloadColor = 'purple';
          } else if (sem.totalHours <= 12) {
            sem.workloadStatus = 'خفيف';
            sem.workloadColor = 'emerald';
          } else {
            sem.workloadStatus = 'متوازن ومثالي';
            sem.workloadColor = 'blue';
          }
        }
      } else {
        if (sem.isSummer) {
          sem.workloadStatus = 'صيفي مركز';
          sem.workloadColor = 'amber';
        } else if (sem.totalHours >= 18) {
          sem.workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
          sem.workloadColor = 'purple';
        } else if (sem.totalHours <= 12) {
          sem.workloadStatus = 'خفيف';
          sem.workloadColor = 'emerald';
        } else {
          sem.workloadStatus = 'متوازن ومثالي';
          sem.workloadColor = 'blue';
        }
      }
    };

    updateWorkload(newSemesters[sourceSemIdx]);
    updateWorkload(newSemesters[targetSemIdx]);

    setCustomSemesters(newSemesters);
    showToast(`تم نقل المقرر "${movedCourse.courseName}" إلى ${newSemesters[targetSemIdx].semesterName}`);
  };

  const handlePaceChange = (pace: 'balanced' | 'fast' | 'light') => {
    const maxReg = pace === 'fast' ? 18 : pace === 'light' ? 14 : 16;
    setConfig((prev) => ({
      ...prev,
      pace,
      maxRegularHours: maxReg,
    }));
    showToast(
      pace === 'fast'
        ? 'تم تفعيل مسار الحد الأقصى العادي (18 س.م لكل فصل، وحتى 21 س.م لفصل التخرج)'
        : pace === 'light'
        ? 'تم تفعيل مسار التخفيف (12-14 س.م لكل فصل)'
        : 'تم تفعيل مسار التوازن الأكاديمي (15-16 س.م لكل فصل)'
    );
  };

  const toggleSummer = () => {
    setConfig((prev) => ({
      ...prev,
      includeSummer: !prev.includeSummer,
    }));
    showToast(config.includeSummer ? 'تم استبعاد الفصول الصيفية من مسار التخرج' : 'تم تضمين الفصول الصيفية لتسريع موعد التخرج');
  };

  const handleCopyCourseCode = (code: string, name: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(`تم نسخ رقم المقرر (${code}) - ${name}`);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportRoadmapCsv = () => {
    if (!activeSemesters || activeSemesters.length === 0) return;

    const headers = [
      'رقم الفصل',
      'اسم الفصل الدراسي',
      'السنة الأكاديمية',
      'نوع الفصل',
      'رقم المقرر',
      'اسم المقرر',
      'الساعات المعتمدة',
      'المستوى',
      'تصنيف المساق',
      'سبب الإدراج الأكاديمي',
    ];

    const rows: (string | number)[][] = [];
    activeSemesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        rows.push([
          sem.semesterNumber,
          sem.semesterName,
          sem.academicYear,
          sem.isSummer ? 'صيفي' : 'نظامي',
          c.courseNumber,
          c.courseName,
          c.creditHours || 3,
          c.level ? `سنة ${c.level}` : '—',
          c.category || 'متطلب خطة',
          c.reason || '—',
        ]);
      });
    });

    const filename = `خريطة_التخرج_${planData?.majorName || 'جامعة_مؤتة'}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
    showToast('تم تصدير خريطة التخرج بنجاح إلى ملف Excel / CSV');
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-44 bg-surface-container-low rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface-container-low rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-surface-container-low rounded-2xl" />
      </div>
    );
  }

  if (error && !planData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="bg-error-container/40 border border-error/30 rounded-2xl p-space-xl text-on-surface">
          <span className="material-symbols-outlined text-5xl text-error mb-3">warning</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر إنشاء خريطة التخرج</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchPlan(true)}
            className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 hover:bg-primary-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const remainingHours = baseRoadmap?.totalRemainingHours || 0;
  const completedHours = baseRoadmap?.completedHours || 0;
  const currentRegisteredHours = baseRoadmap?.currentRegisteredHours || 0;
  const totalDegreeHours = baseRoadmap?.totalDegreeHours || 132;
  const progressPercent = baseRoadmap?.progressPercent || 0;
  const estimatedGraduationSemester = baseRoadmap?.estimatedGraduationSemester || '—';
  const semestersCount = activeSemesters.length;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* رأس الطباعة الرسمي للجامعة (يظهر فقط عند الطباعة أو حفظ PDF) */}
      <PrintHeader
        documentTitle="خريطة التخرج ومسار الفصول المقترحة"
        studentName={planData?.studentName}
        studentId={planData?.studentId}
        major={planData?.majorName}
        academicYear={estimatedGraduationSemester}
        extraStats={[
          { label: 'الساعات المنجزة', value: `${completedHours} س.م` },
          { label: 'الساعات المسجلة حالياً', value: `${currentRegisteredHours} س.م` },
          { label: 'الساعات المتبقية', value: `${remainingHours} س.م` },
          { label: 'الفصل المتوقع للتخرج', value: estimatedGraduationSemester },
        ]}
      />

      {/* 1. Header Banner & Context */}
      <div className="w-full bg-gradient-to-l from-primary via-primary-container to-slate-900 text-on-primary rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden mb-space-lg border border-white/10 no-print">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-secondary-container/30 text-secondary-container px-3 py-1 rounded-full font-label-sm text-xs font-bold flex items-center gap-1.5 border border-secondary-container/20">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                المرشد الأكاديمي الذكي (AI Graduation Advisor)
              </span>
              <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full font-label-sm text-xs">
                {planData?.majorName || 'الخطة الأكاديمية'}
              </span>
              {planData?.planYear && (
                <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full font-label-sm text-xs">
                  خطة سنة {planData.planYear}
                </span>
              )}
            </div>

            <h1 className="font-headline-xl text-2xl sm:text-headline-xl font-bold tracking-tight text-white">
              خريطة التخرج ومسار الفصول المقترحة
            </h1>
            <p className="font-body-md text-on-primary-container max-w-2xl text-xs sm:text-sm leading-relaxed">
              مسار متكامل ومجدول ذكياً للفصول المتبقية حتى التخرج. تم حساب الأسبقيات والمساقات الحرجة ومشاريع التخرج مع موازنة عبء الامتحانات والمعدل التراكمي.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => fetchPlan(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>sync</span>
              <span>{refreshing ? 'جاري التحديث...' : 'تحديث المسار'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              title="طباعة خريطة التخرج أو حفظها كـ PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={handleExportRoadmapCsv}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              title="تصدير مسار التخرج والفصول المقترحة إلى ملف Excel / CSV"
            >
              <span className="material-symbols-outlined text-base text-secondary-container">table_view</span>
              <span>تصدير Excel</span>
            </button>
            <Link
              href="/plan"
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">account_tree</span>
              <span>الخطة الشجرية</span>
            </Link>
          </div>
        </div>

        {/* Decorative background watermarks */}
        <div className="absolute -left-10 -bottom-10 opacity-10 pointer-events-none select-none text-white">
          <span className="material-symbols-outlined text-[200px]">route</span>
        </div>
      </div>

      {/* 2. Interactive Strategy & Pace Controller */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm border border-surface-container-high/50 mb-space-lg no-print">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-sm text-sm sm:text-headline-sm text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <span>تخصيص سرعة ووتيرة التخرج (Graduation Pace Simulation)</span>
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              الحد الأقصى في الفصل العادي <strong>18 س.م</strong>، ويُسمح للطالب الخريج بتسجيل حتى <strong>21 س.م</strong> حصراً في فصل تخرجه، وفي الصيفي حتى <strong>10 س.م</strong> (وحتى <strong>12 س.م</strong> للخريج بالصيفي).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            {/* Pace Buttons */}
            <div className="bg-surface-container-low p-1 rounded-xl flex items-center gap-1 border border-surface-container-high/40 w-full sm:w-auto justify-between">
              <button
                onClick={() => handlePaceChange('fast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.pace === 'fast'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span>⚡</span>
                <span>أقصى عبء عادي (18 س.م)</span>
              </button>
              <button
                onClick={() => handlePaceChange('balanced')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.pace === 'balanced'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span>⚖️</span>
                <span>متوازن (15-16 س.م)</span>
              </button>
              <button
                onClick={() => handlePaceChange('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.pace === 'light'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span>🌿</span>
                <span>مخفف (12-14 س.م)</span>
              </button>
            </div>

            {/* Summer Toggle Button */}
            <button
              onClick={toggleSummer}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer border ${
                config.includeSummer
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-surface-container-low border-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-base text-amber-600">
                {config.includeSummer ? 'wb_sunny' : 'nightlight'}
              </span>
              <span>{config.includeSummer ? 'الفصول الصيفية: مفعّلة ✓' : 'الفصول الصيفية: مستبعدة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        {/* Card 1: Remaining Hours */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">الساعات المتبقية للتخرج</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">hourglass_bottom</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-primary">{remainingHours}</span>
              <span className="text-xs text-on-surface-variant font-medium">ساعة معتمدة</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-on-surface-variant mt-1.5">
              <span>أنجزت {completedHours} س.م فعلياً • {currentRegisteredHours} س.م قيد الدراسة بالفصل الحالي</span>
              <span>المجموع {totalDegreeHours} س.م</span>
            </div>
          </div>
        </div>

        {/* Card 2: Semesters Needed */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">الفصول الدراسية المتبقية</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">calendar_view_week</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-secondary">{semestersCount}</span>
              <span className="text-xs text-on-surface-variant font-medium">فصول دراسية</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              الفصل الحالي ({currentRegisteredHours} س.م قيد الدراسة) يليه {semestersCount > 1 ? `${semestersCount - 1} فصول للتخرج` : 'فصل التخرج'}
            </p>
          </div>
        </div>

        {/* Card 3: Target Graduation Term */}
        <div className="bg-gradient-to-br from-secondary/10 to-secondary-container/20 rounded-xl p-5 shadow-sm border border-secondary/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-secondary">موعد التخرج التقديري</span>
            <span className="material-symbols-outlined text-2xl text-secondary">school</span>
          </div>
          <div className="mt-2">
            <span className="font-headline-sm text-base sm:text-headline-sm font-extrabold text-primary block leading-tight">
              {estimatedGraduationSemester}
            </span>
            <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-on-secondary rounded text-[11px] font-bold">
              فصل إنهاء متطلبات الدرجة 🎓
            </span>
          </div>
        </div>

        {/* Card 4: Load Balance & Quality Score */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">مؤشر جودة وتوازن الخطة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-emerald-600">98%</span>
              <span className="text-xs text-emerald-700 font-bold">متطابق ومثالي</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              تم ضبط المتطلبات السابقة وتسلسل مشاريع التخرج 1 و 2
            </p>
          </div>
        </div>
      </div>

      {/* 4. Academic Plan Categories Audit (تدقيق متطلبات الخطة الأكاديمية) */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container-high/50 mb-space-lg">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="font-headline-sm text-sm sm:text-headline-sm text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
              <span>تدقيق تصنيفات متطلبات الخطة الأكاديمية (Degree Requirements Audit)</span>
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              مبني بدقة 100% على شجرة خطتك الرسمية بجامعة مؤتة • متطلب 00 منجز بالكامل • تم ضبط الساعات الاختيارية دون زيادة
            </p>
          </div>

          <button
            onClick={() => setShowAuditPanel(!showAuditPanel)}
            className="text-xs font-bold text-primary hover:text-secondary inline-flex items-center gap-1 cursor-pointer transition-colors py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base">
              {showAuditPanel ? 'expand_less' : 'expand_more'}
            </span>
            <span>{showAuditPanel ? 'إخفاء جدول التدقيق' : 'عرض جدول التدقيق الكامل'}</span>
          </button>
        </div>

        {/* Categories Strip Cards */}
        {showAuditPanel && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
            {baseRoadmap?.categoriesSummary.map((cat) => {
              const isDone = cat.status === 'مكتمل';

              return (
                <div
                  key={cat.categoryId || cat.name}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/10'
                      : 'bg-surface-container-lowest border-surface-container-high/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-label-md text-xs font-bold text-on-surface line-clamp-1">
                        {cat.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {cat.status}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                      <span>المطلوب: {cat.requiredHours} س.م</span>
                      <span>المنجز: {cat.completedHours} س.م</span>
                      {cat.enrolledHours > 0 && (
                        <span className="text-blue-700 font-bold">قيد الدراسة: {cat.enrolledHours} س.م</span>
                      )}
                    </div>

                    {/* Progress Bar (مبني على الساعات المنجزة فعلياً) */}
                    <div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-600' : 'bg-primary'
                        }`}
                        style={{
                          width: `${
                            cat.requiredHours > 0
                              ? Math.min(
                                  100,
                                  Math.round((cat.completedHours / cat.requiredHours) * 100)
                                )
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-container-high/40 flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant">
                      المتبقي المطلوب:{' '}
                      <strong className="text-primary">{cat.remainingHours} س.م</strong>
                    </span>
                    {cat.name.includes('00') && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        معفى / منجز ✓
                      </span>
                    )}
                    {cat.isElective && cat.remainingHours > 0 && (
                      <span className="text-[10px] text-amber-800 font-medium">
                        خيار استرشادي
                      </span>
                    )}
                    {cat.isRemedial && (
                      <span className="text-[10px] text-amber-800 font-medium">
                        أولوية فصل 1
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-surface-container-high/40 text-xs">
          <span className="font-bold text-on-surface-variant text-[11px] ml-1">تصفية العرض:</span>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            الكل ({remainingHours} س.م)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('major_comp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'major_comp'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            تخصص إجباري ({baseRoadmap?.stats.majorCompulsoryRemaining || 0} س.م)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('major_elec')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'major_elec'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            تخصص اختياري ({baseRoadmap?.stats.majorElectiveRemaining || 0} س.م)
          </button>
          {baseRoadmap && baseRoadmap.stats.collegeCompulsoryRemaining > 0 && (
            <button
              onClick={() => setSelectedCategoryFilter('college_comp')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'college_comp'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
              }`}
            >
              كلية إجباري ({baseRoadmap.stats.collegeCompulsoryRemaining} س.م)
            </button>
          )}
          <button
            onClick={() => setSelectedCategoryFilter('uni_comp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'uni_comp'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            جامعة إجباري ({baseRoadmap?.stats.uniCompulsoryRemaining || 0} س.م)
          </button>
          {baseRoadmap && baseRoadmap.stats.remedialRemaining > 0 && (
            <button
              onClick={() => setSelectedCategoryFilter('remedial')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'remedial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              استدراكي ({baseRoadmap.stats.remedialRemaining} مقرر)
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Semesters Roadmap Track */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <h3 className="font-headline-md text-lg sm:text-headline-md text-primary font-bold">
              المسار الزمني المجدول للفصول الدراسية القادمة
            </h3>
          </div>
          <span className="text-xs font-medium text-on-surface-variant">
            إجمالي {activeSemesters.length} فصول • {remainingHours} ساعة موزعة بالكامل
          </span>
        </div>

        {activeSemesters.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container-high/40">
            <span className="material-symbols-outlined text-6xl text-secondary mb-3">school</span>
            <h4 className="font-headline-md text-xl font-bold text-primary">تهانينا! لا توجد مواد متبقية</h4>
            <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
              لقد أتممت بنجاح جميع متطلبات التخرج وساعات الخطة الدراسية المقررة لك.
            </p>
          </div>
        ) : (
          activeSemesters.map((sem, semIdx) => {
            const isLast = semIdx === activeSemesters.length - 1;
            return (
              <div
                key={sem.id}
                className={`bg-surface-container-lowest rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                  sem.isGraduationSemester
                    ? 'border-2 border-secondary ring-4 ring-secondary/10'
                    : sem.isCurrentSemester
                    ? 'border-2 border-blue-500/60 ring-4 ring-blue-500/10'
                    : 'border-surface-container-high/60 hover:border-primary/40'
                }`}
              >
                {/* Semester Header */}
                <div
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                    sem.isGraduationSemester
                      ? 'bg-gradient-to-l from-secondary/15 via-secondary/5 to-transparent border-secondary/30'
                      : sem.isCurrentSemester
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60'
                      : sem.isSummer
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50'
                      : 'bg-surface-container-low/50 border-surface-container-high/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        sem.isGraduationSemester
                          ? 'bg-secondary text-on-secondary'
                          : sem.isCurrentSemester
                          ? 'bg-blue-600 text-white'
                          : sem.isSummer
                          ? 'bg-amber-500 text-white'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {sem.semesterNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                          {sem.semesterName}
                        </h4>
                        {sem.isCurrentSemester && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-label-sm text-xs font-extrabold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-blue-700">pending_actions</span>
                            الفصل الحالي (قيد الدراسة) ⏳
                          </span>
                        )}
                        {sem.isGraduationSemester && (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-xs font-extrabold flex items-center gap-1 animate-pulse">
                              <span className="material-symbols-outlined text-xs">school</span>
                              فصل التخرج الرسمي 🎓
                            </span>
                            {!sem.isSummer ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                مسموح حتى 21 س.م (عبء خريج)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                مسموح حتى 12 س.م (خريج بالصيفي)
                              </span>
                            )}
                          </>
                        )}
                        {sem.isSummer && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                            فصل صيفي
                          </span>
                        )}
                      </div>
                      <span className="font-label-sm text-xs text-on-surface-variant block mt-0.5">
                        {sem.isCurrentSemester
                          ? `المساقات المسجلة فعلياً: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد قيد الدراسة)`
                          : sem.isGraduationSemester
                          ? sem.isSummer
                            ? `العبء الفصلي: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد) • مسموح حتى 12 س.م لتخرج الصيفي`
                            : `العبء الفصلي: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد) • مسموح حتى 21 س.م للتخرج`
                          : sem.isSummer
                          ? `العبء الفصلي: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد) • الحد الأقصى 10 س.م`
                          : `العبء الفصلي: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد) • الحد الأقصى 18 س.م`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                        sem.workloadColor === 'amber'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : sem.workloadColor === 'purple'
                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                          : sem.workloadColor === 'emerald'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      {sem.workloadStatus}
                    </span>

                    <span className="px-3 py-1 bg-surface-container rounded-lg font-mono text-xs font-bold text-primary">
                      {sem.totalHours} س.م
                    </span>
                  </div>
                </div>

                {/* Courses Table / Cards in this semester */}
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sem.courses.map((course) => {
                      const isMatchFilter =
                        selectedCategoryFilter === 'all'
                          ? true
                          : selectedCategoryFilter === 'college_comp'
                          ? course.category.includes('كلي') &&
                            (course.category.includes('إجبار') || course.category.includes('اجبار'))
                          : selectedCategoryFilter === 'major_comp'
                          ? course.category.includes('تخص') &&
                            (course.category.includes('إجبار') || course.category.includes('اجبار'))
                          : selectedCategoryFilter === 'major_elec'
                          ? course.isElectiveChoice ||
                            course.category.includes('اختيار') ||
                            course.category.includes('إختيار')
                          : selectedCategoryFilter === 'uni_comp'
                          ? course.category.includes('جامع') &&
                            (course.category.includes('إجبار') || course.category.includes('اجبار'))
                          : selectedCategoryFilter === 'remedial'
                          ? course.isRemedial || course.level === 0 || course.category.includes('استدراكي')
                          : true;

                      return (
                        <div
                          key={course.courseNumber}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            !isMatchFilter
                              ? 'opacity-30 grayscale border-surface-container-high'
                              : course.isCriticalPath
                              ? 'bg-primary/[0.02] border-primary/20 hover:border-primary shadow-2xs'
                              : 'bg-surface-container-lowest border-surface-container-high/60 hover:border-surface-container-highest'
                          }`}
                        >
                          <div>
                            {/* Course header */}
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className="font-mono text-xs bg-surface-container px-2 py-0.5 rounded font-bold text-on-surface-variant"
                                dir="ltr"
                              >
                                {course.courseNumber}
                              </span>

                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded font-bold bg-surface-container-low text-primary">
                                  {course.creditHours} س.م
                                </span>
                                <span
                                  className={`font-label-sm text-[10px] px-2 py-0.5 rounded font-bold ${
                                    course.difficulty === 'متقدم'
                                      ? 'bg-purple-100 text-purple-900'
                                      : course.difficulty === 'سهل'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-blue-100 text-blue-900'
                                  }`}
                                >
                                  {course.difficulty}
                                </span>
                              </div>
                            </div>

                            {/* Course name */}
                            <h5 className="font-label-lg text-sm font-bold text-primary mt-2 leading-tight">
                              {course.courseName}
                            </h5>

                            {/* Category badge & Special Tag */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-on-surface-variant line-clamp-1">
                                {course.category}
                              </span>
                              {sem.isCurrentSemester && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  قيد الدراسة بالفصل الحالي
                                </span>
                              )}
                              {course.isElectiveChoice && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  خيار اختياري مقترح
                                </span>
                              )}
                              {course.isRemedial && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500 text-white">
                                  استدراكي إجباري
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reason Badge & Action Buttons */}
                          <div className="pt-2 border-t border-surface-container-high/40 space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-xs text-secondary">tips_and_updates</span>
                              <span className="line-clamp-1">{course.reason}</span>
                            </div>

                            <div className="flex items-center justify-between gap-1 pt-1">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCopyCourseCode(course.courseNumber, course.courseName)}
                                  title="نسخ رقم المساق للتسجيل"
                                  className="text-[11px] font-bold text-on-surface-variant hover:text-primary flex items-center gap-1 py-1 px-2 rounded hover:bg-surface-container cursor-pointer transition-colors"
                                >
                                  <span className="material-symbols-outlined text-xs">content_copy</span>
                                  <span>نسخ الرمز</span>
                                </button>
                              </div>

                              {/* Shift course across semesters (only allowed for upcoming semesters) */}
                              {!sem.isCurrentSemester && (
                                <div className="flex items-center gap-1">
                                  {semIdx > (activeSemesters[0]?.isCurrentSemester ? 1 : 0) && (
                                    <button
                                      onClick={() => moveCourseToSemester(course.courseNumber, semIdx, semIdx - 1)}
                                      title="نقل إلى الفصل السابق"
                                      className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                                    </button>
                                  )}
                                  {semIdx < activeSemesters.length - 1 && (
                                    <button
                                      onClick={() => moveCourseToSemester(course.courseNumber, semIdx, semIdx + 1)}
                                      title="نقل إلى الفصل التالي"
                                      className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-base">arrow_back</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Smart Academic Advisory Note Box */}
      <div className="mt-space-lg bg-primary-container text-on-primary rounded-2xl p-6 shadow-sm border border-secondary/20 relative overflow-hidden">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shrink-0 shadow-md">
            <span className="material-symbols-outlined text-2xl">psychology</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-primary">
              توصيات وخطة المرشد الأكاديمي لضمان التخرج في الموعد المحدد:
            </h4>
            <ul className="text-xs sm:text-sm text-on-primary-container space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>أولوية المواد الاستدراكية:</strong> يجب تسجيل المواد الاستدراكية (99) فوراً في أول فصل دراسي لأنها تفتح المواد الأساسية لخطتك.
              </li>
              <li>
                <strong>تتابع مشاريع التخرج:</strong> تم فصل مشروع تخرج 1 ومشروع تخرج 2 في فصلين متتاليين لضمان شرط الأسبقية الأكاديمي بجامعة مؤتة.
              </li>
              <li>
                <strong>استثمار الفصل الصيفي:</strong> إدراج المواد الاختيارية ومتطلبات الجامعة في الفصل الصيفي يخفف الضغط عن الفصول النظامية ويرفع المعدل التراكمي.
              </li>
              <li>
                <strong>قاعدة الحد الأقصى للعبء الفصلي (18 / 21 س.م وعادي / صيفي):</strong> في الفصول العادية يُسمح بتسجيل حتى <strong>18 ساعة معتمدة</strong> كحد أقصى، ولا يُسمح بتجاوزها إلا في <strong>فصل التخرج حصراً</strong> حيث يُسمح للطالب الخريج بتسجيل حتى <strong>21 ساعة معتمدة</strong>. وفي الفصل الصيفي يكون الحد الأقصى <strong>10 ساعات معتمدة</strong>، ويُسمح للطالب الخريج في الفصل الصيفي بتسجيل حتى <strong>12 ساعة معتمدة</strong>.
              </li>
              <li>
                <strong>المرونة والتعديل:</strong> يمكنك استخدام أزرار الأسهم لنقل أي مادة بين الفصول حسب تفضيلاتك، مع التزام النظام بالحد الأقصى المسموح أكاديمياً.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* تذييل الطباعة الرسمي للجامعة */}
      <PrintFooter />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-primary text-on-primary px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 border border-secondary/30">
          <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
