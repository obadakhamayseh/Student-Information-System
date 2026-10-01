import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseExamScheduleHtml } from '@/lib/parsers/schedule.parser';
import { parseDashboardHtml } from '@/lib/parsers/dashboard.parser';

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.cookies) {
    return NextResponse.json(
      { error: 'SESSION_EXPIRED', message: 'غير مسجل الدخول' },
      { status: 401 }
    );
  }

  try {
    // 1. جلب جدول الامتحانات
    const { html: examHtml, updatedCookies } = await MutahClient.fetchProtectedPage(
      'examschedule.jsp',
      session.cookies
    );

    let activeCookies = updatedCookies || session.cookies;

    // 2. جلب المواد المسجلة للفصل الحالي من لوحة التحكم
    const { html: dashHtml, updatedCookies: dashCookies } = await MutahClient.fetchProtectedPage(
      'dashboard.jsp',
      activeCookies
    );

    if (dashCookies && dashCookies !== session.cookies) {
      session.cookies = dashCookies;
      await session.save();
    }

    try {
      const fs = await import('fs');
      const path = await import('path');
      fs.writeFileSync(path.join(process.cwd(), 'fixtures/raw_pages/examschedule.html'), examHtml, 'utf8');
      fs.writeFileSync(path.join(process.cwd(), 'fixtures/raw_pages/dashboard.html'), dashHtml, 'utf8');
      console.log('[DEBUG] Saved examschedule.html and dashboard.html');
    } catch (e) {
      console.error('[DEBUG] Failed to save schedule HTML:', e);
    }

    const examData = parseExamScheduleHtml(examHtml);
    const dashData = parseDashboardHtml(dashHtml);
    console.log('[DEBUG] Parsed Schedule Data:', { examsCount: examData.exams?.length, coursesCount: dashData.courses?.length });

    return NextResponse.json({
      currentSemester: dashData.currentSemester || 'الفصل الحالي',
      totalRegisteredHours: dashData.registeredHours || 0,
      weeklySchedule: dashData.courses || [],
      exams: examData.exams || [],
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
