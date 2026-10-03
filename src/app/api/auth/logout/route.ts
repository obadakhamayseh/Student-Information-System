import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient } from '@/lib/upstream/client';
import { ServerCache } from '@/lib/server-cache';

export async function POST() {
  const session = await getSession();

  // حذف بيانات الكاش بالكامل فوراً عند تسجيل الخروج
  if (session.studentId) {
    ServerCache.invalidateSession(session.studentId);
  }
  ServerCache.clearAll();

  // إرسال طلب تسجيل الخروج وإبطال الجلسة في خادم الجامعة الأصلي
  if (session.cookies) {
    await MutahClient.logout(session.cookies);
  }

  session.destroy();
  return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح من النظام ومن خادم الجامعة' });
}
