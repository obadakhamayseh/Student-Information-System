import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseStudyPlanHtml } from './parsers/plan.parser';
import { generateGraduationRoadmap } from './roadmap-engine';
import { validateCustomPlan } from './roadmap-validator';

describe('Academic Plan Customizer & AI Advisor Engine', () => {
  const fixturesDir = path.join(process.cwd(), 'fixtures/raw_pages');
  const planHtml = fs.readFileSync(path.join(fixturesDir, 'treeplan.html'), 'utf8');
  const planData = parseStudyPlanHtml(planHtml);

  it('should give 100% score and perfect rating for the default recommended roadmap', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const result = validateCustomPlan(planData, roadmap.semesters);

    expect(result.score).toBe(100);
    expect(result.isValid).toBe(true);
    expect(result.rating).toContain('ممتاز ومثالي');
    expect(result.errorCount).toBe(0);
    expect(result.majorElectiveHoursScheduled).toBe(4);
    expect(result.unassignedCompulsoryCourses.length).toBe(0);
    expect(result.totalScheduledRemainingHours).toBe(28);
  });

  it('should detect prerequisite violations when a course is placed ahead of its prerequisite', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);

    // ننقل مساق معالجة اللغات الطبيعية 2222243 (متطلبه برمجة علوم البيانات 2222241 وهو منجز)
    // أو ننقل مساق الشبكات العصبونية 2222451 (متطلبه التعلم الآلي 2222364) إلى فصل لا تنطبق فيه المتطلبات
    // مثلاً، نجعل مساق مشروع التخرج 2 في الفصل الأول ومشاريع التخرج 1 غير مكتملة
    const customSemesters = JSON.parse(JSON.stringify(futureSemesters));
    
    // وضع مساق تخصص متقدم (الشبكات العصبونية 2222451) بدون متطلب سابق
    // أو نقل مشروع التخرج 2 في الفصل الأول قبل إنهاء مشروع 1
    customSemesters[0].courses.push({
      courseNumber: '2211362', // متطلبها نظم التشغيل
      courseName: 'معالجة الصور الرقمية',
      creditHours: 2,
      category: 'متطلبات التخصص الاختيارية',
    });

    const result = validateCustomPlan(planData, customSemesters);
    expect(result).toBeDefined();
  });

  it('should detect credit hour overload when a regular semester exceeds 18 credit hours', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);
    const customSemesters = JSON.parse(JSON.stringify(futureSemesters));

    // إضافة مساقات حتى يتجاوز الفصل الأول 18 س.م
    customSemesters[0].courses.push({
      courseNumber: '0301323',
      courseName: 'تحليل عددي (1)',
      creditHours: 3,
      category: 'متطلبات التخصص الاختيارية',
      level: 3,
      difficulty: 'متوسط',
      reason: 'تجربة فحص السقف',
    });
    customSemesters[0].totalHours += 3; // يصبح 19 س.م

    const result = validateCustomPlan(planData, customSemesters);
    expect(result.isValid).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.checks.some((c) => c.category === 'workload' && c.status === 'error')).toBe(true);
    expect(result.suggestions.some((s) => s.type === 'overload')).toBe(true);
  });

  it('should detect unassigned compulsory courses when a compulsory course is removed', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);
    const customSemesters = JSON.parse(JSON.stringify(futureSemesters));

    // إزالة مساق إجباري (مثل 0301131 الإحصاء والاحتمالات)
    customSemesters[0].courses = customSemesters[0].courses.filter((c: any) => c.courseNumber !== '0301131');
    customSemesters[0].totalHours -= 3;

    const result = validateCustomPlan(planData, customSemesters);
    expect(result.unassignedCompulsoryCourses.some((c) => c.courseNumber === '0301131')).toBe(true);
    expect(result.suggestions.some((s) => s.type === 'missing_compulsory')).toBe(true);
  });

  it('should detect excess elective hours when more than 4 hours of major electives are scheduled', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);
    const customSemesters = JSON.parse(JSON.stringify(futureSemesters));

    // إضافة مساق اختياري إضافي بـ 3 ساعات
    customSemesters[1].courses.push({
      courseNumber: '2221264',
      courseName: 'ذكاء الأعمال',
      creditHours: 3,
      category: 'متطلبات التخصص الاختيارية',
      isElectiveChoice: true,
    });
    customSemesters[1].totalHours += 3;

    const result = validateCustomPlan(planData, customSemesters);
    expect(result.majorElectiveHoursScheduled).toBe(7); // 4 + 3 = 7
    expect(result.suggestions.some((s) => s.type === 'excess_elective')).toBe(true);
  });

  it('should provide coursePrereqMap and semesterWorkloadMap for fine-grained UI cards', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const result = validateCustomPlan(planData, roadmap.semesters);

    expect(result.coursePrereqMap).toBeDefined();
    expect(result.semesterWorkloadMap).toBeDefined();

    // Verify workload map has entries for future semesters
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);
    futureSemesters.forEach((sem) => {
      const semW = result.semesterWorkloadMap[sem.id];
      expect(semW).toBeDefined();
      expect(semW.totalHours).toBe(sem.totalHours);
      expect(semW.isOverloaded).toBe(false);
    });

    // Verify course prereq status
    futureSemesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        const pStatus = result.coursePrereqMap[`${c.courseNumber}_${sem.id}`];
        expect(pStatus).toBeDefined();
        expect(pStatus.isMet).toBe(true);
      });
    });
  });

  it('should accurately distinguish officially passed courses from enrolled courses pending final grades', () => {
    const roadmap = generateGraduationRoadmap(planData);
    const result = validateCustomPlan(planData, roadmap.semesters);

    // Verify official audit rule check exists
    expect(result.checks.some((c) => c.id === 'prereq_official_audit_rule')).toBe(true);

    // Neural Networks (2222451) depends on Machine Learning (2222364) which is currently enrolled (مسجلة)
    const futureSemesters = roadmap.semesters.filter((s) => !s.isCurrentSemester);
    const sem1 = futureSemesters[0];
    const sem2 = futureSemesters[1];

    // Find course 2222451 in scheduled semesters
    const nnCourse = sem1.courses.find((c) => c.courseNumber === '2222451') ||
      sem2.courses.find((c) => c.courseNumber === '2222451');

    if (nnCourse) {
      const targetSem = sem1.courses.some((c) => c.courseNumber === '2222451') ? sem1 : sem2;
      const status = result.coursePrereqMap[`${nnCourse.courseNumber}_${targetSem.id}`];
      expect(status).toBeDefined();
      expect(status.hasPrereq).toBe(true);
      expect(status.isCurrentlyEnrolled).toBe(true);
      expect(status.statusType).toBe('enrolled_pending_grade');
      expect(status.statusBadgeText).toContain('قيد الدراسة');
    }

    const completedCourse = planData.courses.find((c) => c.status === 'منجزة');
    expect(completedCourse).toBeDefined();
    expect(completedCourse?.status).toBe('منجزة');
  });
});
