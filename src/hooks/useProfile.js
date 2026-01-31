'use client';

import { useEffect, useCallback } from 'react';
import { getProfile } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';

/**
 * Fetches profile (user + balances) when authenticated.
 * Profile is stored globally so when currency is changed in the Header,
 * balance page and new-offer page (and any other consumer) update immediately.
 */
export function useProfile() {
  const token = useAuthStore((s) => s.token);
  const { profile, loading, error, setProfile, setLoading, setError, clearProfile } = useProfileStore();

  const refetch = useCallback(() => {
    if (!token) return Promise.resolve(null);
    setLoading(true);
    setError(null);
    return getProfile(token)
      .then((data) => {
        setProfile(data);
        setLoading(false);
        return data;
      })
      .catch((err) => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
        setProfile(null);
        return null;
      });
  }, [token, setProfile, setLoading, setError]);

  useEffect(() => {
    if (!token) {
      clearProfile();
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile(token)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, clearProfile, setProfile, setLoading, setError]);

  const preferredCurrency = profile?.preferredCurrency ?? null;
  const total = profile?.totalInPreferredCurrency;
  const available = total ? Number(total.available) : 0;
  const frozen = total ? Number(total.frozen) : 0;

  return {
    profile,
    preferredCurrency,
    balances: profile?.balances ?? [],
    primaryBalance: preferredCurrency ? { available, frozen, currency: preferredCurrency } : null,
    loading,
    error,
    refetch,
  };
}
