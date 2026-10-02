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

    const data = parseStudyPlanHtml(html);

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
