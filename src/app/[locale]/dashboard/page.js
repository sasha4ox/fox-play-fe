'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';
import { useAuthStore } from '@/store/authStore';
import { getRecentServers } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { games, loading, error } = useGames();
  const token = useAuthStore((s) => s.token);
  const [recentServers, setRecentServers] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setRecentServers([]);
      return;
    }
    setRecentLoading(true);
    getRecentServers(token)
      .then((list) => setRecentServers(Array.isArray(list) ? list : []))
      .catch(() => setRecentServers([]))
      .finally(() => setRecentLoading(false));
  }, [token]);

  const handleGameClick = (gameId) => {
    router.push(`/${locale}/game/${gameId}`);
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
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Link href={`/${locale}/dashboard/balance`} style={{ textDecoration: 'none' }}>
            <Typography component="span" color="secondary" fontWeight={500}>{t('balance')}</Typography>
          </Link>
          <Typography component="span" color="text.secondary">·</Typography>
          <Link href={`/${locale}/dashboard/orders`} style={{ textDecoration: 'none' }}>
            <Typography component="span" color="secondary" fontWeight={500}>{t('myOrdersChat')}</Typography>
          </Link>
          <Typography component="span" color="text.secondary">·</Typography>
          <Link href={`/${locale}/dashboard/sales`} style={{ textDecoration: 'none' }}>
            <Typography component="span" color="secondary" fontWeight={500}>{t('mySales')}</Typography>
          </Link>
        </Box>
        {token && (
          <>
            <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
              {t('recentServers')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('recentServersHint')}
            </Typography>
            {recentLoading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={56} />
                ))}
              </Box>
            )}
            {!recentLoading && recentServers.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                {recentServers.map((s) => (
                  <Card key={s.serverId} variant="outlined">
                    <CardActionArea component={Link} href={`/${locale}/game/${s.gameId}/${s.variantId}/${s.serverId}/offers`}>
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {s.gameName} → {s.variantName} → {s.serverName}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
            {!recentLoading && recentServers.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('recentServersEmpty')}
              </Typography>
            )}
          </>
        )}

        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom sx={{ mt: token ? 2 : 0 }}>
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
                <CardActionArea onClick={() => handleGameClick(game.id)}>
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
