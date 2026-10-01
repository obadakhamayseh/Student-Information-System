import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
import { parseTranscriptHtml } from '@/lib/parsers/grades.parser';

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
      'studmarks.jsp',
      session.cookies
    );

    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    try {
      const fs = await import('fs');
      const path = await import('path');
      const dumpPath = path.join(process.cwd(), 'fixtures/raw_pages/studmarks.html');
      fs.writeFileSync(dumpPath, html, 'utf8');
      console.log('[DEBUG] Saved studmarks.html (' + html.length + ' bytes)');
    } catch (e) {
      console.error('[DEBUG] Failed to save studmarks.html:', e);
    }

    const data = parseTranscriptHtml(html);
    console.log('[DEBUG] Parsed Transcript Data:', JSON.stringify(data, null, 2));
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
