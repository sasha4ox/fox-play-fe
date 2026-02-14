'use client';

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
import { useGames } from '@/hooks/useGames';
import { getFlatGameOfferTarget } from '@/lib/games';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { games, loading, error } = useGames();

  const handleGameClick = (game) => {
    const target = getFlatGameOfferTarget(game);
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
            {games.map((game) => (
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
      </Container>
    </Box>
  );
}
