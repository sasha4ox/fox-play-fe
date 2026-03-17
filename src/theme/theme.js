'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Modern light palette: warm neutrals, refined violet accent, soft contrast.
 * Warmer background (#fafaf9), distinctive primary (#6366f1), WCAG-friendly.
 */
const lightPalette = {
  mode: 'light',
  primary: { main: '#6366f1', contrastText: '#ffffff' },
  secondary: { main: '#64748b', contrastText: '#ffffff' },
  background: { default: '#fafaf9', paper: '#ffffff' },
  text: { primary: '#1c1917', secondary: '#78716c' },
  divider: 'rgba(28, 25, 23, 0.08)',
  action: {
    hover: 'rgba(28, 25, 23, 0.04)',
    selected: 'rgba(99, 102, 241, 0.1)',
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
        root: ({ theme }) => {
          const isLight = theme.palette.mode === 'light';
          return {
            borderRadius: 12,
            border: isLight
              ? `1px solid rgba(28, 25, 23, 0.12)`
              : `1px solid ${theme.palette.divider}`,
            boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
            '&:hover': {
              borderColor: isLight ? 'rgba(99, 102, 241, 0.4)' : theme.palette.divider,
              boxShadow: isLight ? '0 4px 12px rgba(0, 0, 0, 0.08)' : undefined,
            },
          };
        },
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
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&[type=number]': { MozAppearance: 'textfield' },
          '&[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
          '&[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: {
            paddingLeft: 12,
            paddingRight: 12,
          },
        }),
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
