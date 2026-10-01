import { NextRequest, NextResponse } from 'next/server';
import { MutahClient } from '@/lib/upstream/client';
import { getSession } from '@/lib/session';
import { LoginRequestSchema } from '@/lib/schemas/auth.schema';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const parseResult = LoginRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'بيانات غير صالحة';
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { studentId, password, captchaInput } = parseResult.data;

    // استخراج الكوكيز والـ CSRF من الجلسة المشفرة مباشرة
    const cookiesToUse = session.tempCookies || parseResult.data.tempCookies;
    const csrfToUse = session.csrfToken || parseResult.data.csrfToken || '';

    if (!cookiesToUse) {
      return NextResponse.json(
        {
          success: false,
          error: 'انتهت صلاحية رمز التحقق، يرجى تحديث الرمز وإعادة المحاولة',
        },
        { status: 400 }
      );
    }

    // إرسال طلب تسجيل الدخول إلى بوابة جامعة مؤتة
    const loginResult = await MutahClient.submitLogin({
      studentId,
      password,
      captchaInput,
      csrfToken: csrfToUse,
      cookies: cookiesToUse,
    });

    if (!loginResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: loginResult.error || 'فشل تسجيل الدخول، يرجى التحقق من بياناتك',
        },
        { status: 401 }
      );
    }

    // حفظ الجلسة مشفرة في iron-session (httpOnly Cookie)
    session.isLoggedIn = true;
    session.studentId = studentId;
    session.cookies = loginResult.cookies;
    session.tempCookies = undefined;
    session.csrfToken = undefined;
    session.loginTime = Date.now();
    await session.save();

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً',
      },
      { status: 500 }
    );
  }
}
