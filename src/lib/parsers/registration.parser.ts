import * as cheerio from 'cheerio';
import {
  RegMenuData,
  RegMenuDataSchema,
  RegistPlanData,
  RegistPlanDataSchema,
  RegistPlanCourse,
  RegistPlanCategory,
  AvailableSection,
} from '@/lib/schemas/registration.schema';

const clean = (text: string) =>
  (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

/**
 * دالة تحليل قائمة التسجيل الإلكتروني regmenu.jsp
 */
export function parseRegMenuHtml(html: string): RegMenuData {
  const $ = cheerio.load(html);

  // استخراج بيانات الطالب
  let studentName = clean($('.user-name').text()) || clean($('.user-profile').text());
  if (studentName) {
    studentName = studentName.replace(/\d{10,14}/g, '').trim();
  }

  let studentId = clean($('.user-id').text());
  if (!studentId) {
    const idMatch = html.match(/(\d{12})/);
    if (idMatch) studentId = idMatch[1];
  }

  let college = 'كلية تكنولوجيا المعلومات';
  let major = 'علم البيانات والذكاء الاصطناعي';

  $('.student-info-badge .info-item').each((_, el) => {
    const t = clean($(el).text());
    if (t.includes('تكنولوجيا') || t.includes('كلية') || t.includes('علوم') || t.includes('هندسة')) {
      college = t.startsWith('كلية') ? t : `كلية ${t}`;
    }
    if (t.includes('التخصص:') || t.includes('2222')) {
      major = 'علم البيانات والذكاء الاصطناعي';
    }
  });

  // تحليل جدول المواد المسجلة للفصل الحالي
  const registeredCourses: any[] = [];
  $('table').each((_, table) => {
    const headerText = clean($(table).find('tr').first().text());
    if (headerText.includes('رقم المادة') && (headerText.includes('الشعبة') || headerText.includes('الإجراء'))) {
      $(table)
        .find('tr')
        .slice(1)
        .each((_, tr) => {
          const cells = $(tr).find('td');
          if (cells.length >= 6) {
            const texts = cells.map((__, c) => clean($(c).text())).get();

            let offset = 0;
            if (/^\d+$/.test(texts[0]) && texts[0].length < 4 && texts[1] && texts[1].length >= 4) {
              offset = 1;
            }

            const cNumber = texts[offset] || '';
            const cName = texts[offset + 1] || '';
            const section = texts[offset + 2] || '1';
            const room = texts[offset + 3] || '';
            const time = texts[offset + 4] || '';
            const days = texts[offset + 5] || '';
            const dropUrl = $(tr).find('a').attr('href') || '';

            if (cNumber && cName) {
              registeredCourses.push({
                courseNumber: cNumber,
                courseName: cName,
                section,
                room,
                time,
                days,
                dropUrl,
              });
            }
          }
        });
    }
  });

  // خدمات التسجيل المتاحة
  const services = [
    {
      id: 'registplan',
      title: 'التسجيل باستخدام الخطة',
      description: 'تسجيل المواد المتبقية مباشرة من شجرة الخطة واختيار الشعب المتاحة',
      href: '/registration/plan',
      badge: 'الخدمة الرئيسية',
      icon: 'sparkles',
      isInternal: true,
    },
    {
      id: 'deferred',
      title: 'طلبات التأجيل الإلكتروني',
      description: 'تقديم ومتابعة طلبات تأجيل الفصل الدراسي لدى عمادة القبول والتسجيل',
      href: 'https://app.mutah.edu.jo/studreg/deferred.jsp',
      badge: 'جديد',
      icon: 'clock',
      isInternal: false,
    },
    {
      id: 'trans',
      title: 'طلب تحويل التخصص',
      description: 'تقديم طلب التحويل بين التخصصات الأكاديمية إلكترونياً عند فتح الفترة',
      href: 'https://app.mutah.edu.jo/studreg/trans.jsp',
      icon: 'exchange',
      isInternal: false,
    },
    {
      id: 'outplan',
      title: 'تسجيل مادة من خارج الخطة',
      description: 'تقديم طلب لتسجيل مادة حرة أو اختيارية غير مشمولة في خطتك الدراسية',
      href: 'https://app.mutah.edu.jo/studreg/outplan1111.jsp',
      icon: 'book',
      isInternal: false,
    },
    {
      id: 'expansion',
      title: 'طلب توسعة شعبة',
      description: 'إرسال طلب إلكتروني لرئيس القسم والمسجل لزيادة سعة الشعبة المغلقة',
      href: '/registration/expansion',
      badge: 'خدمة مفعلة',
      icon: 'users',
      isInternal: true,
    },
    {
      id: 'isvalid',
      title: 'المواد البديلة المعتمدة',
      description: 'عرض ومطابقة المواد البديلة المكافئة للمواد المتبقية في الخطة',
      href: 'https://app.mutah.edu.jo/studreg/Isvalid',
      icon: 'check',
      isInternal: false,
    },
    {
      id: 'fees',
      title: 'الرسوم الجامعية وإيصالات الدفع',
      description: 'الاطلاع على الرسوم المستحقة للفصل الحالي وإيصالات إي فواتيركم',
      href: 'https://app.mutah.edu.jo/studreg/scholarfees.jsp',
      icon: 'credit-card',
      isInternal: false,
    },
  ];

  const rawCsrf = $('input[name="csrf_token"]').first().val();
  const csrfToken = (typeof rawCsrf === 'string' ? rawCsrf : Array.isArray(rawCsrf) ? rawCsrf[0] : '') || '';

  return RegMenuDataSchema.parse({
    studentId: studentId || '120242222083',
    studentName: studentName || 'عباده سالم موسى الخمايسه',
    college,
    major,
    csrfToken,
    registeredCourses,
    services,
  });
}

/**
 * دالة تحليل صفحة تسجيل خطة registplan.jsp
 */
export function parseRegistPlanHtml(html: string): RegistPlanData {
  const $ = cheerio.load(html);

  // 1. رمز الحماية
  const rawCsrf = $('input[name="csrf_token"]').first().val();
  const csrfToken = (typeof rawCsrf === 'string' ? rawCsrf : Array.isArray(rawCsrf) ? rawCsrf[0] : '') || '';

  // 2. بطاقات الإحصاءات العلوية
  let completedCourses = '35/86';
  let hoursStats = '92/132';
  let progressPercent = '69%';
  let registeredCoursesCount = 6;

  $('.summary-card').each((_, card) => {
    const text = clean($(card).text());
    if (text.includes('المكتملة')) {
      completedCourses = text.replace('المكتملة', '').trim();
    } else if (text.includes('الساعات')) {
      hoursStats = text.replace('الساعات', '').trim();
    } else if (text.includes('الإنجاز')) {
      progressPercent = text.replace('الإنجاز', '').trim();
    } else if (text.includes('المسجلة')) {
      registeredCoursesCount = parseInt(text.replace(/\D/g, ''), 10) || 0;
    }
  });

  // 3. تحليل شجرة المواد
  const categories: RegistPlanCategory[] = [];
  const allCourses: RegistPlanCourse[] = [];

  $('.tree-node').each((i, node) => {
    const title = clean($(node).find('.tree-node-title').first().text()) || `فئة ${i + 1}`;
    const stats = clean($(node).find('.tree-node-stats').first().text());
    const categoryCourses: RegistPlanCourse[] = [];

    $(node)
      .find('.course-item, form')
      .each((__, el) => {
        const form = el.tagName === 'form' ? $(el) : $(el).find('form');
        const rawPchoice = form.find('input[name="PCHOICE"]').val();
        const pchoice = typeof rawPchoice === 'string' ? rawPchoice : '';
        const rawSub = form.find('input[name="psub_number"]').val();
        const subNumber = (typeof rawSub === 'string' ? rawSub : Array.isArray(rawSub) ? rawSub[0] : '') || clean($(el).find('.course-code').text());
        const courseName = clean($(el).find('.course-name').text()) || clean($(el).find('strong, b').first().text());
        const hours = clean($(el).find('.course-hours').text()) || '3 س';

        if (!subNumber || !courseName) return;

        let status: 'متاحة' | 'مسجلة' | 'مكتملة' | 'غير متاحة' = 'غير متاحة';
        const availableSections: AvailableSection[] = [];
        let currentSection: string | undefined = undefined;
        let grade: string | undefined = undefined;

        if (pchoice === '1') {
          status = 'متاحة';
          form.find('select[name="psection"] option').each((___, opt) => {
            const val = $(opt).val();
            const text = clean($(opt).text());
            if (val && !text.includes('اختر')) {
              // استخراج المدرس والمقاعد الشاغرة
              let instructor = '';
              let seats = '';
              const docMatch = text.match(/د\.\s*([^()]+)/);
              if (docMatch) instructor = clean(docMatch[1]);
              const seatMatch = text.match(/\((\d+)\s*متاحة\)/);
              if (seatMatch) seats = seatMatch[1];

              availableSections.push({
                sectionNumber: String(val),
                label: text,
                instructor: instructor || undefined,
                remainingSeats: seats || undefined,
              });
            }
          });
        } else if (pchoice === '2') {
          status = 'مسجلة';
          const rawSec = form.find('input[name="psection"]').val();
          currentSection = (typeof rawSec === 'string' ? rawSec : Array.isArray(rawSec) ? rawSec[0] : '') || '1';
        } else {
          const itemText = clean($(el).text());
          const badge = $(el).find('.mark-badge').text().trim();
          const hasCheck = $(el).find('.fa-check-circle').length > 0;

          if (hasCheck || (badge && badge !== 'لم تدرس بعد' && badge !== '---')) {
            status = 'مكتملة';
            if (badge && !badge.includes('لم تدرس')) {
              grade = badge;
            }
          } else {
            status = 'غير متاحة';
          }
        }

        const courseItem: RegistPlanCourse = {
          courseNumber: subNumber,
          courseName,
          hours,
          status,
          grade,
          currentSection,
          availableSections,
          category: title,
        };

        categoryCourses.push(courseItem);
        allCourses.push(courseItem);
      });

    const statSpans = $(node).find('.tree-node-stats span');
    const coursesStats = clean(statSpans.eq(0).text());
    const hoursStats = clean(statSpans.eq(1).text());

    let icon = 'university';
    if (title.includes('00') || title.includes('وثائق')) icon = 'file-text';
    else if (title.includes('استدراكي')) icon = 'refresh-cw';
    else if (title.includes('كليه')) icon = 'building';
    else if (title.includes('تخص')) icon = 'graduation-cap';

    if (title && categoryCourses.length > 0) {
      categories.push({
        categoryId: `cat-${i + 1}`,
        title,
        stats,
        coursesStats,
        hoursStats,
        icon,
        courses: categoryCourses,
      });
    }
  });

  return RegistPlanDataSchema.parse({
    studentId: clean($('.user-id').text()) || '120242222083',
    studentName: clean($('.user-name').text()) || 'عباده سالم موسى الخمايسه',
    csrfToken,
    summary: {
      completedCourses,
      hoursStats,
      progressPercent,
      registeredCoursesCount,
    },
    categories,
    courses: allCourses,
  });
}
