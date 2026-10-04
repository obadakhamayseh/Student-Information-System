import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseStudyPlanHtml } from './parsers/plan.parser';
import { generateGraduationRoadmap } from './roadmap-engine';

describe('Graduation Roadmap Engine', () => {
  const fixturesDir = path.join(process.cwd(), 'fixtures/raw_pages');

  it('should generate an intelligent multi-semester roadmap from study plan data', () => {
    const planHtml = fs.readFileSync(path.join(fixturesDir, 'treeplan.html'), 'utf8');
    const planData = parseStudyPlanHtml(planHtml);

    const roadmap = generateGraduationRoadmap(planData, {
      pace: 'balanced',
      includeSummer: true,
      maxRegularHours: 16,
      maxSummerHours: 9,
    });

    expect(roadmap.totalRemainingHours).toBe(28); // 28 ساعة متبقية للتسجيل (18 تخصص إجباري + 6 جامعة إجباري + 4 تخصص اختياري)
    expect(roadmap.grossRemainingHours).toBe(46); // 46 ساعة إجمالياً قبل احتساب الفصل الحالي كمنجز
    expect(roadmap.completedHours).toBe(86);
    expect(roadmap.currentRegisteredHours).toBe(18); // 16 إجباري + 2 اختياري (معالجة الصور الرقمية 2211362)
    expect(roadmap.totalDegreeHours).toBe(132);
    // التحقق الرياضي الحاسم: المنجز (86) + المسجل حالياً (18) + المتبقي للتسجيل (28) = مجموع الدرجة (132)
    expect(roadmap.completedHours + roadmap.currentRegisteredHours + roadmap.totalRemainingHours).toBe(roadmap.totalDegreeHours);

    // التحقق من حصص الفئات المتبقية للتسجيل بعد خصم الفصل الحالي
    expect(roadmap.stats.uniCompulsoryRemaining).toBe(6);
    expect(roadmap.stats.uniElectiveRemaining).toBe(0); // مكتملة 3/3 في الأقسام الثلاثة
    expect(roadmap.stats.majorCompulsoryRemaining).toBe(18); // 18 س.م فصول قادمة (بعد خصم 13 س.م قيد الدراسة حالياً)
    expect(roadmap.stats.majorElectiveRemaining).toBe(4); // 4 ساعات فقط متبقية للتسجيل (بعد إنجاز 3 س.م وتسجيل 2 س.م من أصل 9 س.م)
    expect(roadmap.stats.collegeCompulsoryRemaining).toBe(0); // مسجل بالفصل الحالي بـ 3 س.م (قيد الدراسة - بانتظار النتائج)
    expect(roadmap.stats.remedialRemaining).toBe(0); // مهارات حاسوب 99 معفى لاجتياز امتحان المستوى 2200096

    // متطلب 00 مكتمل
    const cat00 = roadmap.categoriesSummary.find((c) => c.categoryId === 'children_00' || c.name.includes('00'));
    expect(cat00?.status).toBe('مكتمل');
    expect(cat00?.remainingHours).toBe(0);

    // متطلب الاستدراكي مكتمل بالكامل
    const catRem = roadmap.categoriesSummary.find((c) => c.name.includes('استدراكي'));
    expect(catRem?.status).toBe('مكتمل');

    // لا توجد أي امتحانات مستوى أو مواد استدراكية معفاة في الفصول
    const scheduledExamsOrRemedials = roadmap.semesters.flatMap((s) => s.courses).filter((c) => c.courseNumber.includes('096') || c.courseNumber === '2200099' || c.category === '00');
    expect(scheduledExamsOrRemedials.length).toBe(0);

    expect(roadmap.semesters.length).toBeGreaterThan(0);
    expect(roadmap.estimatedGraduationSemester).toBeTruthy();

    // الفصل الأول يمثل الفصل الحالي قيد الدراسة بـ 18 ساعة معتمدة (16 إجباري + 2 اختياري كلية)
    expect(roadmap.semesters[0].isCurrentSemester).toBe(true);
    expect(roadmap.semesters[0].totalHours).toBe(18);

    // الساعات المعتمدة للمساقات المجدولة تطابق 46 ساعة بالضبط (16 بالفصل الحالي + 30 بالفصول القادمة)
    const totalScheduledHours = roadmap.semesters.reduce(
      (sum, s) => sum + s.courses.filter((c) => !c.isRemedial).reduce((cSum, c) => cSum + c.creditHours, 0),
      0
    );
    expect(totalScheduledHours).toBe(46);

    // الفصل الأخير يجب أن يكون موسوماً كفصل تخرج
    const lastSemester = roadmap.semesters[roadmap.semesters.length - 1];
    expect(lastSemester.isGraduationSemester).toBe(true);

    // التحقق من أن كل مادة تحتوي سبباً ومستوى
    roadmap.semesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        expect(c.reason).toBeTruthy();
        expect(c.difficulty).toBeTruthy();
      });
    });
  });

  it('should handle zero remaining courses gracefully when student has graduated', () => {
    const emptyPlan = {
      majorName: 'هندسة البرمجيات',
      planYear: '2024',
      totalHours: 132,
      completedHours: 132,
      remainingHours: 0,
      categories: [],
      courses: [
        {
          courseNumber: '0301101',
          courseName: 'تفاضل وتكامل 1',
          creditHours: 3,
          prerequisite: '—',
          status: 'منجزة' as const,
          category: 'متطلبات جامعة',
        },
      ],
    };

    const roadmap = generateGraduationRoadmap(emptyPlan);
    expect(roadmap.isCompleted).toBe(true);
    expect(roadmap.semesters.length).toBe(0);
    expect(roadmap.progressPercent).toBe(100);
  });

  it('should allow up to 21 credit hours in the graduation semester for a graduating student', () => {
    // خطة يتبقى فيها 20 ساعة معتمدة دون تعارض مشاريع تخرج (مشروع 1 منجز بالفعل)
    const graduatingPlan = {
      majorName: 'علم الحاسوب',
      planYear: '2024',
      totalHours: 132,
      completedHours: 112,
      remainingHours: 20,
      categories: [
        {
          categoryId: 'cat_comp',
          name: 'تخصص إجباري',
          requiredHours: 72,
          completedHours: 52,
          passedCoursesCount: 15,
          totalCoursesCount: 22,
          courses: [
            {
              courseNumber: '2201401',
              courseName: 'مقرر تخصص 1',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201402',
              courseName: 'مقرر تخصص 2',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201403',
              courseName: 'مقرر تخصص 3',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201404',
              courseName: 'مقرر تخصص 4',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201405',
              courseName: 'مقرر تخصص 5',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201406',
              courseName: 'مقرر تخصص 6',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201492',
              courseName: 'مشروع تخرج 2',
              creditHours: 2,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
          ],
        },
      ],
      courses: [],
    };

    const roadmap = generateGraduationRoadmap(graduatingPlan, {
      pace: 'fast',
      includeSummer: false,
      maxRegularHours: 18,
    });

    // بما أن الطالب خريج ومجموع الساعات 20 ساعة (<= 21 س.م)، تُجمع كلها في فصل تخرج واحد
    expect(roadmap.semesters.length).toBe(1);
    expect(roadmap.semesters[0].totalHours).toBe(20);
    expect(roadmap.semesters[0].isGraduationSemester).toBe(true);
    expect(roadmap.semesters[0].workloadStatus).toBe('عبء تخرج استثنائي (21 س.م)');
  });

  it('should allow up to 12 credit hours in the summer graduation semester when graduating in summer', () => {
    // خطة يتبقى فيها 11 ساعة معتمدة في الصيفي للتخرج
    const summerGradPlan = {
      majorName: 'علم الحاسوب',
      planYear: '2024',
      totalHours: 132,
      completedHours: 121,
      remainingHours: 11,
      currentSemester: 'الفصل الثاني 2025/2026', // الفصل القادم هو الصيفي
      categories: [
        {
          categoryId: 'cat_comp',
          name: 'تخصص إجباري',
          requiredHours: 72,
          completedHours: 61,
          passedCoursesCount: 18,
          totalCoursesCount: 22,
          courses: [
            {
              courseNumber: '2201411',
              courseName: 'مادة تخصص أ',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201412',
              courseName: 'مادة تخصص ب',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201413',
              courseName: 'مادة تخصص ج',
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
            {
              courseNumber: '2201492',
              courseName: 'مشروع تخرج 2',
              creditHours: 2,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
          ],
        },
      ],
      courses: [],
    };

    const roadmap = generateGraduationRoadmap(summerGradPlan, {
      pace: 'fast',
      includeSummer: true,
      maxSummerHours: 9,
    });

    expect(roadmap.semesters.length).toBe(1);
    expect(roadmap.semesters[0].isSummer).toBe(true);
    expect(roadmap.semesters[0].isGraduationSemester).toBe(true);
    expect(roadmap.semesters[0].totalHours).toBe(11);
    expect(roadmap.semesters[0].workloadStatus).toBe('عبء تخرج صيفي استثنائي (12 س.م)');
  });

  it('should strictly cap non-graduation regular semesters at 18 hours and never assign 21h badge to non-graduating terms', () => {
    // خطة يتبقى فيها 38 ساعة (18 ساعة بالفصل الأول، و 20 ساعة بفصل التخرج)
    const twoSemesterPlan = {
      majorName: 'هندسة البرمجيات',
      planYear: '2024',
      totalHours: 132,
      completedHours: 94,
      remainingHours: 38,
      categories: [
        {
          categoryId: 'cat_comp',
          name: 'تخصص إجباري',
          requiredHours: 72,
          completedHours: 34,
          passedCoursesCount: 10,
          totalCoursesCount: 22,
          courses: [
            // 6 مواد = 18 ساعة للفصل الأول
            ...[1, 2, 3, 4, 5, 6].map((i) => ({
              courseNumber: `220130${i}`,
              courseName: `مقرر تخصص مستوى ثلاثة ${i}`,
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            })),
            // 6 مواد (18 ساعة) + مشروع تخرج 2 (2 ساعة) = 20 ساعة لفصل التخرج
            ...[1, 2, 3, 4, 5, 6].map((i) => ({
              courseNumber: `220140${i}`,
              courseName: `مقرر تخصص مستوى أربعة ${i}`,
              creditHours: 3,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            })),
            {
              courseNumber: '2201492',
              courseName: 'مشروع تخرج 2',
              creditHours: 2,
              prerequisite: '—',
              status: 'متبقية' as const,
              category: 'تخصص إجباري',
            },
          ],
        },
      ],
      courses: [],
    };

    const roadmap = generateGraduationRoadmap(twoSemesterPlan, {
      pace: 'fast',
      includeSummer: false,
      maxRegularHours: 18,
    });

    expect(roadmap.semesters.length).toBe(2);

    // الفصل الأول: عادي وغير خريج -> الحد الأقصى الصارم 18 س.م
    const sem1 = roadmap.semesters[0];
    expect(sem1.isGraduationSemester).toBe(false);
    expect(sem1.totalHours).toBe(18);
    expect(sem1.workloadStatus).toBe('مكثف (الحد الأقصى 18 س.م)');

    // الفصل الثاني: خريج -> مسموح حتى 21 س.م، أخذ 20 ساعة
    const sem2 = roadmap.semesters[1];
    expect(sem2.isGraduationSemester).toBe(true);
    expect(sem2.totalHours).toBe(20);
    expect(sem2.workloadStatus).toBe('عبء تخرج استثنائي (21 س.م)');
  });

  it('should enforce semester limits across all pace options for treeplan fixture', () => {
    const planHtml = fs.readFileSync(path.join(fixturesDir, 'treeplan.html'), 'utf8');
    const planData = parseStudyPlanHtml(planHtml);

    ['fast', 'balanced', 'light'].forEach((p) => {
      [true, false].forEach((includeSummer) => {
        const roadmap = generateGraduationRoadmap(planData, {
          pace: p as any,
          includeSummer,
          maxRegularHours: p === 'fast' ? 18 : p === 'light' ? 14 : 16,
          maxSummerHours: 9,
        });

        roadmap.semesters.forEach((sem) => {
          if (sem.isCurrentSemester) return;

          if (sem.isGraduationSemester) {
            if (sem.isSummer) {
              expect(sem.totalHours).toBeLessThanOrEqual(12);
            } else {
              expect(sem.totalHours).toBeLessThanOrEqual(21);
            }
          } else {
            // أي فصل ليس فصل تخرج
            if (sem.isSummer) {
              expect(sem.totalHours).toBeLessThanOrEqual(10);
              expect(sem.workloadStatus).not.toBe('عبء تخرج صيفي استثنائي (12 س.م)');
            } else {
              expect(sem.totalHours).toBeLessThanOrEqual(18);
              expect(sem.workloadStatus).not.toBe('عبء تخرج استثنائي (21 س.م)');
            }
          }
        });
      });
    });
  });
});

