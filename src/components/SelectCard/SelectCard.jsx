'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { DEFAULT_GAME_IMAGE } from '@/lib/games';

export default function SelectCard({ name, imageUrl, onClick }) {
  const [imgError, setImgError] = useState(false);
  const src = (imageUrl && !imgError) ? imageUrl : DEFAULT_GAME_IMAGE;

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
            onError={() => setImgError(true)}
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
