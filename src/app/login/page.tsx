'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // حالة الكابتشا
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(true);

  // حالات الخطأ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // مرجع لمنع تكرار جلب الكابتشا مرتين في وضع التطوير (React StrictMode)
  const isFetchingCaptchaRef = useRef(false);
  const hasMountedRef = useRef(false);

  // جلب رمز التحقق مع حفظ الجلسة مشفرة في السيرفر تلقائياً
  const loadCaptcha = async (force = false) => {
    if (isFetchingCaptchaRef.current && !force) return;
    isFetchingCaptchaRef.current = true;
    setIsLoadingCaptcha(true);
    setCaptchaInput('');

    try {
      const res = await fetch('/api/auth/captcha', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.captchaUrl) {
        setCaptchaUrl(data.captchaUrl);
      } else {
        setErrorMessage(data.error || 'تعذر جلب رمز التحقق');
      }
    } catch {
      setErrorMessage('فشل في الاتصال بخادم الجامعة، تأكد من اتصال الإنترنت');
    } finally {
      setIsLoadingCaptcha(false);
      isFetchingCaptchaRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadCaptcha();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanStudentId = studentId.trim();
    const cleanCaptcha = captchaInput.trim();

    if (!cleanStudentId) {
      setErrorMessage('يرجى إدخال الرقم الجامعي');
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }
    if (!cleanCaptcha) {
      setErrorMessage('يرجى إدخال رمز التحقق (CAPTCHA)');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: cleanStudentId,
            password,
            captchaInput: cleanCaptcha,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          router.push('/dashboard');
        } else {
          setErrorMessage(
            data.error || 'رمز التحقق أو كلمة المرور غير صحيحة. تم تحديث الرمز، يرجى إدخال الرمز الجديد الظاهر في الصورة'
          );
          // عند الخطأ نحدث الكابتشا تلقائياً
          loadCaptcha(true);
        }
      } catch {
        setErrorMessage('تعذر الاتصال بالبوابة، يرجى المحاولة بعد قليل');
        loadCaptcha(true);
      }
    });
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 bg-slate-950 overflow-hidden font-sans">
      {/* خلفية جمالية تفاعلية وإضاءات هادئة */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* بطاقة الدخول الزجاجية الفخمة */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-950/40">
          {/* رأس البطاقة والشعار */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25 mb-4 text-white">
              <GraduationCap className="w-9 h-9" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs font-semibold tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جامعة مؤتة • MUTAH UNIVERSITY</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">بوابة الطالب الذكية</h1>
            <p className="text-slate-400 text-xs mt-1.5">
              واجهة شخصية عصرية، سريعة، ومباشرة فوق نظام معلومات الطلبة
            </p>
          </div>

          {/* تنبيه الخطأ إن وُجد */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* نموذج الدخول */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* الرقم الجامعي */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                الرقم الجامعي (Student ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثال: 120242222083"
                  className="w-full h-12 bg-slate-800/60 border border-slate-700 rounded-xl px-11 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500 text-left font-mono"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 bg-slate-800/60 border border-slate-700 rounded-xl px-11 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500 text-left"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* التحقق البشري (CAPTCHA) */}
            <div className="pt-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                رمز التحقق البصري (CAPTCHA)
              </label>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="h-12 flex-1 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-700 p-1">
                  {isLoadingCaptcha ? (
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>جاري جلب الرمز...</span>
                    </div>
                  ) : captchaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={captchaUrl}
                      alt="رمز التحقق"
                      className="h-full object-contain filter contrast-125"
                    />
                  ) : (
                    <span className="text-xs text-red-500">فشل تحميل الرمز</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => loadCaptcha(true)}
                  disabled={isLoadingCaptcha}
                  title="تحديث رمز التحقق"
                  className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingCaptcha ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <input
                type="text"
                dir="ltr"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="أدخل الرمز الظاهر في الصورة"
                className="w-full h-12 bg-slate-800/60 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500 text-center font-mono tracking-widest"
                required
              />
            </div>

            {/* زر الدخول */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending || isLoadingCaptcha}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق وتسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* شارة الضمان والأمان */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>اتصال مشفر ومباشر • لا يتم تخزين كلمة المرور أو حفظ أي بيانات إطلاقاً</span>
          </div>
        </div>

        {/* تذييل */}
        <p className="text-center text-slate-500 text-xs mt-6">
          جامعة مؤتة • تطوير واجهة حديثة مبنية على Next.js 14 BFF
        </p>
      </div>
    </main>
  );
}
