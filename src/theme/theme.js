'use client';

import { createTheme } from '@mui/material/styles';

/**
 * MUI theme matching existing app style (globals.css vars)
 * --background: #f9f6f1, --second-color: #EAe5de, --third-color: #352228, --fourth-color: #4d3d42
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#352228',   // third-color
      contrastText: '#fff',
    },
    secondary: {
      main: '#4d3d42',   // fourth-color
      contrastText: '#fff',
    },
    background: {
      default: '#f9f6f1', // background
      paper: '#EAe5de',   // second-color
    },
    text: {
      primary: '#352228',
      secondary: '#725e65', // text-second-color
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(114, 94, 101, 0.2)',
          transition: 'background 0.2s, border-color 0.2s',
          '&:hover': {
            borderColor: 'rgba(114, 94, 101, 0.4)',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#4d3d42',
          '&:hover': {
            color: '#352228',
          },
        },
      },
    },
  },
});

export default theme;
