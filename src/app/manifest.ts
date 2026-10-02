import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'بوابة الطالب الذكية - جامعة مؤتة',
    short_name: 'بوابة مؤتة',
    description: 'النظام الذكي لمعلومات الطلبة، العلامات، الجداول الدراسية، الخطة الأكاديمية والتسجيل - جامعة مؤتة',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#001833',
    theme_color: '#00274d',
    lang: 'ar',
    dir: 'rtl',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
