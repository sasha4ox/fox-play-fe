/**
 * Hook to access cookie consent state and actions.
 * Use for conditional script loading (analytics, marketing).
 */
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';

export function useCookieConsent() {
  return useCookieConsentContext();
}
