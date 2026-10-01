import { NextResponse } from 'next/server';
import { MutahClient } from '@/lib/upstream/client';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    // 1. بدء جلسة والحصول على كوكيز Barracuda & Tomcat الأولية ورمز الـ CSRF
    const { cookies, csrfToken, timestamp } = await MutahClient.getInitialSession();

    // 2. جلب صورة الكابتشا بنفس الكوكيز
    const { buffer, contentType, updatedCookies } = await MutahClient.fetchCaptchaImage(
      cookies,
      timestamp
    );

    // 3. حفظ الكوكيز ورمز الـ CSRF في كوكي الجلسة المشفرة httpOnly
    session.tempCookies = updatedCookies;
    session.csrfToken = csrfToken;
    await session.save();

    // 4. تحويل الصورة إلى base64 لنقلها بسلاسة للواجهة
    const base64Image = Buffer.from(buffer).toString('base64');
    const dataUri = `data:${contentType};base64,${base64Image}`;

    return NextResponse.json({
      captchaUrl: dataUri,
      csrfToken,
    });
  } catch (error: any) {
    console.error('Error generating captcha:', error);
    return NextResponse.json(
      { error: 'فشل في جلب رمز التحقق من خادم الجامعة، يرجى المحاولة مرة أخرى' },
      { status: 502 }
    );
  }
}
