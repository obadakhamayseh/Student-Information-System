'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. تسجيل الـ Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.error('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. فحص هل التطبيق مفتوح بالفعل كتطبيق مثبت (Standalone Mode)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      return; // التطبيق مثبت ويعمل كتطبيق بالفعل
    }

    // 3. فحص بيئة iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. الاستماع لحدث تثبيت التطبيق على أندرويد وكروم
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // إظهار البانر بعد 3 ثوانٍ من فتح الموقع إذا لم يقم المستخدم بإغلاقه مؤخراً
      const dismissedUntil = localStorage.getItem('mutah_pwa_dismissed');
      const now = Date.now();
      if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
        setTimeout(() => {
          setShowBanner(true);
        }, 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. الاستماع لأي طلب فتح يدوي من أزرار الهيدر أو القائمة
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt().then(() => {
          deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
              setShowBanner(false);
              setDeferredPrompt(null);
            }
          });
        });
      } else if (isIosDevice) {
        setShowIosModal(true);
      } else {
        // إذا لم يكن الحدث جاهزاً بعد (أو على حاسوب)
        setShowBanner(true);
      }
    };

    window.addEventListener('trigger-pwa-install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-pwa-install', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowBanner(false);
      setShowIosModal(true);
    } else {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // تأجيل الظهور التلقائي لمدة 3 أيام
    localStorage.setItem(
      'mutah_pwa_dismissed',
      (Date.now() + 3 * 24 * 60 * 60 * 1000).toString()
    );
  };

  if (isStandalone) {
    return null; // لا داعي لإظهار أي بانر داخل التطبيق المثبت
  }

  return (
    <>
      {/* 1. البانر التفاعلي السفلي لتثبيت التطبيق على الهاتف */}
      {showBanner && (
        <div className="fixed bottom-20 lg:bottom-6 inset-x-3 sm:inset-x-auto sm:left-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-surface-container-lowest border-2 border-primary/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 relative overflow-hidden">
            {/* مؤشر لوني علوي */}
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-secondary via-primary to-secondary"></div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md p-1 border border-primary-container">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Mutah SIS Logo"
                  className="w-full h-full rounded-lg object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-mono">
                    تطبيق PWA
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">• جامعة مؤتة</span>
                </div>
                <h3 className="text-sm font-bold text-primary mt-0.5 tracking-tight">
                  تحميل بوابة الطالب كتطبيق على الهاتف
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  تثبيت خفيف وسريع بدون الحاجة لمتجر التطبيقات للوصول الفوري لعلاماتك وجدولك الأكاديمي.
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
                title="إغلاق"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-surface-container-high/40">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-primary hover:bg-primary-container text-on-primary py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">download_for_offline</span>
                <span>تثبيت التطبيق الآن</span>
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. نافذة إرشادات التثبيت لأجهزة iPhone / iPad أو المتصفحات التي لا تدعم التثبيت التلقائي */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 p-1">
                  <img src="/icons/icon-192x192.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm font-bold text-primary">
                    تثبيت تطبيق بوابة مؤتة
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">خطوات التحميل السريعة</span>
                </div>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface">
              <div className="p-3 bg-surface-container-low rounded-xl flex items-center gap-3 border border-surface-container-high/40">
                <span className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold font-mono shrink-0">
                  1
                </span>
                <span>
                  اضغط على زر المشاركة <strong>(Share / <span className="material-symbols-outlined text-sm inline align-middle">ios_share</span>)</strong> في شريط متصفحك بالأسفل أو بالأعلى.
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl flex items-center gap-3 border border-surface-container-high/40">
                <span className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold font-mono shrink-0">
                  2
                </span>
                <span>
                  مرّر للأسفل واختر <strong>&quot;إضافة إلى الصفحة الرئيسية&quot;</strong> (Add to Home Screen <span className="material-symbols-outlined text-sm inline align-middle">add_box</span>).
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl flex items-center gap-3 border border-surface-container-high/40">
                <span className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold font-mono shrink-0">
                  3
                </span>
                <span>
                  اضغط على <strong>&quot;إضافة&quot; (Add)</strong> في الزاوية العلوية، وسيظهر التطبيق فوراً على شاشة هاتفك مع أيقونته الخاصة!
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary-container transition-all cursor-pointer"
              >
                فهمت، حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// دالة مساعدة عامة لإطلاق التثبيت من أي مكان في التطبيق
export function triggerPwaInstall() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
  }
}
