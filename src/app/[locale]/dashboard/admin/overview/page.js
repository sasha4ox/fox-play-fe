'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import { useAuthStore } from '@/store/authStore';
import { getAdminStats } from '@/lib/api';

export default function AdminOverviewPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminStats(token)
      .then(setStats)
      .catch((e) => setError(e.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, [token]);

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const cards = loading
    ? []
    : [
        { label: t('statsUsers'), value: stats?.usersCount ?? 0 },
        { label: t('statsOrders'), value: stats?.ordersCount ?? 0 },
        { label: t('statsDisputesOpen'), value: stats?.disputesOpen ?? 0 },
        { label: t('statsDisputesResolved'), value: stats?.disputesResolved ?? 0 },
        { label: t('statsOffers'), value: stats?.offersCount ?? 0 },
        { label: t('statsDepositsPending'), value: stats?.depositsPending ?? 0 },
        { label: t('statsDepositsCompleted'), value: stats?.depositsCompleted ?? 0 },
      ];

  return (
    <Container maxWidth="md">
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('overview')}
      </Typography>
      <Grid container spacing={2}>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          cards.map(({ label, value }) => (
            <Grid item xs={12} sm={6} md={4} key={label}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    {label}
                  </Typography>
                  <Typography variant="h5">{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      {!loading && stats?.ordersByStatus && Object.keys(stats.ordersByStatus).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {t('ordersByStatus')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}
