'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const SCROLL_THRESHOLD = 400;
const THROTTLE_MS = 150;

export default function ScrollToTop() {
  const t = useTranslations('Common');
  const [visible, setVisible] = useState(false);

  const updateVisibility = useCallback(() => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY ?? document.documentElement?.scrollTop : 0;
    const shouldShow = scrollY > SCROLL_THRESHOLD;
    setVisible((prev) => (prev !== shouldShow ? shouldShow : prev));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = null;
    let lastRun = 0;

    const onScroll = () => {
      const now = Date.now();
      if (rafId !== null) return;
      if (now - lastRun >= THROTTLE_MS) {
        lastRun = now;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          updateVisibility();
        });
      } else {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          lastRun = Date.now();
          updateVisibility();
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateVisibility();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updateVisibility]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1100,
      }}
    >
      <IconButton
        onClick={scrollToTop}
        aria-label={t('scrollToTop')}
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: 2,
          '&:hover': {
            bgcolor: 'primary.dark',
            boxShadow: 4,
          },
        }}
      >
        <KeyboardArrowUpIcon fontSize="medium" />
      </IconButton>
    </Box>
  );
}
