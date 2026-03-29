'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Zustand `persist` rehydrates from localStorage asynchronously. Until then, `token`/`user`
 * can be null even when the user is logged in — do not treat missing token as logged-out
 * until hydration has finished.
 */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(
    () => typeof window !== 'undefined' && useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}
