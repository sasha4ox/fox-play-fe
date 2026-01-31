'use client';

import { create } from 'zustand';

/**
 * Global profile store so that when currency (or profile) is updated in the Header,
 * all pages using useProfile() (balance, new offer, etc.) re-render with the new data.
 */
export const useProfileStore = create((set) => ({
  profile: null,
  loading: false,
  error: null,

  setProfile: (profile) => set({ profile, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set((state) => ({ error, ...(error != null ? { loading: false } : {}) })),
  clearProfile: () => set({ profile: null, loading: false, error: null }),
}));
