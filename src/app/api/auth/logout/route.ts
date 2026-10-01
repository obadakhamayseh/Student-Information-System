import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MutahClient } from '@/lib/upstream/client';

export async function POST() {
  const session = await getSession();

  // إرسال طلب تسجيل الخروج وإبطال الجلسة في خادم الجامعة الأصلي
  if (session.cookies) {
    await MutahClient.logout(session.cookies);
  }

  session.destroy();
  return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح من النظام ومن خادم الجامعة' });
}

