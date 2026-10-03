/**
 * أداة تصدير البيانات إلى ملفات Excel / CSV متوافقة 100% مع اللغة العربية
 * تستخدم UTF-8 BOM (\uFEFF) لضمان فتح الملفات في Microsoft Excel بدون أي تشويه في الحروف العربية
 */

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void {
  if (typeof window === 'undefined') return;

  const sanitizeCell = (cell: string | number | undefined | null): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell).trim();
    // إذا كانت الخلية تحتوي على فواصل أو علامات تنصيص أو سطور جديدة، يتم تغليفها بعلامات تنصيص مزدوجة
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // إضافة \uFEFF في البداية (UTF-8 Byte Order Mark) ليقرأ Excel الحروف العربية بشكل سليم تلقائياً
  const csvContent =
    '\uFEFF' +
    [
      headers.map(sanitizeCell).join(','),
      ...rows.map((row) => row.map(sanitizeCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * وظيفة استدعاء الطباعة أو الحفظ كـ PDF الرسمي بنقاء وجودة عالية
 */
export function triggerPrint(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
