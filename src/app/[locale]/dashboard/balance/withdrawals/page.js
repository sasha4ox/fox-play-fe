'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { getMyCardPayoutRequests, getMyCryptoPayoutRequests } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useTranslations } from 'next-intl';

export default function BalanceWithdrawalsPage() {
  const locale = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const t = useTranslations('Balance');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getMyCardPayoutRequests(token, { take: 100 }),
      getMyCryptoPayoutRequests(token, { take: 100 }),
    ])
      .then(([cardData, cryptoData]) => {
        const cardItems = (cardData?.items ?? []).map((r) => ({ ...r, type: 'card' }));
        const cryptoItems = (cryptoData?.items ?? []).map((r) => ({ ...r, type: 'crypto' }));
        const merged = [...cardItems, ...cryptoItems].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setItems(merged);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!isAuth) openLoginModal();
  }, [isAuth, openLoginModal]);

  const formatDate = (d) => (d ? new Date(d).toLocaleString(locale) : '—');

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="md">
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t('withdrawalsTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('withdrawalsHint')}
        </Typography>
        <Button component={Link} href={`${base}/dashboard/balance`} variant="outlined" size="small" sx={{ mb: 2 }}>
          {t('dashboard')}
        </Button>

        {loading ? (
          <Skeleton height={200} />
        ) : items.length === 0 ? (
          <Typography color="text.secondary">{t('noWithdrawals')}</Typography>
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((r) => (
              <Card key={`${r.type}-${r.id}`} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('date')}
                    </Typography>
                    <Typography variant="body2">{formatDate(r.createdAt)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('withdrawalsType')}
                    </Typography>
                    <Typography variant="body2">{r.type === 'crypto' ? t('withdrawWithCrypto') : t('withdrawOnCard')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('amount')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {r.amount} {r.currency}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('status')}
                    </Typography>
                    <Chip
                      size="small"
                      label={r.status}
                      color={r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'error' : 'default'}
                      variant={r.status === 'PENDING' ? 'outlined' : 'filled'}
                    />
                  </Box>
                  {r.status === 'PENDING' && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                      {t('typicallyProcessedInDays')}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('processedAt')}
                    </Typography>
                    <Typography variant="body2">{r.processedAt ? formatDate(r.processedAt) : '—'}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Table size="small" sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('date')}</TableCell>
                <TableCell>{t('withdrawalsType')}</TableCell>
                <TableCell align="right">{t('amount')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('processedAt')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={`${r.type}-${r.id}`}>
                  <TableCell>{formatDate(r.createdAt)}</TableCell>
                  <TableCell>{r.type === 'crypto' ? t('withdrawWithCrypto') : t('withdrawOnCard')}</TableCell>
                  <TableCell align="right">
                    {r.amount} {r.currency}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status}
                      color={r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'error' : 'default'}
                      variant={r.status === 'PENDING' ? 'outlined' : 'filled'}
                    />
                    {r.status === 'PENDING' && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {t('typicallyProcessedInDays')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{r.processedAt ? formatDate(r.processedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Container>
    </Box>
  );
}
