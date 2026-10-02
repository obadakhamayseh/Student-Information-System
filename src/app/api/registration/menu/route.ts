import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseRegMenuHtml } from '@/lib/parsers/registration.parser';

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
    const { html, updatedCookies } = await MutahClient.fetchProtectedPage(
      'regmenu.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    const data = parseRegMenuHtml(html);

    if (data.registeredCourses && data.registeredCourses.length > 0) {
      try {
        const { SubpClient } = await import('@/lib/upstream/subp.client');
        data.registeredCourses = await SubpClient.enrichCourses(data.registeredCourses, forceRefresh);
      } catch (err) {
        console.warn('[REGMENU] Could not enrich registered courses with subp:', err);
      }
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

    console.error('Regmenu fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب قائمة التسجيل الإلكتروني' },
      { status: 500 }
    );
  }
}
