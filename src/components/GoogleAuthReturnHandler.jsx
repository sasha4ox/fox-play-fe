'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getProfile } from '@/lib/api';

/**
 * Handles return from Google OAuth redirect flow: reads ?token= or ?google_error= from URL,
 * stores token and fetches user, then cleans the URL.
 */
export default function GoogleAuthReturnHandler() {
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const googleError = searchParams.get('google_error');
    if (googleError) {
      try {
        sessionStorage.setItem('googleSignInError', googleError);
      } catch (_) {}
      const url = new URL(window.location.href);
      url.searchParams.delete('google_error');
      window.history.replaceState({}, '', url.pathname + url.search);
      return;
    }
    if (!token) return;

    setAuth(null, token);
    getProfile(token)
      .then((profile) => {
        if (profile && profile.id) {
          setAuth(
            {
              id: profile.id,
              email: profile.email,
              preferredCurrency: profile.preferredCurrency,
              nickname: profile.nickname,
              role: profile.role,
            },
            token
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname + url.search);
      });
  }, [searchParams, setAuth]);

  return null;
}
