import { describe, it, expect } from 'vitest';
import { parseTranscriptHtml } from './grades.parser';

describe('Transcript Parser', () => {
  it('should parse semester grades correctly', () => {
    const html = `
      <html>
        <body>
          <table>
            <caption>الفصل الأول 2024/2025</caption>
            <tr>
              <th>رقم المادة</th>
              <th>اسم المادة</th>
              <th>الساعات</th>
              <th>العلامة</th>
              <th>النقاط</th>
              <th>الحالة</th>
            </tr>
            <tr>
              <td>0301101</td>
              <td>تراكيب البيانات</td>
              <td>3</td>
              <td>88</td>
              <td>A-</td>
              <td>ناجح</td>
            </tr>
            <tr>
              <td>0301102</td>
              <td>قواعد البيانات</td>
              <td>3</td>
              <td>92</td>
              <td>A</td>
              <td>ناجح</td>
            </tr>
            <tr>
              <td colspan="6">المعدل الفصلي: 90.00 | المعدل التراكمي: 87.50</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const result = parseTranscriptHtml(html);
    expect(result.semesters.length).toBeGreaterThan(0);
    const sem = result.semesters[0];
    expect(sem.courses.length).toBe(2);
    expect(sem.courses[0].courseName).toBe('تراكيب البيانات');
    expect(sem.courses[0].grade).toBe('88');
    expect(sem.semesterGpa).toBe('90.00');
    expect(sem.cumulativeGpa).toBe('87.50');
  });
});
