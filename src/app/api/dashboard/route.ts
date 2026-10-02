import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseDashboardHtml } from '@/lib/parsers/dashboard.parser';
import { ServerCache, CACHE_TTL } from '@/lib/server-cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  const session = await getSession();

  if (!session.isLoggedIn || !session.cookies) {
    return NextResponse.json(
      { error: 'SESSION_EXPIRED', message: 'غير مسجل الدخول' },
      { status: 401 }
    );
  }

  const studentId = session.studentId || 'unknown';

  // خدمة الكاش: إذا كانت البيانات محفوظة وحديثة — أرجعها فوراً دون طلب upstream
  if (!forceRefresh) {
    const cached = ServerCache.get(ServerCache.key(studentId, 'dashboard'));
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    // جلب dashboard و studmarks بالتوازي لتوفير الوقت
    const [dashResult, marksResult] = await Promise.allSettled([
      MutahClient.fetchProtectedPage('dashboard.jsp', session.cookies),
      MutahClient.fetchProtectedPage('studmarks.jsp', session.cookies),
    ]);

    const { html, updatedCookies } = dashResult.status === 'fulfilled'
      ? dashResult.value
      : { html: '', updatedCookies: '' };

    const marksHtml = marksResult.status === 'fulfilled' ? marksResult.value.html : '';

    // تحديث الكوكيز مرة واحدة
    const finalCookies = updatedCookies || session.cookies;
    if (finalCookies !== session.cookies) {
      session.cookies = finalCookies;
    }

    const data = parseDashboardHtml(html, marksHtml);

    // حفظ اسم الطالب في الجلسة إذا تغير
    if (data.studentName && data.studentName !== session.studentName) {
      session.studentName = data.studentName;
    }
    await session.save();

    // إثراء بأسماء الدكاترة والقاعات من جريدة المواد
    if (data.courses && data.courses.length > 0) {
      try {
        const { SubpClient } = await import('@/lib/upstream/subp.client');
        data.courses = await SubpClient.enrichCourses(data.courses, forceRefresh);
      } catch (err) {
        console.warn('[DASHBOARD] Could not enrich courses with subp:', err);
      }
    }

    // حفظ في الكاش
    ServerCache.set(ServerCache.key(studentId, 'dashboard'), data, CACHE_TTL.DASHBOARD);

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب بيانات لوحة التحكم' },
      { status: 500 }
    );
  }
}
