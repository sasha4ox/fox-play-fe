import { Suspense } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import LoginModal from '@/components/LoginModal/LoginModal';
import CookieConsent from '@/components/CookieConsent/CookieConsent';
import ConditionalAnalytics from '@/components/ConditionalAnalytics/ConditionalAnalytics';
import ScrollToTop from '@/components/ScrollToTop/ScrollToTop';
import Providers from '@/components/Providers/Providers';
import GoogleAuthReturnHandler from '@/components/GoogleAuthReturnHandler';
import SyncPreferredLocale from '@/components/SyncPreferredLocale/SyncPreferredLocale';
import CompleteProfileGate from '@/components/CompleteProfileGate/CompleteProfileGate';
import RecentServersBar from '@/components/RecentServersBar/RecentServersBar';
import GlobalErrorHandler from '@/components/GlobalErrorHandler/GlobalErrorHandler';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://foxyplay.app';

/** Build hreflang alternates. Use BCP 47 "uk" for Ukrainian (URL stays /ua/). Canonical is self-referencing per page. */
export async function generateMetadata({ params, request }) {
  const { locale } = await params;
  const pathname = request?.url ? new URL(request.url).pathname : '';
  const pathWithoutLocale = pathname ? pathname.replace(/^\/(en|ua|ru|es)/, '') || '/' : '/';
  const canonical = `${BASE_URL}/${locale}${pathWithoutLocale}`;
  return {
    title: 'FoxyPlay',
    description: 'FoxyPlay – marketplace for in-game items and services',
    icons: { icon: '/images/favicon.png', apple: '/images/favicon.png' },
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en${pathWithoutLocale}`,
        uk: `${BASE_URL}/ua${pathWithoutLocale}`,
        ru: `${BASE_URL}/ru${pathWithoutLocale}`,
        es: `${BASE_URL}/es${pathWithoutLocale}`,
        'x-default': `${BASE_URL}/en${pathWithoutLocale}`,
      },
    },
  };
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;


  if (!['en', 'ua', 'ru', 'es'].includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale === 'ua' ? 'uk' : locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GlobalErrorHandler />
        <Providers>
          <NextIntlClientProvider>
            <Suspense fallback={null}>
              <GoogleAuthReturnHandler />
              <SyncPreferredLocale />
            </Suspense>
            <CompleteProfileGate />
            <div style={{ width: '100%', minWidth: '100%', maxWidth: '100vw', overflowX: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <RecentServersBar />
              <main style={{ flex: 1, maxWidth: 1600, width: '100%', margin: '0 auto' }}>{children}</main>
              <Footer />
              <LoginModal />
              <CookieConsent />
              <ScrollToTop />
              <ConditionalAnalytics />
            </div>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
