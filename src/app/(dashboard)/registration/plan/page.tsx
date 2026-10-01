'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Printer,
  ChevronLeft,
  ChevronDown,
  Layers,
  GraduationCap,
  Building2,
  Building,
  RefreshCw,
  FileText,
  Hourglass,
  Plus,
  Trash2,
  Search,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  AlertCircle,
  FolderPlus,
  FolderMinus,
  Check,
} from 'lucide-react';
import type { RegistPlanData, RegistPlanCourse, RegistPlanCategory } from '@/lib/schemas/registration.schema';

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
        setError(json.message || 'فشل جلب صفحة تسجيل الخطة');
        return;
      }

      setData(json);

      // فتح الفئات التي تحتوي على مواد متاحة أو مسجلة تلقائياً
      const autoExpanded = new Set<string>();
      const initialSections: Record<string, string> = {};

      json.categories?.forEach((cat: RegistPlanCategory) => {
        const hasAvailableOrRegistered = cat.courses.some(
          (c) => c.status === 'متاحة' || c.status === 'مسجلة'
        );
        if (hasAvailableOrRegistered) {
          autoExpanded.add(cat.categoryId);
        }

        cat.courses.forEach((c) => {
          if (c.status === 'متاحة' && c.availableSections.length > 0) {
            initialSections[c.courseNumber] = c.availableSections[0].sectionNumber;
          }
        });
      });

      setExpandedCategories(autoExpanded);
      setSelectedSections(initialSections);
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
    if (!data) return;
    setExpandedCategories(new Set(data.categories.map((c) => c.categoryId)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const handleRegisterCourse = async (course: RegistPlanCourse) => {
    const section = selectedSections[course.courseNumber] || course.availableSections[0]?.sectionNumber;
    if (!section) {
      setActionMessage({ type: 'error', text: 'يرجى اختيار شعبة أولاً' });
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
          section,
          csrfToken: data?.csrfToken,
          redirectPage: 'registplan.jsp',
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setActionMessage({
          type: 'success',
          text: `تم تسجيل مادة "${course.courseName}" بالشعبة (${section}) بنجاح!`,
        });
        fetchRegistPlan(true);
      } else {
        setActionMessage({
          type: 'error',
          text: resJson.message || 'فشل تسجيل المادة، تحقق من الشروط أو التعارضات الأكاديمية',
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
          text: `تم سحب مادة "${dropTarget.courseName}" بنجاح!`,
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

  const getCategoryIcon = (iconName: string, title: string) => {
    if (title.includes('00') || title.includes('وثائق')) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    }
    if (title.includes('استدراكي')) {
      return <RefreshCw className="w-4 h-4 text-indigo-400" />;
    }
    if (title.includes('كليه')) {
      return <Building className="w-4 h-4 text-cyan-400" />;
    }
    if (title.includes('تخص')) {
      return <GraduationCap className="w-4 h-4 text-blue-400" />;
    }
    return <Building2 className="w-4 h-4 text-sky-400" />;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-4">
        <div className="h-16 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300">
          <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">تعذر فتح صفحة الخطة</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchRegistPlan(true)}
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-5">
      {/* الشريط العلوي للإجراءات (مطابق تماماً لترويسة الموقع الأصلي) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800/80 shadow-lg">
        {/* أزرار التوسيع والطي والطباعة */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>توسيع الكل</span>
          </button>

          <button
            onClick={collapseAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <FolderMinus className="w-3.5 h-3.5 text-indigo-400" />
            <span>طي الكل</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>طباعة</span>
          </button>
        </div>

        {/* أزرار لوحة المعلومات وتسجيل الخروج والتحديث */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/20 text-xs font-semibold transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة المعلومات</span>
          </Link>

          <button
            onClick={() => fetchRegistPlan(true)}
            disabled={refreshing}
            title="تحديث الخطة"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* رسالة التنبيه إن وجدت */}
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
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white text-xs px-2">
            إغلاق
          </button>
        </div>
      )}

      {/* شريط العنوان ومفتاح الألوان (Legend) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* العنوان الأيمن */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">الخطة الدراسية</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                اختر الشعبة للتسجيل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              المكتملة: {data?.summary.completedCourses} • الساعات: {data?.summary.hoursStats} ({data?.summary.progressPercent})
            </p>
          </div>
        </div>

        {/* مفتاح الحالات (Legend) */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-emerald-300 font-semibold">متاحة</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
            <span className="text-blue-300 font-semibold">مسجلة</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            <span className="text-amber-300 font-semibold">مكتملة</span>
          </div>
        </div>
      </div>

      {/* شريط البحث والتصفية السريعة */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مادة برقمها أو اسمها..."
            className="w-full h-9 bg-slate-950/70 border border-slate-800 rounded-xl pr-9 pl-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'متاحة', 'مسجلة', 'مكتملة'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'جميع الحالات' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* شجرة فئات الخطة (Accordion List) مطابق للشكل المطلوب */}
      <div className="space-y-2.5">
        {data?.categories.map((category) => {
          const isExpanded = expandedCategories.has(category.categoryId);

          // تصفية المواد داخل الفئة حسب البحث والحالة
          const filteredCourses = category.courses.filter((c) => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (!searchQuery.trim()) return true;
            return (
              c.courseName.includes(searchQuery) ||
              c.courseNumber.includes(searchQuery)
            );
          });

          // إذا كان هناك بحث أو تصفية ولم تتطابق أي مادة، نخفي الفئة
          if (searchQuery.trim() && filteredCourses.length === 0) return null;
          if (statusFilter !== 'all' && filteredCourses.length === 0) return null;

          return (
            <div
              key={category.categoryId}
              className="bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden transition-all shadow-sm"
            >
              {/* شريط الفئة القابل للضغط والتوسيع (tree-node-header) */}
              <div
                onClick={() => toggleCategory(category.categoryId)}
                className="w-full p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
              >
                {/* العنوان والأيقونة وسهم التوسيع في اليمين */}
                <div className="flex items-center gap-3">
                  <div className="text-slate-400 transition-transform duration-200">
                    <ChevronLeft
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? '-rotate-90 text-blue-400' : ''
                      }`}
                    />
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center">
                    {getCategoryIcon(category.icon, category.title)}
                  </div>

                  <span className="font-bold text-sm text-slate-100">{category.title}</span>
                </div>

                {/* مؤشرات الإحصاءات في اليسار (الشارات الملونة) */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  {/* شارة المواد المنجزة */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{category.coursesStats || '0/0'}</span>
                  </span>

                  {/* شارة الساعات المنجزة */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/80 text-[11px]">
                    <Hourglass className="w-3 h-3 text-amber-400" />
                    <span>{category.hoursStats || '0/0 س'}</span>
                  </span>
                </div>
              </div>

              {/* قائمة المواد عند فتح الفئة (tree-children) */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/40 divide-y divide-slate-800/40">
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
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
                          {/* الجزء الأيمن: أيقونة الحالة، رقم المادة، اسمها، وساعاتها */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* أيقونة الحالة الدائرية */}
                            <div className="shrink-0">
                              {course.status === 'مكتملة' && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              )}
                              {course.status === 'مسجلة' && (
                                <Clock className="w-4 h-4 text-blue-400" />
                              )}
                              {course.status === 'متاحة' && (
                                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                              )}
                              {course.status === 'غير متاحة' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 block m-0.5" />
                              )}
                            </div>

                            {/* رقم المادة */}
                            <span className="font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] shrink-0">
                              {course.courseNumber}
                            </span>

                            {/* اسم المادة */}
                            <span className="font-semibold text-slate-200 truncate">
                              {course.courseName}
                            </span>

                            {/* الساعات المعتمدة */}
                            <span className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full shrink-0">
                              {course.hours}
                            </span>
                          </div>

                          {/* الجزء الأيسر: الإجراءات أو العلامة أو الشعب */}
                          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                            {/* مادة مكتملة */}
                            {course.status === 'مكتملة' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  {course.grade || 'ناجح'}
                                </span>
                                <span className="text-[10px] text-slate-400">مكتملة</span>
                              </div>
                            )}

                            {/* مادة مسجلة للفصل الحالي */}
                            {course.status === 'مسجلة' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-mono">
                                  شعبة {course.currentSection || '1'}
                                </span>
                                <button
                                  onClick={() => setDropTarget(course)}
                                  disabled={isSubmitting}
                                  className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>سحب</span>
                                </button>
                              </div>
                            )}

                            {/* مادة متاحة للتسجيل */}
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
                                  className="h-8 bg-slate-900 border border-slate-700 rounded-lg px-2 text-[11px] text-white focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
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
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>جارٍ...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      <span>سجل</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* مادة غير متاحة */}
                            {course.status === 'غير متاحة' && (
                              <span className="text-[11px] text-slate-500">
                                غير متاحة - لا توجد شعب
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
                <span className="font-mono text-blue-400">شعبة {dropTarget.currentSection || '1'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDropConfirm}
                disabled={actionLoading === dropTarget.courseNumber}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === dropTarget.courseNumber ? (
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
                disabled={actionLoading === dropTarget.courseNumber}
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
