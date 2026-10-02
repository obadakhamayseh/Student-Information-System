'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExpandSectionData, ExpansionRequestItem } from '@/lib/schemas/expansion.schema';

export default function ExpandSectionPage() {
  const router = useRouter();
  const [data, setData] = useState<ExpandSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // حقول نموذج التوسعة الجديد
  const [courseNumber, setCourseNumber] = useState('');
  const [section, setSection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // نافذة تأكيد الإلغاء
  const [cancelTarget, setCancelTarget] = useState<ExpansionRequestItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // رسائل التنبيه والنتائج
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchExpandSectionData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registration/expansion', { cache: 'no-store' });
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب بيانات طلب توسعة الشعبة');
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
    fetchExpandSectionData();
  }, []);

  const handleResetForm = () => {
    setCourseNumber('');
    setSection('');
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cNum = courseNumber.trim();
    const sec = section.trim();

    if (!/^\d{7}$/.test(cNum)) {
      setFormError('رقم المادة يجب أن يتكون من 7 أرقام (مثال: 2211362)');
      return;
    }

    if (!/^\d{1,2}$/.test(sec)) {
      setFormError('رقم الشعبة يجب أن يتكون من 1 أو 2 أرقام (مثال: 1 أو 10)');
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expand',
          courseNumber: cNum,
          section: sec,
          csrfToken: data?.csrfToken,
          redirectPage: 'expand_section.jsp',
        }),
      });

      const resJson = await res.json();

      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: resJson.message || `تم تقديم طلب توسعة الشعبة (${sec}) للمادة (${cNum}) بنجاح`,
        });
        handleResetForm();
        fetchExpandSectionData(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر تقديم طلب التوسعة، يرجى التأكد من صحة رقم المادة والشعبة',
        });
      }
    } catch {
      setActionMessage({
        type: 'error',
        text: 'حدث خطأ في الاتصال أثناء إرسال الطلب، يرجى المحاولة لاحقاً',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/registration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_expansion',
          courseNumber: cancelTarget.courseNumber,
          section: cancelTarget.section,
          csrfToken: data?.csrfToken,
          redirectPage: 'expand_section.jsp',
        }),
      });

      const resJson = await res.json();

      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: resJson.message || 'تم إلغاء طلب التوسعة بنجاح',
        });
        setCancelTarget(null);
        fetchExpandSectionData(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر إلغاء الطلب، قد يكون تمت معالجته بالفعل',
        });
      }
    } catch {
      setActionMessage({
        type: 'error',
        text: 'حدث خطأ في الاتصال أثناء تنفيذ عملية الإلغاء',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-32 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-xl" />
        <div className="h-64 bg-surface-container-low rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center">
        <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-on-surface">
          <span className="material-symbols-outlined text-4xl text-error mb-3">error</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر عرض صفحة طلب التوسعة</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchExpandSectionData(true)}
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
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            <span>بوابة القبول والتسجيل • جامعة مؤتة</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
            طلب توسعة شعبة
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-base">person</span>
            <span>{data?.studentName}</span>
            <span>•</span>
            <span className="material-symbols-outlined text-base">domain</span>
            <span>{data?.college}</span>
            <span>•</span>
            <span className="material-symbols-outlined text-base">badge</span>
            <span dir="ltr" className="font-mono">{data?.studentId}</span>
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <Link
            href="/registration"
            className="bg-surface-container-low hover:bg-surface-container-high text-on-surface px-space-md py-2.5 rounded-lg font-label-md font-semibold flex items-center gap-1.5 border border-surface-container-high/50 transition-all"
          >
            <span className="material-symbols-outlined text-base">arrow_forward</span>
            <span>العودة للتسجيل</span>
          </Link>

          <button
            onClick={() => fetchExpandSectionData(true)}
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

      {/* 2. رسالة التنبيه أو النجاح */}
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

      {/* 3. صندوق الملاحظة الأكاديمية */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-space-md flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
        <span className="material-symbols-outlined text-xl text-amber-600 shrink-0 mt-0.5">
          warning
        </span>
        <div>
          <strong className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5 text-sm">
            ملاحظة تنظيمية هامة:
          </strong>
          <span>
            تقديم طلب التوسعة في الشعب المغلقة لا يعني تسجيل المادة بشكل تلقائي. يتم تدقيق الطلب من قبل القسم الأكاديمي المختص ومسجل الكلية واعتماده وفق سعة القاعة وتوافر المقاعد.
          </span>
        </div>
      </div>

      {/* 4. طلبات التوسعة السابقة */}
      <section className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between pb-space-md border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">history</span>
            </span>
            <div>
              <h2 className="font-headline-md text-headline-md text-primary font-bold">
                طلبات التوسعة السابقة
              </h2>
              <span className="font-label-sm text-xs text-on-surface-variant">
                إجمالي الطلبات: {data?.requests.length || 0} طلب
              </span>
            </div>
          </div>

          <a
            href="#new-expansion-form"
            className="text-xs text-secondary hover:text-secondary font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 transition-all"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>طلب توسعة جديد</span>
          </a>
        </div>

        {/* عرض الهواتف: بطاقات (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-surface-container-high/40 mt-space-sm">
          {!data?.requests || data.requests.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant text-xs space-y-1">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">hourglass_empty</span>
              <p>لا توجد طلبات توسعة سابقة مسجلة لهذا الفصل</p>
            </div>
          ) : (
            data.requests.map((req) => (
              <div key={req.serial} className="p-3.5 bg-surface-container-low/40 rounded-xl my-2 flex flex-col gap-2 border border-surface-container-high/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-headline-sm text-sm font-bold text-on-surface">{req.courseName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs bg-surface-container-high px-2 py-0.5 rounded text-primary font-bold" dir="ltr">
                        {req.courseNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        شعبة {req.section}
                      </span>
                    </div>
                  </div>
                  {req.canCancel && (
                    <button
                      onClick={() => setCancelTarget(req)}
                      className="px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      <span>إلغاء</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-surface-container-high/40 text-xs">
                  <span className="text-on-surface-variant">رد القسم:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                      req.status.includes('قبول') || req.status.includes('مقبول')
                        ? 'bg-secondary/15 text-secondary border border-secondary/30'
                        : req.status.includes('رفض') || req.status.includes('مرفوض')
                        ? 'bg-error/15 text-error border border-error/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <span>{req.status}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* عرض الشاشات الأكبر: جدول (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto mt-space-sm">
          {!data?.requests || data.requests.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant text-xs space-y-1">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">hourglass_empty</span>
              <p>لا توجد طلبات توسعة سابقة مسجلة لهذا الفصل</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-surface-container-high/60 bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">رقم المادة</th>
                  <th className="py-3 px-4">اسم المادة</th>
                  <th className="py-3 px-4 text-center">الشعبة</th>
                  <th className="py-3 px-4 text-center">رد القسم الأكاديمي</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
                {data.requests.map((req) => (
                  <tr key={req.serial} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-on-surface-variant">
                      {req.serial}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-primary" dir="ltr">
                      {req.courseNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-on-surface">{req.courseName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        {req.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                          req.status.includes('قبول') || req.status.includes('مقبول')
                            ? 'bg-secondary/15 text-secondary border border-secondary/30'
                            : req.status.includes('رفض') || req.status.includes('مرفوض')
                            ? 'bg-error/15 text-error border border-error/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <span>{req.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {req.canCancel ? (
                        <button
                          onClick={() => setCancelTarget(req)}
                          className="px-3 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>إلغاء</span>
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 5. نموذج تقديم طلب توسعة جديد */}
      <section id="new-expansion-form" className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-2.5 pb-space-md border-b border-surface-container-high/40">
          <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">send</span>
          </span>
          <div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              تقديم طلب توسعة جديد
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              أدخل رقم المادة ورقم الشعبة المغلقة لإرسال طلب استثنائي لزيادة المقاعد
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="mt-space-md space-y-space-md">
          {formError && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span className="font-bold">{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* رقم المادة */}
            <div className="space-y-1.5">
              <label htmlFor="psub_number" className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">pin</span>
                <span>رقم المادة (7 أرقام)</span>
              </label>
              <input
                type="text"
                id="psub_number"
                name="psub_number"
                value={courseNumber}
                onChange={(e) => {
                  setCourseNumber(e.target.value.replace(/\D/g, '').slice(0, 7));
                  setFormError(null);
                }}
                maxLength={7}
                pattern="[0-9]{7}"
                placeholder="أدخل 7 أرقام (مثال: 2211362)"
                required
                className="w-full bg-surface-container-low border border-surface-container-high focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-mono outline-none transition-all"
              />
              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>مثال: 2211362, 2212351</span>
              </div>
            </div>

            {/* رقم الشعبة */}
            <div className="space-y-1.5">
              <label htmlFor="psection" className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">layers</span>
                <span>رقم الشعبة (1-2 أرقام)</span>
              </label>
              <input
                type="text"
                id="psection"
                name="psection"
                value={section}
                onChange={(e) => {
                  setSection(e.target.value.replace(/\D/g, '').slice(0, 2));
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
                <span>أدخل رقم الشعبة المغلقة المراد فتح مقعد بها</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span>جارٍ إرسال الطلب...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>إرسال طلب التوسعة</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg border border-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">backspace</span>
              <span>مسح</span>
            </button>
          </div>
        </form>
      </section>

      {/* 6. نافذة تأكيد الإلغاء (Modal) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                تأكيد إلغاء طلب التوسعة
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                هل أنت متأكد من رغبتك في سحب وإلغاء طلب توسعة الشعبة التالي؟
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">اسم المادة:</span>
                <span className="font-bold text-on-surface">{cancelTarget.courseName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">رقم المادة:</span>
                <span className="font-mono font-bold text-primary" dir="ltr">{cancelTarget.courseNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">الشعبة:</span>
                <span className="font-mono font-bold text-secondary">شعبة {cancelTarget.section}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-lg bg-error hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {cancelling ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                    <span>جارٍ الإلغاء...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">cancel</span>
                    <span>نعم، إلغاء الطلب</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer border border-surface-container-high/60"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
