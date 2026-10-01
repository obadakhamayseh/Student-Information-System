import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseRegMenuHtml, parseRegistPlanHtml } from './registration.parser';

describe('Registration Parsers', () => {
  const fixturesDir = path.join(process.cwd(), 'fixtures/raw_pages');

  it('should parse regmenu.html with registered courses and services', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'regmenu.html'), 'utf8');
    const result = parseRegMenuHtml(html);

    expect(result.studentId).toBe('120242222083');
    expect(result.studentName).toBe('عباده سالم موسى الخمايسه');
    expect(result.registeredCourses.length).toBe(6);
    expect(result.registeredCourses[0].courseNumber).toBe('2212351');
    expect(result.registeredCourses[0].courseName).toBe('أمن الحاسبات والشبكات');
    expect(result.registeredCourses[0].section).toBe('2');
    expect(result.csrfToken).toBeTruthy();
    expect(result.services.length).toBeGreaterThan(5);
    expect(result.services[0].href).toBe('/registration/plan');
  });

  it('should parse registplan.html with available sections and study tree', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'registplan.html'), 'utf8');
    const result = parseRegistPlanHtml(html);

    expect(result.csrfToken).toBeTruthy();
    expect(result.summary.completedCourses).toBe('35/86');
    expect(result.summary.hoursStats).toBe('92/132');
    expect(result.summary.progressPercent).toBe('69%');
    expect(result.summary.registeredCoursesCount).toBe(6);

    expect(result.categories.length).toBeGreaterThan(5);
    expect(result.courses.length).toBeGreaterThan(50);

    const availableCourses = result.courses.filter(c => c.status === 'متاحة');
    expect(availableCourses.length).toBeGreaterThan(0);
    expect(availableCourses[0].availableSections.length).toBeGreaterThan(0);

    const registeredCourses = result.courses.filter(c => c.status === 'مسجلة');
    expect(registeredCourses.length).toBe(6);
  });
});
