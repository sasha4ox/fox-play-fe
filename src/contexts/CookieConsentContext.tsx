'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  CookieConsentState,
  CookieCategoryId,
  getStoredConsent,
  setStoredConsent,
  hasUserConsented,
  DEFAULT_CONSENT,
} from '@/lib/cookieConsent';

interface CookieConsentContextValue {
  consent: CookieConsentState | null;
  hasConsented: boolean;
  showBanner: boolean;
  isSettingsOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  updateCategory: (category: CookieCategoryId, enabled: boolean) => void;
  savePreferences: (prefs: Partial<CookieConsentState>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  closeBanner: () => void;
  reopenBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored ?? DEFAULT_CONSENT);
    setShowBanner(!hasUserConsented());
  }, []);

  const hasConsented = consent !== null && consent.timestamp > 0;

  const persist = useCallback((next: CookieConsentState) => {
    const withTimestamp = { ...next, timestamp: Date.now(), version: '1' };
    setStoredConsent(withTimestamp);
    setConsent(withTimestamp);
  }, []);

  const acceptAll = useCallback(() => {
    persist({
      ...DEFAULT_CONSENT,
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    });
    setShowBanner(false);
    setIsSettingsOpen(false);
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({
      ...DEFAULT_CONSENT,
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    });
    setShowBanner(false);
    setIsSettingsOpen(false);
  }, [persist]);

  const updateCategory = useCallback((category: CookieCategoryId, enabled: boolean) => {
    setConsent((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [category]: enabled };
      return next;
    });
  }, []);

  const savePreferences = useCallback(
    (prefs: Partial<CookieConsentState>) => {
      const base = consent ?? DEFAULT_CONSENT;
      persist({
        ...base,
        ...prefs,
        essential: true, // always on
      });
      setShowBanner(false);
      setIsSettingsOpen(false);
    },
    [consent, persist]
  );

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const closeBanner = useCallback(() => setShowBanner(false), []);
  const reopenBanner = useCallback(() => setShowBanner(true), []);

  const value: CookieConsentContextValue = {
    consent,
    hasConsented,
    showBanner,
    isSettingsOpen,
    acceptAll,
    rejectNonEssential,
    updateCategory,
    savePreferences,
    openSettings,
    closeSettings,
    closeBanner,
    reopenBanner,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsentContext(): CookieConsentContextValue {
  const ctx = React.useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsentContext must be used within CookieConsentProvider');
  return ctx;
}
