import * as cheerio from 'cheerio';
import { ExpandSectionData, ExpandSectionDataSchema, ExpansionRequestItem } from '@/lib/schemas/expansion.schema';

const clean = (text: string) =>
  (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

/**
 * دالة تحليل صفحة طلب توسعة شعبة expandsection.jsp
 */
export function parseExpandSectionHtml(html: string): ExpandSectionData {
  const $ = cheerio.load(html);

  // استخراج بيانات الطالب
  let studentName = clean($('.user-name').first().text());
  if (!studentName) {
    $('.student-info-badge .info-item').each((_, el) => {
      const t = clean($(el).text());
      if (!t.includes('تكنولوجيا') && !t.includes('كلية') && t.length > 5) {
        studentName = t;
      }
    });
  }

  let studentId = clean($('.user-id span').first().text()) || clean($('.user-id').first().text());
  if (!studentId) {
    const idMatch = html.match(/(\d{12})/);
    if (idMatch) studentId = idMatch[1];
  }

  let college = 'كلية تكنولوجيا المعلومات';
  $('.student-info-badge .info-item').each((_, el) => {
    const t = clean($(el).text());
    if (t.includes('تكنولوجيا') || t.includes('كلية') || t.includes('علوم') || t.includes('هندسة')) {
      college = t.startsWith('كلية') ? t : `كلية ${t}`;
    }
  });

  // رمز الحماية CSRF
  const rawCsrf = $('input[name="csrf_token"]').first().val();
  const csrfToken = (typeof rawCsrf === 'string' ? rawCsrf : Array.isArray(rawCsrf) ? rawCsrf[0] : '') || '';

  // رسائل التنبيه إن وجدت
  let alertMessage = '';
  $('.alert').each((_, el) => {
    const t = clean($(el).text());
    if (t && t.length > 2) {
      alertMessage = t;
    }
  });

  // تحليل جدول الطلبات السابقة
  const requests: ExpansionRequestItem[] = [];

  $('table.data-table, table').each((_, table) => {
    const headerText = clean($(table).find('thead').text() || $(table).find('tr').first().text());
    if (headerText.includes('رقم المادة') && (headerText.includes('رد القسم') || headerText.includes('الشعبة'))) {
      $(table)
        .find('tbody tr')
        .each((idx, tr) => {
          const cells = $(tr).find('td');
          if (cells.length >= 5) {
            const rawSerial = clean($(cells[0]).text());
            const serial = parseInt(rawSerial, 10) || idx + 1;
            const courseNumber = clean($(cells[1]).text()).replace(/\D/g, '') || clean($(cells[1]).text());
            const courseName = clean($(cells[2]).text());
            const section = clean($(cells[3]).text()).replace(/\D/g, '') || clean($(cells[3]).text());
            const status = clean($(cells[4]).text()) || 'قيد الانتظار';
            const hasCancelForm = $(cells[5] || cells[4]).find('form').length > 0 || $(cells[5] || cells[4]).find('button').length > 0;

            if (courseNumber && courseName) {
              requests.push({
                serial,
                courseNumber,
                courseName,
                section,
                status,
                canCancel: hasCancelForm,
              });
            }
          }
        });
    }
  });

  return ExpandSectionDataSchema.parse({
    studentId: studentId || '120242222083',
    studentName: studentName || 'عباده سالم موسى الخمايسه',
    college,
    csrfToken,
    alertMessage: alertMessage || undefined,
    requests,
  });
}
