'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  CircleDashed,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { StudyPlanData, PlanCourse } from '@/lib/schemas/plan.schema';

export default function PlanPage() {
  const router = useRouter();
  const [data, setData] = useState<StudyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'منجزة' | 'مسجلة' | 'متبقية'>('all');

  const fetchPlan = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/plan', { cache: 'no-store' });
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-28 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
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
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض الخطة الدراسية</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchPlan(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredCourses = (data?.courses || []).filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    return (
      c.courseName.includes(searchQuery) ||
      c.courseNumber.includes(searchQuery)
    );
  });

  const completedHours = data?.completedHours || 0;
  const totalHours = data?.totalHours || 132;
  const progressPercent = Math.min(100, Math.round((completedHours / totalHours) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
      {/* الترويسة وبطاقة التقدم في الخطة */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>شجرة المتطلبات والخطة الاسترشادية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              الخطة الدراسية والمواد المتبقية
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              تتبع الساعات المنجزة والمواد المتبقية للتخرج • جامعة مؤتة
            </p>
          </div>

          <button
            onClick={() => fetchPlan(true)}
            disabled={refreshing}
            title="تحديث الخطة"
            className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* شريط الإنجاز */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300">
              الساعات المنجزة: <span className="font-bold text-white">{completedHours}</span> من أصل{' '}
              <span className="font-bold text-white">{totalHours}</span> ساعة
            </span>
            <span className="font-mono text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* شريط البحث وتصفية الحالة */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مادة في الخطة برقمها أو اسمها..."
            className="w-full h-10 bg-slate-950/70 border border-slate-800 rounded-xl pr-10 pl-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'منجزة', 'مسجلة', 'متبقية'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'جميع المواد' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة المواد */}
      <div className="space-y-4">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            لا توجد مواد مطابقة في الخطة الدراسية
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course, idx) => (
              <div
                key={idx}
                className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-slate-400">{course.courseNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {course.grade && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {course.grade}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          course.status === 'منجزة'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : course.status === 'مسجلة'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {course.status === 'منجزة' && <CheckCircle2 className="w-3 h-3" />}
                        {course.status === 'مسجلة' && <Clock className="w-3 h-3" />}
                        {course.status === 'متبقية' && <CircleDashed className="w-3 h-3" />}
                        <span>{course.status}</span>
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-3">{course.courseName}</h3>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>الساعات المعتمدة:</span>
                      <span className="text-slate-200 font-mono">{course.creditHours} ساعات</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>المتطلب السابق:</span>
                      <span className="text-slate-300 font-mono">{course.prerequisite || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                      <span>التصنيف:</span>
                      <span className="text-slate-400">{course.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
