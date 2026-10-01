'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import type { TranscriptData } from '@/lib/schemas/grades.schema';

export default function GradesPage() {
  const router = useRouter();
  const [data, setData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const fetchGrades = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/grades', { cache: 'no-store' });
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

  const getGradeBadge = (gradeStr: string) => {
    const num = parseFloat(gradeStr);
    if (isNaN(num)) {
      if (gradeStr.includes('ناجح')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      if (gradeStr.includes('راسب')) return 'bg-red-500/10 text-red-400 border-red-500/20';
      return 'bg-slate-800 text-slate-300 border-slate-700';
    }
    if (num >= 85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (num >= 75) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (num >= 65) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (num >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-red-500/10 text-red-400 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-28 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
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
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض كشف العلامات</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchGrades(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  // تصفية الفصول والمواد بحسب البحث
  const filteredSemesters = (data?.semesters || []).filter((sem) => {
    if (selectedSemester !== 'all' && sem.semesterId !== selectedSemester) return false;
    if (!searchQuery.trim()) return true;
    return sem.courses.some(
      (c) =>
        c.courseName.includes(searchQuery) ||
        c.courseNumber.includes(searchQuery)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
      {/* الترويسة العلوية والمؤشرات الإجمالية */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>السجل الأكاديمي الشامل</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              كشف العلامات والتطور الدراسي
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              درجات الفصول الدراسية مطابقة 100% لسجلات جامعة مؤتة
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 px-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block">المعدل التراكمي الكلي</span>
                <span className="text-xl font-bold text-white font-mono">{data?.cumulativeGpa || '0.00'}%</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <button
              onClick={() => fetchGrades(true)}
              disabled={refreshing}
              title="تحديث العلامات"
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* شريط البحث وتصفية الفصول */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مادة باسمها أو رقمها..."
            className="w-full h-10 bg-slate-950/70 border border-slate-800 rounded-xl pr-10 pl-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="h-10 bg-slate-950/70 border border-slate-800 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">جميع الفصول الدراسية</option>
            {(data?.semesters || []).map((sem) => (
              <option key={sem.semesterId} value={sem.semesterId}>
                {sem.semesterName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* قائمة الفصول وعلامات المواد */}
      <div className="space-y-6">
        {filteredSemesters.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            لا توجد مواد مطابقة للبحث أو لا تتوفر علامات مسجلة حالياً
          </div>
        ) : (
          filteredSemesters.map((sem) => (
            <div
              key={sem.semesterId}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* رأس الفصل الدراسي */}
              <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{sem.semesterName}</h2>
                    <span className="text-[11px] text-slate-400">
                      عدد المواد: {sem.courses.length} مادة
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  {sem.semesterGpa && sem.semesterGpa !== '0.00' && (
                    <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                      <span className="text-[10px] text-slate-400 ml-1">فصلي:</span>
                      <span>{sem.semesterGpa}%</span>
                    </div>
                  )}
                  {sem.cumulativeGpa && sem.cumulativeGpa !== '0.00' && (
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      <span className="text-[10px] text-slate-400 ml-1">تراكمي:</span>
                      <span>{sem.cumulativeGpa}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* جدول مواد الفصل */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-950/20 text-slate-400 text-[11px]">
                      <th className="py-3 px-4 font-medium">رقم المادة</th>
                      <th className="py-3 px-4 font-medium">اسم المادة</th>
                      <th className="py-3 px-4 font-medium text-center">الساعات</th>
                      <th className="py-3 px-4 font-medium text-center">العلامة</th>
                      <th className="py-3 px-4 font-medium text-center">التقدير</th>
                      <th className="py-3 px-4 font-medium text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-200">
                    {sem.courses.map((course, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{course.courseNumber}</td>
                        <td className="py-3 px-4 font-medium text-white">{course.courseName}</td>
                        <td className="py-3 px-4 text-center font-mono">{course.creditHours}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block min-w-10 px-2 py-0.5 rounded-md font-mono font-bold border text-xs ${getGradeBadge(
                              course.grade
                            )}`}
                          >
                            {course.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {course.points || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] ${
                              course.status.includes('ناجح')
                                ? 'text-emerald-400'
                                : course.status.includes('راسب')
                                ? 'text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {course.status.includes('ناجح') && <CheckCircle2 className="w-3 h-3" />}
                            <span>{course.status || '—'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
