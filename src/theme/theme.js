'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Best-practice light palette: soft background, clear primary, WCAG-friendly contrast.
 * Background #fafafa reduces glare; primary blue for clarity and trust.
 */
const lightPalette = {
  mode: 'light',
  primary: { main: '#2563eb', contrastText: '#ffffff' },
  secondary: { main: '#475569', contrastText: '#ffffff' },
  background: { default: '#f8fafc', paper: '#ffffff' },
  text: { primary: '#0f172a', secondary: '#64748b' },
  divider: 'rgba(15, 23, 42, 0.12)',
  action: {
    hover: 'rgba(15, 23, 42, 0.04)',
    selected: 'rgba(37, 99, 235, 0.08)',
  },
};

/**
 * Best-practice dark palette: true dark surfaces, elevated paper, readable text.
 * Background #0f172a (slate-900); primary #60a5fa for clear accent on dark.
 */
const darkPalette = {
  mode: 'dark',
  primary: { main: '#60a5fa', contrastText: '#0f172a' },
  secondary: { main: '#94a3b8', contrastText: '#0f172a' },
  background: { default: '#0f172a', paper: '#1e293b' },
  text: { primary: '#f1f5f9', secondary: '#94a3b8' },
  divider: 'rgba(241, 245, 249, 0.12)',
  action: {
    hover: 'rgba(241, 245, 249, 0.08)',
    selected: 'rgba(96, 165, 250, 0.16)',
  },
};

const shared = {
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          transition: 'background 0.2s, border-color 0.2s',
          '&:hover': { borderColor: theme.palette.divider },
        }),
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: 'inherit',
          '&:hover': { opacity: 0.85 },
        },
      },
    },
  },
};

/**
 * Returns MUI theme for the given mode ('light' | 'dark').
 */
export function getTheme(mode) {
  return createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    ...shared,
  });
}

/** Default export for backward compatibility (light theme). */
export default getTheme('light');
