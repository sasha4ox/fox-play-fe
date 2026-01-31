'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const THEME_STORAGE_KEY = 'foxplay-theme';

/**
 * Theme: only Light and Dark in the UI.
 * - First visit (no localStorage): mode stays 'system' → follow device (light/dark).
 * - When user picks Light or Dark we store that and use it on next visit.
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      mode: 'system', // 'system' = follow device; 'light' | 'dark' = user choice (persisted)
      setMode: (mode) => set({ mode }),
    }),
    { name: THEME_STORAGE_KEY }
  )
);
