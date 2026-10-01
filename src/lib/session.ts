import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isLoggedIn: boolean;
  studentId?: string;
  studentName?: string;
  cookies?: string; // كوكيز جلسة بوابة مؤتة الأصلية بعد الدخول (JSESSIONID, BNIS_*, BNES_*)
  tempCookies?: string; // كوكيز جلسة الكابتشا المؤقتة
  csrfToken?: string; // رمز CSRF المرتبط بجلسة الكابتشا
  loginTime?: number;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'mutah_secret_session_encryption_key_2026_secure_32chars',
  cookieName: 'mutah_sis_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // ساعتان كحد أقصى للجلسة
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}
