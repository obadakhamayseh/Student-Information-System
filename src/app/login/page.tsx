'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Captcha state
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(true);

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFetchingCaptchaRef = useRef(false);
  const hasMountedRef = useRef(false);

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
            data.error || 'رمز التحقق أو كلمة المرور غير صحيحة. تم تحديث الرمز، يرجى إدخال الرمز الجديد'
          );
          loadCaptcha(true);
        }
      } catch {
        setErrorMessage('تعذر الاتصال بالبوابة، يرجى المحاولة بعد قليل');
        loadCaptcha(true);
      }
    });
  };

  return (
    <main className="min-h-screen bg-background text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-body-md">
      {/* Background Subtle Accent Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Top Banner Strip */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 px-3 sm:px-4 rounded-xl bg-surface-container-lowest/80 backdrop-blur-md shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-2 sm:gap-space-sm">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-lg sm:text-xl">school</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-xs sm:text-sm text-primary font-bold">جامعة مؤتة</span>
            <span className="font-label-sm text-[10px] sm:text-[11px] text-on-surface-variant font-medium">
              بوابة الطالب الأكاديمية (SIS)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-label-sm bg-surface-container-low px-2 py-1 sm:px-2.5 rounded-lg shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-secondary font-bold text-[10px] sm:text-xs">اتصال آمن</span>
        </div>
      </header>

      {/* Central Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-[0_4px_28px_rgba(0,18,41,0.08)] border border-surface-container-high/60 relative">
          {/* Header */}
          <div className="text-center mb-space-lg">
            <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-3 shadow-md">
              <span className="material-symbols-outlined text-3xl text-secondary-container">fingerprint</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary">تسجيل الدخول الموحد</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              الربط الآمن والمباشر مع بوابة الطالب المركزية لجامعة مؤتة
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-space-md p-space-md rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-space-xs border border-error/20">
              <span className="material-symbols-outlined text-lg text-error shrink-0">error</span>
              <span className="font-label-md">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-space-md">
            {/* Student ID */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">
                الرقم الجامعي (Student ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
                  placeholder="2021102934"
                  className="w-full h-11 bg-surface-container-low border border-surface-container-high rounded-xl px-10 text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono text-left"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  badge
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-surface-container-low border border-surface-container-high rounded-xl px-10 text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-left"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  lock
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="pt-1">
              <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">
                رمز التحقق البصري (CAPTCHA)
              </label>
              <div className="flex items-center gap-space-sm mb-2">
                <div className="h-12 flex-1 bg-surface-container-low rounded-xl flex items-center justify-center overflow-hidden border border-surface-container-high p-1">
                  {isLoadingCaptcha ? (
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs font-label-sm">
                      <span className="material-symbols-outlined text-sm animate-spin text-secondary">sync</span>
                      <span>جاري جلب الرمز...</span>
                    </div>
                  ) : captchaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={captchaUrl}
                      alt="رمز التحقق"
                      className="h-full object-contain filter contrast-125 select-none"
                    />
                  ) : (
                    <span className="text-xs text-error font-label-sm">فشل تحميل الرمز</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => loadCaptcha(true)}
                  disabled={isLoadingCaptcha}
                  title="تحديث رمز التحقق"
                  className="h-12 w-12 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span
                    className={`material-symbols-outlined text-lg text-secondary ${
                      isLoadingCaptcha ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                </button>
              </div>

              <input
                type="text"
                dir="ltr"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="أدخل الرمز الظاهر أعلاه"
                className="w-full h-11 bg-surface-container-low border border-surface-container-high rounded-xl px-4 text-on-surface text-base focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-center font-mono tracking-widest font-bold"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending || isLoadingCaptcha}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    <span>جاري التحقق والمطابقة...</span>
                  </>
                ) : (
                  <>
                    <span>دخول البوابة الأكاديمية</span>
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security & Guarantee Strip */}
          <div className="mt-space-lg pt-space-md border-t border-surface-container-high/60 flex items-center justify-center gap-2 text-on-surface-variant text-xs font-label-sm">
            <span className="material-symbols-outlined text-secondary text-base">verified_user</span>
            <span>جلسة معتمدة بتشفير HttpOnly آمن وبدون تخزين كلمات المرور</span>
          </div>
        </div>

        {/* Footer Support Info */}
        <div className="text-center mt-6 text-on-surface-variant text-xs font-label-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-secondary">support_agent</span>
            عمادة القبول والتسجيل: +962 3 2372380
          </span>
          <span className="hidden sm:inline">•</span>
          <span>جامعة مؤتة © 2024</span>
        </div>
      </div>

      <footer className="text-center py-2 text-xs font-label-sm text-on-surface-variant/80">
        بوابة الطالب المطورة بنظام Next.js 16 مع واجهة التصميم الأكاديمي الموحدة
      </footer>
    </main>
  );
}
