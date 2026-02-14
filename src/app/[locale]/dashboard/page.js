'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import { useGames } from '@/hooks/useGames';
import { getDirectOfferTarget } from '@/lib/games';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { games, loading, error } = useGames();
  const [search, setSearch] = useState('');

  const searchQuery = search.trim().toLowerCase();
  const filteredGames = searchQuery
    ? games.filter((game) => {
        const gameName = String(game?.name ?? '').toLowerCase();
        const variantNames = (game?.variants ?? []).map((v) => String(v?.name ?? '').toLowerCase());
        return gameName.includes(searchQuery) || variantNames.some((n) => n.includes(searchQuery));
      })
    : games;

  const handleGameClick = (game) => {
    const target = getDirectOfferTarget(game);
    if (target) {
      router.push(`/${locale}/game/${game.id}/${target.variantId}/${target.serverId}/offers`);
    } else {
      router.push(`/${locale}/game/${game.id}`);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Container>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('chooseGame')}
        </Typography>

        {!loading && games.length > 0 && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <InputBase
              placeholder={t('searchGames')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 22 }} />}
              sx={{
                width: '100%',
                maxWidth: 400,
                py: 1.25,
                px: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                fontSize: '1rem',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ py: 3, px: 3 }}>
                  <Skeleton variant="text" width="40%" height={32} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && games.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {filteredGames.map((game) => (
              <Card key={game.id} variant="outlined">
                <CardActionArea onClick={() => handleGameClick(game)}>
                  <CardContent sx={{ py: 3, px: 3 }}>
                    <Typography variant="h6" fontWeight={500} color="text.primary">
                      {game.name}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}

        {!loading && !error && games.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t('noGames')}
          </Typography>
        )}

        {!loading && !error && games.length > 0 && filteredGames.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t('noSearchResults')}
          </Typography>
        )}
      </Container>
    </Box>
  );
}
