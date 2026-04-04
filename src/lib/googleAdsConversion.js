import { sendGAEvent } from '@next/third-parties/google';

const DEDUPE_PREFIX = 'fox_gads_conv:';

const REGISTRATION_CONVERSION_PAYLOAD = {
  send_to: 'AW-778100487/xdzOCJ3s25UcEIe-g_MC',
  value: 1.0,
  currency: 'UAH',
};

const START_SELLING_CONVERSION_PAYLOAD = {
  send_to: 'AW-778100487/wfssCLHN5ZUcEIe-g_MC',
  value: 1.0,
  currency: 'UAH',
};

function pushConversionOnce(dedupeKey, payload) {
  if (typeof window === 'undefined') return;
  if (!dedupeKey || typeof dedupeKey !== 'string') return;

  try {
    const key = `${DEDUPE_PREFIX}${dedupeKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // sessionStorage unavailable — still fire conversion once this session
  }
  sendGAEvent('event', 'conversion', payload);
}

/**
 * Fire Google Ads registration conversion (email verified).
 * Dedupes by verification token so refresh does not double-count.
 */
export function trackRegistrationConversion(verificationToken) {
  pushConversionOnce(verificationToken, REGISTRATION_CONVERSION_PAYLOAD);
}

/**
 * Fire Google Ads registration conversion (new Google OAuth account).
 * Dedupes by user id so refresh does not double-count.
 */
export function trackGoogleRegistrationConversion(userId) {
  if (!userId) return;
  pushConversionOnce(`google:${userId}`, REGISTRATION_CONVERSION_PAYLOAD);
}

/**
 * Fire Google Ads "Start to Selling" conversion after first successful offer create in this session.
 */
export function trackStartSellingConversion() {
  pushConversionOnce('start_selling', START_SELLING_CONVERSION_PAYLOAD);
}
