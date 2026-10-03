'use client';

import React from 'react';

interface PrintHeaderProps {
  documentTitle: string;
  studentName?: string;
  studentId?: string;
  major?: string;
  academicYear?: string;
  extraStats?: { label: string; value: string | number }[];
}

export function PrintHeader({
  documentTitle,
  studentName,
  studentId,
  major,
  academicYear,
  extraStats = [],
}: PrintHeaderProps) {
  const currentDate = new Date().toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('ar-JO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="hidden print:block mb-6 pb-4 border-b-2 border-primary text-black">
      {/* رأس الوثيقة الرسمي للجامعة */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-300">
        <div className="text-right">
          <h2 className="text-base font-bold text-black">المملكة الأردنية الهاشمية</h2>
          <h1 className="text-lg font-extrabold text-primary">جامعة مؤتة</h1>
          <h3 className="text-xs font-semibold text-gray-700">عمادة القبول والتسجيل</h3>
        </div>

        <div className="text-center px-4 py-2 border-2 border-primary/40 rounded-lg bg-gray-50">
          <span className="text-sm font-black text-primary tracking-wide block">
            {documentTitle}
          </span>
          <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
            وثيقة إلكترونية رسمية استرشادية
          </span>
        </div>

        <div className="text-left text-xs text-gray-600 font-mono">
          <div>تاريخ الإصدار: {currentDate}</div>
          <div>الوقت: {currentTime}</div>
          <div className="text-[10px] text-gray-500">نظام معلومات الطلبة</div>
        </div>
      </div>

      {/* بطاقة معلومات الطالب في الوثيقة المطبوعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs bg-gray-50/70 p-2.5 rounded-md border border-gray-200 mt-2">
        <div>
          <span className="text-gray-500 block text-[10px]">اسم الطالب:</span>
          <span className="font-bold text-gray-900">{studentName || '—'}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">الرقم الجامعي:</span>
          <span className="font-bold font-mono text-gray-900">{studentId || '—'}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">التخصص الأكاديمي:</span>
          <span className="font-bold text-gray-900">{major || '—'}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">الفصل الدراسي:</span>
          <span className="font-bold text-gray-900">{academicYear || 'الفصل الحالي'}</span>
        </div>

        {extraStats.map((stat, i) => (
          <div key={i} className="pt-1 border-t border-gray-200/60">
            <span className="text-gray-500 block text-[10px]">{stat.label}:</span>
            <span className="font-bold text-primary font-mono">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrintFooter() {
  const currentDate = new Date().toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div className="hidden print:flex items-center justify-between text-[9px] text-gray-500 border-t border-gray-300 pt-2 mt-8">
      <span>
        هذه الوثيقة صادرة إلكترونياً عن بوابة الطالب الأكاديمية - جامعة مؤتة ▪ التاريخ: {currentDate}
      </span>
      <span>صالحة للاستخدام الداخلي ومراجعة المرشد الأكاديمي</span>
    </div>
  );
}
