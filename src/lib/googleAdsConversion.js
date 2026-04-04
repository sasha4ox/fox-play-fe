import { sendGAEvent } from '@next/third-parties/google';

const DEDUPE_PREFIX = 'fox_gads_registration_conv:';

/**
 * Fire Google Ads registration conversion (email verified).
 * Dedupes by verification token so refresh does not double-count.
 */
export function trackRegistrationConversion(verificationToken) {
  if (typeof window === 'undefined') return;
  if (!verificationToken || typeof verificationToken !== 'string') return;

  try {
    const key = `${DEDUPE_PREFIX}${verificationToken}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // sessionStorage unavailable — still fire conversion once this session
  }

  sendGAEvent('event', 'conversion', {
    send_to: 'AW-778100487/xdzOCJ3s25UcEIe-g_MC',
    value: 1.0,
    currency: 'UAH',
  });
}
