import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseExpandSectionHtml } from './expansion.parser';

describe('Expansion Parser', () => {
  const fixturesDir = path.join(process.cwd(), 'fixtures/raw_pages');

  it('should parse expandsection.html with student info and expansion requests', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'expandsection.html'), 'utf8');
    const result = parseExpandSectionHtml(html);

    expect(result.studentId).toBe('120242222083');
    expect(result.studentName).toBe('عباده سالم موسى الخمايسه');
    expect(result.college).toBe('كلية تكنولوجيا المعلومات');
    expect(result.csrfToken).toBeTruthy();
    expect(result.requests.length).toBe(1);
    expect(result.requests[0].courseNumber).toBe('2211362');
    expect(result.requests[0].courseName).toBe('معالجة الصور الرقميه');
    expect(result.requests[0].section).toBe('2');
    expect(result.requests[0].status).toBe('قيد الانتظار');
    expect(result.requests[0].canCancel).toBe(true);
  });
});
