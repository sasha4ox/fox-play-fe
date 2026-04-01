'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuthStore } from '@/store/authStore';
import { getAdminUserFinancialHistory } from '@/lib/api';
import { formatBalancePaymentContext } from '@/lib/formatBalancePaymentContext';

const FH_TYPES = new Set([
  'sale',
  'purchase',
  'refund',
  'deposit',
  'card_payout_refund',
  'crypto_payout_refund',
  'iban_payout_refund',
  'withdrawal',
  'payout_lock',
]);

function typeLabel(itemType, t) {
  return FH_TYPES.has(itemType) ? t(`fhType_${itemType}`) : itemType;
}

export default function AdminUserFinancialHistoryPage() {
  const t = useTranslations('Admin');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { locale, userId } = useParams();
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ items: [], total: 0, balances: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currencyFilter, setCurrencyFilter] = useState('');

  const load = useCallback(() => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    getAdminUserFinancialHistory(userId, token, {
      take: 100,
      currency: currencyFilter || undefined,
    })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token, userId, currencyFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button component={Link} href={`/${locale}/dashboard/admin/users`} size="small">
          ← {t('users')}
        </Button>
        <Typography variant="h6">{t('userFinancialHistory')}</Typography>
        <Typography variant="body2" color="text.secondary">
          ({t('fhUserIdLabel')}: {userId})
        </Typography>
      </Box>

      {data.balances && data.balances.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('balances')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {t('fhBalancesHint')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {data.balances.map((b) => (
              <Typography key={b.currency} variant="body2">
                {b.currency}: {Number(b.available).toFixed(2)} {t('available')}
                {Number(b.frozen) > 0 ? `, ${Number(b.frozen).toFixed(2)} ${t('frozen')}` : ''}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, mb: 2 }}>
        <InputLabel>{t('currency')}</InputLabel>
        <Select
          value={currencyFilter}
          label={t('currency')}
          onChange={(e) => setCurrencyFilter(e.target.value)}
        >
          <MenuItem value="">{t('filterAll')}</MenuItem>
          <MenuItem value="UAH">UAH</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="RUB">RUB</MenuItem>
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      ) : data.items.length === 0 ? (
        <Typography color="text.secondary">{t('noTransactions')}</Typography>
      ) : isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {data.items.map((item, i) => (
            <Card key={i} variant="outlined" sx={{ overflow: 'visible' }}>
              <CardContent sx={{ '&:last-child': { pb: 1.5 }, pt: 1.5, px: 1.5, py: 1 }}>
                <Typography variant="subtitle2">
                  {item.date ? new Date(item.date).toLocaleString() : '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">{typeLabel(item.type, t)}</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: (item.type === 'purchase' || item.type === 'withdrawal' || item.type === 'payout_lock') ? 'error.main' : 'success.main',
                  }}
                >
                  {(item.type === 'purchase' || item.type === 'withdrawal' || item.type === 'payout_lock') ? '−' : '+'}
                  {item.amount} {item.currency}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {t('fhPaymentTransfer')}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {formatBalancePaymentContext(item.paymentContext, (key, values) => t(`fh${key}`, values))}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {t('fhDescription')}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{item.description ?? '—'}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>{t('created')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell>{t('amount')}</TableCell>
                <TableCell>{t('currency')}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>{t('fhPaymentTransfer')}</TableCell>
                <TableCell>{t('fhDescription')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {item.date ? new Date(item.date).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{typeLabel(item.type, t)}</TableCell>
                  <TableCell>
                    {(item.type === 'purchase' || item.type === 'withdrawal' || item.type === 'payout_lock') ? '−' : '+'}
                    {item.amount} {item.currency}
                  </TableCell>
                  <TableCell>{item.currency}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {formatBalancePaymentContext(item.paymentContext, (key, values) => t(`fh${key}`, values))}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.description ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {data.total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('totalEntries', { count: data.total })}
        </Typography>
      )}
    </Container>
  );
}
