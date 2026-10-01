/**
 * Upstream HTTP Client for Mutah University SIS
 * Handles Barracuda WAF cookies, session lifecycle, and SSRF protection.
 */

export class SessionExpiredError extends Error {
  constructor(message = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class UpstreamError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface LoginResult {
  success: boolean;
  error?: string;
  cookies: string;
}

export class MutahClient {
  public static readonly BASE_URL = 'https://app.mutah.edu.jo/studreg';

  private static readonly DEFAULT_HEADERS: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };

  /**
   * دمج وحفظ كوكيز الخادم (بما فيها كوكيز Barracuda WAF: BNIS_* و BNES_*)
   */
  public static mergeCookies(oldCookies: string, setCookieHeaders: string[] | string | null): string {
    const cookieMap = new Map<string, string>();

    // تفكيك الكوكيز القديمة
    if (oldCookies) {
      oldCookies.split(';').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            cookieMap.set(trimmed.substring(0, eqIdx).trim(), trimmed.substring(eqIdx + 1).trim());
          }
        }
      });
    }

    // تفكيك وتحديث الكوكيز الجديدة
    if (setCookieHeaders) {
      const headersArr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      for (const header of headersArr) {
        // نأخذ الجزء الأول فقط قبل الفاصلة المنقوطة (key=val)
        const parts = header.split(';');
        const pair = parts[0]?.trim();
        if (pair) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            const key = pair.substring(0, eqIdx).trim();
            const val = pair.substring(eqIdx + 1).trim();
            cookieMap.set(key, val);
          }
        }
      }
    }

    return Array.from(cookieMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * جلب صفحة تسجيل الدخول للحصول على الكوكيز المبدئية ورمز الـ CSRF
   */
  public static async getInitialSession(): Promise<{
    cookies: string;
    csrfToken: string;
    timestamp: number;
  }> {
    const url = `${this.BASE_URL}/`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.DEFAULT_HEADERS,
      redirect: 'manual',
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const mergedCookies = this.mergeCookies('', setCookies);

    const html = await response.text();
    // استخراج csrf_token
    const match = html.match(/name=["']csrf_token["']\s+value=["']([^"']+)["']/i);
    const csrfToken = match ? match[1] : '';

    return {
      cookies: mergedCookies,
      csrfToken,
      timestamp: Date.now(),
    };
  }

  /**
   * جلب صورة الـ CAPTCHA بنفس كوكيز الجلسة
   */
  public static async fetchCaptchaImage(cookies: string, ts: number): Promise<{
    buffer: ArrayBuffer;
    contentType: string;
    updatedCookies: string;
  }> {
    const url = `${this.BASE_URL}/captchaImage?ts=${ts}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.DEFAULT_HEADERS,
        Referer: `${this.BASE_URL}/`,
        Cookie: cookies,
      },
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const updatedCookies = this.mergeCookies(cookies, setCookies);

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return {
      buffer,
      contentType,
      updatedCookies,
    };
  }

  /**
   * محاولة تسجيل الدخول عبر إرسال الطلب إلى /studreg/logprog
   */
  public static async submitLogin(params: {
    studentId: string;
    password: string;
    captchaInput: string;
    csrfToken: string;
    cookies: string;
  }): Promise<LoginResult> {
    const url = `${this.BASE_URL}/logprog`;
    const submitTimestamp = Date.now().toString();

    const formData = new URLSearchParams();
    formData.append('csrf_token', params.csrfToken);
    formData.append('submit_timestamp', submitTimestamp);
    formData.append('pstudnum', params.studentId);
    formData.append('pstudpass', params.password);
    formData.append('captcha_input', params.captchaInput);
    formData.append('logon', 'دخول');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://app.mutah.edu.jo',
        Referer: `${this.BASE_URL}/`,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        Cookie: params.cookies,
      },
      body: formData.toString(),
      redirect: 'manual', // لا نتبع التوجيه تلقائياً لفحص الـ Location وكوكيز الرد بدقة
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const updatedCookies = this.mergeCookies(params.cookies, setCookies);

    const status = response.status;
    const location = response.headers.get('location') || '';
    const bodyText = await response.text();

    console.log('[UPSTREAM LOGIN RESULT]', {
      status,
      location,
      bodyPreview: bodyText.substring(0, 300),
      setCookiesCount: setCookies.length,
      studentId: params.studentId,
      captchaInput: params.captchaInput,
      hasCsrf: !!params.csrfToken,
      cookiesPreview: params.cookies.substring(0, 80) + '...',
    });

    // التحقق من النجاح
    const isRedirectToApp =
      status === 302 &&
      !location.includes('logscreen') &&
      !location.includes('error') &&
      !location.includes('login');

    if (
      isRedirectToApp ||
      location.includes('dashboard') ||
      location.includes('regmenu') ||
      location.includes('main') ||
      bodyText.includes('dashboard.jsp') ||
      bodyText.includes('regmenu.jsp')
    ) {
      return {
        success: true,
        cookies: updatedCookies,
      };
    }

    // التحقق من أسباب الفشل
    if (bodyText.includes('رمز التحقق') || location.includes('captcha')) {
      return {
        success: false,
        error: 'رمز التحقق (CAPTCHA) غير صحيح، يرجى المحاولة مرة أخرى',
        cookies: updatedCookies,
      };
    }

    if (bodyText.includes('كلمة المرور') || bodyText.includes('الرقم الجامعي')) {
      return {
        success: false,
        error: 'الرقم الجامعي أو كلمة المرور غير صحيحة',
        cookies: updatedCookies,
      };
    }

    // إذا تم التوجيه إلى صفحة الدخول مرة أخرى مع خطأ
    if (location.includes('logscreen') || location.includes('login')) {
      return {
        success: false,
        error: 'فشل تسجيل الدخول، تأكد من صحة بياناتك ورمز التحقق',
        cookies: updatedCookies,
      };
    }

    // إذا كان الرد 200 ولم يكن فيه لوحة التحكم
    return {
      success: false,
      error: 'لم تتم المصادقة بنجاح، يرجى إعادة المحاولة',
      cookies: updatedCookies,
    };
  }

  /**
   * جلب أي صفحة داخلية محمية بعد المصادقة
   */
  public static async fetchProtectedPage(
    relativePath: string,
    cookies: string
  ): Promise<{ html: string; updatedCookies: string }> {
    // التأكد من الحماية من SSRF: السماح فقط بالمسارات النسبية داخل البوابة
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const targetUrl = `${this.BASE_URL}/${cleanPath}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...this.DEFAULT_HEADERS,
        Referer: `${this.BASE_URL}/dashboard.jsp`,
        Cookie: cookies,
      },
      redirect: 'manual',
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const updatedCookies = this.mergeCookies(cookies, setCookies);

    // فحص انتهاء الجلسة عبر Location
    const location = response.headers.get('location') || '';
    if (
      response.status === 302 &&
      (location.includes('session_expired') || location.includes('logscreen') || location.includes('login'))
    ) {
      throw new SessionExpiredError();
    }

    const html = await response.text();

    // فحص انتهاء الجلسة من خلال محتوى الصفحة
    if (
      html.includes('session_expired') ||
      (html.includes('تسجيل الدخول - جامعة مؤتة') && !relativePath.includes('log'))
    ) {
      throw new SessionExpiredError();
    }

    if (!response.ok && response.status !== 302) {
      throw new UpstreamError(`فشل الاتصال بالخادم الأصلي (رمز الرد: ${response.status})`, response.status);
    }

    return { html, updatedCookies };
  }

  /**
   * تنفيذ عملية إضافة (1) أو سحب (2) مادة دراسية
   */
  public static async executeRegistrationAction(params: {
    action: 'add' | 'drop';
    courseNumber: string;
    section: string;
    csrfToken: string;
    cookies: string;
    redirectPage?: string;
  }): Promise<{ success: boolean; message?: string; updatedCookies: string }> {
    const url = `${this.BASE_URL}/regist`;
    const formData = new URLSearchParams();
    formData.append('csrf_token', params.csrfToken);
    formData.append('psub_number', params.courseNumber);
    formData.append('psection', params.section);
    formData.append('PCHOICE', params.action === 'add' ? '1' : '2');
    formData.append('redirect_page', params.redirectPage || 'registplan.jsp');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://app.mutah.edu.jo',
        Referer: `${this.BASE_URL}/${params.redirectPage || 'registplan.jsp'}`,
        Cookie: params.cookies,
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const updatedCookies = this.mergeCookies(params.cookies, setCookies);

    const location = response.headers.get('location') || '';
    if (
      response.status === 302 &&
      (location.includes('session_expired') || location.includes('logscreen'))
    ) {
      throw new SessionExpiredError();
    }

    const html = await response.text();
    // فحص الرسائل التحذيرية أو الأخطاء في رد الخادم
    if (html.includes('تعارض') || html.includes('لا يمكن') || html.includes('مغلقة') || html.includes('السقف')) {
      const match = html.match(/(تعارض.*?|لا يمكن.*?|الشعبة مغلقة.*?)/);
      return {
        success: false,
        message: match ? match[0] : 'تعذر إتمام العملية بسبب قيود التسجيل الأكاديمي',
        updatedCookies,
      };
    }

    return {
      success: true,
      message: params.action === 'add' ? 'تم تسجيل المادة بنجاح' : 'تم سحب المادة بنجاح',
      updatedCookies,
    };
  }

  /**
   * تنفيذ طلب توسعة شعبة (إرسال طلب جديد 1 أو إلغاء طلب 2)
   */
  public static async executeExpansionAction(params: {
    action: 'create' | 'cancel';
    courseNumber: string;
    section: string;
    csrfToken: string;
    cookies: string;
  }): Promise<{ success: boolean; message?: string; updatedCookies: string }> {
    const url = `${this.BASE_URL}/openReq`;
    const formData = new URLSearchParams();
    formData.append('csrf_token', params.csrfToken);
    formData.append('psub_number', params.courseNumber);
    formData.append('psection', params.section);
    formData.append('PCHOICE', params.action === 'create' ? '1' : '2');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://app.mutah.edu.jo',
        Referer: `${this.BASE_URL}/expandsection.jsp`,
        Cookie: params.cookies,
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
    const updatedCookies = this.mergeCookies(params.cookies, setCookies);

    const location = response.headers.get('location') || '';
    if (
      response.status === 302 &&
      (location.includes('session_expired') || location.includes('logscreen'))
    ) {
      throw new SessionExpiredError();
    }

    const html = await response.text();
    if (html.includes('alert-danger') || html.includes('لا يمكن') || html.includes('مسبقاً')) {
      const match = html.match(/(لا يمكن[^<]+|تم إرسال[^<]+|الشعبة ليست[^<]+)/);
      return {
        success: false,
        message: match ? match[0].trim() : 'تعذر إتمام طلب التوسعة',
        updatedCookies,
      };
    }

    return {
      success: true,
      message: params.action === 'create' ? 'تم إرسال طلب توسعة الشعبة بنجاح' : 'تم إلغاء طلب توسعة الشعبة بنجاح',
      updatedCookies,
    };
  }

  /**
   * تسجيل الخروج وإبطال الجلسة على خادم الجامعة الأصلي
   */
  public static async logout(cookies: string): Promise<void> {
    try {
      await fetch(`${this.BASE_URL}/logout.jsp`, {
        method: 'GET',
        headers: {
          ...this.DEFAULT_HEADERS,
          Cookie: cookies,
          Referer: `${this.BASE_URL}/dashboard.jsp`,
        },
        redirect: 'manual',
      });
    } catch (e) {
      console.error('Error logging out from upstream server:', e);
    }
  }
}
