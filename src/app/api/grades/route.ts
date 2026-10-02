import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseTranscriptHtml } from '@/lib/parsers/grades.parser';
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
    const cached = ServerCache.get(ServerCache.key(studentId, 'grades'));
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const { html, updatedCookies } = await MutahClient.fetchProtectedPage(
      'studmarks.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    const data = parseTranscriptHtml(html);

    ServerCache.set(ServerCache.key(studentId, 'grades'), data, CACHE_TTL.GRADES);

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Grades fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب كشف العلامات' },
      { status: 500 }
    );
  }
}
