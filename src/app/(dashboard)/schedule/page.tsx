'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  User,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { ScheduleData } from '@/lib/schemas/schedule.schema';

export default function SchedulePage() {
  const router = useRouter();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'weekly'>('exams');

  const fetchSchedule = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/schedule', { cache: 'no-store' });
      const json = await res.json();

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(json.message || 'فشل جلب جدول الامتحانات والمحاضرات');
        return;
      }

      setData(json);
      // إذا كان جدول الامتحانات فارغاً ولديه مواد مسجلة، نفتح التبويب الأسبوعي تلقائياً
      if ((json.exams || []).length === 0 && (json.weeklySchedule || []).length > 0) {
        setActiveTab('weekly');
      }
    } catch {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-28 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
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
          <h2 className="text-lg font-bold text-white mb-2">تعذر عرض الجدول</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => fetchSchedule(true)}
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
      {/* الترويسة العلوية */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>المواعيد والقاعات الدراسية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              الجدول الدراسي وبرنامج الامتحانات
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {data?.currentSemester || 'الفصل الدراسي الحالي'} • جامعة مؤتة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSchedule(true)}
              disabled={refreshing}
              title="تحديث الجدول"
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* أزرار التبديل بين جدول الامتحانات والمحاضرات */}
        <div className="mt-6 flex items-center gap-2 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'exams'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>برنامج الامتحانات ({data?.exams.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'weekly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>المحاضرات المسجلة ({data?.weeklySchedule.length || 0})</span>
          </button>
        </div>
      </div>

      {/* محتوى جدول الامتحانات */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {data?.exams.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              لا يتوفر جدول امتحانات منشور حالياً لهذا الفصل في بوابة الجامعة
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.exams.map((exam, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-blue-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono text-slate-400">{exam.courseNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        شعبة: {exam.section || '1'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-4">{exam.courseName}</h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{exam.examDay} • {exam.examDate}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>الوقت: {exam.examTime}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>القاعة: {exam.room || 'تُحدد لاحقاً'}</span>
                      </div>
                    </div>
                  </div>

                  {exam.seatNumber && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>رقم الجلوس:</span>
                      <span className="font-mono text-white font-bold">{exam.seatNumber}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى المحاضرات الأسبوعية */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {data?.weeklySchedule.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              لا توجد محاضرات مسجلة للفصل الحالي
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.weeklySchedule.map((course, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono text-slate-400">{course.courseNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        شعبة {course.section || '1'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-3">{course.courseName}</h3>

                    <div className="space-y-2 text-xs">
                      {course.days && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>الأيام: {course.days}</span>
                        </div>
                      )}

                      {course.time && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>الوقت: {course.time}</span>
                        </div>
                      )}

                      {course.room && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>القاعة: {course.room}</span>
                        </div>
                      )}

                      {course.instructor && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>المدرس: {course.instructor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
