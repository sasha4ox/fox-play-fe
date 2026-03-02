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

export const metadata = {
  title: "FoxyPlay",
  description: "FoxyPlay – marketplace for in-game items and services",
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;


  if (!['en', 'ua'].includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GlobalErrorHandler />
        <Providers>
          <NextIntlClientProvider>
            <Suspense fallback={null}>
              <GoogleAuthReturnHandler />
            </Suspense>
            <CompleteProfileGate />
            <div style={{ width: '100%', minWidth: '100%', maxWidth: '100vw', overflowX: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <RecentServersBar />
              <main style={{ flex: 1 }}>{children}</main>
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
