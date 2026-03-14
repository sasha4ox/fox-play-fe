'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
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
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useAuthStore } from '@/store/authStore';
import { getAdminTransactionLog } from '@/lib/api';

const PAGE_SIZE = 20;
const TYPE_KEYS = {
  order: 'typeOrder',
  deposit: 'typeDeposit',
  withdrawal_card: 'typeWithdrawalCard',
  withdrawal_crypto: 'typeWithdrawalCrypto',
  withdrawal_iban: 'typeWithdrawalIban',
  withdrawal_legacy: 'typeWithdrawalLegacy',
};

function formatUser(user) {
  if (!user) return '—';
  return user.nickname ? `${user.nickname} (${user.email})` : user.email;
}

export default function AdminTransactionLogPage() {
  const locale = useLocale();
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminTransactionLog(token, {
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      search: search || undefined,
    })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('transactionLog')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('transactionLogDescription')}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('searchByNameOrEmail')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 220 }}
        />
        <Button variant="contained" onClick={handleSearch}>
          {t('search')}
        </Button>
        {search && (
          <Button
            size="small"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setPage(0);
            }}
          >
            {t('clearFilter')}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
      ) : data.items.length === 0 ? (
        <Typography color="text.secondary">{t('noTransactions')}</Typography>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell>{t('type')}</TableCell>
                  <TableCell>{t('description')}</TableCell>
                  <TableCell>{t('user')}</TableCell>
                  <TableCell>{t('amount')}</TableCell>
                  <TableCell>{t('currency')}</TableCell>
                  <TableCell>{t('method')}</TableCell>
                  <TableCell>{t('status')}</TableCell>
                  <TableCell>{t('processedBy')}</TableCell>
                  <TableCell>{t('reference')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>{t(TYPE_KEYS[item.type] ?? 'typeOrder')}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }} title={item.description}>
                      <Typography variant="body2" noWrap>
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.type === 'order'
                        ? `${formatUser(item.buyer)} → ${formatUser(item.seller)}`
                        : formatUser(item.user)}
                    </TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell>{item.currency}</TableCell>
                    <TableCell>{item.method}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.processedBy ?? '—'}</TableCell>
                    <TableCell>
                      {item.referenceType === 'order' && (
                        <Link href={`/${locale}/dashboard/orders/${item.referenceId}`} target="_blank" rel="noopener">
                          {item.orderNumber || item.referenceId.slice(0, 8)}
                        </Link>
                      )}
                      {item.referenceType !== 'order' && (
                        <Typography variant="body2" color="text.secondary">
                          {item.referenceId.slice(0, 8)}…
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('total')}: {data.total} · {t('page')} {page + 1} {t('of')} {totalPages}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label={t('previousPage')}
              >
                ←
              </IconButton>
              <IconButton
                size="small"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label={t('nextPage')}
              >
                →
              </IconButton>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
