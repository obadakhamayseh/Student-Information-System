import { NextResponse } from 'next/server';
import { SubpClient } from '@/lib/upstream/subp.client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId') || searchParams.get('code') || '';
  const section = searchParams.get('section') || '';
  const force = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

  if (!courseId) {
    return NextResponse.json({ error: 'INVALID_QUERY', message: 'يرجى تزويد رقم المادة' }, { status: 400 });
  }

  try {
    const results = await SubpClient.searchCourse(courseId, section, force);
    return NextResponse.json({
      success: true,
      courseId,
      totalSections: results.length,
      sections: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SEARCH_FAILED', message: error.message || 'فشل البحث في جريدة المواد' },
      { status: 500 }
    );
  }
}
