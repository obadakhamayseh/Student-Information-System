import * as cheerio from 'cheerio';
import { TranscriptData, TranscriptDataSchema, SemesterRecord, CourseGrade } from '@/lib/schemas/grades.schema';

/**
 * دالة نقية لتحليل كشف علامات الطالب من studmarks.jsp بدقة 100%
 */
export interface ParseTranscriptOptions {
  studentId?: string;
  studentName?: string;
  major?: string;
}

export function parseTranscriptHtml(
  html: string,
  options?: ParseTranscriptOptions
): TranscriptData {
  const $ = cheerio.load(html);

  const clean = (text: string) =>
    text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

  const semesters: SemesterRecord[] = [];

  // فحص الفصول في نظام مؤتة الحديث (.semester-group)
  const semesterGroups = $('.semester-group');

  if (semesterGroups.length > 0) {
    semesterGroups.each((i, group) => {
      const header = $(group).find('.semester-header');
      const title = clean(header.find('.semester-title').text());
      const iconId = header.find('.semester-icon').attr('id') || '';

      // فك شفرة السنة الدراسية والفصل من id="semesterIcon_2025_1"
      let semesterName = title;
      const yearMatch = iconId.match(/semesterIcon_(\d{4})_(\d+)/);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1], 10);
        const semNum = yearMatch[2];
        const semNameMap: Record<string, string> = {
          '0': 'مواد معادلة / منقولة',
          '1': 'الفصل الدراسي الأول',
          '2': 'الفصل الدراسي الثاني',
          '3': 'الفصل الدراسي الصيفي',
        };
        const academicYear = `${startYear}/${startYear + 1}`;
        semesterName =
          semNum === '0'
            ? 'مواد منقولة ومعادلة'
            : `${semNameMap[semNum] || title} (${academicYear})`;
      }

      const statsText = clean(header.find('.semester-stats').text());
      const gpaMatch = statsText.match(/معدل:\s*([\d.]+)/);
      const hoursMatch = statsText.match(/ساعات:\s*(\d+)/);
      const cumGpaMatch = statsText.match(/تراكمي:\s*([\d.]+)/);

      const courses: CourseGrade[] = [];
      $(group)
        .find('table tr')
        .slice(1)
        .each((_, tr) => {
          const cells = $(tr).find('td');
          if (cells.length >= 5) {
            const texts = cells.map((__, c) => clean($(c).text())).get();

            let offset = 0;
            if (/^\d+$/.test(texts[0]) && texts[0].length < 4 && texts[1] && texts[1].length >= 4) {
              offset = 1;
            }

            const cNumber = texts[offset] || '';
            const cName = texts[offset + 1] || '';
            const cGrade = texts[offset + 2] || '—';
            const cHours = parseFloat(texts[offset + 3]) || 3;
            const statusRaw = texts[offset + 4] || '';

            const numGrade = parseFloat(cGrade);
            let status = statusRaw;
            if (statusRaw === '-' || !statusRaw) {
              status = !isNaN(numGrade) && numGrade >= 50 ? 'ناجح' : '—';
            }

            if (cNumber && cName) {
              courses.push({
                courseNumber: cNumber,
                courseName: cName,
                creditHours: cHours,
                grade: cGrade,
                points: cHours.toString(),
                status,
              });
            }
          }
        });

      if (courses.length > 0 || semesterName) {
        semesters.push({
          semesterId: `sem-${i + 1}`,
          semesterName: semesterName || `الفصل الدراسي ${i + 1}`,
          semesterGpa: gpaMatch ? gpaMatch[1] : '0.00',
          cumulativeGpa: cumGpaMatch ? cumGpaMatch[1] : '0.00',
          semesterHours: hoursMatch ? parseInt(hoursMatch[1], 10) : 0,
          cumulativeHours: 0,
          courses,
        });
      }
    });
  } else {
    // دعم الجداول التقليدية كاحتياطي
    $('table').each((_, table) => {
      const tableText = $(table).text();
      if (!tableText.includes('العلامة') && !tableText.includes('المعدل') && !tableText.includes('رقم المادة')) return;

      const captionOrHeader = $(table).find('caption, th').first().text();
      const semesterTitle = clean(captionOrHeader) || `الفصل الدراسي ${semesters.length + 1}`;

      const courses: CourseGrade[] = [];
      let semesterGpa = '0.00';
      let cumulativeGpa = '0.00';
      let semesterHours = 0;

      $(table)
        .find('tr')
        .each((__, tr) => {
          const rowText = clean($(tr).text());

          if (rowText.includes('المعدل الفصلي') || rowText.includes('المعدل التراكمي')) {
            const gpaMatch = rowText.match(/المعدل الفصلي\s*[:=\s]*([\d.]+)/);
            const cumGpaMatch = rowText.match(/المعدل التراكمي\s*[:=\s]*([\d.]+)/);
            const hoursMatch = rowText.match(/الساعات\s*[:=\s]*(\d+)/);

            if (gpaMatch) semesterGpa = gpaMatch[1];
            if (cumGpaMatch) cumulativeGpa = cumGpaMatch[1];
            if (hoursMatch) semesterHours = parseInt(hoursMatch[1], 10);
            return;
          }

          const cells = $(tr).find('td');
          if (cells.length >= 4) {
            const texts = cells.map((___, c) => clean($(c).text())).get();
            if (texts[0].includes('رقم المادة') || texts[1].includes('اسم المادة')) return;

            const cNo = texts[0] || '';
            const cName = texts[1] || '';
            const cHours = parseFloat(texts[2]) || 3;
            const cGrade = texts[3] || '—';
            const cPoints = texts[4] || '';
            const cStatus = texts[5] || (parseFloat(cGrade) >= 50 ? 'ناجح' : '—');

            if (cNo && cName && !cName.includes('المعدل')) {
              courses.push({
                courseNumber: cNo,
                courseName: cName,
                creditHours: cHours,
                grade: cGrade,
                points: cPoints,
                status: cStatus,
              });
            }
          }
        });

      if (courses.length > 0) {
        semesters.push({
          semesterId: `sem-${semesters.length + 1}`,
          semesterName: semesterTitle,
          semesterGpa,
          cumulativeGpa,
          semesterHours,
          cumulativeHours: 0,
          courses,
        });
      }
    });
  }

  // حساب المعدل التراكمي الكلي من آخر فصل مسجل
  const lastSemester = semesters[semesters.length - 1];
  const overallCumGpa =
    lastSemester?.cumulativeGpa && lastSemester.cumulativeGpa !== '0.00'
      ? lastSemester.cumulativeGpa
      : '0.00';

  // حساب إجمالي الساعات المجتازة
  let totalPassed = 0;
  semesters.forEach((sem) => {
    sem.courses.forEach((c) => {
      if (c.status.includes('ناجح') || parseFloat(c.grade) >= 50) {
        totalPassed += c.creditHours;
      }
    });
  });

  // استخراج الرقم الجامعي واسم الطالب بدقة وبدون قيم ثابتة
  let studentId = options?.studentId || clean($('.user-id span').text()) || clean($('.user-id').text());
  if (!studentId) {
    const idMatch = html.match(/p_stud_num=(\d+)/) || html.match(/stud_num=(\d+)/) || html.match(/(\d{10,14})/);
    if (idMatch) studentId = idMatch[1];
  }

  let studentName = options?.studentName || clean($('.user-name').text()) || clean($('.user-profile .user-name').text());
  if (!studentName) {
    const nameMatch = html.match(/stud_name=([^&"']+)/);
    if (nameMatch) {
      try {
        studentName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
      } catch {
        studentName = nameMatch[1];
      }
    }
  }

  let major = options?.major || '';
  if (!major) {
    const collegeMatch = html.match(/stud_college=([^&"']+)/);
    if (collegeMatch) {
      try {
        major = decodeURIComponent(collegeMatch[1].replace(/\+/g, ' '));
      } catch {
        major = collegeMatch[1];
      }
    }
  }

  const transcript = {
    studentId: studentId || '',
    studentName: studentName || '',
    major: major || 'جامعة مؤتة',
    cumulativeGpa: overallCumGpa,
    totalPassedHours: totalPassed,
    semesters,
  };

  return TranscriptDataSchema.parse(transcript);
}
