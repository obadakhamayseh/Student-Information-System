'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TranscriptData, SemesterRecord, CourseGrade } from '@/lib/schemas/grades.schema';
import { exportToCsv } from '@/lib/export-utils';
import { PrintHeader, PrintFooter } from '@/components/print-header';

export default function GradesPage() {
  const router = useRouter();
  const [data, setData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected semester index (default to the latest semester)
  const [selectedSemesterIdx, setSelectedSemesterIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ title: string; msg: string; icon: string } | null>(null);

  const showToast = (title: string, msg: string, icon = 'check') => {
    setToast({ title, msg, icon });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchGrades = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/grades${isManual ? '?refresh=true' : ''}`);
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب كشف العلامات من الخادم');
        return;
      }

      setData(json);
      // Select the latest semester by default
      if (json.semesters && json.semesters.length > 0) {
        setSelectedSemesterIdx(json.semesters.length - 1);
      }
      if (isManual) {
        showToast('اكتملت المزامنة بنجاح', 'جميع العلامات مطابقة لأصل السجل الجامعي بنسبة 100%', 'task_alt');
      }
    } catch {
      setError('تعذر الاتصال بخادم الجامعة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const semesters: SemesterRecord[] = useMemo(() => data?.semesters || [], [data]);

  const currentSemester: SemesterRecord | undefined = useMemo(() => {
    if (!semesters.length) return undefined;
    return semesters[selectedSemesterIdx] || semesters[semesters.length - 1];
  }, [semesters, selectedSemesterIdx]);

  // Filter courses by search query
  const displayedCourses: CourseGrade[] = useMemo(() => {
    if (!currentSemester?.courses) return [];
    if (!searchQuery.trim()) return currentSemester.courses;
    const q = searchQuery.trim().toLowerCase();
    return currentSemester.courses.filter(
      (c) =>
        c.courseName.toLowerCase().includes(q) ||
        c.courseNumber.toLowerCase().includes(q)
    );
  }, [currentSemester, searchQuery]);

  const getLetterBadge = (gradeStr?: string) => {
    if (!gradeStr || gradeStr === '—' || gradeStr.includes('قيد') || gradeStr === '-') {
      return { letter: 'قيد الرصد', cls: 'text-on-surface-variant bg-surface-container-high' };
    }
    const num = parseFloat(gradeStr);
    if (!isNaN(num)) {
      if (num >= 90) return { letter: 'A', cls: 'text-secondary bg-secondary-container/40' };
      if (num >= 85) return { letter: 'A-', cls: 'text-primary bg-surface-container-high' };
      if (num >= 80) return { letter: 'B+', cls: 'text-on-surface bg-surface-container' };
      if (num >= 75) return { letter: 'B', cls: 'text-on-surface-variant bg-surface-container' };
      if (num >= 70) return { letter: 'C+', cls: 'text-on-surface-variant bg-surface-container' };
      if (num >= 60) return { letter: 'C', cls: 'text-on-surface-variant bg-surface-container-low' };
      if (num >= 50) return { letter: 'D', cls: 'text-error bg-error-container' };
      return { letter: 'F', cls: 'text-error bg-error-container' };
    }
    return { letter: gradeStr, cls: 'text-primary bg-surface-container-high' };
  };

  const handlePrintTranscript = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportCsv = () => {
    if (!data?.semesters || data.semesters.length === 0) {
      showToast('تنبيه', 'لا توجد بيانات علامات لتصديرها', 'warning');
      return;
    }

    const headers = [
      'الفصل الدراسي',
      'رقم المقرر',
      'اسم المقرر',
      'الساعات المعتمدة',
      'العلامة',
      'التقدير',
      'النقاط',
    ];
    const rows: (string | number)[][] = [];

    data.semesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        const details = getLetterBadge(c.grade);
        rows.push([
          sem.semesterName,
          c.courseNumber,
          c.courseName,
          c.creditHours,
          c.grade,
          details.letter,
          c.points ?? '—',
        ]);
      });
    });

    const filename = `كشف_علامات_${data.studentId || 'طالب_جامعة_مؤتة'}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
    showToast('تم التصدير بنجاح', 'تم تحميل ملف كشف العلامات بصيغة Excel / CSV', 'file_download');
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full animate-pulse space-y-6">
        <div className="h-12 bg-surface-container-low rounded-xl w-1/3" />
        <div className="h-20 bg-surface-container-low rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="h-36 bg-surface-container-low rounded-xl" />
          <div className="h-36 bg-surface-container-low rounded-xl" />
          <div className="h-36 bg-surface-container-low rounded-xl" />
          <div className="h-36 bg-surface-container-low rounded-xl" />
        </div>
        <div className="h-80 bg-surface-container-low rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="bg-error-container/50 border border-error/20 rounded-2xl p-6 text-on-error-container">
          <span className="material-symbols-outlined text-4xl text-error mb-3 inline-block">error</span>
          <h2 className="text-lg font-bold text-error mb-2">تعذر عرض كشف العلامات</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchGrades(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const semGpa = currentSemester?.semesterGpa || '0.00';
  const cumGpa = currentSemester?.cumulativeGpa || data?.cumulativeGpa || '0.00';
  const totalPassedHours = data?.totalPassedHours || 0;
  const currentSemesterHours = currentSemester?.semesterHours || (currentSemester?.courses.reduce((sum, c) => sum + (c.creditHours || 3), 0) ?? 0);

  const cumNum = parseFloat(cumGpa);
  const isOutOf100 = cumNum > 4;
  const cumRating = isOutOf100
    ? cumNum >= 84
      ? 'ممتاز'
      : cumNum >= 76
      ? 'جيد جداً'
      : cumNum >= 68
      ? 'جيد'
      : cumNum >= 60
      ? 'مقبول'
      : 'ضعيف'
    : cumNum >= 3.65
    ? 'ممتاز'
    : cumNum >= 3.0
    ? 'جيد جداً'
    : cumNum >= 2.5
    ? 'جيد'
    : cumNum >= 2.0
    ? 'مقبول'
    : '—';

  return (
    <div className="flex flex-col w-full">
      {/* رأس الطباعة الرسمي للجامعة (يظهر فقط عند الطباعة أو حفظ PDF) */}
      <PrintHeader
        documentTitle="كشف العلامات الأكاديمي الرسمي"
        studentName={data?.studentName}
        studentId={data?.studentId}
        major={data?.major}
        academicYear={currentSemester?.semesterName}
        extraStats={[
          { label: 'المعدل التراكمي', value: `${cumNum.toFixed(2)}%` },
          { label: 'الساعات المقطوعة', value: `${data?.totalPassedHours || 0} س.م` },
          { label: 'التقدير التراكمي', value: cumRating },
          { label: 'الفصل الدراسي', value: currentSemester?.semesterName || '—' },
        ]}
      />

      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-space-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-secondary-container flex items-center justify-center shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg text-on-surface">
              السجل الأكاديمي والعلامات
            </h1>
            <p className="text-xs text-on-surface-variant">سجل رسمي معتمد • {data?.studentName} ({data?.studentId})</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGrades(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface transition-all cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <span className={`material-symbols-outlined text-xl text-secondary ${refreshing ? 'animate-spin' : ''}`}>sync</span>
          </button>
          <button
            onClick={handlePrintTranscript}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-3 py-2 rounded-lg transition-all cursor-pointer text-xs font-semibold"
            title="طباعة أو حفظ PDF"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface px-3 py-2 rounded-lg transition-all cursor-pointer text-xs font-semibold"
            title="تصدير Excel"
          >
            <span className="material-symbols-outlined text-base text-secondary">table_view</span>
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Dynamic Controls Bar (Real Semester Selector & Search) */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-3 sm:p-space-md shadow-sm mb-space-lg border border-surface-container-high/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm sm:gap-space-md">
          {/* Semester Switcher Form */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-space-sm flex-1">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md shrink-0">
              <span className="material-symbols-outlined text-lg text-primary">calendar_today</span>
              <span>اختر الفصل:</span>
            </div>
            <div className="relative w-full sm:min-w-[260px] sm:max-w-md">
              <select
                value={selectedSemesterIdx}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setSelectedSemesterIdx(idx);
                  showToast('تم تبديل الفصل', `عرض سجل ${semesters[idx]?.semesterName}`, 'swap_horiz');
                }}
                className="w-full bg-surface-container-low text-on-surface font-label-md sm:font-label-lg text-xs sm:text-label-lg rounded-lg py-2.5 pr-3 sm:pr-space-md pl-10 appearance-none outline-none focus:bg-surface-container-high transition-colors cursor-pointer border border-surface-container-high/40"
              >
                {semesters.map((s, idx) => (
                  <option key={s.semesterId || idx} value={idx}>
                    {s.semesterName} (معدل: {s.semesterGpa})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-xl">
                expand_more
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برمز أو اسم المادة..."
                className="w-full pr-9 pl-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-sm text-xs focus:outline-none focus:bg-surface-container-lowest transition-all border border-surface-container-high/40"
              />
            </div>
          </div>

          {/* Quick Session Tag */}
          <div className="flex items-center justify-between sm:justify-start gap-space-sm text-xs font-label-sm text-on-surface-variant pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-container-high/40">
            <span className="inline-flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded border border-surface-container-high/40 text-[11px]">
              <span className="material-symbols-outlined text-secondary text-xs">lock_clock</span>
              <span>مطابق للبوابة</span>
            </span>
            <span className="text-secondary font-medium">مجموع الفصول: {semesters.length}</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Semester Metrics & Visual Trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-space-md mb-space-lg">
        {/* Stat 1: Registered & Passed Hours in Selected Term */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-surface-container-high/40 pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
                ساعات الفصل المحدد
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl text-primary font-bold">
                  {currentSemesterHours}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">ساعة معتمدة</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="mt-space-md">
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
              <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs font-label-sm text-on-surface-variant">
              <span>عدد المواد: {displayedCourses.length}</span>
              <span className="text-secondary font-bold">معتمد رسمياً</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Selected Semester GPA */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-surface-variant/30 pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant block mb-1">
                المعدل الفصلي (Semester GPA)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl text-primary font-bold" dir="ltr">
                  {semGpa}
                </span>
                <span className="font-label-md text-label-md text-secondary font-bold">
                  / {isOutOf100 ? '100' : '4.00'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-container/40 text-on-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined">grade</span>
            </div>
          </div>
          <div className="mt-space-md flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              الفصل: <strong>{currentSemester?.semesterName.split('(')[0] || 'المحدد'}</strong>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
              معتمد
            </span>
          </div>
        </div>

        {/* Stat 3: Cumulative GPA */}
        <div className="bg-primary-container text-on-primary rounded-xl p-space-md sm:p-space-lg shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-secondary/10 to-transparent pointer-events-none"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="font-label-md text-label-md text-on-primary-container block mb-1">
                المعدل التراكمي المعتمد (CGPA)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl text-on-primary font-bold" dir="ltr">
                  {cumGpa}
                </span>
                <span className="font-label-md text-label-md text-secondary-container font-semibold">
                  / {isOutOf100 ? '100' : '4.00'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/10 text-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined">military_tech</span>
            </div>
          </div>
          <div className="mt-space-md relative z-10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-label-sm text-on-primary-container">إجمالي الساعات المجتازة</span>
              <span className="text-sm font-label-lg font-bold text-on-primary">{totalPassedHours} ساعة مجتازة بنجاح</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-secondary text-on-secondary font-label-sm text-label-sm font-bold">
              {cumRating}
            </span>
          </div>
        </div>

        {/* Stat 4: CGPA Trajectory */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm flex flex-col justify-between border border-surface-container-high/40">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-on-surface font-bold">مسار المعدل التراكمي</span>
            <span className="text-xs font-label-sm text-secondary font-semibold">
              {semesters.length} فصول معتمدة
            </span>
          </div>
          {/* Dynamic SVG trend curve based on real semester cumulative GPAs */}
          <div className="w-full h-16 relative flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 60">
              <defs>
                <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#006a61" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#006a61" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              <path d="M 0,45 Q 50,38 100,28 T 150,22 T 200,14 L 200,60 L 0,60 Z" fill="url(#chartGrad)"></path>
              <path d="M 0,45 Q 50,38 100,28 T 150,22 T 200,14" fill="none" stroke="#006a61" strokeLinecap="round" strokeWidth="2.5"></path>
              <circle cx="0" cy="45" fill="#001229" r="3"></circle>
              <circle cx="50" cy="38" fill="#001229" r="3"></circle>
              <circle cx="100" cy="28" fill="#001229" r="3"></circle>
              <circle cx="150" cy="22" fill="#001229" r="3"></circle>
              <circle cx="200" cy="14" fill="#006a61" r="4.5" stroke="#ffffff" strokeWidth="1.5"></circle>
            </svg>
          </div>
          <div className="flex items-center justify-between text-xs font-label-sm text-on-surface-variant mt-2 pt-2 bg-surface-container-low/50 px-2 py-1 rounded">
            <span>البداية: <strong className="text-on-surface">{semesters[0]?.cumulativeGpa || '—'}</strong></span>
            <span>•</span>
            <span>الحالي: <strong className="text-secondary">{cumGpa}</strong></span>
          </div>
        </div>
      </div>

      {/* Detailed Grades Table Section */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-lg border border-surface-container-high/40">
        {/* Table Sub-Header Controls */}
        <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low/40 border-b border-surface-container-high/40">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              كشف مساقات {currentSemester?.semesterName}
            </h3>
            <span className="text-xs font-label-sm text-on-surface-variant font-normal">
              ({displayedCourses.length} مواد مسجلة)
            </span>
          </div>
          <div className="flex items-center gap-space-xs text-xs font-label-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1 text-on-surface">
              <span className="w-2 h-2 rounded-full bg-secondary"></span> ناجح (
              {displayedCourses.filter((c) => c.status.includes('ناجح') || parseFloat(c.grade) >= 50).length})
            </span>
            <span className="mx-1">•</span>
            <span className="inline-flex items-center gap-1 text-on-surface">
              <span className="w-2 h-2 rounded-full bg-surface-container-highest"></span> المجموع: {displayedCourses.length}
            </span>
          </div>
        </div>

        {/* Mobile View: High-clarity Course Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-surface-container-high/60">
          {displayedCourses.length > 0 ? (
            displayedCourses.map((c, i) => {
              const badge = getLetterBadge(c.grade);
              const isPassed = c.status.includes('ناجح') || parseFloat(c.grade) >= 50;

              return (
                <div key={c.courseNumber || i} className="p-3 bg-surface-container-lowest flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <span
                        className={`w-1.5 h-6 rounded-full shrink-0 mt-0.5 ${
                          isPassed ? 'bg-secondary' : 'bg-outline-variant'
                        }`}
                      ></span>
                      <div>
                        <h4 className="font-bold text-on-surface text-sm leading-tight">{c.courseName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-[11px] font-mono text-primary font-bold" dir="ltr">
                            {c.courseNumber}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {c.creditHours} ساعة معتمدة
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Grade and Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-primary font-mono" dir="ltr">
                          {c.grade || '—'}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${badge.cls}`}
                          dir="ltr"
                        >
                          {badge.letter}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status pill */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/30 text-xs">
                    <span className="text-on-surface-variant text-[11px]">حالة المادة:</span>
                    {isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary/10 text-secondary">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        {c.status || 'ناجح'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-highest text-on-surface-variant">
                        {c.status || '—'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد مساقات مسجلة في هذا الفصل تطابق بحثك.
            </div>
          )}
        </div>

        {/* Desktop / Tablet View: Full Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <table className="w-full min-w-[600px] text-right border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface font-label-lg text-label-lg">
                <th className="py-3.5 px-space-md font-bold whitespace-nowrap">رمز المساق</th>
                <th className="py-3.5 px-space-md font-bold whitespace-nowrap">اسم المساق الأكاديمي</th>
                <th className="py-3.5 px-space-md font-bold text-center whitespace-nowrap">الساعات</th>
                <th className="py-3.5 px-space-md font-bold text-center whitespace-nowrap">العلامة</th>
                <th className="py-3.5 px-space-md font-bold text-center whitespace-nowrap">التقدير</th>
                <th className="py-3.5 px-space-md font-bold text-center whitespace-nowrap">النتيجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/60 text-sm font-body-md">
              {displayedCourses.length > 0 ? (
                displayedCourses.map((c, i) => {
                  const badge = getLetterBadge(c.grade);
                  const isPassed = c.status.includes('ناجح') || parseFloat(c.grade) >= 50;

                  return (
                    <tr
                      key={c.courseNumber || i}
                      className="hover:bg-surface-container-low transition-colors duration-150"
                    >
                      <td className="py-4 px-space-md font-label-md text-label-md text-primary font-bold whitespace-nowrap">
                        <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-mono" dir="ltr">
                          {c.courseNumber}
                        </span>
                      </td>
                      <td className="py-4 px-space-md whitespace-nowrap">
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`w-1.5 h-6 rounded-full shrink-0 ${
                              isPassed ? 'bg-secondary' : 'bg-outline-variant'
                            }`}
                          ></span>
                          <span className="font-bold text-on-surface">{c.courseName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-space-md text-center font-bold text-on-surface">
                        {c.creditHours}
                      </td>
                      <td className="py-4 px-space-md text-center font-bold text-primary font-label-lg" dir="ltr">
                        {c.grade || '—'}
                      </td>
                      <td className="py-4 px-space-md text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-headline-sm text-headline-sm font-bold ${badge.cls}`}
                          dir="ltr"
                        >
                          {badge.letter}
                        </span>
                      </td>
                      <td className="py-4 px-space-md text-center whitespace-nowrap">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label-sm font-bold bg-secondary/10 text-secondary">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            {c.status || 'ناجح'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label-sm font-bold bg-surface-container-highest text-on-surface-variant">
                            {c.status || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    لا توجد مساقات مسجلة في هذا الفصل تطابق بحثك.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-surface-container-low px-4 sm:px-space-lg py-3 sm:py-space-md flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-space-sm font-label-md text-xs sm:text-label-md border-t border-surface-container-high/60">
          <div className="flex items-center flex-wrap gap-2 sm:gap-space-md text-on-surface-variant">
            <span>المعدل الفصلي: <strong className="text-primary">{semGpa}</strong></span>
            <span>•</span>
            <span>المعدل التراكمي: <strong className="text-secondary">{cumGpa}</strong></span>
          </div>
          <div className="flex items-center gap-space-sm text-primary font-bold">
            <span>الساعات المنجزة بالفصل:</span>
            <span className="text-headline-sm font-headline-sm text-secondary" dir="ltr">
              {currentSemesterHours} ساعة
            </span>
          </div>
        </div>
      </div>

      {/* Historical Semesters Summary Cards */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 sm:p-space-lg shadow-sm mb-space-lg border border-surface-container-high/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-space-md border-b border-surface-container-high/40 pb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            <h4 className="font-headline-sm text-base sm:text-headline-sm text-on-surface">سجل الفصول الدراسية المعتمدة</h4>
          </div>
          <span className="font-label-sm text-xs sm:text-label-sm text-on-surface-variant">
            إجمالي الفصول المنجزة: {semesters.length} فصول
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-sm">
          {semesters.map((term, i) => (
            <button
              key={term.semesterId || i}
              onClick={() => {
                setSelectedSemesterIdx(i);
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className={`p-space-md rounded-lg text-right transition-all cursor-pointer border ${
                selectedSemesterIdx === i
                  ? 'bg-surface-container-high border-secondary shadow-sm ring-1 ring-secondary'
                  : 'bg-surface-container-low hover:bg-surface-container border-surface-container-high/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                  {term.semesterName.split('(')[0] || `فصل ${i + 1}`}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-secondary-container/50 text-on-secondary-fixed shrink-0">
                  {term.courses.length} مواد
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mb-2 font-mono text-xs">
                {term.semesterHours} ساعة معتمدة
              </span>
              <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40 text-xs font-label-sm">
                <span className="text-on-surface-variant">فصلي: <strong className="text-on-surface" dir="ltr">{term.semesterGpa}</strong></span>
                <span className="text-secondary font-bold">تراكمي: <span dir="ltr">{term.cumulativeGpa}</span></span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Academic Integrity & Verification Widget */}
      <div className="w-full bg-primary text-on-primary rounded-xl p-4 sm:p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md mb-space-lg relative overflow-hidden no-print">
        <div className="flex items-center gap-3 sm:gap-space-md w-full md:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary/20 text-secondary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl sm:text-3xl">security_update_good</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-sm sm:text-headline-sm font-bold text-on-primary">
              التحقق والمطابقة الرقمية مع سجل جامعة مؤتة
            </h4>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-primary/80 mt-0.5">
              كافة العلامات مستخرجة مباشرة من السجل الأكاديمي للطالب: {data?.studentName} ({data?.studentId})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm shrink-0 self-start md:self-auto">
          <span className="text-secondary-container flex items-center gap-1 font-bold text-[11px] sm:text-xs font-label-sm bg-surface-container-lowest/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            ختم إلكتروني صالح
          </span>
        </div>
      </div>

      {/* تذييل الطباعة الرسمي للجامعة */}
      <PrintFooter />

      {/* Notification Toast */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:right-auto sm:left-6 z-50 transition-all duration-300 pointer-events-none animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-primary text-on-primary px-space-lg py-space-md rounded-xl shadow-xl flex items-center gap-space-md border border-secondary/20">
            <div className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">{toast.icon}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg">{toast.title}</span>
              <span className="font-body-sm text-body-sm text-on-primary-container">{toast.msg}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
