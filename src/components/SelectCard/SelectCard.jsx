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
      sx={{
        overflow: 'hidden',
        borderRadius: 2,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'scale(1.04)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        },
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
