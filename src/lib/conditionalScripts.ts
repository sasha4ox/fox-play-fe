/**
 * Example: Load scripts only after user consent.
 * Use these helpers in components that need analytics/marketing.
 *
 * Usage:
 *   const { consent } = useCookieConsent();
 *   useAnalyticsScript(consent?.analytics);
 *   useMarketingScript(consent?.marketing);
 */

import { useEffect } from 'react';

/**
 * Load a script by URL when consent is granted.
 * Does nothing if consent is false or script already loaded.
 */
export function loadScriptWhenConsented(
  url: string,
  consented: boolean,
  options?: { id?: string; async?: boolean }
): void {
  if (!consented || typeof document === 'undefined') return;
  const id = options?.id ?? `script-${url.replace(/[^a-z0-9]/gi, '')}`;
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.src = url;
  script.async = options?.async ?? true;
  document.body.appendChild(script);
}

/**
 * Hook: Load analytics script only when user consented to analytics cookies.
 * Replace ANALYTICS_SCRIPT_URL with your actual analytics URL (e.g. Google Analytics).
 */
export function useAnalyticsScript(consented: boolean | undefined): void {
  useEffect(() => {
    if (!consented) return;
    // Example: Google Analytics - replace with your GA4 URL
    // const url = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    const url = 'https://example.com/analytics.js'; // placeholder
    loadScriptWhenConsented(url, true, { id: 'analytics-script' });
  }, [consented]);
}

/**
 * Hook: Load marketing script only when user consented to marketing cookies.
 */
export function useMarketingScript(consented: boolean | undefined): void {
  useEffect(() => {
    if (!consented) return;
    const url = 'https://example.com/marketing.js'; // placeholder
    loadScriptWhenConsented(url, true, { id: 'marketing-script' });
  }, [consented]);
}
