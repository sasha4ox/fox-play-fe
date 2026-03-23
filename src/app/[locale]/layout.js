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
import { headers } from 'next/headers';
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
export async function generateMetadata({ params }) {
  const { locale } = params;

  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '/';
  
  const pathWithoutLocale =
    pathname.replace(/^\/(en|ua|ru|es)/, '') || '/';

  const canonical = `${BASE_URL}/${locale}`;


  return {
    metadataBase: new URL(BASE_URL),

    title: {
      default: 'FoxyPlay – Marketplace for In-Game Items & Services',
      template: '%s | FoxyPlay',
    },

    description:
      'Buy and sell in-game items, currency, and boosting services safely. FoxyPlay is a trusted marketplace for gamers worldwide.',

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

    openGraph: {
      title: 'FoxyPlay – Marketplace for Gamers',
      description:
        'Buy and sell in-game items and services securely.',
      url: canonical,
      siteName: 'FoxyPlay',
      images: [
        {
          url: `${BASE_URL}/images/og-banner.jpg`,
          width: 1200,
          height: 630,
        },
      ],
      locale,
      type: 'website',
    },

    twitter: {
      card: 'summary_large_image',
      title: 'FoxyPlay – Marketplace for Gamers',
      description:
        'Buy and sell in-game items and services securely.',
      images: [`${BASE_URL}/images/og-banner.jpg`],
    },

    robots: {
      index: true,
      follow: true,
    },

    icons: {
      icon: '/images/favicon.png',
      apple: '/images/favicon.png',
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
              <main style={{ flex: 1, maxWidth: 1600, width: '100%', margin: '0 auto', boxShadow: '-4px 0 16px rgba(0,0,0,0.18), 4px 0 16px rgba(0,0,0,0.18)' }}>{children}</main>
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
