import * as cheerio from 'cheerio';
import { ScheduleData, ScheduleDataSchema, ExamItem } from '@/lib/schemas/schedule.schema';

/**
 * دالة نقية لتحليل جدول الامتحانات من examschedule.jsp بدقة 100%
 */
export function parseExamScheduleHtml(html: string): ScheduleData {
  const $ = cheerio.load(html);

  const clean = (text: string) =>
    text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

  const exams: ExamItem[] = [];

  $('table').each((_, table) => {
    const tableText = $(table).text();
    if (
      tableText.includes('الامتحان') ||
      tableText.includes('تاريخ') ||
      tableText.includes('رقم المادة') ||
      tableText.includes('القاعة')
    ) {
      $(table)
        .find('tr')
        .slice(1)
        .each((_, tr) => {
          const cells = $(tr).find('td');
          if (cells.length >= 6) {
            const texts = cells.map((__, c) => clean($(c).text())).get();

            // فحص إذا كان العمود الأول هو الرقم التسلسلي #
            let offset = 0;
            if (/^\d+$/.test(texts[0]) && texts[0].length < 4 && texts[1] && texts[1].length >= 4) {
              offset = 1;
            }

            const cNumber = texts[offset] || '';
            const cName = texts[offset + 1] || '';
            const section = texts[offset + 2] || '1';
            const rawDate = texts[offset + 3] || '';
            const examTime = texts[offset + 4] || '';
            const examTypeRaw = texts[offset + 5] || '';
            const rawRoom = texts[offset + 6] || '';
            const notes = texts[offset + 7] || '';

            // استخراج اليوم والتاريخ من "2026/08/29 (السبت)"
            let examDay = '';
            let examDate = rawDate;
            const dayMatch = rawDate.match(/\((.*?)\)/);
            if (dayMatch) {
              examDay = dayMatch[1].trim();
              examDate = rawDate.replace(/\(.*?\)/, '').trim();
            }

            // تنظيف القاعة
            let room = rawRoom;
            const roomMatch = rawRoom.match(/القاعات والمواقع:\s*(.*)/);
            if (roomMatch && roomMatch[1] && roomMatch[1] !== '-') {
              room = roomMatch[1].trim();
            } else if (examTypeRaw && examTypeRaw !== '-') {
              room = examTypeRaw;
            } else {
              room = 'تُحدد لاحقاً';
            }

            const examType = examTypeRaw && examTypeRaw !== '-' ? examTypeRaw : 'امتحان نهائي';

            if (cNumber && cName) {
              exams.push({
                courseNumber: cNumber,
                courseName: cName,
                section,
                examDay: examDay || '—',
                examDate: examDate || '—',
                examTime: examTime || '—',
                room,
                seatNumber: notes || '—',
                examType,
              });
            }
          }
        });
    }
  });

  return ScheduleDataSchema.parse({
    currentSemester: 'الفصل الحالي',
    totalRegisteredHours: 0,
    weeklySchedule: [],
    exams,
  });
}
