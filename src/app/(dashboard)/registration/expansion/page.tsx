'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Maximize2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  RotateCcw,
  Hash,
  Layers,
  Info,
  Trash2,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Building,
  User,
  History,
} from 'lucide-react';
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
      setFormError('رقم الشعبة يجب أن يتكون من 1 إلى 2 أرقام (مثال: 1 أو 10)');
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/registration/expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          courseNumber: cNum,
          section: sec,
          csrfToken: data?.csrfToken || '',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: resJson.message || `تم تقديم طلب توسعة المادة (${cNum}) شعبة (${sec}) بنجاح`,
        });
        handleResetForm();
        fetchExpandSectionData(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'تعذر إتمام طلب التوسعة، تأكد من الشعبة والمادة',
        });
      }
    } catch {
      setActionMessage({
        type: 'error',
        text: 'حدث خطأ في الاتصال أثناء إرسال طلب التوسعة',
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
      const res = await fetch('/api/registration/expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          courseNumber: cancelTarget.courseNumber,
          section: cancelTarget.section,
          csrfToken: data?.csrfToken || '',
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
          text: resJson.message || 'تعذر إلغاء طلب التوسعة',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-36 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        <div className="h-56 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
        <div className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
          <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض صفحة طلب التوسعة</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchExpandSectionData(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
      {/* الترويسة الرئيسية */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>بوابة القبول والتسجيل • جامعة مؤتة</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  طلب توسعة شعبة
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  تقديم ومتابعة طلبات زيادة الطاقة الاستيعابية للشعب المغلقة لدى القسم الأكاديمي
                </p>
              </div>
            </div>

            {/* تفاصيل الطالب */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-950/40 px-3 py-1 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>{data?.studentName}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/40 px-3 py-1 rounded-lg border border-slate-800">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>{data?.college}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/40 px-3 py-1 rounded-lg border border-slate-800 font-mono">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{data?.studentId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <Link
              href="/registration"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>قائمة التسجيل</span>
            </Link>

            <button
              onClick={() => fetchExpandSectionData(true)}
              disabled={refreshing}
              title="تحديث البيانات"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* رسالة النجاح أو التنبيه */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* صندوق الملاحظة الهامة */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-200 text-xs leading-relaxed shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <strong className="font-bold text-amber-300 block mb-0.5">ملاحظة هامة:</strong>
          <span>طلب التسجيل في الشعب المغلقة لا يعني تسجيل المادة بشكل تلقائي. سيتم مراجعة الطلب من قبل القسم المختص واتخاذ القرار حسب الطاقة الاستيعابية.</span>
        </div>
      </div>

      {/* القسم الأول: طلبات التوسعة السابقة */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">طلبات التوسعة السابقة</h2>
              <span className="text-[11px] text-slate-400">
                إجمالي الطلبات: {data?.requests.length || 0} طلب
              </span>
            </div>
          </div>

          <a
            href="#new-expansion-form"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>طلب توسعة جديد</span>
          </a>
        </div>

        <div className="overflow-x-auto">
          {(!data?.requests || data.requests.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600 mb-1" />
              <p>لا توجد طلبات توسعة سابقة مسجلة لهذا الفصل</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-950/20 text-slate-400 text-[11px]">
                  <th className="py-3 px-4 font-medium text-center w-12">#</th>
                  <th className="py-3 px-4 font-medium">رقم المادة</th>
                  <th className="py-3 px-4 font-medium">اسم المادة</th>
                  <th className="py-3 px-4 font-medium text-center">الشعبة</th>
                  <th className="py-3 px-4 font-medium text-center">رد القسم</th>
                  <th className="py-3 px-4 font-medium text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {data.requests.map((req) => (
                  <tr key={req.serial} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-[11px] font-mono inline-flex items-center justify-center">
                        {req.serial}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 font-semibold">
                      {req.courseNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{req.courseName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {req.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 ${
                          req.status.includes('قبول') || req.status.includes('مقبول')
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : req.status.includes('رفض') || req.status.includes('مرفوض')
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{req.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {req.canCancel ? (
                        <button
                          onClick={() => setCancelTarget(req)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>إلغاء</span>
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* القسم الثاني: نموذج طلب توسعة جديد */}
      <div id="new-expansion-form" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Send className="w-3 h-3 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            تقديم طلب توسعة جديد
          </h3>
        </div>

        <form onSubmit={handleCreateSubmit} className="mt-5 space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* رقم المادة */}
            <div className="space-y-1.5">
              <label htmlFor="psub_number" className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-blue-400" />
                <span>رقم المادة</span>
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
                placeholder="أدخل 7 أرقام"
                required
                className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 font-mono outline-none transition-all"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>مثال: 2211362</span>
              </div>
            </div>

            {/* رقم الشعبة */}
            <div className="space-y-1.5">
              <label htmlFor="psection" className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>رقم الشعبة</span>
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
                placeholder="أدخل 1-2 أرقام"
                required
                className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 font-mono outline-none transition-all"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>مثال: 1, 2, 10</span>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الطلب...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الطلب</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مسح الحقول</span>
            </button>
          </div>
        </form>
      </div>

      {/* روابط سريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/registration"
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>العودة للتسجيل الإلكتروني</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/registration/plan"
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>التسجيل باستخدام الخطة</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/dashboard"
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>لوحة المعلومات الرئيسية</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* نافذة تأكيد إلغاء طلب التوسعة (Modal) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">تأكيد إلغاء طلب التوسعة</h3>
              <p className="text-xs text-slate-400">
                هل أنت متأكد من رغبتك في إلغاء طلب التوسعة للمادة التالية؟
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">المادة:</span>
                <span className="font-bold text-white">{cancelTarget.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الرقم:</span>
                <span className="font-mono text-slate-300">{cancelTarget.courseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الشعبة:</span>
                <span className="font-mono text-blue-400">شعبة {cancelTarget.section}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {cancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ الإلغاء...</span>
                  </>
                ) : (
                  <span>نعم، ألغِ الطلب</span>
                )}
              </button>

              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
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
