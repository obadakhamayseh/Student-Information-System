import { PlanCourse, StudyPlanData } from '@/lib/schemas/plan.schema';
import {
  getOfficialCreditHours,
  getOfficialPrerequisite,
  getOfficialPrerequisiteCode,
  isCourseCorequisite,
  normalizeCourseCode,
} from '@/lib/course-catalog';

export interface PlannedCourseItem extends PlanCourse {
  reason: string;
  difficulty: 'سهل' | 'متوسط' | 'متقدم';
  isCriticalPath?: boolean;
  unlockedCount?: number;
  level: number; // 0: remedial, 1: 1st year, 2: 2nd year, 3: 3rd year, 4: 4th year
  isElectiveChoice?: boolean;
  electiveCategoryName?: string;
  isRemedial?: boolean;
}

export interface RoadmapSemester {
  id: string;
  semesterNumber: number;
  semesterName: string;
  academicYear: string;
  isSummer: boolean;
  isGraduationSemester: boolean;
  isCurrentSemester?: boolean;
  targetHours: number;
  totalHours: number;
  courses: PlannedCourseItem[];
  workloadStatus:
    | 'خفيف'
    | 'متوازن ومثالي'
    | 'مكثف'
    | 'مكثف (الحد الأقصى 18 س.م)'
    | 'عبء تخرج استثنائي (21 س.م)'
    | 'عبء تخرج صيفي استثنائي (12 س.م)'
    | 'صيفي مركز'
    | 'الفصل الحالي (قيد الدراسة)';
  workloadColor: 'emerald' | 'blue' | 'amber' | 'purple';
}

export interface RoadmapCategorySummary {
  categoryId: string;
  name: string;
  requiredHours: number;
  completedHours: number;
  enrolledHours: number;
  remainingHours: number;
  status: 'مكتمل' | 'مكتمل بالفصل الحالي' | 'متبقي';
  isCompulsory: boolean;
  isElective: boolean;
  isRemedial: boolean;
  totalCoursesCount: number;
  passedCoursesCount: number;
}

export interface RoadmapResult {
  semesters: RoadmapSemester[];
  totalRemainingHours: number;
  completedHours: number;
  currentRegisteredHours: number;
  totalDegreeHours: number;
  semestersCount: number;
  estimatedGraduationSemester: string;
  isCompleted: boolean;
  criticalPathCourses: PlannedCourseItem[];
  progressPercent: number;
  stats: {
    majorCompulsoryRemaining: number;
    majorElectiveRemaining: number;
    uniCompulsoryRemaining: number;
    uniElectiveRemaining: number;
    collegeCompulsoryRemaining: number;
    remedialRemaining: number;
  };
  categoriesSummary: RoadmapCategorySummary[];
}

export interface RoadmapConfig {
  pace: 'balanced' | 'fast' | 'light';
  includeSummer: boolean;
  maxRegularHours: number;
  maxSummerHours: number;
  startSemesterName?: string;
}

export const DEFAULT_ROADMAP_CONFIG: RoadmapConfig = {
  pace: 'balanced',
  includeSummer: true,
  maxRegularHours: 16,
  maxSummerHours: 9,
  startSemesterName: 'الفصل الأول (2026/2027)',
};

/**
 * دقة استخراج المستوى الدراسي للمادة (100، 200، 300، 400، أو استدراكي 99)
 */
export function getCourseLevel(courseNumber: string, courseName: string): number {
  if (courseNumber.includes('099') || courseName.includes('99') || courseName.includes('استدراكي')) {
    return 0;
  }
  const digits = courseNumber.replace(/\D/g, '');
  if (digits.length >= 7) {
    const levelDigit = parseInt(digits[4], 10);
    if (!isNaN(levelDigit) && levelDigit >= 1 && levelDigit <= 5) {
      return levelDigit;
    }
  }
  if (digits.length >= 3) {
    const levelDigit = parseInt(digits[digits.length - 3], 10);
    if (!isNaN(levelDigit) && levelDigit >= 1 && levelDigit <= 5) {
      return levelDigit;
    }
  }
  return 2; // افتراضي متوسط
}

/**
 * استنتاج الصعوبة
 */
export function getCourseDifficulty(
  level: number,
  category: string,
  name: string
): 'سهل' | 'متوسط' | 'متقدم' {
  if (
    level === 0 ||
    category.includes('جامعه') ||
    category.includes('جامعة') ||
    name.includes('مهارات') ||
    name.includes('عسكرية') ||
    name.includes('وطنية') ||
    name.includes('إسلام') ||
    name.includes('قانون')
  ) {
    return 'سهل';
  }
  if (
    level >= 3 ||
    name.includes('مشروع') ||
    name.includes('خوارزميات') ||
    name.includes('ذكاء') ||
    name.includes('تعلم الآلة') ||
    name.includes('عميق') ||
    name.includes('أمن')
  ) {
    return 'متقدم';
  }
  return 'متوسط';
}

/**
 * محرك الخريطة الأكاديمية الذكية المبني بدقة 100% على تصنيفات متطلبات الخطة الأكاديمية للطالب
 */
export function generateGraduationRoadmap(
  planData: StudyPlanData,
  config: Partial<RoadmapConfig> = {}
): RoadmapResult {
  const cfg: RoadmapConfig = { ...DEFAULT_ROADMAP_CONFIG, ...config };

  const allCourses = planData.courses || [];
  const rawCategories = planData.categories || [];

  // 1. حساب المساقات والساعات المسجلة حالياً في الفصل الجاري (قيد الدراسة)
  const currentRegistered = allCourses.filter((c) => c.status === 'مسجلة');
  const currentRegisteredHours = currentRegistered.reduce(
    (sum, c) => sum + getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
    0
  );

  const currentEnrolledCourses: PlannedCourseItem[] = currentRegistered.map((c) => {
    const level = getCourseLevel(c.courseNumber, c.courseName);
    const difficulty = getCourseDifficulty(level, c.category, c.courseName);
    const hours = getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours);
    const prereq = getOfficialPrerequisite(c.courseNumber, c.prerequisite);
    return {
      ...c,
      creditHours: hours,
      prerequisite: prereq,
      level,
      difficulty,
      reason: 'مقرر مسجل حالياً في جدولك الدراسي (قيد الدراسة)',
      isCriticalPath: false,
    };
  });

  const categoriesSummary: RoadmapCategorySummary[] = [];
  const scheduledDegreePool: PlannedCourseItem[] = [];
  const remedialPool: PlannedCourseItem[] = [];

  const stats = {
    majorCompulsoryRemaining: 0,
    majorElectiveRemaining: 0,
    uniCompulsoryRemaining: 0,
    uniElectiveRemaining: 0,
    collegeCompulsoryRemaining: 0,
    remedialRemaining: 0,
  };

  let totalDegreeHours = 0;
  let completedDegreeHours = 0;
  let totalRemainingHours = 0;

  // إذا كانت شجرة التصنيفات متوفرة من treeplan.jsp
  if (rawCategories.length > 0) {
    rawCategories.forEach((cat) => {
      const catName = cat.name.trim();
      const catId = cat.categoryId;

      // 1. متطلب 00 (وثائق وامتحانات مستوى): "اعتبر ان متطلب 00 منجز"
      const isCat00 =
        catId === 'children_00' ||
        catId === '00' ||
        catName === '00' ||
        catName.includes('00') ||
        catName.includes('وثائق') ||
        catName.includes('امتحان مستوى');

      if (isCat00) {
        categoriesSummary.push({
          categoryId: catId,
          name: 'متطلب 00 (امتحانات المستوى والوثائق)',
          requiredHours: 0,
          completedHours: 0,
          enrolledHours: 0,
          remainingHours: 0,
          status: 'مكتمل',
          isCompulsory: false,
          isElective: false,
          isRemedial: false,
          totalCoursesCount: cat.courses?.length || 3,
          passedCoursesCount: cat.courses?.length || 3,
        });
        // لا نحتسب أي ساعات ولا نضيف أي مساق منه
        return;
      }

      // 2. المواد الاستدراكية (remedial): لا تحتسب ضمن ساعات التخرج الـ 132
      const isRemedial =
        catName.includes('استدراكي') ||
        catName.toLowerCase().includes('remedial') ||
        catId === 'children_01';

      if (isRemedial) {
        const catCourses = cat.courses || [];
        // المساقات الاستدراكية: الطالب معفى من مهارات حاسوب 99 (2200099) لاجتيازه امتحان المستوى 2200096
        const unpassedRemedial = catCourses.filter(
          (c) => c.status === 'متبقية' && c.courseNumber !== '2200099'
        );
        const passedRemedial = catCourses.filter(
          (c) => c.status === 'منجزة' || c.courseNumber === '2200099'
        );

        stats.remedialRemaining = unpassedRemedial.length;

        categoriesSummary.push({
          categoryId: catId,
          name: catName,
          requiredHours: 0,
          completedHours: cat.completedHours || passedRemedial.length * 3,
          enrolledHours: 0,
          remainingHours: 0,
          status: unpassedRemedial.length === 0 ? 'مكتمل' : 'متبقي',
          isCompulsory: true,
          isElective: false,
          isRemedial: true,
          totalCoursesCount: catCourses.length,
          passedCoursesCount: passedRemedial.length,
        });

        // المقررات الاستدراكية المتبقية توضع في حوض خاص لتدخل في الفصل الأول حصراً
        unpassedRemedial.forEach((c) => {
          remedialPool.push({
            ...c,
            creditHours: 0, // لا تحتسب ضمن ساعات التخرج المعتمدة
            level: 0,
            difficulty: 'سهل',
            reason: 'مقرر استدراكي إجباري يجب تسجيله بأول فصل دراسي (لا يدخل ضمن ساعات التخرج)',
            isCriticalPath: true,
            unlockedCount: 3,
            isRemedial: true,
          });
        });
        return;
      }

      // 3. تصنيفات متطلبات الدرجة العلمية المعتمدة (تخرج 132 ساعة)
      const catReq = cat.requiredHours || 0;
      const catComp = cat.completedHours || 0;
      totalDegreeHours += catReq;
      completedDegreeHours += catComp;

      const catCourses = cat.courses || [];
      const enrolledInCat = catCourses.filter((c) => c.status === 'مسجلة');
      const enrolledHoursInCat = enrolledInCat.reduce(
        (sum, c) => sum + getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
        0
      );

      const isCompulsory =
        catName.includes('إجباري') ||
        catName.includes('اجباري') ||
        catName.includes('إجباريه') ||
        catName.includes('اجبارية');

      const isElective =
        catName.includes('إختياري') ||
        catName.includes('اختياري') ||
        catName.includes('إختيارية') ||
        catName.includes('اختيارية');

      if (isCompulsory) {
        // متطلب إجباري: نعتمد حصراً على ساعات تصنيف المتطلب الأكاديمي والمنجز الفعلي (دون احتساب الفصل الحالي كمنجز)
        const catRemainingHours = Math.max(0, catReq - catComp);

        totalRemainingHours += catRemainingHours;

        if (catName.includes('جامع')) {
          stats.uniCompulsoryRemaining += catRemainingHours;
        } else if (catName.includes('كلي')) {
          stats.collegeCompulsoryRemaining += catRemainingHours;
        } else {
          stats.majorCompulsoryRemaining += catRemainingHours;
        }

        categoriesSummary.push({
          categoryId: catId,
          name: catName,
          requiredHours: catReq,
          completedHours: catComp,
          enrolledHours: enrolledHoursInCat,
          remainingHours: catRemainingHours,
          status: catRemainingHours === 0 ? 'مكتمل' : 'متبقي',
          isCompulsory: true,
          isElective: false,
          isRemedial: false,
          totalCoursesCount: catCourses.length,
          passedCoursesCount: catCourses.filter((c) => c.status === 'منجزة').length,
        });

        // الساعات المطلوبة من المقررات غير المسجلة وغير المنجزة (المتبقية) لجدولتها بالفصول القادمة
        // لأن المساقات المسجلة حالياً ستُدرج بالفصل الحالي
        const unstudiedNeededHours = Math.max(0, catRemainingHours - enrolledHoursInCat);

        if (unstudiedNeededHours > 0) {
          const unstudiedCourses = catCourses.filter((c) => c.status === 'متبقية');

          // ترتيب المساقات الإجبارية:
          // 1. مشاريع التخرج أولاً لتأكيد إدراجها
          // 2. المستوى الأقل أولاً (تأسيسي)
          const sortedCompulsory = [...unstudiedCourses].sort((a, b) => {
            const isAProj =
              a.courseName.includes('مشروع') ||
              a.courseNumber.endsWith('491') ||
              a.courseNumber.endsWith('492');
            const isBProj =
              b.courseName.includes('مشروع') ||
              b.courseNumber.endsWith('491') ||
              b.courseNumber.endsWith('492');
            if (isAProj && !isBProj) return -1;
            if (!isAProj && isBProj) return 1;

            const lvlA = getCourseLevel(a.courseNumber, a.courseName);
            const lvlB = getCourseLevel(b.courseNumber, b.courseName);
            return lvlA - lvlB;
          });

          for (const c of sortedCompulsory) {
            const hours = getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours);
            const prereq = getOfficialPrerequisite(c.courseNumber, c.prerequisite);

            const level = getCourseLevel(c.courseNumber, c.courseName);
            const difficulty = getCourseDifficulty(level, c.category, c.courseName);
            const isProj1 =
              c.courseName.includes('مشروع تخرج 1') ||
              c.courseName.includes('مشروع تخرج1') ||
              c.courseNumber.endsWith('491');
            const isProj2 =
              c.courseName.includes('مشروع تخرج 2') ||
              c.courseName.includes('مشروع تخرج2') ||
              c.courseNumber.endsWith('492');

            let reason = 'متطلب تخصص إجباري لاستكمال الخطة';
            let isCriticalPath = false;

            if (isProj2) {
              reason = 'مشروع التخرج النهائي (متطلب التخرج الأخير)';
              isCriticalPath = true;
            } else if (isProj1) {
              reason = 'مشروع التخرج الأول (يفتح مشروع التخرج 2)';
              isCriticalPath = true;
            } else if (catName.includes('جامع')) {
              reason = 'متطلب جامعة إجباري لاستكمال الخطة العامة';
            } else if (catName.includes('كلي')) {
              reason = 'متطلب كلية إجباري';
              isCriticalPath = true;
            } else if (level <= 2) {
              reason = 'مقرر أساسي يفتح مواد تخصص متقدمة';
              isCriticalPath = true;
            }

            scheduledDegreePool.push({
              ...c,
              creditHours: hours,
              prerequisite: prereq,
              level,
              difficulty,
              reason,
              isCriticalPath,
              unlockedCount: isCriticalPath ? (isProj1 ? 2 : 1) : 0,
            });
          }
        }
      } else if (isElective) {
        // متطلب اختياري: نحسب بدقة الساعات الناقصة من واقع المطلوب والمنجز الفعلي فقط
        const catRemainingHours = Math.max(0, catReq - catComp);

        totalRemainingHours += catRemainingHours;

        if (catName.includes('جامع')) {
          stats.uniElectiveRemaining += catRemainingHours;
        } else {
          stats.majorElectiveRemaining += catRemainingHours;
        }

        categoriesSummary.push({
          categoryId: catId,
          name: catName,
          requiredHours: catReq,
          completedHours: catComp,
          enrolledHours: enrolledHoursInCat,
          remainingHours: catRemainingHours,
          status: catRemainingHours === 0 ? 'مكتمل' : 'متبقي',
          isCompulsory: false,
          isElective: true,
          isRemedial: false,
          totalCoursesCount: catCourses.length,
          passedCoursesCount: catCourses.filter((c) => c.status === 'منجزة').length,
        });

        // الساعات المطلوبة من المقررات الاختيارية غير المسجلة حالياً
        const unstudiedNeededHours = Math.max(0, catRemainingHours - enrolledHoursInCat);

        if (unstudiedNeededHours > 0) {
          const unstudiedElectives = catCourses.filter((c) => c.status === 'متبقية');
          let accumulatedHours = 0;

          // فرز المقررات الاختيارية لاختيار الأنسب أكاديمياً
          const sortedElectives = [...unstudiedElectives].sort((a, b) => {
            const lvlA = getCourseLevel(a.courseNumber, a.courseName);
            const lvlB = getCourseLevel(b.courseNumber, b.courseName);
            return lvlA - lvlB;
          });

          for (const electiveCourse of sortedElectives) {
            if (accumulatedHours >= unstudiedNeededHours) break;
            const hours = getOfficialCreditHours(
              electiveCourse.courseNumber,
              electiveCourse.courseName,
              electiveCourse.creditHours
            );
            accumulatedHours += hours;

            const level = getCourseLevel(electiveCourse.courseNumber, electiveCourse.courseName);
            const difficulty = getCourseDifficulty(
              level,
              electiveCourse.category,
              electiveCourse.courseName
            );
            const prereq = getOfficialPrerequisite(
              electiveCourse.courseNumber,
              electiveCourse.prerequisite
            );

            scheduledDegreePool.push({
              ...electiveCourse,
              creditHours: hours,
              prerequisite: prereq,
              level,
              difficulty,
              reason: `مساق اختياري مقترح لاستيفاء متطلب (${catName}) - خيار استرشادي يمكن استبداله`,
              isCriticalPath: false,
              isElectiveChoice: true,
              electiveCategoryName: catName,
            });
          }
        }
      } else {
        // فئة عامة أخرى
        const catRemainingHours = Math.max(0, catReq - catComp);
        totalRemainingHours += catRemainingHours;

        categoriesSummary.push({
          categoryId: catId,
          name: catName,
          requiredHours: catReq,
          completedHours: catComp,
          enrolledHours: enrolledHoursInCat,
          remainingHours: catRemainingHours,
          status: catRemainingHours === 0 ? 'مكتمل' : 'متبقي',
          isCompulsory: true,
          isElective: false,
          isRemedial: false,
          totalCoursesCount: catCourses.length,
          passedCoursesCount: catCourses.filter((c) => c.status === 'منجزة').length,
        });

        const unstudiedNeededHours = Math.max(0, catRemainingHours - enrolledHoursInCat);
        if (unstudiedNeededHours > 0) {
          const unstudied = catCourses.filter((c) => c.status === 'متبقية');
          let acc = 0;
          for (const c of unstudied) {
            if (acc >= unstudiedNeededHours) break;
            const h = c.creditHours || 3;
            acc += h;
            scheduledDegreePool.push({
              ...c,
              creditHours: h,
              level: getCourseLevel(c.courseNumber, c.courseName),
              difficulty: 'متوسط',
              reason: `متطلب استكمال ساعات (${catName})`,
            });
          }
        }
      }
    });
  } else {
    // خطة احتياطية في حال لم تكن شجرة التصنيفات متوفرة
    totalDegreeHours = planData.totalHours || 132;
    completedDegreeHours = planData.completedHours || 0;

    const remainingCourses = allCourses.filter(
      (c) =>
        c.status === 'متبقية' &&
        c.category !== '00' &&
        !c.courseNumber.includes('096') &&
        !c.courseName.includes('امتحان مستوى')
    );

    totalRemainingHours = remainingCourses.reduce(
      (sum, c) =>
        sum + getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
      0
    );

    remainingCourses.forEach((c) => {
      const level = getCourseLevel(c.courseNumber, c.courseName);
      const hours = getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours);
      const prereq = getOfficialPrerequisite(c.courseNumber, c.prerequisite);

      if (level === 0 || c.category.includes('استدراكي')) {
        remedialPool.push({
          ...c,
          creditHours: 0,
          prerequisite: prereq,
          level: 0,
          difficulty: 'سهل',
          reason: 'مقرر استدراكي إجباري يجب تسجيله بأول فصل دراسي',
          isCriticalPath: true,
          isRemedial: true,
        });
      } else {
        scheduledDegreePool.push({
          ...c,
          creditHours: hours,
          prerequisite: prereq,
          level,
          difficulty: getCourseDifficulty(level, c.category, c.courseName),
          reason: 'متطلب خطة دراسية',
          isCriticalPath: level <= 2,
        });
      }
    });
  }

  // مطابقة الساعات بدقة
  if (totalDegreeHours === 0) totalDegreeHours = planData.totalHours || 132;
  if (completedDegreeHours === 0) completedDegreeHours = planData.completedHours || 0;

  // إذا لم يتبق أي ساعات للتخرج
  if (scheduledDegreePool.length === 0 && remedialPool.length === 0 && currentEnrolledCourses.length === 0) {
    return {
      semesters: [],
      totalRemainingHours: 0,
      completedHours: completedDegreeHours,
      currentRegisteredHours,
      totalDegreeHours,
      semestersCount: 0,
      estimatedGraduationSemester: 'مؤهل للتخرج حالياً 🎉',
      isCompleted: true,
      criticalPathCourses: [],
      progressPercent: 100,
      stats,
      categoriesSummary,
    };
  }

  // 4. فرز المساقات وجدولة الأولويات
  // - المواد الاستدراكية توضع بأول فصل
  // - مشروع تخرج 2 يوضع دائماً بالفصل الأخير (فصل التخرج)
  // - مشروع تخرج 1 يوضع قبل مشروع تخرج 2 بفصل على الأقل
  // - المواد التأسيسية الأقل مستوى أولاً
  const proj2Index = scheduledDegreePool.findIndex(
    (c) => c.courseName.includes('مشروع تخرج 2') || c.courseNumber.endsWith('492')
  );
  let proj2Course: PlannedCourseItem | null = null;
  if (proj2Index !== -1) {
    proj2Course = scheduledDegreePool.splice(proj2Index, 1)[0];
  }

  const proj1Index = scheduledDegreePool.findIndex(
    (c) =>
      c.courseName.includes('مشروع تخرج 1') ||
      c.courseName.includes('مشروع تخرج1') ||
      c.courseNumber.endsWith('491')
  );
  let proj1Course: PlannedCourseItem | null = null;
  if (proj1Index !== -1) {
    proj1Course = scheduledDegreePool.splice(proj1Index, 1)[0];
  }

  // ترتيب الحوض العام
  scheduledDegreePool.sort((a, b) => {
    // المسار الحرج أولاً
    if (a.isCriticalPath && !b.isCriticalPath) return -1;
    if (!a.isCriticalPath && b.isCriticalPath) return 1;

    // المستوى الأقل أولاً (1 ثم 2 ثم 3 ثم 4)
    if (a.level !== b.level) {
      return a.level - b.level;
    }

    return 0;
  });

  const criticalPathCourses = [
    ...remedialPool,
    ...scheduledDegreePool.filter((c) => c.isCriticalPath),
    ...(proj2Course ? [proj2Course] : []),
  ].slice(0, 6);

  // 5. محاكي وتوزيع الفصول الدراسية بدقة
  const semesters: RoadmapSemester[] = [];

  // تتبع المقررات المنجزة أكاديمياً لفتح المتطلبات السابقة
  const completedCourseCodes = new Set<string>();
  allCourses
    .filter((c) => c.status === 'منجزة')
    .forEach((c) => {
      completedCourseCodes.add(normalizeCourseCode(c.courseNumber));
    });
  // امتحانات المستوى والمقررات الاستدراكية المعفاة
  completedCourseCodes.add('1801096');
  completedCourseCodes.add('1802096');
  completedCourseCodes.add('2200096');
  completedCourseCodes.add('2200099');

  // إذا كان الطالب مسجلاً في مقررات بالفصل الحالي (قيد الدراسة - غير محسوبة كمنجزة بعد)
  if (currentEnrolledCourses.length > 0) {
    const curSemName = planData.currentSemester
      ? `${planData.currentSemester} (الفصل الحالي - قيد الدراسة)`
      : 'الفصل الحالي (مسجل حالياً - قيد الدراسة)';

    semesters.push({
      id: 'sem-plan-current',
      semesterNumber: 1,
      semesterName: curSemName,
      academicYear: '2025/2026',
      isSummer: planData.currentSemester?.includes('صيف') || false,
      isGraduationSemester: false,
      isCurrentSemester: true,
      targetHours: currentRegisteredHours,
      totalHours: currentRegisteredHours,
      courses: currentEnrolledCourses,
      workloadStatus: 'الفصل الحالي (قيد الدراسة)',
      workloadColor: 'blue',
    });

    // عند اجتياز الفصل الحالي، تصبح هذه المساقات منجزة ومفتوحة كمتطلبات سابقة للفصول القادمة
    currentEnrolledCourses.forEach((c) => {
      completedCourseCodes.add(normalizeCourseCode(c.courseNumber));
    });
  }

  const maxReg =
    cfg.pace === 'fast' ? 18 : cfg.pace === 'light' ? 14 : cfg.maxRegularHours;
  const maxSum = cfg.pace === 'fast' ? 10 : cfg.maxSummerHours;

  // تحديد الفصل القادم بذكاء بناءً على فصل الطالب الحالي
  let currentSemesterType: 'first' | 'second' | 'summer' = 'first';
  let currentStartYear = 2026;

  if (planData.currentSemester) {
    const cur = planData.currentSemester;
    if (cur.includes('أول') || cur.includes('الأول')) {
      currentSemesterType = 'second';
    } else if (cur.includes('ثاني') || cur.includes('الثاني')) {
      currentSemesterType = cfg.includeSummer ? 'summer' : 'first';
      if (!cfg.includeSummer) currentStartYear++;
    } else if (cur.includes('صيف')) {
      currentSemesterType = 'first';
    }
  }

  let semIndex = semesters.length + 1;
  const pool = [...scheduledDegreePool];

  while (pool.length > 0 || proj1Course || proj2Course || remedialPool.length > 0) {
    const isSummer = cfg.includeSummer && currentSemesterType === 'summer';

    // حساب الساعات المتبقية الإجمالية في الحوض
    const remainingInPoolHours =
      pool.reduce(
        (s, c) =>
          s + getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
        0
      ) +
      (proj1Course ? proj1Course.creditHours || 1 : 0) +
      (proj2Course ? proj2Course.creditHours || 2 : 0) +
      remedialPool.reduce((s, c) => s + (c.creditHours || 0), 0);

    // التحقق من أهلية التخرج في هذا الفصل:
    // 1. لا يمكن دمج مشروعي تخرج 1 و 2 معاً بنفس الفصل (مشروع 1 متطلب سابق لمشروع 2)
    const hasBothProjectsPending = proj1Course !== null && proj2Course !== null;

    // 2. الحد الأقصى لساعات التخرج:
    // - في الفصول العادية يُسمح للخريج حتى 21 ساعة معتمدة (بدلاً من 18)
    // - في الفصل الصيفي يُسمح للخريج حتى 12 ساعة معتمدة (بدلاً من 10)
    const maxGraduationCapacity = isSummer ? 12 : 21;
    const canGraduateThisTerm =
      remainingInPoolHours <= maxGraduationCapacity &&
      !hasBothProjectsPending;

    // السقف الصارم للساعات المسموحة في هذا الفصل:
    // إذا كان خريجاً:
    //   - عادي: حتى 21 س.م
    //   - صيفي: حتى 12 س.م
    // إذا لم يكن خريجاً:
    //   - عادي: الحد الأقصى الصارم 18 س.م (أو أقل بحسب نمط التوزيع pace)
    //   - صيفي: الحد الأقصى الصارم 10 س.م
    const hardMaxCapacity = canGraduateThisTerm
      ? maxGraduationCapacity
      : isSummer
      ? Math.min(10, maxSum)
      : Math.min(18, maxReg);

    const targetHours = canGraduateThisTerm
      ? remainingInPoolHours
      : hardMaxCapacity;

    let semName = '';
    const academicYear = `${currentStartYear}/${currentStartYear + 1}`;

    if (currentSemesterType === 'first') {
      semName = `الفصل الأول (${academicYear})`;
    } else if (currentSemesterType === 'second') {
      semName = `الفصل الثاني (${academicYear})`;
    } else {
      semName = `الفصل الصيفي (${academicYear})`;
    }

    const currentSemesterCourses: PlannedCourseItem[] = [];
    let currentHours = 0;

    // وضع المواد الاستدراكية كأولوية في أول فصل مقترح مستقبلي
    if (remedialPool.length > 0) {
      while (remedialPool.length > 0) {
        const rem = remedialPool.shift()!;
        currentSemesterCourses.push(rem);
      }
    }

    const isPotentiallyPenultimate =
      remainingInPoolHours <= hardMaxCapacity * 2 && proj1Course !== null;
    const isLastSemester = canGraduateThisTerm || remainingInPoolHours <= hardMaxCapacity;

    // إدراج مشروع تخرج 1 إذا كان معلقاً وليس فصلاً صيفياً
    if (
      proj1Course &&
      (isPotentiallyPenultimate || isLastSemester || pool.length === 0) &&
      !isSummer &&
      currentHours + (proj1Course.creditHours || 1) <= hardMaxCapacity
    ) {
      currentSemesterCourses.push(proj1Course);
      currentHours += proj1Course.creditHours || 1;
      proj1Course = null;
    }

    // تعبئة مساقات الفصل حتى الحد المستهدف والحد الأقصى الصارم مع التحقق من المتطلب السابق
    let i = 0;
    while (i < pool.length) {
      const candidate = pool[i];
      const hours = getOfficialCreditHours(
        candidate.courseNumber,
        candidate.courseName,
        candidate.creditHours
      );

      // فحص المتطلب السابق الأكاديمي بدقة:
      const prereqCode = getOfficialPrerequisiteCode(candidate.courseNumber);
      const isCoreq = isCourseCorequisite(candidate.courseNumber);

      let isPrereqMet = true;
      if (prereqCode) {
        const normPrereq = normalizeCourseCode(prereqCode);
        if (!completedCourseCodes.has(normPrereq)) {
          // إذا كان متطلب مرافق (أو يرافق)، يمكن دراسته إذا كان متطلبه مسجلاً بنفس الفصل
          if (
            isCoreq &&
            currentSemesterCourses.some(
              (c) => normalizeCourseCode(c.courseNumber) === normPrereq
            )
          ) {
            isPrereqMet = true;
          } else {
            isPrereqMet = false;
          }
        }
      }

      if (!isPrereqMet) {
        i++;
        continue;
      }

      // تجنب وضع مساقات تخصص عليا بدون مساقات تمهيدية في الصيفي إلا إذا كان فصل تخرج
      if (
        isSummer &&
        !canGraduateThisTerm &&
        candidate.level >= 4 &&
        pool.some((p) => p.category.includes('جامع') || p.level <= 2)
      ) {
        i++;
        continue;
      }

      // إضافة المساق فقط إذا لم يتجاوز السقف الصارم والساعات المستهدفة
      if (currentHours + hours <= targetHours && currentHours + hours <= hardMaxCapacity) {
        currentSemesterCourses.push({
          ...candidate,
          creditHours: hours,
        });
        currentHours += hours;
        pool.splice(i, 1);
      } else {
        i++;
      }
    }

    // إدراج مشروع تخرج 2 في الفصل الأخير فقط بشرط عدم وجود مشروع 1 في نفس الفصل
    const hasProj1InCurrentSem = currentSemesterCourses.some(
      (c) =>
        c.courseName.includes('مشروع تخرج 1') ||
        c.courseName.includes('مشروع تخرج1') ||
        c.courseNumber.endsWith('491')
    );

    const proj2Prereq = proj2Course
      ? getOfficialPrerequisiteCode(proj2Course.courseNumber)
      : undefined;
    const canTakeProj2 =
      !hasProj1InCurrentSem &&
      !proj1Course &&
      (!proj2Prereq || completedCourseCodes.has(normalizeCourseCode(proj2Prereq)));

    // إدراج مشروع تخرج 2:
    // يوضع حصراً في فصل التخرج أو عند استنفاذ حوض المواد، وبما لا يتجاوز hardMaxCapacity مطلقاً
    if (
      !hasProj1InCurrentSem &&
      !proj1Course &&
      proj2Course &&
      canTakeProj2 &&
      (canGraduateThisTerm || pool.length === 0) &&
      (!isSummer || canGraduateThisTerm) &&
      currentHours + (proj2Course.creditHours || 2) <= hardMaxCapacity
    ) {
      currentSemesterCourses.push(proj2Course);
      currentHours += proj2Course.creditHours || 2;
      proj2Course = null;
    }

    // إضافة مساقات هذا الفصل إلى قائمة المواد المنجزة لتفتح متطلبات الفصول اللاحقة
    currentSemesterCourses.forEach((c) => {
      completedCourseCodes.add(normalizeCourseCode(c.courseNumber));
    });

    const isGrad =
      pool.length === 0 && !proj1Course && !proj2Course && remedialPool.length === 0;

    let workloadStatus: RoadmapSemester['workloadStatus'] = 'متوازن ومثالي';
    let workloadColor: RoadmapSemester['workloadColor'] = 'blue';

    if (isGrad) {
      if (isSummer) {
        if (currentHours > 10) {
          workloadStatus = 'عبء تخرج صيفي استثنائي (12 س.م)';
          workloadColor = 'purple';
        } else {
          workloadStatus = 'صيفي مركز';
          workloadColor = 'amber';
        }
      } else {
        if (currentHours > 18) {
          workloadStatus = 'عبء تخرج استثنائي (21 س.م)';
          workloadColor = 'purple';
        } else if (currentHours === 18) {
          workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
          workloadColor = 'purple';
        } else if (currentHours <= 12) {
          workloadStatus = 'خفيف';
          workloadColor = 'emerald';
        } else {
          workloadStatus = 'متوازن ومثالي';
          workloadColor = 'blue';
        }
      }
    } else {
      if (isSummer) {
        workloadStatus = 'صيفي مركز';
        workloadColor = 'amber';
      } else if (currentHours === 18) {
        workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
        workloadColor = 'purple';
      } else if (currentHours <= 12) {
        workloadStatus = 'خفيف';
        workloadColor = 'emerald';
      } else {
        workloadStatus = 'متوازن ومثالي';
        workloadColor = 'blue';
      }
    }

    semesters.push({
      id: `sem-plan-${semIndex}`,
      semesterNumber: semIndex,
      semesterName: semName,
      academicYear,
      isSummer,
      isGraduationSemester: isGrad,
      targetHours,
      totalHours: currentHours,
      courses: currentSemesterCourses,
      workloadStatus,
      workloadColor,
    });

    semIndex++;

    // تقدم المؤشر الزمني للفصول
    if (currentSemesterType === 'first') {
      currentSemesterType = 'second';
    } else if (currentSemesterType === 'second') {
      currentSemesterType = cfg.includeSummer ? 'summer' : 'first';
      if (!cfg.includeSummer) currentStartYear++;
    } else {
      currentSemesterType = 'first';
      currentStartYear++;
    }

    if (semIndex > 10) break; // حماية ضد التكرار اللانهائي
  }

  // إذا تبقى مشروع تخرج 2 بسبب مصادفة صيفية، نلحقه بفصل نظامي أخير
  if (proj2Course) {
    const academicYear = `${currentStartYear}/${currentStartYear + 1}`;
    semesters.push({
      id: `sem-plan-${semIndex}`,
      semesterNumber: semIndex,
      semesterName: `الفصل الأول (${academicYear})`,
      academicYear,
      isSummer: false,
      isGraduationSemester: true,
      targetHours: maxReg,
      totalHours: proj2Course.creditHours || 2,
      courses: [proj2Course],
      workloadStatus: 'خفيف',
      workloadColor: 'emerald',
    });
  }

  // وضع علامة التخرج على الفصل الختامي وضمان عدم حمل أي فصل سابق لشارة التخرج
  if (semesters.length > 0) {
    semesters.forEach((s, idx) => {
      const isLast = idx === semesters.length - 1;
      s.isGraduationSemester = isLast;
      if (!isLast && !s.isCurrentSemester) {
        if (s.isSummer) {
          s.workloadStatus = 'صيفي مركز';
          s.workloadColor = 'amber';
        } else if (s.totalHours >= 18) {
          s.workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
          s.workloadColor = 'purple';
        } else if (s.totalHours <= 12) {
          s.workloadStatus = 'خفيف';
          s.workloadColor = 'emerald';
        } else {
          s.workloadStatus = 'متوازن ومثالي';
          s.workloadColor = 'blue';
        }
      }
    });
  }

  const estimatedGraduationSemester =
    semesters.length > 0 ? semesters[semesters.length - 1].semesterName : '—';

  const progressPercent =
    totalDegreeHours > 0
      ? Math.min(
          100,
          Math.round((completedDegreeHours / totalDegreeHours) * 100)
        )
      : 0;

  return {
    semesters,
    totalRemainingHours,
    completedHours: completedDegreeHours,
    currentRegisteredHours,
    totalDegreeHours,
    semestersCount: semesters.length,
    estimatedGraduationSemester,
    isCompleted: false,
    criticalPathCourses,
    progressPercent,
    stats,
    categoriesSummary,
  };
}
