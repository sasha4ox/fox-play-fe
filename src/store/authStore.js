'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'foxplay-auth';

/**
 * Auth store – user & token for app-wide access.
 * Dashboard and offers are public; login required only for: post offer, comment, buy, sell.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,   // { id, email, role?, nickname?, preferredCurrency? } or null
      token: null,

      setAuth: (user, token) => set({ user, token }),

      logout: () => {
        set({ user: null, token: null })
        if (typeof window !== 'undefined') {
          fetch('/api/logout', { method: 'POST' }).catch(() => {})
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Selector for use in components (avoids stale closure on isAuthenticated)
export const useIsAuthenticated = () => {
  const token = useAuthStore((s) => s.token);
  return !!token;
};
