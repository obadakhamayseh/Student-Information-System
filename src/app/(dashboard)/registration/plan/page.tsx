'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RegistPlanData, RegistPlanCourse } from '@/lib/schemas/registration.schema';

export default function RegistPlanPage() {
  const router = useRouter();
  const [data, setData] = useState<RegistPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<RegistPlanCourse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'متاحة' | 'مسجلة' | 'مكتملة'>('all');

  const fetchRegistPlan = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registration/plan', { cache: 'no-store' });
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب صفحة التسجيل بالخطة');
        return;
      }

      setData(json);

      // فتح الفئات تلقائياً افتراضياً
      if (json.categories && json.categories.length > 0) {
        const initialExpanded = new Set<string>();
        json.categories.slice(0, 3).forEach((cat: any) => initialExpanded.add(cat.categoryId));
        setExpandedCategories(initialExpanded);
      }
    } catch {
      setError('تعذر الاتصال بخادم الجامعة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistPlan();
  }, []);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const expandAll = () => {
    if (!data?.categories) return;
    setExpandedCategories(new Set(data.categories.map((c) => c.categoryId)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleRegisterCourse = async (course: RegistPlanCourse) => {
    const chosenSection = selectedSections[course.courseNumber] || course.availableSections[0]?.sectionNumber;
    if (!chosenSection) {
      setActionMessage({ type: 'error', text: 'يرجى اختيار الشعبة أولاً' });
      return;
    }

    setActionLoading(course.courseNumber);
    setActionMessage(null);

    try {
      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          courseNumber: course.courseNumber,
          section: chosenSection,
          csrfToken: data?.csrfToken,
          redirectPage: 'registplan.jsp',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: `تم تسجيل مادة "${course.courseName}" (شعبة ${chosenSection}) بنجاح!`,
        });
        fetchRegistPlan(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر إتمام التسجيل، يرجى التأكد من الشروط والشعبة',
        });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ في الاتصال أثناء التسجيل' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDropConfirm = async () => {
    if (!dropTarget) return;

    setActionLoading(dropTarget.courseNumber);
    setActionMessage(null);

    try {
      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'drop',
          courseNumber: dropTarget.courseNumber,
          section: dropTarget.currentSection || '1',
          csrfToken: data?.csrfToken,
          redirectPage: 'registplan.jsp',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: `تم سحب مادة "${dropTarget.courseName}" بنجاح من جدولك!`,
        });
        setDropTarget(null);
        fetchRegistPlan(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر إتمام عملية السحب',
        });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ في الاتصال أثناء السحب' });
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryIcon = (title: string) => {
    if (title.includes('00')) return 'description';
    if (title.includes('استدراكي')) return 'autorenew';
    if (title.includes('كليه') || title.includes('كلية')) return 'domain';
    if (title.includes('تخص')) return 'school';
    return 'account_balance';
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-28 bg-surface-container-low rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-surface-container-low rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center">
        <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-on-surface">
          <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر فتح صفحة الخطة</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchRegistPlan(true)}
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
    <div className="flex flex-col w-full space-y-space-lg">
      {/* 1. الترويسة الرئيسية */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-xs text-secondary font-label-md">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span className="material-symbols-outlined text-sm">menu_book</span>
            <span>بوابة القبول والتسجيل • جامعة مؤتة</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
            التسجيل باستخدام الخطة الدراسية
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span>تصفح شجرة الخطة لاختيار الشعب المتاحة وإضافتها أو سحبها مباشرة</span>
            <span>•</span>
            <span className="font-mono text-primary font-bold">
              المكتملة: {data?.summary.completedCourses || '—'} {data?.summary.progressPercent ? `(${data.summary.progressPercent})` : ''}
            </span>
          </p>
        </div>

        {/* أزرار الإجراءات العلوية */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={expandAll}
            className="bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-2 rounded-lg font-label-md font-semibold flex items-center gap-1.5 border border-surface-container-high/50 transition-all cursor-pointer text-xs"
          >
            <span className="material-symbols-outlined text-base text-primary">unfold_more</span>
            <span>توسيع الكل</span>
          </button>

          <button
            onClick={collapseAll}
            className="bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-2 rounded-lg font-label-md font-semibold flex items-center gap-1.5 border border-surface-container-high/50 transition-all cursor-pointer text-xs"
          >
            <span className="material-symbols-outlined text-base text-on-surface-variant">unfold_less</span>
            <span>طي الكل</span>
          </button>

          <Link
            href="/registration"
            className="bg-surface-container-low hover:bg-surface-container-high text-on-surface px-3 py-2 rounded-lg font-label-md font-semibold flex items-center gap-1.5 border border-surface-container-high/50 transition-all text-xs"
          >
            <span className="material-symbols-outlined text-base">arrow_forward</span>
            <span>العودة للتسجيل</span>
          </Link>

          <button
            onClick={() => fetchRegistPlan(true)}
            disabled={refreshing}
            title="تحديث الخطة"
            className="bg-primary hover:bg-primary-container text-on-primary px-3 py-2 rounded-lg font-label-lg flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-75 cursor-pointer text-xs"
          >
            <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </section>

      {/* 2. رسالة التنبيه إن وجدت */}
      {actionMessage && (
        <div
          className={`p-space-md rounded-xl border flex items-center justify-between font-label-md transition-all shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-secondary/10 border-secondary/30 text-secondary'
              : 'bg-error-container/20 border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {actionMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-bold">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* 3. شريط البحث ومفتاح الحالات (Search & Legend Toolbar) */}
      <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
        {/* حقل البحث السريع */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مادة برقمها أو اسمها..."
            className="w-full bg-surface-container-low border border-surface-container-high/60 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg pr-9 pl-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
            </button>
          )}
        </div>

        {/* فلاتر الحالات ومفتاح الألوان */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'متاحة', 'مسجلة', 'مكتملة'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === filter
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-surface-container-high/40'
              }`}
            >
              {filter === 'all' ? 'جميع الحالات' : filter}
            </button>
          ))}
        </div>
      </section>

      {/* 4. قائمة شجرة فئات الخطة (Accordion List) */}
      <div className="space-y-3">
        {data?.categories.map((category) => {
          const isExpanded = expandedCategories.has(category.categoryId);

          const filteredCourses = category.courses.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (!searchQuery.trim()) return true;
            return (
              c.courseName.includes(searchQuery) ||
              c.courseNumber.includes(searchQuery)
            );
          });

          if (searchQuery.trim() && filteredCourses.length === 0) return null;
          if (statusFilter !== 'all' && filteredCourses.length === 0) return null;

          return (
            <div
              key={category.categoryId}
              className="bg-surface-container-lowest border border-surface-container-high/40 rounded-xl overflow-hidden transition-all shadow-sm"
            >
              {/* شريط الفئة القابل للضغط */}
              <div
                onClick={() => toggleCategory(category.categoryId)}
                className="w-full p-4 flex items-center justify-between cursor-pointer select-none hover:bg-surface-container-low/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-base transition-transform text-on-surface-variant ${
                      isExpanded ? '-rotate-90 text-primary font-bold' : ''
                    }`}
                  >
                    chevron_left
                  </span>

                  <span className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">
                      {getCategoryIcon(category.title)}
                    </span>
                  </span>

                  <span className="font-headline-sm text-sm font-bold text-on-surface">
                    {category.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-bold text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>{category.coursesStats || '0/0'}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface border border-surface-container-high text-[11px]">
                    <span className="material-symbols-outlined text-[13px] text-primary">hourglass_top</span>
                    <span>{category.hoursStats || '0/0 س'}</span>
                  </span>
                </div>
              </div>

              {/* قائمة المواد عند فتح الفئة */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-surface-container-high/40 bg-surface-container-low/20 divide-y divide-surface-container-high/40">
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-6 text-on-surface-variant text-xs">
                      لا توجد مواد مطابقة في هذه الفئة
                    </div>
                  ) : (
                    filteredCourses.map((course) => {
                      const isSubmitting = actionLoading === course.courseNumber;

                      return (
                        <div
                          key={course.courseNumber}
                          className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              {course.status === 'مكتملة' && (
                                <span className="material-symbols-outlined text-base text-secondary">check_circle</span>
                              )}
                              {course.status === 'مسجلة' && (
                                <span className="material-symbols-outlined text-base text-primary">schedule</span>
                              )}
                              {course.status === 'متاحة' && (
                                <span className="material-symbols-outlined text-base text-emerald-600 animate-pulse">add_task</span>
                              )}
                              {course.status === 'غير متاحة' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-surface-container-high block m-0.5" />
                              )}
                            </div>

                            <span className="font-mono text-primary font-bold bg-surface-container-high px-2 py-0.5 rounded text-[11px] shrink-0" dir="ltr">
                              {course.courseNumber}
                            </span>

                            <span className="font-bold text-on-surface truncate">
                              {course.courseName}
                            </span>

                            <span className="text-[10px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full shrink-0 border border-surface-container-high/50 font-mono">
                              {course.hours} س
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
                            {course.status === 'مكتملة' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                                  {course.grade || 'ناجح'}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-bold">مكتملة</span>
                              </div>
                            )}

                            {course.status === 'مسجلة' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono font-bold">
                                  شعبة {course.currentSection || '1'}
                                </span>
                                <button
                                  onClick={() => setDropTarget(course)}
                                  disabled={isSubmitting}
                                  className="px-3 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  <span>سحب</span>
                                </button>
                              </div>
                            )}

                            {course.status === 'متاحة' && (
                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <select
                                  value={
                                    selectedSections[course.courseNumber] ||
                                    course.availableSections[0]?.sectionNumber
                                  }
                                  onChange={(e) =>
                                    setSelectedSections({
                                      ...selectedSections,
                                      [course.courseNumber]: e.target.value,
                                    })
                                  }
                                  className="h-8 bg-surface-container-low border border-surface-container-high rounded-lg px-2 text-[11px] text-on-surface focus:outline-none focus:border-primary max-w-[200px] truncate"
                                >
                                  {course.availableSections.map((sec) => (
                                    <option key={sec.sectionNumber} value={sec.sectionNumber}>
                                      {sec.label}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleRegisterCourse(course)}
                                  disabled={isSubmitting}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                      <span>جارٍ...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-sm">add</span>
                                      <span>تسجيل</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {course.status === 'غير متاحة' && (
                              <span className="text-[11px] text-on-surface-variant/60">
                                غير متاحة - لا توجد شعب مفتوحة
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. نافذة تأكيد سحب المادة (Modal) */}
      {dropTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                تأكيد سحب المادة
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                هل أنت متأكد من رغبتك في سحب المادة التالية من جدولك للفصل الحالي؟
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">المادة:</span>
                <span className="font-bold text-on-surface">{dropTarget.courseName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">الرقم:</span>
                <span className="font-mono font-bold text-primary" dir="ltr">{dropTarget.courseNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">الشعبة:</span>
                <span className="font-mono font-bold text-secondary">شعبة {dropTarget.currentSection || '1'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDropConfirm}
                disabled={actionLoading === dropTarget.courseNumber}
                className="flex-1 py-2.5 rounded-lg bg-error hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {actionLoading === dropTarget.courseNumber ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                    <span>جارٍ السحب...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span>نعم، اسحب المادة</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setDropTarget(null)}
                disabled={actionLoading === dropTarget.courseNumber}
                className="flex-1 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer border border-surface-container-high/60"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
