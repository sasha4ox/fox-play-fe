'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { getAuthTheme } from '@/theme/authTheme';

const HERO_PATH = '/images/auth-hero.png';

export default function AuthPageLayout({ children }) {
  const authTheme = getAuthTheme();
  const [heroFailed, setHeroFailed] = useState(false);

  return (
    <ThemeProvider theme={authTheme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          minHeight: { xs: 'auto', md: 'min(720px, calc(100dvh - 200px))' },
          alignItems: 'stretch',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            flex: { xs: '0 0 auto', md: '1 1 50%' },
            minHeight: { xs: 180, sm: 200, md: 'auto' },
            maxHeight: { xs: 220, md: 'none' },
            overflow: 'hidden',
            background: heroFailed
              ? 'linear-gradient(145deg, #0c0e14 0%, #1a1c23 40%, #3d1f0a 100%)'
              : '#0c0e14',
          }}
        >
          {!heroFailed && (
            <Image
              src={HERO_PATH}
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              onError={() => setHeroFailed(true)}
            />
          )}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: {
                xs: 'linear-gradient(to bottom, transparent 0%, rgba(26,28,35,0.85) 100%)',
                md: 'linear-gradient(to right, transparent 0%, rgba(26,28,35,0.25) 55%, #1a1c23 100%)',
              },
              pointerEvents: 'none',
            }}
          />
        </Box>

        <Box
          sx={{
            flex: { xs: '1 1 auto', md: '1 1 50%' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: { xs: 3, sm: 4, md: 5 },
            px: { xs: 2.5, sm: 3, md: 4 },
            pb: { xs: 'max(24px, env(safe-area-inset-bottom))', md: 5 },
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 440,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
