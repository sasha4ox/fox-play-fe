'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { getAdminOrders } from '@/lib/api';

export default function AdminOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('Admin');
  const tSales = useTranslations('Sales');
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminOrders(token, { take: 500 })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [token]);

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('orders')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('total')}: {loading ? '…' : data.total}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('orderId')}</TableCell>
              <TableCell>{t('buyerNickname')}</TableCell>
              <TableCell>{t('sellerNickname')}</TableCell>
              <TableCell>{t('offerTitle')}</TableCell>
              <TableCell>{tSales('status')}</TableCell>
              <TableCell>{t('created')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={120} height={24} /></TableCell>
                  <TableCell><Skeleton width={80} height={24} /></TableCell>
                  <TableCell><Skeleton width={80} height={24} /></TableCell>
                  <TableCell><Skeleton width={100} height={24} /></TableCell>
                  <TableCell><Skeleton width={60} height={24} /></TableCell>
                  <TableCell><Skeleton width={90} height={24} /></TableCell>
                </TableRow>
              ))
            ) : data.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  {t('noOrders')}
                </TableCell>
              </TableRow>
            ) : (
              data.orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Link
                      href={`/${locale}/dashboard/orders/${order.id}`}
                      style={{ color: 'inherit', fontWeight: 600 }}
                    >
                      {order.id.slice(0, 8)}…
                    </Link>
                  </TableCell>
                  <TableCell>{order.buyerNickname || '—'}</TableCell>
                  <TableCell>{order.sellerNickname || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 180 }} noWrap title={order.offerTitle}>
                    {order.offerTitle || '—'}
                  </TableCell>
                  <TableCell>{order.status ? tSales(`status_${order.status}`) : '—'}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
