import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseStudyPlanHtml } from '@/lib/parsers/plan.parser';

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
      'treeplan.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    try {
      const fs = await import('fs');
      const path = await import('path');
      const dumpPath = path.join(process.cwd(), 'fixtures/raw_pages/treeplan.html');
      fs.writeFileSync(dumpPath, html, 'utf8');
      console.log('[DEBUG] Saved treeplan.html (' + html.length + ' bytes)');
    } catch (e) {
      console.error('[DEBUG] Failed to save treeplan.html:', e);
    }

    const data = parseStudyPlanHtml(html);
    console.log('[DEBUG] Parsed Plan Data:', { coursesCount: data.courses?.length, totalHours: data.totalHours });
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
