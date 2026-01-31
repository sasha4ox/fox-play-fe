'use client';

import { createTheme } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: { main: '#352228', contrastText: '#fff' },
  secondary: { main: '#4d3d42', contrastText: '#fff' },
  background: { default: '#f9f6f1', paper: '#EAe5de' },
  text: { primary: '#352228', secondary: '#725e65' },
};

const darkPalette = {
  mode: 'dark',
  primary: { main: '#b8a4a8', contrastText: '#1a1214' },
  secondary: { main: '#c9b9bd', contrastText: '#1a1214' },
  background: { default: '#1a1214', paper: '#252022' },
  text: { primary: '#f0e6e8', secondary: '#b8a4a8' },
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
        root: {
          borderRadius: 12,
          border: '1px solid rgba(114, 94, 101, 0.2)',
          transition: 'background 0.2s, border-color 0.2s',
          '&:hover': { borderColor: 'rgba(114, 94, 101, 0.4)' },
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
