import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient, SessionExpiredError } from '@/lib/upstream/client';
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
    const { html, updatedCookies } = await MutahClient.fetchProtectedPage(
      'dashboard.jsp',
      session.cookies
    );

    // تحديث الكوكيز في الجلسة إذا أرسل الخادم كوكيز جديدة
    if (updatedCookies && updatedCookies !== session.cookies) {
      session.cookies = updatedCookies;
      await session.save();
    }

    // حفظ نسخة من الـ HTML لتحليل هيكل الجدول بدقة
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dumpPath = path.join(process.cwd(), 'fixtures/raw_pages/dashboard.html');
      fs.writeFileSync(dumpPath, html, 'utf8');
      console.log('[DEBUG] Saved dashboard.html (' + html.length + ' bytes)');
    } catch (e) {
      console.error('[DEBUG] Failed to save dashboard.html:', e);
    }

    let marksHtml = '';
    try {
      const marksRes = await MutahClient.fetchProtectedPage('studmarks.jsp', updatedCookies || session.cookies);
      marksHtml = marksRes.html;
      if (marksRes.updatedCookies && marksRes.updatedCookies !== session.cookies) {
        session.cookies = marksRes.updatedCookies;
        await session.save();
      }
    } catch (e) {
      console.warn('[DASHBOARD] Could not fetch studmarks for GPA:', e);
    }

    const data = parseDashboardHtml(html, marksHtml);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return NextResponse.json(
        { error: 'SESSION_EXPIRED', message: 'انتهت صلاحية الجلسة في بوابة الجامعة' },
        { status: 401 }
      );
    }

    console.error('Dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'UPSTREAM_ERROR', message: error.message || 'فشل جلب بيانات لوحة التحكم' },
      { status: 500 }
    );
  }
}
