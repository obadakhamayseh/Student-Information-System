import * as cheerio from 'cheerio';

// السماح بالاتصال بالسيرفر الجامعي حتى مع وجود شهادات داخلية
if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface SubpSectionInfo {
  college: string;
  courseNumber: string;
  courseName: string;
  section: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  availableSeats: number;
  isFull: boolean;
  days: string;
  timeFrom: string;
  timeTo: string;
  room: string;
  notes: string;
}

// كاش محلي للذاكرة قصير الأمد (دقيقتين) لتفادي تكرار الطلبات المتزامنة مع ضمان الحداثة الفورية للبيانات
const offeringCache = new Map<string, { data: SubpSectionInfo[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // دقيقتين فقط لضمان التحديث الحي

let cachedViewState: string | null = null;
let cachedEventValidation: string | null = null;
let cachedViewStateGen: string | null = null;
let cachedCookies: string | null = null;
let lastTokenTime = 0;
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 دقائق

export class SubpClient {
  private static BASE_URL = 'https://subp.mutah.edu.jo/';

  /**
   * مسح الكاش لإجبار الجلب المباشر
   */
  public static clearCache(): void {
    offeringCache.clear();
  }

  /**
   * جلب رموز ViewState والـ Cookies الأولية من جريدة المواد
   */
  private static async getTokens(): Promise<{ viewState: string; eventValidation: string; viewStateGen: string; cookies: string }> {
    const now = Date.now();
    if (cachedViewState && cachedEventValidation && now - lastTokenTime < TOKEN_TTL_MS) {
      return {
        viewState: cachedViewState,
        eventValidation: cachedEventValidation,
        viewStateGen: cachedViewStateGen || '',
        cookies: cachedCookies || '',
      };
    }

    const res = await fetch(this.BASE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });

    const html = await res.text();
    const cookies = res.headers.get('set-cookie') || '';

    const $ = cheerio.load(html);
    cachedViewState = String($('input[name="__VIEWSTATE"]').val() || '');
    cachedEventValidation = String($('input[name="__EVENTVALIDATION"]').val() || '');
    cachedViewStateGen = String($('input[name="__VIEWSTATEGENERATOR"]').val() || '');
    cachedCookies = cookies;
    lastTokenTime = now;

    return {
      viewState: cachedViewState || '',
      eventValidation: cachedEventValidation || '',
      viewStateGen: cachedViewStateGen || '',
      cookies: cachedCookies || '',
    };
  }

  /**
   * البحث عن مادة أو شعبة في جريدة المواد الرسمية (subp.mutah.edu.jo) مباشرة
   */
  public static async searchCourse(
    courseNumber: string,
    section?: string,
    forceRefresh = false
  ): Promise<SubpSectionInfo[]> {
    const cleanCode = (courseNumber || '').trim();
    const cleanSec = (section || '').trim();

    if (!cleanCode) return [];

    const cacheKey = `${cleanCode}_${cleanSec}`;
    const cached = offeringCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const tokens = await this.getTokens();

      const body = new URLSearchParams();
      body.append('__VIEWSTATE', tokens.viewState);
      body.append('__VIEWSTATEGENERATOR', tokens.viewStateGen);
      body.append('__EVENTVALIDATION', tokens.eventValidation);
      body.append('lstSearchCol', '0');
      body.append('txtSearchSubID', cleanCode);
      body.append('txtSearchSubName', '');
      body.append('txtSearchSection', cleanSec);
      body.append('txtSearchTeacher', '');
      body.append('ImageButton1.x', '10');
      body.append('ImageButton1.y', '10');

      const searchRes = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://subp.mutah.edu.jo',
          Referer: this.BASE_URL,
          Cookie: tokens.cookies,
        },
        body: body.toString(),
        cache: 'no-store',
      });

      const html = await searchRes.text();
      const $ = cheerio.load(html);

      // تحديث الرموز إذا تغيرت في الرد
      const newVs = $('input[name="__VIEWSTATE"]').val();
      const newEv = $('input[name="__EVENTVALIDATION"]').val();
      if (newVs && newEv) {
        cachedViewState = String(newVs);
        cachedEventValidation = String(newEv);
        lastTokenTime = Date.now();
      }

      const results: SubpSectionInfo[] = [];
      const table = $('table#GridView1');

      table.find('tr').slice(1).each((_, tr) => {
        const tds = $(tr)
          .find('td')
          .map((__, el) => $(el).text().trim())
          .get();

        if (tds.length >= 11) {
          const college = tds[0];
          const cCode = tds[1];
          const cName = tds[2];
          const sec = tds[3];
          const instructor = tds[4];
          const capacity = parseInt(tds[5], 10) || 0;
          const enrolled = parseInt(tds[6], 10) || 0;
          const days = tds[7];
          const timeFrom = tds[8];
          const timeTo = tds[9];
          const room = tds[10];
          const notes = tds[11] || '';

          const availableSeats = Math.max(0, capacity - enrolled);
          const isFull = availableSeats <= 0;

          results.push({
            college,
            courseNumber: cCode,
            courseName: cName,
            section: sec,
            instructor,
            capacity,
            enrolled,
            availableSeats,
            isFull,
            days,
            timeFrom,
            timeTo,
            room,
            notes,
          });
        }
      });

      offeringCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch (error) {
      console.warn(`[SubpClient] Failed to search for course ${cleanCode}:`, error);
      return [];
    }
  }

  /**
   * إثراء قائمة المواد بأسماء الدكاترة الحقيقية والقاعات الدقيقة من جريدة المواد
   */
  public static async enrichCourses<T extends { courseNumber: string; section?: string; room?: string; instructor?: string; capacity?: number; enrolled?: number }>(
    courses: T[],
    forceRefresh = false
  ): Promise<T[]> {
    if (!courses || courses.length === 0) return courses;

    const enriched = await Promise.all(
      courses.map(async (c) => {
        try {
          const sections = await this.searchCourse(c.courseNumber, c.section, forceRefresh);
          const match = sections.find((s) => !c.section || s.section === c.section) || sections[0];

          if (match) {
            return {
              ...c,
              instructor: match.instructor || c.instructor || 'هيئة تدريس',
              room: match.room && match.room !== '*** **' ? match.room : c.room || 'IT',
              capacity: match.capacity || (c as any).capacity,
              enrolled: match.enrolled || (c as any).enrolled,
            };
          }
        } catch {
          // في حال حدوث أي خطأ نحافظ على البيانات الحالية
        }
        return c;
      })
    );

    return enriched;
  }
}
