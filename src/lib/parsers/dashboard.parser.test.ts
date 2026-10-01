import { describe, it, expect } from 'vitest';
import { parseDashboardHtml } from './dashboard.parser';

describe('Dashboard Parser', () => {
  it('should parse student information correctly from HTML table', () => {
    const sampleHtml = `
      <html>
        <body>
          <table>
            <tr>
              <td>الرقم الجامعي:</td><td>120242222083</td>
              <td>اسم الطالب:</td><td>أحمد محمد</td>
            </tr>
            <tr>
              <td>الكلية:</td><td>كلية تكنولوجيا المعلومات</td>
              <td>التخصص:</td><td>علم الحاسوب</td>
            </tr>
            <tr>
              <td>المعدل التراكمي:</td><td>84.50</td>
              <td>المعدل الفصلي:</td><td>86.20</td>
            </tr>
            <tr>
              <td>الساعات المقطوعة:</td><td>65</td>
              <td>الساعات المسجلة:</td><td>15</td>
            </tr>
            <tr>
              <td>المرشد الأكاديمي:</td><td>د. معتز المبيضين</td>
              <td>الحالة الأكاديمية:</td><td>منتظم</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const result = parseDashboardHtml(sampleHtml);

    expect(result.studentId).toBe('120242222083');
    expect(result.studentName).toBe('أحمد محمد');
    expect(result.college).toBe('كلية تكنولوجيا المعلومات');
    expect(result.major).toBe('علم الحاسوب');
    expect(result.cumulativeGpa).toBe('84.50');
    expect(result.semesterGpa).toBe('86.20');
    expect(result.passedHours).toBe(65);
    expect(result.registeredHours).toBe(15);
    expect(result.advisor).toBe('د. معتز المبيضين');
    expect(result.academicStatus).toBe('منتظم');
  });

  it('should handle edge cases with empty or minimal HTML gracefully', () => {
    const minimalHtml = '<html><body><div>لا توجد بيانات</div></body></html>';
    const result = parseDashboardHtml(minimalHtml);

    expect(result.studentId).toBe('');
    expect(result.cumulativeGpa).toBe('0.00');
    expect(result.passedHours).toBe(0);
    expect(result.courses).toEqual([]);
  });
});
