'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { componentClass } from '@/lib/componentPath';
import { useAuthStore } from '@/store/authStore';
import { updateProfile } from '@/lib/api';

const LOCALES = ['en', 'ua', 'ru', 'es'];

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);

  const redirectedPathname = (targetLocale) => {
    // Remove current locale from pathname
    const segments = pathname.split('/');
    segments[1] = targetLocale;

    const newPath = segments.join('/');

    const query = searchParams.toString();
    return query ? `${newPath}?${query}` : newPath;
  };

  const handleLocaleClick = (targetLocale) => {
    if (token) {
      updateProfile({ preferredLocale: targetLocale }, token).catch(() => {});
    }
  };

  return (
    <nav className={componentClass('LocaleSwitcher')}>
      {LOCALES.map((lng) => (
        <Link
          key={lng}
          href={redirectedPathname(lng)}
          onClick={() => handleLocaleClick(lng)}
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
