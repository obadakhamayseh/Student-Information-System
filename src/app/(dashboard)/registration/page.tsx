'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RegMenuData, RegisteredCourseItem } from '@/lib/schemas/registration.schema';

export default function RegistrationMenuPage() {
  const router = useRouter();
  const [data, setData] = useState<RegMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<RegisteredCourseItem | null>(null);
  const [dropping, setDropping] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // حقول إضافة مادة جديدة مباشرة
  const [addCourseNumber, setAddCourseNumber] = useState('');
  const [addSection, setAddSection] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // فلترة وبحث بالمواد المسجلة
  const [searchQuery, setSearchQuery] = useState('');

  // استعلام فوري من جريدة المواد الرسمية (subp.mutah.edu.jo)
  const [subpPreview, setSubpPreview] = useState<{
    courseName?: string;
    sections: Array<{
      section: string;
      instructor: string;
      room: string;
      timeFrom: string;
      timeTo: string;
      days: string;
      capacity: number;
      enrolled: number;
      availableSeats: number;
      isFull: boolean;
    }>;
    loading: boolean;
  }>({ sections: [], loading: false });

  // جلب بيانات الشعب والأساتذة والقاعات تلقائياً عند كتابة 7 أرقام
  useEffect(() => {
    if (addCourseNumber.length === 7) {
      let isMounted = true;
      setSubpPreview({ sections: [], loading: true });
      fetch(`/api/subp/search?courseId=${addCourseNumber}`)
        .then((res) => res.json())
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.sections && res.sections.length > 0) {
            setSubpPreview({
              courseName: res.sections[0]?.courseName,
              sections: res.sections,
              loading: false,
            });
          } else {
            setSubpPreview({ sections: [], loading: false });
          }
        })
        .catch(() => {
          if (isMounted) setSubpPreview({ sections: [], loading: false });
        });
      return () => {
        isMounted = false;
      };
    } else {
      setSubpPreview({ sections: [], loading: false });
    }
  }, [addCourseNumber]);

  const fetchRegMenu = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/registration/menu${isManual ? '?refresh=true' : ''}`);
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب قائمة التسجيل الإلكتروني');
        return;
      }

      setData(json);
    } catch {
      setError('تعذر الاتصال بخادم الجامعة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegMenu();
  }, []);

  // حساب ساعات المادة بدقة (مشروع تخرج 1 = 1 ساعة، 2 = 2 ساعة، المختبر = 1 ساعة، الباقي 3)
  const getCourseHours = (courseNumber: string, courseName: string): number => {
    if (
      courseNumber === '2222491' ||
      courseNumber.endsWith('491') ||
      courseName.includes('مشروع تخرج 1') ||
      courseName.includes('مشروع تخرج1')
    ) {
      return 1;
    }
    if (
      courseNumber === '2222492' ||
      courseNumber.endsWith('492') ||
      courseName.includes('مشروع تخرج 2') ||
      courseName.includes('مشروع تخرج2')
    ) {
      return 2;
    }
    if (courseName.includes('مختبر') || courseName.toLowerCase().includes('lab')) {
      return 1;
    }
    return 3;
  };

  const registeredCourses = useMemo(() => data?.registeredCourses || [], [data]);

  // إجمالي الساعات المسجلة
  const totalRegisteredHours = useMemo(() => {
    return registeredCourses.reduce(
      (sum, c) => sum + getCourseHours(c.courseNumber, c.courseName),
      0
    );
  }, [registeredCourses]);

  // تصفية المواد المسجلة بالبحث
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return registeredCourses;
    const q = searchQuery.trim().toLowerCase();
    return registeredCourses.filter(
      (c) =>
        c.courseName.toLowerCase().includes(q) ||
        c.courseNumber.toLowerCase().includes(q) ||
        c.room.toLowerCase().includes(q) ||
        c.days.toLowerCase().includes(q)
    );
  }, [registeredCourses, searchQuery]);

  const handleDropConfirm = async () => {
    if (!dropTarget) return;
    setDropping(true);
    setActionMessage(null);

    try {
      // جلب صفحة تسجيل الخطة للحصول على الـ CSRF
      const planRes = await fetch('/api/registration/plan');
      const planData = await planRes.json();
      const csrfToken = planData.csrfToken;

      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'drop',
          courseNumber: dropTarget.courseNumber,
          section: dropTarget.section,
          csrfToken,
          redirectPage: 'regmenu.jsp',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({ type: 'success', text: resJson.message || 'تم سحب المادة بنجاح من جدولك' });
        setDropTarget(null);
        fetchRegMenu(true);
      } else {
        setActionMessage({ type: 'error', text: resJson.message || 'تعذر إتمام عملية السحب' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ في الاتصال أثناء تنفيذ عملية السحب' });
    } finally {
      setDropping(false);
    }
  };

  const handleResetAddForm = () => {
    setAddCourseNumber('');
    setAddSection('');
    setSubpPreview({ sections: [], loading: false });
    setFormError(null);
  };

  const handleAddCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cNum = addCourseNumber.trim();
    const sec = addSection.trim();

    if (!/^\d{7}$/.test(cNum)) {
      setFormError('رقم المادة يجب أن يتكون من 7 أرقام (مثال: 0501101 أو 2212351)');
      return;
    }

    if (!/^\d{1,2}$/.test(sec)) {
      setFormError('رقم الشعبة يجب أن يتكون من 1 أو 2 أرقام (مثال: 1 أو 10)');
      return;
    }

    setAddingCourse(true);
    setActionMessage(null);

    try {
      let csrfToken = data?.csrfToken;
      if (!csrfToken) {
        const planRes = await fetch('/api/registration/plan');
        const planData = await planRes.json();
        csrfToken = planData.csrfToken;
      }

      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          courseNumber: cNum,
          section: sec,
          csrfToken,
          redirectPage: 'regmenu.jsp',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: resJson.message || `تم تسجيل المادة (${cNum}) شعبة (${sec}) بنجاح`,
        });
        handleResetAddForm();
        fetchRegMenu(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر إضافة المادة، يرجى التأكد من الشعبة ورقم المادة وشروطها',
        });
      }
    } catch {
      setActionMessage({
        type: 'error',
        text: 'حدث خطأ في الاتصال أثناء إضافة المادة، يرجى المحاولة لاحقاً',
      });
    } finally {
      setAddingCourse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-32 bg-surface-container-low rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface-container-low rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center">
        <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-on-surface">
          <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر عرض قائمة التسجيل</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchRegMenu(true)}
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
      {/* 1. الترويسة الرئيسية - Banner مطابق لباقي الصفحات */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-xs text-secondary font-label-md">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span className="material-symbols-outlined text-sm">how_to_reg</span>
            <span>بوابة القبول والتسجيل • جامعة مؤتة</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
            التسجيل الإلكتروني والخدمات الأكاديمية
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-base">domain</span>
            <span>{data?.college || 'جامعة مؤتة'}</span>
            <span>•</span>
            <span className="material-symbols-outlined text-base">person</span>
            <span>{data?.studentName || 'طالب جامعة مؤتة'}</span>
            <span>•</span>
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>الفصل الأول 2026/2027</span>
          </p>
        </div>

        {/* أزرار الإجراءات والوصول السريع */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <Link
            href="/registration/plan"
            className="bg-secondary hover:opacity-95 text-on-secondary px-space-md py-2.5 rounded-lg font-label-md font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
            <span>التسجيل بالخطة</span>
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </Link>

          <Link
            href="/registration/expansion"
            className="bg-surface-container-low hover:bg-surface-container-high text-on-surface px-space-md py-2.5 rounded-lg font-label-md font-semibold flex items-center gap-1.5 border border-surface-container-high/50 transition-all"
          >
            <span className="material-symbols-outlined text-lg text-primary">open_in_full</span>
            <span className="hidden sm:inline">طلب توسعة شعبة</span>
            <span className="sm:hidden">توسعة</span>
          </Link>

          <button
            onClick={() => fetchRegMenu(true)}
            disabled={refreshing}
            title="تحديث البيانات"
            className="bg-primary hover:bg-primary-container text-on-primary px-space-md py-2.5 rounded-lg font-label-lg flex items-center gap-space-xs transition-all shadow-sm active:scale-95 disabled:opacity-75 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </section>

      {/* 2. شريط المؤشرات والإحصائيات السريعة (3 Quick Bento Stat Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-space-md">
        {/* بطاقة 1: المواد المسجلة */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">المواد المسجلة</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-primary font-mono">
              {registeredCourses.length}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">مواد دراسية</span>
          </div>
          <span className="text-[11px] text-secondary font-label-sm font-semibold mt-1">
            الفصل الحالي 2026/2027
          </span>
        </div>

        {/* بطاقة 2: الساعات المسجلة */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-secondary"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">الساعات المسجلة</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-lg">schedule</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-bold text-secondary font-mono">
              {totalRegisteredHours}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">ساعة معتمدة</span>
          </div>
          <span className="text-[11px] text-on-surface-variant font-label-sm mt-1">
            ساعات قيد الدراسة الفعلية
          </span>
        </div>

        {/* بطاقة 3: حالة بوابة التسجيل */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container-high/40">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">حالة التسجيل</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              متاح ونشط
            </span>
          </div>
          <span className="text-[11px] text-on-surface-variant font-label-sm mt-1">
            فترة السحب والإضافة الإلكترونية
          </span>
        </div>


      </section>

      {/* 3. رسالة النجاح أو التنبيه عند تنفيذ عملية */}
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

      {/* 4. جدول وبطاقات المواد المسجلة للفصل الحالي */}
      <section className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-space-md border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-primary font-bold">
                  المواد المسجلة للفصل الحالي
                </h2>
                <span className="text-xs font-label-sm bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full font-mono">
                  {registeredCourses.length} مواد • {totalRegisteredHours} ساعة
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                قائمة المقررات المثبتة في جدولك الأكاديمي مع إمكانية السحب والإضافة
              </p>
            </div>
          </div>


        </div>

        {/* شريط البحث السريع بالمواد المسجلة */}
        {registeredCourses.length > 0 && (
          <div className="pt-space-md pb-space-sm flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المادة، رقمها، القاعة..."
                className="w-full bg-surface-container-low border border-surface-container-high/60 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg pr-9 pl-4 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all"
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
            <span className="font-label-sm text-xs text-on-surface-variant hidden sm:inline">
              المعروض: {filteredCourses.length} من {registeredCourses.length}
            </span>
          </div>
        )}

        {/* عرض الهواتف: بطاقات عصرية للمواد المسجلة (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-surface-container-high/40 mt-space-sm">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course, idx) => {
              const hours = getCourseHours(course.courseNumber, course.courseName);
              return (
                <div key={idx} className="p-3.5 bg-surface-container-low/40 rounded-xl my-2 flex flex-col gap-2.5 border border-surface-container-high/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline-sm text-sm font-bold text-on-surface truncate">
                        {course.courseName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-xs bg-surface-container-high px-2 py-0.5 rounded text-primary font-bold" dir="ltr">
                          {course.courseNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                          شعبة {course.section}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-secondary/10 text-secondary border border-secondary/20">
                          {hours} س
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDropTarget(course)}
                      className="px-2.5 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>سحب</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-container-high/40 text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">meeting_room</span>
                      <span className="truncate">{course.room || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                      <span className="truncate" dir="ltr">{course.time || '—'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-xs text-on-surface">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">calendar_view_week</span>
                      <span>أيام المحاضرة: <strong>{course.days || 'غير محدد'}</strong></span>
                    </div>
                    {course.instructor && (
                      <div className="col-span-2 flex items-center justify-between text-xs text-primary font-medium pt-1 border-t border-surface-container-high/30">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-secondary">person</span>
                          <span>مدرس المساق: <strong>{course.instructor}</strong></span>
                        </div>
                        {course.capacity ? (
                          <span className="text-[10px] text-on-surface-variant font-mono bg-surface-container px-1.5 py-0.5 rounded" dir="ltr">
                            {course.enrolled}/{course.capacity} مقعد
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-on-surface-variant text-xs">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد مواد مسجلة لهذا الفصل حتى الآن'}
            </div>
          )}
        </div>

        {/* عرض الشاشات الأكبر: جدول أنيق متجاوب (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto mt-space-sm">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant text-xs">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد مواد مسجلة لهذا الفصل حتى الآن'}
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-surface-container-high/60 bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold">
                  <th className="py-3 px-4 font-label-md">رقم المادة</th>
                  <th className="py-3 px-4 font-label-md">اسم المادة</th>
                  <th className="py-3 px-4 font-label-md">مدرس المساق</th>
                  <th className="py-3 px-4 font-label-md text-center">الشعبة</th>
                  <th className="py-3 px-4 font-label-md text-center">الساعات</th>
                  <th className="py-3 px-4 font-label-md">القاعة</th>
                  <th className="py-3 px-4 font-label-md">الوقت</th>
                  <th className="py-3 px-4 font-label-md">الأيام</th>
                  <th className="py-3 px-4 font-label-md text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
                {filteredCourses.map((course, idx) => {
                  const hours = getCourseHours(course.courseNumber, course.courseName);
                  return (
                    <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary" dir="ltr">
                        {course.courseNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        {course.courseName}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-secondary">person</span>
                            <span className="font-medium text-primary">{course.instructor || 'هيئة تدريس'}</span>
                          </div>
                          {course.capacity ? (
                            <span className="text-[10px] text-on-surface-variant font-mono mt-0.5" dir="ltr">
                              {course.enrolled} / {course.capacity} مسجل
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                          {course.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-secondary/10 text-secondary border border-secondary/20">
                          {hours} س
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-secondary">meeting_room</span>
                          <span>{course.room || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant font-mono" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                          <span>{course.time || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface font-medium">{course.days || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setDropTarget(course)}
                          className="px-3 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>سحب</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 5. بطاقة إضافة مادة جديدة مباشرة (Quick Add Form) */}
      <section id="add-course-card" className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-2.5 pb-space-md border-b border-surface-container-high/40">
          <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">add_circle</span>
          </span>
          <div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              إضافة مادة جديدة مباشرة
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              أدخل رقم المادة المكون من 7 أرقام ورقم الشعبة لتسجيلها مباشرة في جدولك الدراسي
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCourseSubmit} className="mt-space-md space-y-space-md">
          {formError && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span className="font-bold">{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* حقل رقم المادة */}
            <div className="space-y-1.5">
              <label htmlFor="psub_number" className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">pin</span>
                <span>رقم المادة (7 أرقام)</span>
              </label>
              <input
                type="text"
                id="psub_number"
                name="psub_number"
                value={addCourseNumber}
                onChange={(e) => {
                  setAddCourseNumber(e.target.value.replace(/\D/g, '').slice(0, 7));
                  setFormError(null);
                }}
                maxLength={7}
                pattern="[0-9]{7}"
                placeholder="أدخل 7 أرقام لرقم المادة"
                required
                className="w-full bg-surface-container-low border border-surface-container-high focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-mono outline-none transition-all"
              />
              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>أدخل رقم المساق المكون من 7 خانات من خطتك الدراسية</span>
              </div>
            </div>

            {/* حقل رقم الشعبة */}
            <div className="space-y-1.5">
              <label htmlFor="psection" className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">layers</span>
                <span>رقم الشعبة (1-2 أرقام)</span>
              </label>
              <input
                type="text"
                id="psection"
                name="psection"
                value={addSection}
                onChange={(e) => {
                  setAddSection(e.target.value.replace(/\D/g, '').slice(0, 2));
                  setFormError(null);
                }}
                maxLength={2}
                pattern="[0-9]{1,2}"
                placeholder="أدخل رقم الشعبة (مثال: 1)"
                required
                className="w-full bg-surface-container-low border border-surface-container-high focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-mono outline-none transition-all"
              />
              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>أرقام الشعب المتاحة عادة: 1, 2, 3, 10</span>
              </div>
            </div>
          </div>

          {/* معاينة الشعب الحقيقية من جريدة المواد الرسمية (subp.mutah.edu.jo) */}
          {subpPreview.loading && (
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center gap-2 text-xs text-on-surface-variant animate-pulse">
              <span className="material-symbols-outlined text-base animate-spin text-secondary">sync</span>
              <span>جارٍ الاستعلام عن الشعب ومدرسي المساق والقاعات من جريدة المواد الرسمية...</span>
            </div>
          )}

          {!subpPreview.loading && subpPreview.sections.length > 0 && (
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-secondary/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-secondary text-base">verified</span>
                  <span>جريدة المواد الرسمية: {subpPreview.courseName}</span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {subpPreview.sections.length} شعب معروضة
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {subpPreview.sections.map((sec) => {
                  const isSelected = addSection === sec.section;
                  return (
                    <button
                      key={sec.section}
                      type="button"
                      onClick={() => setAddSection(sec.section)}
                      className={`p-2.5 rounded-lg text-right transition-all flex flex-col gap-1 border cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border-surface-container-high/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">شعبة {sec.section}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            sec.isFull
                              ? isSelected ? 'bg-error/30 text-on-primary' : 'bg-error/15 text-error'
                              : isSelected ? 'bg-white/20 text-on-primary' : 'bg-emerald-500/15 text-emerald-700'
                          }`}
                        >
                          {sec.availableSeats > 0 ? `${sec.availableSeats} مقعد شاغر` : 'ممتلئة'}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] ${isSelected ? 'text-on-primary/90' : 'text-primary'}`}>
                        <span className="material-symbols-outlined text-xs">person</span>
                        <span className="truncate">{sec.instructor || 'هيئة تدريس'}</span>
                      </div>
                      <div className={`flex items-center justify-between text-[10px] ${isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                        <span>{sec.days}</span>
                        <span dir="ltr">{sec.room}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات للنموذج */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={addingCourse}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {addingCourse ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span>جارٍ تسجيل المادة...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>إضافة المادة للجدول</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetAddForm}
              disabled={addingCourse}
              className="px-5 py-2.5 rounded-lg border border-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">backspace</span>
              <span>مسح</span>
            </button>
          </div>
        </form>
      </section>



      {/* 7. نافذة تأكيد سحب المادة (Modal مطابق لنظام التصميم) */}
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
                هل أنت متأكد من رغبتك في سحب المادة التالية من جدولك الأكاديمي للفصل الحالي؟
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">اسم المادة:</span>
                <span className="font-bold text-on-surface">{dropTarget.courseName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">رقم المادة:</span>
                <span className="font-mono font-bold text-primary" dir="ltr">{dropTarget.courseNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">الشعبة:</span>
                <span className="font-mono font-bold text-secondary">شعبة {dropTarget.section}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDropConfirm}
                disabled={dropping}
                className="flex-1 py-2.5 rounded-lg bg-error hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {dropping ? (
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
                disabled={dropping}
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
