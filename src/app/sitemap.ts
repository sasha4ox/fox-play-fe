import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://foxyplay.app';

const LOCALES = ['en', 'ua', 'ru', 'es'] as const;
/** BCP 47 for hreflang: Ukrainian is "uk", URL segment stays "ua" */
const HREFLANG_LOCALES = { en: 'en', ua: 'uk', ru: 'ru', es: 'es' } as const;

/** Static paths under [locale] to include in sitemap (no auth, dashboard, or API). */
const STATIC_PATHS = [
  '',
  'how-it-works',
  'how-safe-transfer-works',
  'terms',
  'privacy',
  'payment-model',
  'contact',
  'disclaimer',
  'cookie-policy',
  'aml-compliance',
  'crypto-risk',
  'operator-legal',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    const pathSegment = path ? `/${path}` : '';
    const languages: Record<string, string> = {};
    for (const locale of LOCALES) {
      languages[HREFLANG_LOCALES[locale]] = `${BASE_URL}/${locale}${pathSegment}`;
    }
    languages['x-default'] = `${BASE_URL}/en${pathSegment}`;

    entries.push({
      url: `${BASE_URL}/en${pathSegment}`,
      lastModified: now,
      changeFrequency: path === '' ? 'daily' : 'monthly',
      priority: path === '' ? 1 : 0.8,
      alternates: {
        languages,
      },
    });
  }

  return entries;
}
