'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Dark auth shell: charcoal panels, orange accent (matches login/register reference).
 * Used inside ThemeProvider on auth pages so styling is stable regardless of global theme.
 */
export function getAuthTheme() {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#d35400', contrastText: '#ffffff' },
      secondary: { main: '#d35400', contrastText: '#ffffff' },
      background: { default: '#1a1c23', paper: '#2d303e' },
      text: { primary: '#f8fafc', secondary: '#94a3b8' },
      divider: 'rgba(241, 245, 249, 0.12)',
      action: {
        hover: 'rgba(241, 245, 249, 0.08)',
        selected: 'rgba(211, 84, 0, 0.2)',
      },
    },
    typography: {
      fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
      h4: { fontWeight: 600 },
      body2: { lineHeight: 1.5 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 10, minHeight: 48 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'medium' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: '#2d303e',
            '& fieldset': { borderColor: 'rgba(241, 245, 249, 0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(241, 245, 249, 0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#d35400' },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: '#94a3b8' },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: { color: '#d35400' },
        },
      },
    },
  });
}
