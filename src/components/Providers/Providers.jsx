'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/theme/theme';

const googleClientId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '' : '';

export default function Providers({ children }) {
  const mode = useThemeStore((s) => s.mode);
  const [effectiveMode, setEffectiveMode] = useState('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const resolve = () => {
      setEffectiveMode(mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode);
    };
    resolve();
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveMode);
  }, [effectiveMode]);

  const theme = useMemo(() => getTheme(effectiveMode), [effectiveMode]);

  const content = (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
  }
  return content;
}
