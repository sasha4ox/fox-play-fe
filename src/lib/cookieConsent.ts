/**
 * GDPR-compliant cookie consent management.
 * Easy to extend: add new categories to COOKIE_CATEGORIES.
 */

export type CookieCategoryId = 'essential' | 'analytics' | 'marketing' | 'functional';

export interface CookieCategory {
  id: CookieCategoryId;
  required: boolean; // cannot be disabled
  defaultEnabled: boolean; // default when user has not consented
}

export interface CookieConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: number;
  version: string;
}

export const STORAGE_KEY = 'cookie_consent';
export const CONSENT_VERSION = '1';

/** Default: only essential enabled (GDPR best practice) */
export const DEFAULT_CONSENT: CookieConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false,
  timestamp: 0,
  version: CONSENT_VERSION,
};

/** Config for adding new categories – extend this array */
export const COOKIE_CATEGORIES: CookieCategory[] = [
  { id: 'essential', required: true, defaultEnabled: true },
  { id: 'analytics', required: false, defaultEnabled: false },
  { id: 'marketing', required: false, defaultEnabled: false },
  { id: 'functional', required: false, defaultEnabled: false },
];

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredConsent(state: CookieConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, timestamp: Date.now(), version: CONSENT_VERSION }));
  } catch {
    // ignore
  }
}

export function hasUserConsented(): boolean {
  const stored = getStoredConsent();
  return stored !== null && stored.timestamp > 0;
}

export function isCategoryAllowed(category: CookieCategoryId): boolean {
  const stored = getStoredConsent();
  if (!stored) return false;
  return stored[category] === true;
}
