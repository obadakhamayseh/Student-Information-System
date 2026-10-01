import { z } from 'zod';

export const LoginRequestSchema = z.object({
  studentId: z
    .string()
    .min(5, 'الرقم الجامعي يجب أن يتكون من 5 أرقام على الأقل')
    .max(15, 'الرقم الجامعي لا يتجاوز 15 رقماً')
    .regex(/^\d+$/, 'الرقم الجامعي يجب أن يحتوي على أرقام فقط'),
  password: z
    .string()
    .min(3, 'كلمة المرور يجب أن لا تقل عن 3 أحرف')
    .max(30, 'كلمة المرور لا تتجاوز 30 حرفاً'),
  captchaInput: z
    .string()
    .min(1, 'يرجى إدخال رمز التحقق (CAPTCHA)'),
  csrfToken: z.string().optional(),
  tempCookies: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthStateSchema = z.object({
  isLoggedIn: z.boolean(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
});

export type AuthState = z.infer<typeof AuthStateSchema>;
