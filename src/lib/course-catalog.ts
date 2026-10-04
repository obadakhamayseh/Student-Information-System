/**
 * الدليل الرسمي المعتمد للخطة الدراسية - جامعة مؤتة
 * تخصص: علم البيانات والذكاء الاصطناعي (Data Science and Artificial Intelligence)
 * تم استخراجه ومطابقته بدقة 100% مع الوثيقة الرسمية الصادرة عن وحدة القبول والتسجيل (AI_Roadmap.md)
 * مجموع ساعات الخطة: 132 ساعة معتمدة
 */

export interface CourseCatalogEntry {
  courseNumber: string;
  courseName: string;
  creditHours: number;
  category: string;
  categoryType:
    | 'level_exam'
    | 'remedial'
    | 'uni_compulsory'
    | 'uni_elective_humanities'
    | 'uni_elective_social'
    | 'uni_elective_tech'
    | 'college_compulsory'
    | 'major_compulsory'
    | 'major_elective';
  prerequisiteCode?: string;
  prerequisiteName?: string;
  prerequisite: string; // نص المتطلب للعرض (مثال: "2211123 البرمجة الشيئية الموجهة")
  isCorequisite: boolean; // متطلب مرافق (أو يرافق)
  isRemedial: boolean; // مساق استدراكي (لا يدخل ضمن ساعات التخرج)
  isLevelExam: boolean; // امتحان مستوى (0 ساعة)
}

export const OFFICIAL_COURSE_CATALOG: Record<string, CourseCatalogEntry> = {
  // 1. امتحانات الكفاءة (0 ساعة)
  '1801096': {
    courseNumber: '1801096',
    courseName: 'امتحان مستوى في اللغة العربية',
    creditHours: 0,
    category: 'امتحانات الكفاءة (00)',
    categoryType: 'level_exam',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: true,
  },
  '1802096': {
    courseNumber: '1802096',
    courseName: 'امتحان مستوى في اللغة الإنجليزية',
    creditHours: 0,
    category: 'امتحانات الكفاءة (00)',
    categoryType: 'level_exam',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: true,
  },
  '2200096': {
    courseNumber: '2200096',
    courseName: 'امتحان مستوى في مهارات الحاسوب',
    creditHours: 0,
    category: 'امتحانات الكفاءة (00)',
    categoryType: 'level_exam',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: true,
  },

  // 2. استدراكي (3 ساعات ولكن لا يدخل ضمن ساعات الخطة)
  '1801099': {
    courseNumber: '1801099',
    courseName: 'اللغة العربية 99',
    creditHours: 3,
    category: 'استدراكي',
    categoryType: 'remedial',
    prerequisiteCode: '1801096',
    prerequisiteName: 'امتحان مستوى في اللغة العربية',
    prerequisite: '1801096 امتحان مستوى في اللغة العربية',
    isCorequisite: false,
    isRemedial: true,
    isLevelExam: false,
  },
  '1802099': {
    courseNumber: '1802099',
    courseName: 'اللغة الإنجليزية 99',
    creditHours: 3,
    category: 'استدراكي',
    categoryType: 'remedial',
    prerequisiteCode: '1802096',
    prerequisiteName: 'امتحان مستوى في اللغة الإنجليزية',
    prerequisite: '1802096 امتحان مستوى في اللغة الإنجليزية',
    isCorequisite: false,
    isRemedial: true,
    isLevelExam: false,
  },
  '2200099': {
    courseNumber: '2200099',
    courseName: 'مهارات حاسوب (99)',
    creditHours: 3,
    category: 'استدراكي',
    categoryType: 'remedial',
    prerequisiteCode: '2200096',
    prerequisiteName: 'امتحان مستوى في مهارات الحاسوب',
    prerequisite: '2200096 امتحان مستوى في مهارات الحاسوب',
    isCorequisite: false,
    isRemedial: true,
    isLevelExam: false,
  },

  // 3.1 متطلبات الجامعة الإجبارية (18 ساعة)
  '0101173': {
    courseNumber: '0101173',
    courseName: 'العلوم العسكرية',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0809103': {
    courseNumber: '0809103',
    courseName: 'المهارات الحياتية والعملية',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1600106': {
    courseNumber: '1600106',
    courseName: 'التربية الوطنية والمسؤولية المجتمعية',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1801102': {
    courseNumber: '1801102',
    courseName: 'مهارات اللغة العربية والتواصل',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisiteCode: '1801099',
    prerequisiteName: 'اللغة العربية 99',
    prerequisite: '1801099 اللغة العربية 99',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1802103': {
    courseNumber: '1802103',
    courseName: 'مهارات اللغة الإنجليزية والتواصل',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisiteCode: '1802099',
    prerequisiteName: 'اللغة الإنجليزية 99',
    prerequisite: '1802099 اللغة الإنجليزية 99',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2100102': {
    courseNumber: '2100102',
    courseName: 'الريادة والابتكار',
    creditHours: 3,
    category: 'متطلبات الجامعة الإجبارية',
    categoryType: 'uni_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 3.2 متطلبات الجامعة الاختيارية / علوم إنسانية (3 ساعات)
  '0209105': {
    courseNumber: '0209105',
    courseName: 'اللغة الألمانية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0209109': {
    courseNumber: '0209109',
    courseName: 'اللغة الفرنسية 1',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0500100': {
    courseNumber: '0500100',
    courseName: 'ثقافة إسلامية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0500103': {
    courseNumber: '0500103',
    courseName: 'حقوق الإنسان في الإسلام',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0706100': {
    courseNumber: '0706100',
    courseName: 'القانون في حياتنا',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0801114': {
    courseNumber: '0801114',
    courseName: 'التربية البيئية والتنمية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0803101': {
    courseNumber: '0803101',
    courseName: 'مبادئ التربية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0809101': {
    courseNumber: '0809101',
    courseName: 'مبادئ علم نفس',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1301100': {
    courseNumber: '1301100',
    courseName: 'مبادئ التربية الرياضية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الإنسانية',
    categoryType: 'uni_elective_humanities',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 3.3 متطلبات الجامعة الاختيارية / علوم اجتماعية واقتصادية (3 ساعات)
  '1601104': {
    courseNumber: '1601104',
    courseName: 'مدخل إلى العنف الأسري',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1602104': {
    courseNumber: '1602104',
    courseName: 'جغرافية الأردن',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1603102': {
    courseNumber: '1603102',
    courseName: 'السياحة في الأردن',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1605101': {
    courseNumber: '1605101',
    courseName: 'مدخل إلى علم السياسة',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2101104': {
    courseNumber: '2101104',
    courseName: 'مهارات إدارية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2103100': {
    courseNumber: '2103100',
    courseName: 'الثقافة المحاسبية والمالية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2109103': {
    courseNumber: '2109103',
    courseName: 'مهارات الاتصال الحياتية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم الاجتماعية والاقتصادية',
    categoryType: 'uni_elective_social',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 3.4 متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا (3 ساعات)
  '0304112': {
    courseNumber: '0304112',
    courseName: 'مهارات الحاسوب (2) للكليات العلمية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0401121': {
    courseNumber: '0401121',
    courseName: 'مبادئ الكهرباء العامة',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0402120': {
    courseNumber: '0402120',
    courseName: 'مبادئ في ميكانيك وصيانة السيارات',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0403120': {
    courseNumber: '0403120',
    courseName: 'السلامة المرورية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '0405101': {
    courseNumber: '0405101',
    courseName: 'الثقافة الرقمية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1100101': {
    courseNumber: '1100101',
    courseName: 'الزراعة والأمن الغذائي',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '1401100': {
    courseNumber: '1401100',
    courseName: 'الثقافة الصحية',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2200100': {
    courseNumber: '2200100',
    courseName: 'تطبيقات الإنترنت وشبكات التواصل الاجتماعي',
    creditHours: 3,
    category: 'متطلبات الجامعة الاختيارية / العلوم والتكنولوجيا',
    categoryType: 'uni_elective_tech',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 4. متطلبات الكلية الإجبارية (24 ساعة)
  '0301101': {
    courseNumber: '0301101',
    courseName: 'تفاضل وتكامل 1',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211121': {
    courseNumber: '2211121',
    courseName: 'مقدمة في البرمجة',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211211': {
    courseNumber: '2211211',
    courseName: 'تركيب بيانات',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisiteCode: '2211123',
    prerequisiteName: 'البرمجة الشيئية الموجهة (الهدفية)',
    prerequisite: '2211123 البرمجة الشيئية الموجهة (الهدفية)',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211261': {
    courseNumber: '2211261',
    courseName: 'مقدمة في قواعد البيانات',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisiteCode: '2211123',
    prerequisiteName: 'البرمجة الشيئية الموجهة (الهدفية)',
    prerequisite: '2211123 البرمجة الشيئية الموجهة (الهدفية)',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2212351': {
    courseNumber: '2212351',
    courseName: 'أمن الحاسبات والشبكات',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisiteCode: '2211351',
    prerequisiteName: 'شبكات الحاسوب',
    prerequisite: '2211351 شبكات الحاسوب',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221111': {
    courseNumber: '2221111',
    courseName: 'مقدمة في تكنولوجيا المعلومات',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222111': {
    courseNumber: '2222111',
    courseName: 'تراكيب متقطعة للحوسبة',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2231101': {
    courseNumber: '2231101',
    courseName: 'أخلاقيات الحاسوب ومهارات الاتصال',
    creditHours: 3,
    category: 'متطلبات الكلية الإجبارية',
    categoryType: 'college_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 5. متطلبات التخصص الإجبارية (72 ساعة)
  '0301131': {
    courseNumber: '0301131',
    courseName: 'مبادئ في الإحصاء والاحتمالات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '0301101',
    prerequisiteName: 'تفاضل وتكامل 1',
    prerequisite: '0301101 تفاضل وتكامل 1',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211122': {
    courseNumber: '2211122',
    courseName: 'مختبر مقدمة في البرمجة',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211121',
    prerequisiteName: 'مقدمة في البرمجة',
    prerequisite: '2211121 مقدمة في البرمجة (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211123': {
    courseNumber: '2211123',
    courseName: 'البرمجة الشيئية الموجهة (الهدفية)',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211121',
    prerequisiteName: 'مقدمة في البرمجة',
    prerequisite: '2211121 مقدمة في البرمجة',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211124': {
    courseNumber: '2211124',
    courseName: 'مختبر البرمجة الشيئية الموجهة (الهدفية)',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211123',
    prerequisiteName: 'البرمجة الشيئية الموجهة (الهدفية)',
    prerequisite: '2211123 البرمجة الشيئية الموجهة (الهدفية) (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211212': {
    courseNumber: '2211212',
    courseName: 'خوارزميات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211211',
    prerequisiteName: 'تركيب بيانات',
    prerequisite: '2211211 تركيب بيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211214': {
    courseNumber: '2211214',
    courseName: 'مختبر خوارزميات',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211212',
    prerequisiteName: 'خوارزميات',
    prerequisite: '2211212 خوارزميات (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211262': {
    courseNumber: '2211262',
    courseName: 'مختبر مقدمة في قواعد البيانات',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211261',
    prerequisiteName: 'مقدمة في قواعد البيانات',
    prerequisite: '2211261 مقدمة في قواعد البيانات (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211263': {
    courseNumber: '2211263',
    courseName: 'برمجة قواعد البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211261',
    prerequisiteName: 'مقدمة في قواعد البيانات',
    prerequisite: '2211261 مقدمة في قواعد البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211351': {
    courseNumber: '2211351',
    courseName: 'شبكات الحاسوب',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211263',
    prerequisiteName: 'برمجة قواعد البيانات',
    prerequisite: '2211263 برمجة قواعد البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211431': {
    courseNumber: '2211431',
    courseName: 'نظم التشغيل',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211212',
    prerequisiteName: 'خوارزميات',
    prerequisite: '2211212 خوارزميات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221363': {
    courseNumber: '2221363',
    courseName: 'نظم قواعد البيانات الموزعة',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211261',
    prerequisiteName: 'مقدمة في قواعد البيانات',
    prerequisite: '2211261 مقدمة في قواعد البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221461': {
    courseNumber: '2221461',
    courseName: 'نظم إسترجاع المعلومات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222161',
    prerequisiteName: 'أساسيات علم البيانات',
    prerequisite: '2222161 أساسيات علم البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222161': {
    courseNumber: '2222161',
    courseName: 'أساسيات علم البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222111',
    prerequisiteName: 'تراكيب متقطعة للحوسبة',
    prerequisite: '2222111 تراكيب متقطعة للحوسبة',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222231': {
    courseNumber: '2222231',
    courseName: 'تمييز الأنماط',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222364',
    prerequisiteName: 'التعلم الآلي والعميق',
    prerequisite: '2222364 التعلم الآلي والعميق',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222232': {
    courseNumber: '2222232',
    courseName: 'نمذجة البيانات ومحاكاتها',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222161',
    prerequisiteName: 'أساسيات علم البيانات',
    prerequisite: '2222161 أساسيات علم البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222233': {
    courseNumber: '2222233',
    courseName: 'استكشاف واستعراض البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222261',
    prerequisiteName: 'مقدمة في الذكاء الاصطناعي',
    prerequisite: '2222261 مقدمة في الذكاء الاصطناعي',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222241': {
    courseNumber: '2222241',
    courseName: 'برمجة علوم البيانات والذكاء الاصطناعي',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222461',
    prerequisiteName: 'هندسة البيانات',
    prerequisite: '2222461 هندسة البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222242': {
    courseNumber: '2222242',
    courseName: 'مختبر برمجة علوم البيانات والذكاء الاصطناعي',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222241',
    prerequisiteName: 'برمجة علوم البيانات والذكاء الاصطناعي',
    prerequisite: '2222241 برمجة علوم البيانات والذكاء الاصطناعي (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222243': {
    courseNumber: '2222243',
    courseName: 'معالجة اللغات الطبيعية',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222241',
    prerequisiteName: 'برمجة علوم البيانات والذكاء الاصطناعي',
    prerequisite: '2222241 برمجة علوم البيانات والذكاء الاصطناعي',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222261': {
    courseNumber: '2222261',
    courseName: 'مقدمة في الذكاء الاصطناعي',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2211121',
    prerequisiteName: 'مقدمة في البرمجة',
    prerequisite: '2211121 مقدمة في البرمجة',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222362': {
    courseNumber: '2222362',
    courseName: 'مختبر الذكاء الاصطناعي',
    creditHours: 1,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222261',
    prerequisiteName: 'مقدمة في الذكاء الاصطناعي',
    prerequisite: '2222261 مقدمة في الذكاء الاصطناعي (أو يرافق)',
    isCorequisite: true,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222364': {
    courseNumber: '2222364',
    courseName: 'التعلم الآلي والعميق',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222261',
    prerequisiteName: 'مقدمة في الذكاء الاصطناعي',
    prerequisite: '2222261 مقدمة في الذكاء الاصطناعي',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222365': {
    courseNumber: '2222365',
    courseName: 'الحوسبة عالية الأداء والبيانات الضخمة',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222461',
    prerequisiteName: 'هندسة البيانات',
    prerequisite: '2222461 هندسة البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222371': {
    courseNumber: '2222371',
    courseName: 'التدريب الميداني',
    creditHours: 0, // ع.س = 0 حسب الخطة الرسمية المعتمدة
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222441': {
    courseNumber: '2222441',
    courseName: 'التنقيب عن البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222461',
    prerequisiteName: 'هندسة البيانات',
    prerequisite: '2222461 هندسة البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222451': {
    courseNumber: '2222451',
    courseName: 'الشبكات العصبونية',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222364',
    prerequisiteName: 'التعلم الآلي والعميق',
    prerequisite: '2222364 التعلم الآلي والعميق',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222461': {
    courseNumber: '2222461',
    courseName: 'هندسة البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222161',
    prerequisiteName: 'أساسيات علم البيانات',
    prerequisite: '2222161 أساسيات علم البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222462': {
    courseNumber: '2222462',
    courseName: 'الروبوتات المتنقلة الذكية',
    creditHours: 3,
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222364',
    prerequisiteName: 'التعلم الآلي والعميق',
    prerequisite: '2222364 التعلم الآلي والعميق',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222491': {
    courseNumber: '2222491',
    courseName: 'مشروع تخرج 1',
    creditHours: 1, // ع.س = 1
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisite: '—',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222492': {
    courseNumber: '2222492',
    courseName: 'مشروع تخرج 2',
    creditHours: 2, // ع.س = 2
    category: 'متطلبات التخصص الإجبارية',
    categoryType: 'major_compulsory',
    prerequisiteCode: '2222491',
    prerequisiteName: 'مشروع تخرج 1',
    prerequisite: '2222491 مشروع تخرج 1',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },

  // 6. متطلبات التخصص الاختيارية (9 ساعات مطلوبة من هذا الحوض)
  '0301323': {
    courseNumber: '0301323',
    courseName: 'تحليل عددي (1)',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2222111',
    prerequisiteName: 'تراكيب متقطعة للحوسبة',
    prerequisite: '2222111 تراكيب متقطعة للحوسبة',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211321': {
    courseNumber: '2211321',
    courseName: 'البرمجة الشيئية الموجهة (الهدفية) المتقدمة',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2211123',
    prerequisiteName: 'البرمجة الشيئية الموجهة (الهدفية)',
    prerequisite: '2211123 البرمجة الشيئية الموجهة (الهدفية)',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2211362': {
    courseNumber: '2211362',
    courseName: 'معالجة الصور الرقمية',
    creditHours: 2, // ع.س = 2
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2211431',
    prerequisiteName: 'نظم التشغيل',
    prerequisite: '2211431 نظم التشغيل',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2212251': {
    courseNumber: '2212251',
    courseName: 'أساسيات الأمن السيبراني',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2212351',
    prerequisiteName: 'أمن الحاسبات والشبكات',
    prerequisite: '2212351 أمن الحاسبات والشبكات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2212353': {
    courseNumber: '2212353',
    courseName: 'مختبر الشبكات وأمن المعلومات',
    creditHours: 1, // ع.س = 1
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2212351',
    prerequisiteName: 'أمن الحاسبات والشبكات',
    prerequisite: '2212351 أمن الحاسبات والشبكات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221223': {
    courseNumber: '2221223',
    courseName: 'برمجة تطبيقات الإنترنت',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2211263',
    prerequisiteName: 'برمجة قواعد البيانات',
    prerequisite: '2211263 برمجة قواعد البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221263': {
    courseNumber: '2221263',
    courseName: 'تطبيقات قواعد البيانات',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2211261',
    prerequisiteName: 'مقدمة في قواعد البيانات',
    prerequisite: '2211261 مقدمة في قواعد البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221264': {
    courseNumber: '2221264',
    courseName: 'ذكاء الأعمال',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2222161',
    prerequisiteName: 'أساسيات علم البيانات',
    prerequisite: '2222161 أساسيات علم البيانات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2221371': {
    courseNumber: '2221371',
    courseName: 'تفاعل الإنسان والحاسوب',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2221461',
    prerequisiteName: 'نظم إسترجاع المعلومات',
    prerequisite: '2221461 نظم إسترجاع المعلومات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2222267': {
    courseNumber: '2222267',
    courseName: 'الذكاء الاصطناعي التوليدي',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2222261',
    prerequisiteName: 'مقدمة في الذكاء الاصطناعي',
    prerequisite: '2222261 مقدمة في الذكاء الاصطناعي',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2231265': {
    courseNumber: '2231265',
    courseName: 'إدارة مشاريع برمجية',
    creditHours: 3,
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteName: 'أساسيات هندسة البرمجيات',
    prerequisite: 'أساسيات هندسة البرمجيات',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
  '2231371': {
    courseNumber: '2231371',
    courseName: 'الحوسبة السحابية وتطبيقاتها',
    creditHours: 2, // ع.س = 2
    category: 'متطلبات التخصص الاختيارية',
    categoryType: 'major_elective',
    prerequisiteCode: '2222365',
    prerequisiteName: 'الحوسبة عالية الأداء والبيانات الضخمة',
    prerequisite: '2222365 الحوسبة عالية الأداء والبيانات الضخمة',
    isCorequisite: false,
    isRemedial: false,
    isLevelExam: false,
  },
};

/**
 * تنظيف ومطابقة كود المساق
 */
export function normalizeCourseCode(code: string): string {
  const digits = (code || '').replace(/\D/g, '');
  if (digits.length >= 7) {
    return digits.slice(-7);
  }
  return digits.padStart(7, '0');
}

/**
 * جلب تفاصيل المساق الرسمية من الكتالوج المعتمد
 */
export function getOfficialCourse(code: string): CourseCatalogEntry | undefined {
  const norm = normalizeCourseCode(code);
  return OFFICIAL_COURSE_CATALOG[norm] || OFFICIAL_COURSE_CATALOG[code];
}

/**
 * استخراج الساعات المعتمدة الرسمية بدقة 100%
 */
export function getOfficialCreditHours(
  code: string,
  fallbackName?: string,
  rawHours?: number | string
): number {
  const norm = normalizeCourseCode(code);
  const entry = OFFICIAL_COURSE_CATALOG[norm] || OFFICIAL_COURSE_CATALOG[code];
  if (entry) {
    return entry.creditHours;
  }

  // إذا تم تمرير رقم ساعات صالح وموجب
  if (typeof rawHours === 'number' && !isNaN(rawHours) && rawHours >= 0) {
    return rawHours;
  }
  if (typeof rawHours === 'string') {
    const parsed = parseInt(rawHours.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  const name = fallbackName || '';
  if (
    code.includes('096') ||
    name.includes('امتحان مستوى') ||
    name.includes('تدريب ميداني') ||
    name.includes('التدريب الميداني') ||
    code === '2222371'
  ) {
    return 0;
  }

  if (
    code === '2222491' ||
    code.endsWith('491') ||
    name.includes('مشروع تخرج 1') ||
    name.includes('مشروع تخرج1') ||
    name.includes('مختبر') ||
    name.toLowerCase().includes('lab')
  ) {
    return 1;
  }

  if (
    code === '2222492' ||
    code.endsWith('492') ||
    name.includes('مشروع تخرج 2') ||
    name.includes('مشروع تخرج2') ||
    code === '2211362' ||
    code === '2231371'
  ) {
    return 2;
  }

  return 3;
}

/**
 * جلب المتطلب السابق الرسمي للمساق
 */
export function getOfficialPrerequisite(code: string, fallback?: string): string {
  const entry = getOfficialCourse(code);
  if (entry) {
    return entry.prerequisite;
  }
  return fallback || '—';
}

/**
 * جلب كود المتطلب السابق إن وجد
 */
export function getOfficialPrerequisiteCode(code: string): string | undefined {
  const entry = getOfficialCourse(code);
  return entry?.prerequisiteCode;
}

/**
 * فحص إذا كان المساق مرافقاً (أو يرافق)
 */
export function isCourseCorequisite(code: string): boolean {
  const entry = getOfficialCourse(code);
  return entry?.isCorequisite || false;
}
