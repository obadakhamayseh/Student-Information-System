import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseRegistPlanHtml } from '@/lib/parsers/registration.parser';

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.cookies) {
    return NextResponse.json(
      { error: 'SESSION_EXPIRED', message: 'غير مسجل الدخول' },
      { status: 401 }
    );
  }

  try {
    const { html, updatedCookies } = await MutahClient.fetchProtectedPage(
      'registplan.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    const data = parseRegistPlanHtml(html, {
      studentId: session.studentId,
      studentName: session.studentName,
    });

    if (data.studentName && (!session.studentName || session.studentName !== data.studentName)) {
      session.studentName = data.studentName;
      await session.save();
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Registplan fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب صفحة تسجيل الخطة' },
      { status: 500 }
    );
  }
}
