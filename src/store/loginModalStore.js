'use client';

import { create } from 'zustand';

/**
 * Global login modal: open when user tries to sell/buy without auth.
 * onSuccess callback runs after successful login (e.g. navigate to create offer).
 */
export const useLoginModalStore = create((set) => ({
  open: false,
  onSuccess: null,

  openModal: (onSuccess = null) => set({ open: true, onSuccess }),

  closeModal: () => set({ open: false, onSuccess: null }),

  /** Call this from Form after successful login (popup mode) */
  triggerLoginSuccess: () => {
    const state = useLoginModalStore.getState()
    state.onSuccess?.()
    state.closeModal()
  },
}))
