'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useAuthStore } from '@/store/authStore';
import { getAdminTransactionLog, getAdminUserFinancialHistory } from '@/lib/api';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get('userId') || undefined;
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ items: [], total: 0 });
  const [userBalances, setUserBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (!token || !userIdFromUrl) {
      setUserBalances([]);
      return;
    }
    getAdminUserFinancialHistory(userIdFromUrl, token, { take: 1 })
      .then((res) => setUserBalances(res.balances || []))
      .catch(() => setUserBalances([]));
  }, [token, userIdFromUrl]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminTransactionLog(token, {
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      search: search || undefined,
      userId: userIdFromUrl,
    })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token, page, search, userIdFromUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');

  const userFilterDisplayName = userIdFromUrl && data.items.length > 0
    ? (() => {
        const first = data.items[0];
        if (first.type === 'order') {
          if (first.buyer?.id === userIdFromUrl) return formatUser(first.buyer);
          if (first.seller?.id === userIdFromUrl) return formatUser(first.seller);
        }
        if (first.user?.id === userIdFromUrl) return formatUser(first.user);
        return userIdFromUrl.slice(0, 8) + '…';
      })()
    : userIdFromUrl
      ? userIdFromUrl.slice(0, 8) + '…'
      : null;

  function getAmountForUser(item) {
    if (!userIdFromUrl) return { text: `${item.amount} ${item.currency}`, isCredit: null };
    if (item.type === 'order') {
      if (item.buyer?.id === userIdFromUrl) return { text: `−${item.amount} ${item.currency}`, isCredit: false };
      if (item.seller?.id === userIdFromUrl) {
        const amt = item.sellerAmount ?? item.amount;
        const cur = item.sellerCurrency ?? item.currency;
        return { text: `+${amt} ${cur}`, isCredit: true };
      }
    }
    if (item.type === 'deposit') return { text: `+${item.amount} ${item.currency}`, isCredit: true };
    if (item.type?.startsWith('withdrawal_')) return { text: `−${item.amount} ${item.currency}`, isCredit: false };
    return { text: `${item.amount} ${item.currency}`, isCredit: null };
  }

  function renderAmount(item) {
    const { text, isCredit } = getAmountForUser(item);
    if (isCredit === true) return <Typography component="span" sx={{ color: 'success.main', fontWeight: 600 }}>{text}</Typography>;
    if (isCredit === false) return <Typography component="span" sx={{ color: 'error.main', fontWeight: 600 }}>{text}</Typography>;
    return text;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('transactionLog')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('transactionLogDescription')}
      </Typography>

      {userIdFromUrl && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="p" sx={{ mb: 1 }}>
            {t('transactionLogOfUser')}
            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {userFilterDisplayName}
            </Typography>
          </Typography>
          {userBalances.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('currentBalance')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {userBalances.map((b) => (
                  <Typography key={b.currency} variant="body2">
                    {b.currency}: {Number(b.available).toFixed(2)} {t('available')}
                    {Number(b.frozen) > 0 ? `, ${Number(b.frozen).toFixed(2)} ${t('frozen')}` : ''}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button component={Link} href={`/${locale}/dashboard/admin/transaction-log`} size="small" variant="outlined">
              {t('showAllTransactions')}
            </Button>
            <Button
              component={Link}
              href={`/${locale}/dashboard/admin/users/${encodeURIComponent(userIdFromUrl)}/financial-history`}
              size="small"
              variant="text"
            >
              {t('userFinancialHistory')}
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('searchByNameOrEmail')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: { xs: 0, sm: 220 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
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
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {data.items.map((item) => (
                <Card key={item.id} variant="outlined" sx={{ overflow: 'visible' }}>
                  <CardContent sx={{ '&:last-child': { pb: 1.5 }, pt: 1.5, px: 1.5, py: 1 }}>
                    <Link
                      href={`/${locale}/dashboard/admin/transaction-log/${encodeURIComponent(item.id)}`}
                      style={{ color: 'inherit', textDecoration: 'underline', display: 'block', marginBottom: 4 }}
                    >
                      <Typography variant="subtitle2">{formatDate(item.date)}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.secondary">{t(TYPE_KEYS[item.type] ?? 'typeOrder')}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{item.description}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {item.type === 'order' ? (
                        <>
                          {item.buyer?.id ? (
                            <Link href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.buyer.id)}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{formatUser(item.buyer)}</Link>
                          ) : formatUser(item.buyer)}
                          {' → '}
                          {item.seller?.id ? (
                            <Link href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.seller.id)}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{formatUser(item.seller)}</Link>
                          ) : formatUser(item.seller)}
                        </>
                      ) : item.user?.id ? (
                        <Link href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.user.id)}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{formatUser(item.user)}</Link>
                      ) : (
                        formatUser(item.user)
                      )}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>{renderAmount(item)}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{item.method} · {item.status}{item.processedBy ? ` · ${item.processedBy}` : ''}</Typography>
                    {item.referenceType === 'order' && (
                      <Link href={`/${locale}/dashboard/orders/${item.referenceId}`} target="_blank" rel="noopener" style={{ fontSize: '0.75rem', display: 'block', marginTop: 4 }}>{item.orderNumber || item.referenceId.slice(0, 8)}</Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
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
                      <TableCell>
                        <Link
                          href={`/${locale}/dashboard/admin/transaction-log/${encodeURIComponent(item.id)}`}
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          {formatDate(item.date)}
                        </Link>
                      </TableCell>
                      <TableCell>{t(TYPE_KEYS[item.type] ?? 'typeOrder')}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }} title={item.description}>
                        <Typography variant="body2" noWrap>
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.type === 'order' ? (
                          <>
                            {item.buyer?.id ? (
                              <Link
                                href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.buyer.id)}`}
                                style={{ color: 'inherit', textDecoration: 'underline' }}
                              >
                                {formatUser(item.buyer)}
                              </Link>
                            ) : (
                              formatUser(item.buyer)
                            )}
                            {' → '}
                            {item.seller?.id ? (
                              <Link
                                href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.seller.id)}`}
                                style={{ color: 'inherit', textDecoration: 'underline' }}
                              >
                                {formatUser(item.seller)}
                              </Link>
                            ) : (
                              formatUser(item.seller)
                            )}
                          </>
                        ) : item.user?.id ? (
                          <Link
                            href={`/${locale}/dashboard/admin/transaction-log?userId=${encodeURIComponent(item.user.id)}`}
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                          >
                            {formatUser(item.user)}
                          </Link>
                        ) : (
                          formatUser(item.user)
                        )}
                      </TableCell>
                      <TableCell>{renderAmount(item)}</TableCell>
                      <TableCell>{userIdFromUrl && item.type === 'order' && item.seller?.id === userIdFromUrl ? (item.sellerCurrency ?? item.currency) : item.currency}</TableCell>
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
          )}

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
