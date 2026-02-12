'use client';

/**
 * Example: Conditional analytics script loading.
 * Load analytics only when the user has consented to analytics cookies.
 *
 * To enable Google Analytics:
 * 1. Add NEXT_PUBLIC_GA_MEASUREMENT_ID to .env
 * 2. Uncomment the useEffect below
 */
import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export default function ConditionalAnalytics() {
  const { consent } = useCookieConsent();
  const analyticsConsented = consent?.analytics ?? false;

  useEffect(() => {
    if (!analyticsConsented || typeof window === 'undefined') return;
    // Uncomment to load Google Analytics:
    // const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    // if (!id) return;
    // const url = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    // const script = document.createElement('script');
    // script.src = url;
    // script.async = true;
    // document.head.appendChild(script);
    // window.gtag = window.gtag || function() {};
    // window.dataLayer = window.dataLayer || [];
    // window.gtag('config', id);
  }, [analyticsConsented]);

  return null;
}
