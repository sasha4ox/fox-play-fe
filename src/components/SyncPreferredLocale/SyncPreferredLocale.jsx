'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { updateProfile } from '@/lib/api';

const SYNCED_KEY = 'preferredLocaleSynced';

/**
 * Syncs current UI locale to backend (preferredLocale) once per session when user is authenticated.
 * Ensures notification links (e.g. Telegram) use the user's language.
 * LocaleSwitcher also syncs when the user changes locale.
 */
export default function SyncPreferredLocale() {
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SYNCED_KEY)) return;
      sessionStorage.setItem(SYNCED_KEY, '1');
    } catch (_) {}
    updateProfile({ preferredLocale: locale }, token).catch(() => {});
  }, [token, locale]);

  return null;
}
