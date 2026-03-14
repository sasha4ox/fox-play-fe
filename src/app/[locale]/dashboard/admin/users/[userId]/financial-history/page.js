'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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
import { useAuthStore } from '@/store/authStore';
import { getAdminUserFinancialHistory } from '@/lib/api';

const TYPE_LABELS = {
  sale: 'Sale',
  purchase: 'Purchase',
  refund: 'Refund',
  deposit: 'Deposit',
  card_payout_refund: 'Card payout refund',
  crypto_payout_refund: 'Crypto payout refund',
  iban_payout_refund: 'IBAN payout refund',
};

export default function AdminUserFinancialHistoryPage() {
  const t = useTranslations('Admin');
  const { locale, userId } = useParams();
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ items: [], total: 0, balances: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currencyFilter, setCurrencyFilter] = useState('');

  const load = () => {
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
  };

  useEffect(() => {
    load();
  }, [token, userId, currencyFilter]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button component={Link} href={`/${locale}/dashboard/admin/users`} size="small">
          ← {t('users')}
        </Button>
        <Typography variant="h6">User financial history</Typography>
        <Typography variant="body2" color="text.secondary">
          (user id: {userId})
        </Typography>
      </Box>

      {data.balances && data.balances.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Balances
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {data.balances.map((b) => (
              <Typography key={b.currency} variant="body2">
                {b.currency}: {Number(b.available).toFixed(2)} available
                {Number(b.frozen) > 0 ? `, ${Number(b.frozen).toFixed(2)} frozen` : ''}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <FormControl size="small" sx={{ minWidth: 120, mb: 2 }}>
        <InputLabel>Currency</InputLabel>
        <Select
          value={currencyFilter}
          label="Currency"
          onChange={(e) => setCurrencyFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
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
        <Typography color="text.secondary">No transactions.</Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {item.date ? new Date(item.date).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[item.type] ?? item.type}</TableCell>
                  <TableCell>
                    {item.type === 'purchase' ? '−' : '+'}
                    {item.amount} {item.currency}
                  </TableCell>
                  <TableCell>{item.currency}</TableCell>
                  <TableCell>{item.description ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {data.total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Total: {data.total} entries
        </Typography>
      )}
    </Container>
  );
}
