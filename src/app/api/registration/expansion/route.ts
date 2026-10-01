import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseExpandSectionHtml } from '@/lib/parsers/expansion.parser';

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
      'expandsection.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    const data = parseExpandSectionHtml(html);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Expand section fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب صفحة طلب توسعة شعبة' },
      { status: 500 }
    );
  }
}

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
    const { action, courseNumber, section, csrfToken } = body;

    if (!action || !courseNumber || !section || !csrfToken) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'جميع الحقول مطلوبة لإتمام طلب التوسعة' },
        { status: 400 }
      );
    }

    const result = await MutahClient.executeExpansionAction({
      action: action === 'cancel' ? 'cancel' : 'create',
      courseNumber,
      section,
      csrfToken,
      cookies: session.cookies,
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

    console.error('Expand section action error:', error);
    return NextResponse.json(
      { error: 'ACTION_FAILED', message: error.message || 'فشل تنفيذ إجراء طلب التوسعة' },
      { status: 500 }
    );
  }
}
