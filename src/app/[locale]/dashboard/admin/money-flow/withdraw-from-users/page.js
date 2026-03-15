'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminCardPayouts,
  adminCardPayoutComplete,
  adminCardPayoutFail,
  getAdminCryptoPayoutRequests,
  adminCryptoPayoutComplete,
  adminCryptoPayoutFail,
} from '@/lib/api';

function maskCardNumber(num) {
  if (!num || num.length < 8) return '****';
  return `${num.slice(0, 4)} **** **** ${num.slice(-4)}`;
}

export default function AdminWithdrawFromUsersPage() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [error, setError] = useState(null);
  const [cardPayouts, setCardPayouts] = useState([]);
  const [loadingCardPayouts, setLoadingCardPayouts] = useState(true);
  const [cardPayoutStatusFilter, setCardPayoutStatusFilter] = useState('');
  const [confirmingCardPayoutComplete, setConfirmingCardPayoutComplete] = useState(null);
  const [confirmingCardPayoutFail, setConfirmingCardPayoutFail] = useState(null);
  const [cryptoPayoutRequests, setCryptoPayoutRequests] = useState([]);
  const [loadingCryptoPayoutRequests, setLoadingCryptoPayoutRequests] = useState(true);
  const [cryptoPayoutStatusFilter, setCryptoPayoutStatusFilter] = useState('');
  const [confirmingCryptoPayoutComplete, setConfirmingCryptoPayoutComplete] = useState(null);
  const [confirmingCryptoPayoutFail, setConfirmingCryptoPayoutFail] = useState(null);

  const loadCardPayouts = () => {
    if (!token) return;
    setLoadingCardPayouts(true);
    getAdminCardPayouts(token, {
      status: cardPayoutStatusFilter || undefined,
      take: 100,
    })
      .then((data) => setCardPayouts(data?.items ?? []))
      .catch(() => setCardPayouts([]))
      .finally(() => setLoadingCardPayouts(false));
  };

  const loadCryptoPayoutRequests = () => {
    if (!token) return;
    setLoadingCryptoPayoutRequests(true);
    getAdminCryptoPayoutRequests(token, { status: cryptoPayoutStatusFilter || undefined, take: 100 })
      .then((data) => setCryptoPayoutRequests(data?.items ?? []))
      .catch(() => setCryptoPayoutRequests([]))
      .finally(() => setLoadingCryptoPayoutRequests(false));
  };

  useEffect(() => {
    loadCardPayouts();
  }, [token, cardPayoutStatusFilter]);

  useEffect(() => {
    loadCryptoPayoutRequests();
  }, [token, cryptoPayoutStatusFilter]);

  const handleCardPayoutComplete = (id) => {
    setConfirmingCardPayoutComplete(id);
    setError(null);
    adminCardPayoutComplete(id, token)
      .then(() => loadCardPayouts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingCardPayoutComplete(null));
  };

  const handleCardPayoutFail = (id) => {
    setConfirmingCardPayoutFail(id);
    setError(null);
    adminCardPayoutFail(id, token)
      .then(() => loadCardPayouts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingCardPayoutFail(null));
  };

  const handleCryptoPayoutComplete = (id) => {
    setConfirmingCryptoPayoutComplete(id);
    setError(null);
    adminCryptoPayoutComplete(id, token)
      .then(() => loadCryptoPayoutRequests())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingCryptoPayoutComplete(null));
  };

  const handleCryptoPayoutFail = (id) => {
    setConfirmingCryptoPayoutFail(id);
    setError(null);
    adminCryptoPayoutFail(id, token)
      .then(() => loadCryptoPayoutRequests())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingCryptoPayoutFail(null));
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 0 }, overflowX: 'hidden', maxWidth: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('withdrawFromUsers')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('cardPayoutRequests')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('cardPayoutRequestsHint')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label={t('filterByStatus')}
              value={cardPayoutStatusFilter}
              onChange={(e) => setCardPayoutStatusFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="">{t('statusAll')}</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </TextField>
          </Box>
          {loadingCardPayouts ? (
            <Skeleton height={60} />
          ) : cardPayouts.length === 0 ? (
            <Typography color="text.secondary">{t('noCardPayoutRequests')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('user')}</TableCell>
                    <TableCell>{t('amount')}</TableCell>
                    <TableCell>{t('cardNumber')}</TableCell>
                    <TableCell>{t('cardHolderName')}</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>{t('date')}</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cardPayouts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.user?.email ?? r.user?.nickname ?? r.user?.id ?? r.userId}</TableCell>
                      <TableCell>{r.amount} {r.currency}</TableCell>
                      <TableCell>{maskCardNumber(r.cardNumber)}</TableCell>
                      <TableCell>{r.cardHolderName ?? '—'}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        {r.status === 'PENDING' && (
                          <Box
                            component="span"
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                              justifyContent: 'flex-end',
                              '& .MuiButton-root': { minHeight: 44 },
                            }}
                          >
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleCardPayoutComplete(r.id)}
                              disabled={confirmingCardPayoutComplete === r.id}
                            >
                              {confirmingCardPayoutComplete === r.id ? '…' : t('markCompleted')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleCardPayoutFail(r.id)}
                              disabled={confirmingCardPayoutFail === r.id}
                            >
                              {confirmingCardPayoutFail === r.id ? '…' : t('markFailed')}
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('cryptoPayoutRequests')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('cryptoPayoutRequestsHint')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label={t('filterByStatus')}
              value={cryptoPayoutStatusFilter}
              onChange={(e) => setCryptoPayoutStatusFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="">{t('statusAll')}</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </TextField>
          </Box>
          {loadingCryptoPayoutRequests ? (
            <Skeleton height={60} />
          ) : cryptoPayoutRequests.length === 0 ? (
            <Typography color="text.secondary">{t('noCryptoPayoutRequests')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('user')}</TableCell>
                    <TableCell>{t('amount')}</TableCell>
                    <TableCell>{t('cryptoWalletLabel')}</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell>{t('date')}</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cryptoPayoutRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.user?.email ?? r.user?.nickname ?? r.user?.id ?? r.userId}</TableCell>
                      <TableCell>{r.amount} {r.currency}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 160 }}>{r.walletAddress ? `${r.walletAddress.slice(0, 10)}…${r.walletAddress.slice(-8)}` : '—'}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        {r.status === 'PENDING' && (
                          <Box
                            component="span"
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                              justifyContent: 'flex-end',
                              '& .MuiButton-root': { minHeight: 44 },
                            }}
                          >
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleCryptoPayoutComplete(r.id)}
                              disabled={confirmingCryptoPayoutComplete === r.id}
                            >
                              {confirmingCryptoPayoutComplete === r.id ? '…' : t('markCompleted')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleCryptoPayoutFail(r.id)}
                              disabled={confirmingCryptoPayoutFail === r.id}
                            >
                              {confirmingCryptoPayoutFail === r.id ? '…' : t('markFailed')}
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
