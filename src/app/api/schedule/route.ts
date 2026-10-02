import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseDashboardHtml } from '@/lib/parsers/dashboard.parser';

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

  try {
    // جلب المواد المسجلة للفصل الحالي من لوحة التحكم فقط
    const { html: dashHtml, updatedCookies } = await MutahClient.fetchProtectedPage(
      'dashboard.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    const dashData = parseDashboardHtml(dashHtml);

    let weeklySchedule = dashData.courses || [];
    if (weeklySchedule.length > 0) {
      try {
        const { SubpClient } = await import('@/lib/upstream/subp.client');
        weeklySchedule = await SubpClient.enrichCourses(weeklySchedule, forceRefresh);
      } catch (err) {
        console.warn('[SCHEDULE] Could not enrich courses with subp:', err);
      }
    }

    return NextResponse.json({
      currentSemester: dashData.currentSemester || 'الفصل الحالي',
      totalRegisteredHours: dashData.registeredHours || 0,
      weeklySchedule,
      exams: [],
    });
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Schedule fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب جدول الامتحانات والمحاضرات' },
      { status: 500 }
    );
  }
}
