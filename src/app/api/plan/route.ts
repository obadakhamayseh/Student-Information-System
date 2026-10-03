import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseStudyPlanHtml } from '@/lib/parsers/plan.parser';
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

  if (!forceRefresh) {
    const cached = ServerCache.get(ServerCache.key(studentId, 'plan'));
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const { html, updatedCookies } = await MutahClient.fetchProtectedPage(
      'treeplan.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    // جلب المواد المسجلة الحالية من كاش لوحة التحكم أو الجدول لتحديدها في الخطة بدقة
    const dashCache = ServerCache.get<any>(ServerCache.key(studentId, 'dashboard'));
    const schedCache = ServerCache.get<any>(ServerCache.key(studentId, 'schedule'));
    let registeredCourseCodes = (dashCache?.courses || schedCache?.weeklySchedule || [])
      .map((c: any) => c.courseNumber)
      .filter(Boolean);
    let majorFromDash = dashCache?.major;

    // إذا لم تكن مساقات الفصل الحالي محفوظة في الكاش، نجلب dashboard سريعاً لمعرفة المساقات المسجلة حالياً
    if (registeredCourseCodes.length === 0 && session.cookies) {
      try {
        const { parseDashboardHtml } = await import('@/lib/parsers/dashboard.parser');
        const dashRes = await MutahClient.fetchProtectedPage('dashboard.jsp', session.cookies);
        if (dashRes.html) {
          const dashData = parseDashboardHtml(dashRes.html);
          if (dashData.courses && dashData.courses.length > 0) {
            registeredCourseCodes = dashData.courses.map((c: any) => c.courseNumber).filter(Boolean);
          }
          if (dashData.major) {
            majorFromDash = dashData.major;
          }
          ServerCache.set(ServerCache.key(studentId, 'dashboard'), dashData, CACHE_TTL.DASHBOARD);
        }
      } catch (err) {
        console.warn('[PLAN] Could not prefetch dashboard for registered courses:', err);
      }
    }

    const data = parseStudyPlanHtml(html, {
      registeredCourseCodes: registeredCourseCodes.length > 0 ? registeredCourseCodes : undefined,
      majorName: majorFromDash,
      studentId: session.studentId,
      studentName: session.studentName,
    });

    if (dashCache?.currentSemester) {
      data.currentSemester = dashCache.currentSemester;
    }

    ServerCache.set(ServerCache.key(studentId, 'plan'), data, CACHE_TTL.PLAN);

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Plan fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب الخطة الدراسية' },
      { status: 500 }
    );
  }
}
