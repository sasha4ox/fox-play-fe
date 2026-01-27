'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

const LOCALES = ['en', 'ua'];

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const redirectedPathname = (targetLocale) => {
    // Remove current locale from pathname
    const segments = pathname.split('/');
    segments[1] = targetLocale;

    const newPath = segments.join('/');

    const query = searchParams.toString();
    return query ? `${newPath}?${query}` : newPath;
  };

  return (
    <nav>
      {LOCALES.map((lng) => (
        <Link
          key={lng}
          href={redirectedPathname(lng)}
          style={{
            marginRight: 8,
            fontWeight: locale === lng ? 'bold' : 'normal'
          }}
        >
          {lng.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}