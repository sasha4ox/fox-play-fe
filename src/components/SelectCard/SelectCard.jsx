'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { DEFAULT_GAME_IMAGE } from '@/lib/games';

/** Normalize imageUrl to an array of candidate URLs (string → [string]). */
function candidateUrls(imageUrl) {
  if (!imageUrl) return [];
  return Array.isArray(imageUrl) ? imageUrl : [imageUrl];
}

export default function SelectCard({ name, imageUrl, onClick }) {
  const urls = useMemo(() => candidateUrls(imageUrl), [imageUrl]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const nextUrl = urls[currentIndex];
  const src = (nextUrl && currentIndex < urls.length) ? nextUrl : DEFAULT_GAME_IMAGE;

  const handleImgError = () => {
    if (currentIndex + 1 < urls.length) setCurrentIndex((i) => i + 1);
    else setCurrentIndex(urls.length); // fallback to default
  };

  return (
    <Card
      variant="outlined"
      elevation={0}
      sx={(theme) => {
        const isLight = theme.palette.mode === 'light';
        const primaryRgb = isLight ? '99, 102, 241' : '96, 165, 250';
        return {
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: isLight ? `rgba(${primaryRgb}, 0.04)` : 'background.paper',
          borderColor: isLight ? `rgba(${primaryRgb}, 0.2)` : undefined,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
            bgcolor: isLight ? `rgba(${primaryRgb}, 0.08)` : undefined,
            boxShadow: isLight
              ? `0 8px 24px rgba(${primaryRgb}, 0.15)`
              : '0 8px 24px rgba(0, 0, 0, 0.4)',
          },
        };
      }}
    >
      <CardActionArea onClick={onClick} sx={{ display: 'block' }}>
        <Box
          sx={{
            position: 'relative',
            height: 160,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={src}
            alt={name}
            onError={handleImgError}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
        <CardContent sx={{ py: 1.5, px: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600} color="text.primary" noWrap>
            {name}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
