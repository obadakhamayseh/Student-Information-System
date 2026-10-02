/**
 * Server-Side In-Memory Cache
 * يخزّن نتائج الـ API محلياً لتجنب الطلبات المتكررة لبوابة الجامعة
 * مع احترام الجلسة الفردية لكل طالب (per-session keying)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // بالميلي ثانية
}

const cache = new Map<string, CacheEntry<unknown>>();

// تنظيف دوري كل 5 دقائق لإزالة المدخلات المنتهية
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const ServerCache = {
  /**
   * جلب قيمة من الكاش
   */
  get<T>(key: string): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  },

  /**
   * حفظ قيمة في الكاش
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  },

  /**
   * حذف قيمة واحدة
   */
  delete(key: string): void {
    cache.delete(key);
  },

  /**
   * حذف كل مدخلات جلسة معينة (عند الضغط على زر التحديث)
   */
  invalidateSession(studentId: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(`${studentId}:`)) {
        cache.delete(key);
      }
    }
  },

  /**
   * بناء مفتاح الكاش
   */
  key(studentId: string, resource: string): string {
    return `${studentId}:${resource}`;
  },
};

// مدد الكاش لكل resource (بالميلي ثانية)
export const CACHE_TTL = {
  DASHBOARD: 3 * 60 * 1000,    // 3 دقائق (بيانات مستقرة نسبياً)
  GRADES: 10 * 60 * 1000,      // 10 دقائق (لا تتغير إلا نادراً)
  PLAN: 10 * 60 * 1000,        // 10 دقائق (لا تتغير إلا نادراً)
  SCHEDULE: 3 * 60 * 1000,     // 3 دقائق
  REGISTRATION: 2 * 60 * 1000, // دقيقتان (أكثر تغيراً)
};
