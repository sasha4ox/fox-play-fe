import { sendGAEvent } from '@next/third-parties/google';

const DEDUPE_PREFIX = 'fox_gads_registration_conv:';

const REGISTRATION_CONVERSION_PAYLOAD = {
  send_to: 'AW-778100487/xdzOCJ3s25UcEIe-g_MC',
  value: 1.0,
  currency: 'UAH',
};

function pushConversionOnce(dedupeKey) {
  if (typeof window === 'undefined') return;
  if (!dedupeKey || typeof dedupeKey !== 'string') return;

  try {
    const key = `${DEDUPE_PREFIX}${dedupeKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // sessionStorage unavailable — still fire conversion once this session
  }
  console.log("Firing registration conversion");
  sendGAEvent('event', 'conversion', REGISTRATION_CONVERSION_PAYLOAD);
}

/**
 * Fire Google Ads registration conversion (email verified).
 * Dedupes by verification token so refresh does not double-count.
 */
export function trackRegistrationConversion(verificationToken) {
  pushConversionOnce(verificationToken);
}

/**
 * Fire Google Ads registration conversion (new Google OAuth account).
 * Dedupes by user id so refresh does not double-count.
 */
export function trackGoogleRegistrationConversion(userId) {
  if (!userId) return;
  pushConversionOnce(`google:${userId}`);
}
