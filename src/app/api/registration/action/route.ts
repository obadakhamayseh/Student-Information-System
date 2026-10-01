import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';

export async function POST(request: Request) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.cookies) {
    return NextResponse.json(
      { error: 'SESSION_EXPIRED', message: 'غير مسجل الدخول' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, courseNumber, section, csrfToken, redirectPage } = body;

    if (!action || !courseNumber || !section || !csrfToken) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'جميع الحقول مطلوبة لإتمام عملية التسجيل' },
        { status: 400 }
      );
    }

    const result = await MutahClient.executeRegistrationAction({
      action,
      courseNumber,
      section,
      csrfToken,
      cookies: session.cookies,
      redirectPage: redirectPage || 'registplan.jsp',
    });

    if (result.updatedCookies && result.updatedCookies !== session.cookies) {
      session.cookies = result.updatedCookies;
      await session.save();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Registration action error:', error);
    return NextResponse.json(
      { error: 'ACTION_FAILED', message: error.message || 'فشل تنفيذ عملية التسجيل' },
      { status: 500 }
    );
  }
}
