import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseDashboardHtml } from './dashboard.parser';
import { parseTranscriptHtml } from './grades.parser';
import { parseExamScheduleHtml } from './schedule.parser';
import { parseStudyPlanHtml } from './plan.parser';

describe('Live Fixtures Parity Tests', () => {
  const fixturesDir = path.join(process.cwd(), 'fixtures/raw_pages');

  it('should parse real dashboard.html fixture with 100% accuracy', () => {
    const dashHtml = fs.readFileSync(path.join(fixturesDir, 'dashboard.html'), 'utf8');
    const marksHtml = fs.readFileSync(path.join(fixturesDir, 'studmarks.html'), 'utf8');
    const result = parseDashboardHtml(dashHtml, marksHtml);

    expect(result.studentId).toBe('120242222083');
    expect(result.studentName).toBe('عباده سالم موسى الخمايسه');
    expect(result.college).toBe('كلية تكنولوجيا المعلومات');
    expect(result.major).toBe('علم البيانات والذكاء الاصطناعي');
    expect(result.registeredHours).toBe(16);
    expect(result.passedHours).toBe(86);
    expect(result.cumulativeGpa).toBe('80.73');
    expect(result.semesterGpa).toBe('72.70');
    expect(result.lastSemesterName).toBe('الفصل الصيفي 2025/2026');
    expect(result.courses.length).toBe(6);
    expect(result.courses[0].courseNumber).toBe('2212351');
    expect(result.courses[0].courseName).toBe('أمن الحاسبات والشبكات');
    expect(result.courses[0].section).toBe('2');
    expect(result.courses[0].room).toBe('IT Smart20');
    expect(result.courses[0].time).toBe('10-11.3');
    expect(result.courses[0].days).toBe('ن،ر');
  });

  it('should parse real studmarks.html fixture with 100% accuracy', () => {
    const marksHtml = fs.readFileSync(path.join(fixturesDir, 'studmarks.html'), 'utf8');
    const result = parseTranscriptHtml(marksHtml);

    expect(result.studentId).toBe('120242222083');
    expect(result.studentName).toBe('عباده سالم موسى الخمايسه');
    expect(result.cumulativeGpa).toBe('80.73');
    expect(result.semesters.length).toBe(7);

    // التحقق من الفصل الأول
    const sem1 = result.semesters[0];
    expect(sem1.semesterGpa).toBe('84.80');
    expect(sem1.cumulativeGpa).toBe('84.80');
    expect(sem1.courses.length).toBe(10);
    expect(sem1.courses[0].courseNumber).toBe('0101173');
    expect(sem1.courses[0].courseName).toBe('العلوم العسكرية');
    expect(sem1.courses[0].grade).toBe('83.00');

    // التحقق من آخر فصل
    const lastSem = result.semesters[result.semesters.length - 1];
    expect(lastSem.semesterGpa).toBe('72.70');
    expect(lastSem.cumulativeGpa).toBe('80.73');
    expect(lastSem.courses.length).toBe(4);
    expect(lastSem.courses[0].courseNumber).toBe('0301101');
    expect(lastSem.courses[0].courseName).toBe('تفاضـــل وتكامـــل 1');
  });

  it('should parse real examschedule.html fixture with 100% accuracy', () => {
    const examHtml = fs.readFileSync(path.join(fixturesDir, 'examschedule.html'), 'utf8');
    const result = parseExamScheduleHtml(examHtml);

    expect(result.exams.length).toBe(3);
    expect(result.exams[0].courseNumber).toBe('2211351');
    expect(result.exams[0].courseName).toBe('شبكات الحاسوب');
    expect(result.exams[0].section).toBe('3');
    expect(result.exams[0].examDate).toBe('2026/08/29');
    expect(result.exams[0].examDay).toBe('السبت');
    expect(result.exams[0].examTime).toBe('10:30-8:30');
    expect(result.exams[0].room).toBe('محوسب - مختبرات الطب');

    expect(result.exams[2].courseNumber).toBe('0301101');
    expect(result.exams[2].courseName).toBe('تفاضـــل وتكامـــل 1');
    expect(result.exams[2].room).toBe('مدرج(4)مجمع قديم 1');
  });

  it('should parse real treeplan.html fixture with 100% accuracy', () => {
    const planHtml = fs.readFileSync(path.join(fixturesDir, 'treeplan.html'), 'utf8');
    const result = parseStudyPlanHtml(planHtml);

    expect(result.courses.length).toBe(86);
    expect(result.completedHours).toBe(86);
    expect(result.totalHours).toBe(132);
    expect(result.remainingHours).toBe(46);

    const completed = result.courses.filter(c => c.status === 'منجزة');
    expect(completed.length).toBeGreaterThan(25);

    const registered = result.courses.filter(c => c.status === 'مسجلة');
    expect(registered.length).toBe(6);
    const registeredHours = registered.reduce((sum, c) => sum + c.creditHours, 0);
    expect(registeredHours).toBe(16);

    // التحقق من تصنيفات الخطة ومتطلباتها الحقيقية من البوابة
    expect(result.categories.length).toBe(9);
    const uniComp = result.categories.find(c => c.name === 'جامعه إجباري');
    expect(uniComp?.completedHours).toBe(12);
    expect(uniComp?.requiredHours).toBe(18);
    expect(uniComp?.passedCoursesCount).toBe(4);
    expect(uniComp?.totalCoursesCount).toBe(6);

    const colComp = result.categories.find(c => c.name === 'كليه اجباري');
    expect(colComp?.completedHours).toBe(21);
    expect(colComp?.requiredHours).toBe(24);
    expect(colComp?.passedCoursesCount).toBe(7);
    expect(colComp?.totalCoursesCount).toBe(8);

    const deptComp = result.categories.find(c => c.name.includes('إجباري') && c.name.includes('تخص'));
    expect(deptComp?.completedHours).toBe(41);
    expect(deptComp?.requiredHours).toBe(72);
    expect(deptComp?.passedCoursesCount).toBe(17);
    expect(deptComp?.totalCoursesCount).toBe(30);
  });
});
