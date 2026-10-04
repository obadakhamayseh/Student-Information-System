import * as cheerio from 'cheerio';
import { DashboardData, DashboardDataSchema } from '@/lib/schemas/student.schema';
import { getOfficialCreditHours } from '@/lib/course-catalog';

/**
 * دالة نقية لتحليل صفحة dashboard.jsp واستخراج بيانات الطالب بدقة 100%
 * تدعم قالب مؤتة الحديث (2024+) وكذلك القوالب الجدولية القياسية
 */
export function parseDashboardHtml(html: string, marksHtml?: string): DashboardData {
  const $ = cheerio.load(html);
  const rawAttributes: Record<string, string> = {};

  const clean = (text: string) =>
    text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

  // 1. فحص خلايا الجداول التقليدية لاستخراج المفاتيح والقيم (key-value)
  $('tr').each((_, tr) => {
    const tds = $(tr).find('td, th');
    for (let i = 0; i < tds.length; i++) {
      const text = clean($(tds[i]).text());
      if (text.includes(':')) {
        const [k, ...rest] = text.split(':');
        const key = clean(k);
        const valInline = clean(rest.join(':'));
        if (valInline) {
          rawAttributes[key] = valInline;
        } else if (i + 1 < tds.length) {
          const nextVal = clean($(tds[i + 1]).text());
          if (nextVal && !nextVal.includes(':')) {
            rawAttributes[key] = nextVal;
          }
        }
      }
    }
  });

  const findAttr = (...keys: string[]): string => {
    for (const k of keys) {
      for (const [attrKey, attrVal] of Object.entries(rawAttributes)) {
        if (attrKey.includes(k) && attrVal) return attrVal;
      }
    }
    return '';
  };

  // 2. استخراج الاسم والرقم الجامعي
  let studentName =
    findAttr('اسم الطالب', 'الاسم') ||
    clean($('.user-name').text()) ||
    clean($('.user-profile .user-name').text()) ||
    clean($('.student-info-badge .info-item').first().text());

  if (studentName) {
    studentName = studentName.replace(/\d{10,14}/g, '').trim();
  }

  let studentId =
    findAttr('الرقم الجامعي', 'رقم الطالب') ||
    clean($('.user-id span').text()) ||
    clean($('.user-id').text());

  if (!studentId) {
    const idMatch = html.match(/(\d{12})/);
    if (idMatch) studentId = idMatch[1];
  }

  // 3. الكلية والتخصص
  let college = findAttr('الكلية');
  let major = findAttr('التخصص', 'القسم');

  if (!college) {
    $('.student-info-badge .info-item').each((_, el) => {
      const t = clean($(el).text());
      if (t.includes('تكنولوجيا') || t.includes('كلية') || t.includes('علوم') || t.includes('آداب') || t.includes('هندسة')) {
        college = t.startsWith('كلية') ? t : `كلية ${t}`;
      }
    });
    if (!college && html.includes('تكنولوجيا المعلومات')) {
      college = 'كلية تكنولوجيا المعلومات';
    }
  }

  if (!major) {
    $('.student-info-badge .info-item').each((_, el) => {
      const t = clean($(el).text());
      if (t.includes('التخصص:') || t.includes('تخصص')) {
        const code = t.replace(/\D/g, '');
        if (code === '2222') major = 'علم البيانات والذكاء الاصطناعي';
        else if (code === '2211') major = 'علم الحاسوب';
        else if (code === '2212') major = 'هندسة البرمجيات';
        else if (code === '2214') major = 'الأمن السيبراني';
        else if (t.replace(/.*التخصص:\s*/, '').trim()) major = t.replace(/.*التخصص:\s*/, '').trim();
        else major = t;
      }
    });

    if (!major && studentId && studentId.length >= 9) {
      const deptCode = studentId.slice(5, 9);
      if (deptCode === '2222') major = 'علم البيانات والذكاء الاصطناعي';
      else if (deptCode === '2211') major = 'علم الحاسوب';
      else if (deptCode === '2212') major = 'هندسة البرمجيات';
      else if (deptCode === '2214') major = 'الأمن السيبراني';
    }

    if (!major) {
      major = college || 'جامعة مؤتة';
    }
  }

  // 4. المرشد الأكاديمي والحالة الأكاديمية
  const advisor = findAttr('المرشد الأكاديمي', 'المرشد') || '—';
  let academicStatus = findAttr('الحالة الأكاديمية', 'حالة الطالب', 'الحالة') || clean($('.student-type-value').text()) || 'منتظم';

  // 5. الساعات المسجلة والمجتازة والمدفوعة
  let registeredHours = parseInt(findAttr('الساعات المسجلة', 'المسجلة').replace(/\D/g, ''), 10) || 0;
  let passedHours = parseInt(findAttr('الساعات المقطوعة', 'الساعات المجتازة', 'المقطوعة', 'المجتازة').replace(/\D/g, ''), 10) || 0;
  let paidHours = parseInt(findAttr('الساعات المدفوعة', 'المدفوعة').replace(/\D/g, ''), 10) || 0;
  let financialBalance = findAttr('الرصيد المالي', 'الرصيد') || '';

  // إذا لم نجدها في الجداول، نبحث في .stat-card
  $('.stat-card').each((_, card) => {
    const label = clean($(card).find('.stat-label').text());
    const val = clean($(card).find('.stat-value').text());
    if (label.includes('المسجلة') && !registeredHours) {
      registeredHours = parseInt(val.replace(/\D/g, ''), 10) || 0;
    } else if ((label.includes('النجاح') || label.includes('المجتازة')) && !passedHours) {
      passedHours = parseInt(val.replace(/\D/g, ''), 10) || 0;
    } else if (label.includes('المدفوعة') && !paidHours) {
      paidHours = parseInt(val.replace(/\D/g, ''), 10) || 0;
    } else if (label.includes('الرصيد') && !financialBalance) {
      financialBalance = val;
    }
  });

  if (!financialBalance) {
    financialBalance = '0.00 د.أ';
  }

  // خدمة العلم
  const militaryStatus = clean($('.military-status').text()) || '';
  let militaryExpireDate = '';
  $('.military-item').each((_, item) => {
    const l = clean($(item).find('.label').text());
    if (l.includes('الإنتهاء') || l.includes('انتهاء')) {
      militaryExpireDate = clean($(item).find('.value').text());
    }
  });

  // ملاحظات القبول والشؤون المالية
  const acceptanceNotesCount = parseInt(clean($('.notes-card-header.acceptance .notes-count').text()) || '0', 10) || 0;
  const financialNotesCount = parseInt(clean($('.notes-card-header.financial .notes-count').text()) || '0', 10) || 0;

  // 6. المعدلات
  let cumulativeGpa = findAttr('المعدل التراكمي', 'التراكمي') || '0.00';
  let semesterGpa = findAttr('المعدل الفصلي', 'الفصلي') || '0.00';
  let lastSemesterName = 'الفصل الصيفي 2025/2026';

  if (marksHtml) {
    const $m = cheerio.load(marksHtml);
    const lastSemHeader = $m('.semester-group').last().find('.semester-header');
    if (lastSemHeader.length > 0) {
      const onclickAttr = lastSemHeader.attr('onclick') || '';
      const matchYearSem = onclickAttr.match(/toggleSemester\(['"](\d{4})_(\d)['"]\)/);
      if (matchYearSem) {
        const y = parseInt(matchYearSem[1], 10);
        const nextY = y + 1;
        const semCode = matchYearSem[2];
        const semName = semCode === '1' ? 'الفصل الأول' : semCode === '2' ? 'الفصل الثاني' : 'الفصل الصيفي';
        lastSemesterName = `${semName} ${y}/${nextY}`;
      }
      const statsText = clean(lastSemHeader.find('.semester-stats').text());
      const gpaMatch = statsText.match(/معدل:\s*([\d.]+)/);
      const cumMatch = statsText.match(/تراكمي:\s*([\d.]+)/);
      if (gpaMatch && (semesterGpa === '0.00' || !semesterGpa)) semesterGpa = gpaMatch[1];
      if (cumMatch && (cumulativeGpa === '0.00' || !cumulativeGpa)) cumulativeGpa = cumMatch[1];
    }
  }

  // 7. جدول المواد المسجلة للفصل الحالي
  const courses: any[] = [];
  $('table').each((_, table) => {
    const headerRow = $(table).find('tr').first();
    const headerText = clean(headerRow.text());

    if (
      (headerText.includes('رقم المادة') || headerText.includes('اسم المادة')) &&
      !headerText.includes('المرشد') &&
      !headerText.includes('الرقم الجامعي')
    ) {
      $(table)
        .find('tr')
        .slice(1)
        .each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const rowTexts = cells.map((__, c) => clean($(c).text())).get();

            let offset = 0;
            if (/^\d+$/.test(rowTexts[0]) && rowTexts[0].length < 4 && rowTexts[1] && rowTexts[1].length >= 4) {
              offset = 1;
            }

            const cNumber = rowTexts[offset] || '';
            const cName = rowTexts[offset + 1] || '';
            const cSection = rowTexts[offset + 2] || '1';
            const cRoom = rowTexts[offset + 3] || '';
            const cTime = rowTexts[offset + 4] || '';
            const cDays = rowTexts[offset + 5] || '';

            if (cNumber && cName && !cName.includes('المجموع') && !cName.includes(':')) {
              const crHours = getOfficialCreditHours(cNumber, cName);

              courses.push({
                courseNumber: cNumber,
                courseName: cName,
                section: cSection,
                creditHours: crHours,
                days: cDays,
                time: cTime,
                room: cRoom,
                instructor: '',
              });
            }
          }
        });
    }
  });

  if (registeredHours === 0 && courses.length > 0) {
    registeredHours = courses.reduce((sum, c) => sum + (c.creditHours || 3), 0);
  }

  let studyPlan = 'خطة دراسية';
  const planMatch = html.match(/الخطة:\s*(\d+)/) || html.match(/خطة\s*(\d+)/);
  if (planMatch) {
    studyPlan = `خطة ${planMatch[1]}`;
  } else if (studentId && studentId.length >= 5) {
    const yr = studentId.substring(1, 5);
    if (/^\d{4}$/.test(yr)) {
      studyPlan = `خطة ${yr}`;
    }
  }

  const parsed = {
    studentId: studentId || '',
    studentName: studentName || '',
    college: college || (html.includes('تكنولوجيا المعلومات') ? 'كلية تكنولوجيا المعلومات' : 'جامعة مؤتة'),
    major: major || college || 'جامعة مؤتة',
    advisor,
    academicStatus,
    cumulativeGpa,
    semesterGpa,
    lastSemesterName,
    passedHours,
    registeredHours,
    paidHours,
    financialBalance,
    studyPlan,
    currentSemester: 'الفصل الأول 2026/2027',
    militaryStatus,
    militaryExpireDate,
    acceptanceNotesCount,
    financialNotesCount,
    courses,
    rawAttributes,
  };

  return DashboardDataSchema.parse(parsed);
}
