'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Clock,
  User,
  MapPin,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  PlusCircle,
  Hash,
  RotateCcw,
  Info,
  Plus,
} from 'lucide-react';
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

  const fetchRegMenu = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registration/menu', { cache: 'no-store' });
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
        setActionMessage({ type: 'success', text: resJson.message || 'تم سحب المادة بنجاح' });
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
    setFormError(null);
  };

  const handleAddCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cNum = addCourseNumber.trim();
    const sec = addSection.trim();

    if (!/^\d{7}$/.test(cNum)) {
      setFormError('رقم المادة يجب أن يتكون من 7 أرقام (مثال: 0501101)');
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
          text: resJson.message || 'تعذر إضافة المادة، يرجى التأكد من الشعبة ورقم المادة',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-32 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        <div className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
          <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض قائمة التسجيل</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchRegMenu(true)}
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
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              التسجيل الإلكتروني والخدمات الأكاديمية
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              إدارة المواد المسجلة للفصل الحالي والوصول إلى خدمات التسجيل والخطط
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/registration/plan"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>التسجيل باستخدام الخطة</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>

            <button
              onClick={() => fetchRegMenu(true)}
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
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
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

      {/* جدول المواد المسجلة للفصل الحالي */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">المواد المسجلة للفصل الحالي</h2>
              <span className="text-[11px] text-slate-400">
                إجمالي المواد: {data?.registeredCourses.length || 0} مواد
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const el = document.getElementById('psub_number');
                el?.focus();
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إضافة مادة</span>
            </button>
            <Link
              href="/registration/plan"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>التسجيل بالخطة</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          {data?.registeredCourses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              لا توجد مواد مسجلة لهذا الفصل حتى الآن
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-950/20 text-slate-400 text-[11px]">
                  <th className="py-3 px-4 font-medium">رقم المادة</th>
                  <th className="py-3 px-4 font-medium">اسم المادة</th>
                  <th className="py-3 px-4 font-medium text-center">الشعبة</th>
                  <th className="py-3 px-4 font-medium">القاعة</th>
                  <th className="py-3 px-4 font-medium">الوقت</th>
                  <th className="py-3 px-4 font-medium">الأيام</th>
                  <th className="py-3 px-4 font-medium text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-200">
                {data?.registeredCourses.map((course, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">{course.courseNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{course.courseName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {course.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{course.room}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{course.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{course.days}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDropTarget(course)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>سحب</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* بطاقة إضافة مادة جديدة مباشرة */}
      <div id="add-course-card" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        {/* ترويسة البطاقة */}
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            إضافة مادة جديدة
          </h3>
        </div>

        <form onSubmit={handleAddCourseSubmit} className="mt-5 space-y-5">
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
                value={addCourseNumber}
                onChange={(e) => {
                  setAddCourseNumber(e.target.value.replace(/\D/g, '').slice(0, 7));
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
                <span>مثال: 0501101</span>
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
                value={addSection}
                onChange={(e) => {
                  setAddSection(e.target.value.replace(/\D/g, '').slice(0, 2));
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
              disabled={addingCourse}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {addingCourse ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الإضافة...</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>إضافة مادة</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetAddForm}
              disabled={addingCourse}
              className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مسح</span>
            </button>
          </div>
        </form>
      </div>

      {/* بطاقات الخدمات الأكاديمية */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>خدمات القبول والتسجيل الإلكترونية</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.services.map((service) => {
            const isInternal = service.isInternal;
            const CardWrapper = isInternal ? Link : 'a';
            const extraProps = isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' };

            return (
              <CardWrapper
                key={service.id}
                href={service.href}
                {...(extraProps as any)}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    {service.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    {service.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
                  <span>{isInternal ? 'فتح الخدمة' : 'بوابة الجامعة'}</span>
                  {isInternal ? (
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>

      {/* نافذة تأكيد سحب المادة (Modal) */}
      {dropTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">تأكيد سحب المادة</h3>
              <p className="text-xs text-slate-400">
                هل أنت متأكد من رغبتك في سحب المادة التالية من جدولك للفصل الحالي؟
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">المادة:</span>
                <span className="font-bold text-white">{dropTarget.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الرقم:</span>
                <span className="font-mono text-slate-300">{dropTarget.courseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الشعبة:</span>
                <span className="font-mono text-blue-400">شعبة {dropTarget.section}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDropConfirm}
                disabled={dropping}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dropping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ السحب...</span>
                  </>
                ) : (
                  <span>نعم، اسحب المادة</span>
                )}
              </button>

              <button
                onClick={() => setDropTarget(null)}
                disabled={dropping}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
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
