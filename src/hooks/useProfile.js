'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProfile } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

/**
 * Fetches profile (user + balances) when authenticated.
 * Returns primary balance in user's preferred currency.
 */
export function useProfile() {
  const token = useAuthStore((s) => s.token);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

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
  }, [token]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
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
  }, [token]);

  const preferredCurrency = profile?.preferredCurrency ?? null;
  // Total in preferred currency (all wallets converted) so switching to RUB shows e.g. 90000 RUB
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
