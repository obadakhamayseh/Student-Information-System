/**
 * محرك الفحص والتدقيق الأكاديمي المتقدم للخطة الدراسية المخصصة
 * Advanced Academic Plan Validator & AI Advisor Engine
 * يتحقق من المتطلبات السابقة، سقوف الساعات، استيفاء الخطة، وتوازن العبء الدراسي بدقة 100%
 */

import { StudyPlanData, PlanCourse } from '@/lib/schemas/plan.schema';
import {
  RoadmapSemester,
  PlannedCourseItem,
  getCourseLevel,
  getCourseDifficulty,
} from './roadmap-engine';
import {
  getOfficialCreditHours,
  getOfficialPrerequisite,
  getOfficialPrerequisiteCode,
  isCourseCorequisite,
  getOfficialCourse,
} from './course-catalog';

export interface PlanAuditCheck {
  id: string;
  title: string;
  category: 'prerequisites' | 'workload' | 'degree_completion' | 'academic_balance';
  status: 'pass' | 'warning' | 'error';
  message: string;
  details?: string;
  affectedCourses?: string[];
  affectedSemesterIndex?: number;
}

export interface PlanSuggestion {
  id: string;
  type:
    | 'prereq_conflict'
    | 'overload'
    | 'underload'
    | 'missing_compulsory'
    | 'missing_elective'
    | 'excess_elective'
    | 'proj2_timing'
    | 'balance_recommendation';
  severity: 'critical' | 'warning' | 'tip';
  title: string;
  description: string;
  actionText?: string;
  suggestedAction?: {
    type: 'move_course' | 'remove_course' | 'add_course' | 'auto_fix';
    courseNumber?: string;
    fromSemesterIndex?: number;
    toSemesterIndex?: number;
    fromSemesterId?: string;
    toSemesterId?: string;
  };
}

export interface CourseEligibility {
  courseNumber: string;
  courseName: string;
  creditHours: number;
  category: string;
  prerequisite: string;
  prerequisiteCode?: string;
  isPrereqMet: boolean;
  missingPrereqName?: string;
  isCorequisite: boolean;
  isElective: boolean;
}

export interface CoursePrereqStatus {
  hasPrereq: boolean;
  prereqCode?: string;
  prereqName?: string;
  isCorequisite?: boolean;
  isOfficiallyCompleted: boolean; // صدرت علامته النهائية وتم اعتماده كـ "منجز" في الخطة التدقيقية
  isCurrentlyEnrolled: boolean; // مسجل حالياً بالفصل الحالي وبانتظار صدور علامته النهائية
  isScheduledEarlier: boolean; // مجدول في فصل سابق بالخطة المستقبلية
  isMet: boolean;
  statusType:
    | 'officially_completed'
    | 'enrolled_pending_grade'
    | 'scheduled_earlier'
    | 'corequisite_same_term'
    | 'missing';
  statusBadgeText: string;
  statusDetails: string;
}

export interface CustomPlanValidationResult {
  score: number; // 0 - 100
  rating: 'ممتاز ومثالي 🌟' | 'سليم أكاديمياً ✓' | 'تنبيهات عبء أو توازن ⚠️' | 'تعارضات أكاديمية حرجة ❌';
  color: 'emerald' | 'blue' | 'amber' | 'rose';
  isValid: boolean;
  checks: PlanAuditCheck[];
  suggestions: PlanSuggestion[];
  coursePrereqMap: Record<string, CoursePrereqStatus>;
  semesterWorkloadMap: Record<
    string,
    {
      totalHours: number;
      maxAllowed: number;
      isOverloaded: boolean;
      isUnderloaded: boolean;
    }
  >;
  unassignedCompulsoryCourses: PlannedCourseItem[];
  availableElectivePool: PlannedCourseItem[];
  totalScheduledRemainingHours: number;
  totalDegreeScheduledHours: number;
  majorElectiveHoursScheduled: number;
  majorElectiveHoursTarget: number;
  missingCompulsoryHours: number;
  passCount: number;
  warningCount: number;
  errorCount: number;
}

const normalizeCode = (c: string) => c.replace(/\D/g, '').trim();

/**
 * دالة التحقق الشامل وتقييم سلامة الخطة المخصصة
 */
export function validateCustomPlan(
  planData: StudyPlanData,
  futureSemesters: RoadmapSemester[]
): CustomPlanValidationResult {
  const checks: PlanAuditCheck[] = [];
  const suggestions: PlanSuggestion[] = [];

  const allCourses = planData.courses || [];

  // 1. تجميع المقررات المنجزة رسمياً التي صدرت علاماتها ووُضع عليها "منجز" في الخطة التدقيقية للموقع الأصلي
  const officiallyCompletedCodes = new Set<string>();
  allCourses.forEach((c) => {
    if (c.status === 'منجزة') {
      officiallyCompletedCodes.add(normalizeCode(c.courseNumber));
    }
  });

  // امتحانات المستوى والمواد الاستدراكية المعفاة رسمياً
  officiallyCompletedCodes.add('1801096');
  officiallyCompletedCodes.add('1802096');
  officiallyCompletedCodes.add('2200096');
  officiallyCompletedCodes.add('2200099');

  // المقررات المسجلة حالياً بالفصل الحالي (قيد الدراسة - بانتظار صدور العلامة النهائية)
  const currentlyEnrolledCodes = new Set<string>();
  allCourses
    .filter((c) => c.status === 'مسجلة')
    .forEach((c) => {
      currentlyEnrolledCodes.add(normalizeCode(c.courseNumber));
    });

  const baseCompletedCodes = new Set<string>(officiallyCompletedCodes);
  currentlyEnrolledCodes.forEach((code) => baseCompletedCodes.add(code));

  // تصفية الفصول المستقبلية فقط (استبعاد الفصل الحالي إن وجد)
  const actualFutureSemesters = futureSemesters.filter((s) => !s.isCurrentSemester);
  const totalFutureCount = actualFutureSemesters.length;

  // معرفة جميع المساقات المجدولة في الفصول المستقبلية
  const allScheduledCourseCodes = new Set<string>();
  const scheduledCourseMap = new Map<string, { semIndex: number; course: PlannedCourseItem }>();

  actualFutureSemesters.forEach((sem, sIdx) => {
    sem.courses.forEach((c) => {
      const code = normalizeCode(c.courseNumber);
      allScheduledCourseCodes.add(code);
      scheduledCourseMap.set(code, { semIndex: sIdx, course: c });
    });
  });

  // 2. فحص المتطلبات السابقة والمرافقة عبر المسار الزمني (Prerequisites & Corequisites Validation)
  const rollingCompletedCodes = new Set<string>(baseCompletedCodes);
  let prereqErrorsCount = 0;
  const coursePrereqMap: Record<string, CoursePrereqStatus> = {};
  const semesterWorkloadMap: Record<
    string,
    {
      totalHours: number;
      maxAllowed: number;
      isOverloaded: boolean;
      isUnderloaded: boolean;
    }
  > = {};

  actualFutureSemesters.forEach((sem, sIdx) => {
    const semCourses = sem.courses || [];
    const semCourseCodes = new Set(semCourses.map((c) => normalizeCode(c.courseNumber)));

    semCourses.forEach((course) => {
      const code = normalizeCode(course.courseNumber);
      const prereqCode = getOfficialPrerequisiteCode(code);
      const isCoreq = isCourseCorequisite(code);

      if (prereqCode) {
        const normPrereq = normalizeCode(prereqCode);
        const isMetEarlier = rollingCompletedCodes.has(normPrereq);
        const isMetSameTerm = isCoreq && semCourseCodes.has(normPrereq);
        const prereqEntry = getOfficialCourse(normPrereq);
        const prereqName = prereqEntry?.courseName || prereqCode;
        const isMet = isMetEarlier || isMetSameTerm;

        const isOfficiallyCompleted = officiallyCompletedCodes.has(normPrereq);
        const isCurrentlyEnrolled = currentlyEnrolledCodes.has(normPrereq);
        const isScheduledEarlier = isMetEarlier && !isOfficiallyCompleted && !isCurrentlyEnrolled;

        let statusType: CoursePrereqStatus['statusType'] = 'missing';
        let statusBadgeText = `❌ المتطلب غير مكتمل (${prereqName})`;
        let statusDetails = `مساق (${course.courseName}) يتطلب اجتياز (${prereqName}) قبله.`;

        if (isOfficiallyCompleted) {
          statusType = 'officially_completed';
          statusBadgeText = '✅ مستوفى رسمياً (منجز بالخطة التدقيقية)';
          statusDetails = 'صدرت علامته النهائية في الموقع الأصلي وتم وضعه كـ منجز بالخطة التدقيقية بنجاح.';
        } else if (isCurrentlyEnrolled) {
          statusType = 'enrolled_pending_grade';
          statusBadgeText = '⏳ قيد الدراسة حالياً (يُعتمد بعد صدور علامته كـ منجز)';
          statusDetails = 'المتطلب مسجل حالياً؛ ويُعتبر مستوفياً رسمياً فور صدور علامته النهائية ووضعه كـ منجز في الموقع الأصلي.';
        } else if (isScheduledEarlier) {
          statusType = 'scheduled_earlier';
          statusBadgeText = '🗓️ مجدول في فصل سابق';
          statusDetails = 'مجدول لدراسته في فصل سابق، ويُعتمد رسمياً بعد اجتيازه وصدور علامته في ذلك الفصل.';
        } else if (isMetSameTerm) {
          statusType = 'corequisite_same_term';
          statusBadgeText = '🔄 متزامن (متطلب مرافق مسجل بنفس الفصل)';
          statusDetails = 'المساق مرافق ويسمح بتسجيله تزامناً في نفس الفصل.';
        }

        coursePrereqMap[`${course.courseNumber}_${sem.id}`] = {
          isMet,
          hasPrereq: true,
          prereqCode,
          prereqName,
          isCorequisite: isCoreq,
          isOfficiallyCompleted,
          isCurrentlyEnrolled,
          isScheduledEarlier,
          statusType,
          statusBadgeText,
          statusDetails,
        };

        if (!isMet) {
          prereqErrorsCount++;

          checks.push({
            id: `prereq_${code}_${sIdx}`,
            title: `تعارض متطلب سابق: ${course.courseName}`,
            category: 'prerequisites',
            status: 'error',
            message: `مساق (${course.courseName}) يتطلب اجتياز (${prereqName}) قبله.`,
            details: isCoreq
              ? `المساق يقبل المرافقة، لكن المتطلب غير مسجل بهذا الفصل أو بالفصول السابقة.`
              : `المتطلب السابق غير مستوفى في الفصول السابقة لهذا الفصل ولم تصدر علامة نهائية له.`,
            affectedCourses: [course.courseNumber, prereqCode],
            affectedSemesterIndex: sIdx,
          });

          // اقتراح حل التعارض
          const prereqLoc = scheduledCourseMap.get(normPrereq);
          if (prereqLoc && prereqLoc.semIndex >= sIdx) {
            const targetIdx = Math.min(totalFutureCount - 1, prereqLoc.semIndex + 1);
            suggestions.push({
              id: `sug_prereq_order_${code}`,
              type: 'prereq_conflict',
              severity: 'critical',
              title: `تعديل تسلسل: ${course.courseName}`,
              description: `يُدرس متطلبها (${prereqName}) في ${actualFutureSemesters[prereqLoc.semIndex].semesterName}. انقل (${course.courseName}) إلى ما بعده.`,
              actionText: `نقل للفصل التالي`,
              suggestedAction: {
                type: 'move_course',
                courseNumber: course.courseNumber,
                fromSemesterIndex: sIdx,
                toSemesterIndex: targetIdx,
                fromSemesterId: sem.id,
                toSemesterId: actualFutureSemesters[targetIdx]?.id,
              },
            });
          } else {
            suggestions.push({
              id: `sug_prereq_missing_${code}`,
              type: 'prereq_conflict',
              severity: 'critical',
              title: `متطلب سابق غير مجدول: ${prereqName}`,
              description: `تحتاج لتسجيل (${prereqName}) أولاً واجتيازه لتتمكن من دراسة (${course.courseName}).`,
              actionText: `إضافة المتطلب السابق`,
              suggestedAction: {
                type: 'add_course',
                courseNumber: normPrereq,
                toSemesterIndex: Math.max(0, sIdx - 1),
                toSemesterId: actualFutureSemesters[Math.max(0, sIdx - 1)]?.id,
              },
            });
          }
        }
      } else {
        coursePrereqMap[`${course.courseNumber}_${sem.id}`] = {
          isMet: true,
          hasPrereq: false,
          isOfficiallyCompleted: true,
          isCurrentlyEnrolled: false,
          isScheduledEarlier: false,
          statusType: 'officially_completed',
          statusBadgeText: 'مساق تأسيسي (بدون متطلب)',
          statusDetails: 'المساق لا يتطلب أي متطلبات سابقة.',
        };
      }
    });

    // بعد انتهاء هذا الفصل، تضاف مواده للمنجزات للفصول اللاحقة
    semCourses.forEach((c) => {
      rollingCompletedCodes.add(normalizeCode(c.courseNumber));
    });
  });

  if (prereqErrorsCount === 0) {
    checks.push({
      id: 'prereqs_ok',
      title: 'سلامة المتطلبات السابقة والأسبقيات',
      category: 'prerequisites',
      status: 'pass',
      message: 'جميع المتطلبات السابقة مستوفاة بتسلسل أكاديمي صحيح ومنضبط.',
    });
  }

  // ضابط اعتماد المتطلبات الأكاديمية الرسمي
  checks.push({
    id: 'prereq_official_audit_rule',
    title: 'ضابط اعتماد المتطلبات (الخطة التدقيقية الرسمية)',
    category: 'prerequisites',
    status: 'pass',
    message:
      'المتطلب السابق يُعتمد مستوفى رسمياً بعد صدور علامته النهائية واعتماده بحالة "منجز" بالخطة التدقيقية من قبل الموقع الأصلي.',
  });

  const pendingCourses = actualFutureSemesters
    .flatMap((s) => s.courses)
    .filter((c) => {
      const pCode = getOfficialPrerequisiteCode(normalizeCode(c.courseNumber));
      return pCode && currentlyEnrolledCodes.has(normalizeCode(pCode));
    });

  if (pendingCourses.length > 0) {
    checks.push({
      id: 'prereqs_pending_grades',
      title: 'متطلبات قيد الدراسة بانتظار ترصيد العلامات النهائية',
      category: 'prerequisites',
      status: 'pass',
      message: `يوجد ${pendingCourses.length} مقررات قادمة تعتمد على مواد قيد الدراسة حالياً؛ وتُعتمد رسمياً فور صدور علاماتها النهائية وتحديث حالتها إلى "منجز" في موقع الجامعة.`,
    });
  }

  // 3. فحص مشاريع التخرج (Project 1 & Project 2 Sequencing)
  const proj1Loc = scheduledCourseMap.get('2222491');
  const proj2Loc = scheduledCourseMap.get('2222492');
  const isProj1Done = baseCompletedCodes.has('2222491');

  if (proj2Loc) {
    const proj2SemIdx = proj2Loc.semIndex;
    const isLastSem = proj2SemIdx === totalFutureCount - 1;

    if (!isLastSem) {
      checks.push({
        id: 'proj2_not_final',
        title: 'توقيت مشروع التخرج 2',
        category: 'academic_balance',
        status: 'warning',
        message: 'مشروع التخرج 2 مسجل في فصل غير نهائي، والأصل دراسته في فصل التخرج الأخير.',
        affectedCourses: ['2222492'],
        affectedSemesterIndex: proj2SemIdx,
      });

      suggestions.push({
        id: 'sug_proj2_final',
        type: 'proj2_timing',
        severity: 'warning',
        title: 'نقل مشروع التخرج 2 لفصل التخرج',
        description: `انقل مشروع تخرج 2 إلى ${actualFutureSemesters[totalFutureCount - 1].semesterName} ليكون مساق التخرج النهائي.`,
        actionText: 'نقل لفصل التخرج',
        suggestedAction: {
          type: 'move_course',
          courseNumber: '2222492',
          fromSemesterIndex: proj2SemIdx,
          toSemesterIndex: totalFutureCount - 1,
        },
      });
    }

    if (proj1Loc && proj1Loc.semIndex >= proj2SemIdx) {
      checks.push({
        id: 'proj_sequence_error',
        title: 'تعارض مشروعي التخرج',
        category: 'prerequisites',
        status: 'error',
        message: 'مشروع التخرج 2 مجدول في نفس فصل أو قبل مشروع التخرج 1.',
        affectedCourses: ['2222491', '2222492'],
      });
    }
  }

  // 4. فحص سقوف الساعات والحد الأدنى والأقصى (Workload & Credit Hour Caps)
  let workloadErrorsCount = 0;
  let workloadWarningsCount = 0;

  actualFutureSemesters.forEach((sem, sIdx) => {
    const isGraduation = sIdx === totalFutureCount - 1;
    const isSummer = sem.isSummer;
    const hours = sem.totalHours;

    const maxAllowed = isGraduation ? (isSummer ? 12 : 21) : isSummer ? 10 : 18;

    semesterWorkloadMap[sem.id] = {
      totalHours: hours,
      maxAllowed,
      isOverloaded: hours > maxAllowed,
      isUnderloaded: !isSummer && !isGraduation && hours < 12 && hours > 0,
    };

    if (hours > maxAllowed) {
      workloadErrorsCount++;
      checks.push({
        id: `overload_${sIdx}`,
        title: `تجاوز السقف الأكاديمي: ${sem.semesterName}`,
        category: 'workload',
        status: 'error',
        message: `العبء (${hours} س.م) يتجاوز الحد الأقصى المسموح به (${maxAllowed} س.م${
          isGraduation ? ' للخريج' : ''
        }).`,
        details: isGraduation
          ? isSummer
            ? 'الحد الأقصى للتخرج في الفصل الصيفي هو 12 ساعة معتمدة.'
            : 'الحد الأقصى للتخرج في الفصل العادي هو 21 ساعة معتمدة استثنائياً.'
          : isSummer
          ? 'الحد الأقصى للفصل الصيفي العادي هو 10 ساعات معتمدة.'
          : 'الحد الأقصى للفصل الاعتيادي هو 18 ساعة معتمدة.',
        affectedSemesterIndex: sIdx,
      });

      suggestions.push({
        id: `sug_reduce_load_${sIdx}`,
        type: 'overload',
        severity: 'critical',
        title: `تخفيف عبء ${sem.semesterName}`,
        description: `العبء (${hours} س.م) غير مسموح به نظاماً. انقل مادة بمقدار ${
          hours - maxAllowed
        } س.م على الأقل لفصل آخر.`,
      });
    } else if (!isSummer && !isGraduation && hours < 12 && hours > 0) {
      workloadWarningsCount++;
      checks.push({
        id: `underload_${sIdx}`,
        title: `العبء أقل من الحد الأدنى: ${sem.semesterName}`,
        category: 'workload',
        status: 'warning',
        message: `العبء (${hours} س.م) أقل من الحد الأدنى للفصل الاعتيادي بالجامعة (12 س.م).`,
        affectedSemesterIndex: sIdx,
      });

      suggestions.push({
        id: `sug_increase_load_${sIdx}`,
        type: 'underload',
        severity: 'warning',
        title: `رفع عبء ${sem.semesterName}`,
        description: `يحبذ تسجيل 12 ساعة على الأقل لتجنب مخالفة الحد الأدنى للانتظام الأكاديمي.`,
      });
    }
  });

  if (workloadErrorsCount === 0 && workloadWarningsCount === 0) {
    checks.push({
      id: 'workload_ok',
      title: 'تطابق سقوف الساعات الأكاديمية',
      category: 'workload',
      status: 'pass',
      message: 'جميع الفصول تلتزم بالحدود الدنيا والقصوى المعتمدة بدقة.',
    });
  }

  // 5. فحص استيفاء متطلبات التخرج (Degree Requirements Completion)
  // حصر المواد الإجبارية المتبقية
  const requiredCompulsory = allCourses.filter(
    (c) =>
      c.status === 'متبقية' &&
      !c.category.includes('استدراكي') &&
      !c.courseNumber.includes('099') &&
      c.category !== '00' &&
      !c.courseNumber.includes('096') &&
      !c.category.includes('اختياري') &&
      !c.category.includes('إختياري')
  );

  const unassignedCompulsory: PlannedCourseItem[] = [];
  requiredCompulsory.forEach((c) => {
    const code = normalizeCode(c.courseNumber);
    if (!allScheduledCourseCodes.has(code)) {
      unassignedCompulsory.push({
        ...c,
        creditHours: getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
        prerequisite: getOfficialPrerequisite(c.courseNumber, c.prerequisite),
        level: getCourseLevel(c.courseNumber, c.courseName),
        difficulty: getCourseDifficulty(
          getCourseLevel(c.courseNumber, c.courseName),
          c.category,
          c.courseName
        ),
        reason: 'متطلب تخصص إجباري غير مجدول',
      });
    }
  });

  const missingCompulsoryHours = unassignedCompulsory.reduce((s, c) => s + c.creditHours, 0);

  if (unassignedCompulsory.length > 0) {
    checks.push({
      id: 'missing_compulsory',
      title: `مواد إجبارية غير مجدولة (${unassignedCompulsory.length} مساق)`,
      category: 'degree_completion',
      status: 'error',
      message: `يتبقى ${missingCompulsoryHours} س.م من متطلبات التخصص/الجامعة الإجبارية لم تتم جدولتها.`,
      details: unassignedCompulsory.map((c) => `[${c.courseNumber}] ${c.courseName}`).join('، '),
      affectedCourses: unassignedCompulsory.map((c) => c.courseNumber),
    });

    suggestions.push({
      id: 'sug_add_compulsory',
      type: 'missing_compulsory',
      severity: 'critical',
      title: 'إدراج المساقات الإجبارية المتبقية',
      description: `لديك ${unassignedCompulsory.length} مواد إجبارية لم تجدولها بعد. أضفها لتتمكن من التخرج.`,
    });
  } else {
    checks.push({
      id: 'compulsory_ok',
      title: 'استيفاء المقررات الإجبارية',
      category: 'degree_completion',
      status: 'pass',
      message: 'جميع المساقات الإجبارية المطلوبة مجدولة بالكامل.',
    });
  }

  // فحص الساعات الاختيارية (المطلوب 4 س.م فقط بعد إنجاز 3 س.م وتسجيل 2 س.م من أصل 9 س.م)
  const majorElectiveHoursTarget = 4;
  let majorElectiveHoursScheduled = 0;
  const scheduledElectives: PlannedCourseItem[] = [];

  actualFutureSemesters.forEach((sem) => {
    sem.courses.forEach((c) => {
      const cat = c.category || '';
      const isElec = cat.includes('اختياري') || cat.includes('إختياري') || c.isElectiveChoice;
      if (isElec && !cat.includes('جامع')) {
        const h = getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours);
        majorElectiveHoursScheduled += h;
        scheduledElectives.push(c);
      }
    });
  });

  if (majorElectiveHoursScheduled === majorElectiveHoursTarget) {
    checks.push({
      id: 'elective_exact',
      title: 'استيفاء الساعات الاختيارية بدقة 100%',
      category: 'degree_completion',
      status: 'pass',
      message: `تمت جدولة 4 ساعات معتمدة من حوض التخصص الاختياري، محققة متطلب الـ 9 ساعات بالتمام.`,
    });
  } else if (majorElectiveHoursScheduled < majorElectiveHoursTarget) {
    const diff = majorElectiveHoursTarget - majorElectiveHoursScheduled;
    checks.push({
      id: 'elective_short',
      title: `نقص في ساعات التخصص الاختياري (${diff} س.م)`,
      category: 'degree_completion',
      status: 'warning',
      message: `المجدول (${majorElectiveHoursScheduled} س.م) أقل من المطلوب (${majorElectiveHoursTarget} س.م).`,
    });
    suggestions.push({
      id: 'sug_add_elective',
      type: 'missing_elective',
      severity: 'warning',
      title: 'إضافة ساعات اختيارية',
      description: `أضف مساقاً اختيارياً بمقدار ${diff} س.م لاستيفاء متطلب التخصص الاختياري كاملاً.`,
    });
  } else {
    const excess = majorElectiveHoursScheduled - majorElectiveHoursTarget;
    checks.push({
      id: 'elective_excess',
      title: `زيادة في الساعات الاختيارية (${excess} س.م)`,
      category: 'degree_completion',
      status: 'warning',
      message: `تمت جدولة ${majorElectiveHoursScheduled} س.م اختياري (الحد المطلوب 4 س.م فقط لاستكمال الـ 9 ساعات).`,
    });
    suggestions.push({
      id: 'sug_remove_excess_elective',
      type: 'excess_elective',
      severity: 'warning',
      title: 'تقليل الساعات الاختيارية الزائدة',
      description: `يمكنك حذف مساق اختياري زائد لتخفيف العبء الفصلي وعدم دراسة ساعات إضافية لا تحتاجها.`,
    });
  }

  // 6. حوض المقررات الاختيارية المتاحة للاختيار (Available Electives Pool)
  const availableElectivePool: PlannedCourseItem[] = [];
  const allElectiveCourses = allCourses.filter((c) => {
    const cat = c.category || '';
    return (
      (cat.includes('اختياري') || cat.includes('إختياري')) &&
      !cat.includes('جامع') &&
      c.status === 'متبقية'
    );
  });

  allElectiveCourses.forEach((c) => {
    const code = normalizeCode(c.courseNumber);
    if (!allScheduledCourseCodes.has(code)) {
      availableElectivePool.push({
        ...c,
        creditHours: getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours),
        prerequisite: getOfficialPrerequisite(c.courseNumber, c.prerequisite),
        level: getCourseLevel(c.courseNumber, c.courseName),
        difficulty: getCourseDifficulty(
          getCourseLevel(c.courseNumber, c.courseName),
          c.category,
          c.courseName
        ),
        reason: 'خيار اختياري متاح في حوض مواد التخصص',
        isElectiveChoice: true,
      });
    }
  });

  // 7. حساب المجموع الكلي ومؤشر الدقة الأكاديمية (Academic Soundness Score)
  const totalScheduledRemainingHours = actualFutureSemesters.reduce((sum, s) => sum + s.totalHours, 0);
  const completedHours = planData.completedHours || 86;
  const currentEnrolledHours = allCourses
    .filter((c) => c.status === 'مسجلة')
    .reduce((sum, c) => sum + getOfficialCreditHours(c.courseNumber, c.courseName, c.creditHours), 0);

  const totalDegreeScheduledHours = completedHours + currentEnrolledHours + totalScheduledRemainingHours;

  let score = 100;
  score -= prereqErrorsCount * 25;
  score -= workloadErrorsCount * 20;
  score -= unassignedCompulsory.length * 15;
  score -= workloadWarningsCount * 5;
  if (majorElectiveHoursScheduled !== majorElectiveHoursTarget) {
    score -= Math.abs(majorElectiveHoursScheduled - majorElectiveHoursTarget) * 4;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: CustomPlanValidationResult['rating'] = 'ممتاز ومثالي 🌟';
  let color: CustomPlanValidationResult['color'] = 'emerald';

  if (score >= 90) {
    rating = 'ممتاز ومثالي 🌟';
    color = 'emerald';
  } else if (score >= 75) {
    rating = 'سليم أكاديمياً ✓';
    color = 'blue';
  } else if (score >= 50) {
    rating = 'تنبيهات عبء أو توازن ⚠️';
    color = 'amber';
  } else {
    rating = 'تعارضات أكاديمية حرجة ❌';
    color = 'rose';
  }

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const errorCount = checks.filter((c) => c.status === 'error').length;

  return {
    score,
    rating,
    color,
    isValid: errorCount === 0,
    checks,
    suggestions,
    coursePrereqMap,
    semesterWorkloadMap,
    unassignedCompulsoryCourses: unassignedCompulsory,
    availableElectivePool,
    totalScheduledRemainingHours,
    totalDegreeScheduledHours,
    majorElectiveHoursScheduled,
    majorElectiveHoursTarget,
    missingCompulsoryHours,
    passCount,
    warningCount,
    errorCount,
  };
}
