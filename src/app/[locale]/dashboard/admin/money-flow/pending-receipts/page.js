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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminPendingReceipts,
  adminConfirmReceipt,
  adminDeclineReceipt,
  getAdminPendingCryptoReceipts,
  adminConfirmCryptoReceipt,
  adminDeclineCryptoReceipt,
  getAdminPendingIbanReceipts,
  adminConfirmIbanReceipt,
  adminDeclineIbanReceipt,
  getAdminPendingBalanceTopUpReceipts,
  adminConfirmBalanceTopUpReceipt,
  adminDeclineBalanceTopUpReceipt,
  adminGetOrCreateContactBuyer,
  adminSendContactBuyerMessage,
  acknowledgeAdminPendingReceiptsView,
} from '@/lib/api';
import Link from 'next/link';

export default function AdminPendingReceiptsPage() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [error, setError] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [confirmingReceipt, setConfirmingReceipt] = useState(null);
  const [decliningReceipt, setDecliningReceipt] = useState(null);
  const [cryptoReceipts, setCryptoReceipts] = useState([]);
  const [loadingCryptoReceipts, setLoadingCryptoReceipts] = useState(true);
  const [confirmingCryptoReceipt, setConfirmingCryptoReceipt] = useState(null);
  const [decliningCryptoReceipt, setDecliningCryptoReceipt] = useState(null);
  const [ibanReceipts, setIbanReceipts] = useState([]);
  const [loadingIbanReceipts, setLoadingIbanReceipts] = useState(true);
  const [confirmingIbanReceipt, setConfirmingIbanReceipt] = useState(null);
  const [decliningIbanReceipt, setDecliningIbanReceipt] = useState(null);
  const [balanceTopUpReceipts, setBalanceTopUpReceipts] = useState([]);
  const [loadingBalanceTopUpReceipts, setLoadingBalanceTopUpReceipts] = useState(true);
  const [confirmingBalanceTopUp, setConfirmingBalanceTopUp] = useState(null);
  const [decliningBalanceTopUp, setDecliningBalanceTopUp] = useState(null);
  const [contactBuyerOrderId, setContactBuyerOrderId] = useState(null);
  const [contactBuyerConvo, setContactBuyerConvo] = useState(null);
  const [contactBuyerMessage, setContactBuyerMessage] = useState('');
  const [contactBuyerLoading, setContactBuyerLoading] = useState(false);
  const [contactBuyerSending, setContactBuyerSending] = useState(false);

  const loadReceipts = () => {
    if (!token) return;
    setLoadingReceipts(true);
    getAdminPendingReceipts(token)
      .then((data) => setReceipts(data?.items ?? []))
      .catch(() => setReceipts([]))
      .finally(() => setLoadingReceipts(false));
  };

  const loadCryptoReceipts = () => {
    if (!token) return;
    setLoadingCryptoReceipts(true);
    getAdminPendingCryptoReceipts(token)
      .then((data) => setCryptoReceipts(data?.items ?? []))
      .catch(() => setCryptoReceipts([]))
      .finally(() => setLoadingCryptoReceipts(false));
  };

  const loadIbanReceipts = () => {
    if (!token) return;
    setLoadingIbanReceipts(true);
    getAdminPendingIbanReceipts(token)
      .then((data) => setIbanReceipts(data?.items ?? []))
      .catch(() => setIbanReceipts([]))
      .finally(() => setLoadingIbanReceipts(false));
  };

  const loadBalanceTopUpReceipts = () => {
    if (!token) return;
    setLoadingBalanceTopUpReceipts(true);
    getAdminPendingBalanceTopUpReceipts(token)
      .then((data) => setBalanceTopUpReceipts(data?.items ?? []))
      .catch(() => setBalanceTopUpReceipts([]))
      .finally(() => setLoadingBalanceTopUpReceipts(false));
  };

  useEffect(() => {
    if (!token) return;
    acknowledgeAdminPendingReceiptsView(token)
      .then(() => {
        try {
          window.dispatchEvent(new Event('refetchAdminMoneyFlowBadges'));
        } catch (_) {}
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    loadReceipts();
  }, [token]);
  useEffect(() => {
    loadCryptoReceipts();
  }, [token]);
  useEffect(() => {
    loadIbanReceipts();
  }, [token]);
  useEffect(() => {
    loadBalanceTopUpReceipts();
  }, [token]);

  const handleConfirmReceipt = (orderId) => {
    setConfirmingReceipt(orderId);
    setError(null);
    adminConfirmReceipt(orderId, token)
      .then(() => loadReceipts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingReceipt(null));
  };

  const handleDeclineReceipt = (orderId) => {
    if (!confirm(t('declineReceiptConfirm'))) return;
    setDecliningReceipt(orderId);
    setError(null);
    adminDeclineReceipt(orderId, token)
      .then(() => loadReceipts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setDecliningReceipt(null));
  };

  const handleOpenContactBuyer = (orderId) => {
    setContactBuyerOrderId(orderId);
    setContactBuyerConvo(null);
    setContactBuyerMessage('');
    setContactBuyerLoading(true);
    setError(null);
    adminGetOrCreateContactBuyer(orderId, {}, token)
      .then((convo) => setContactBuyerConvo(convo))
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setContactBuyerLoading(false));
  };

  const handleSendContactBuyerMessage = () => {
    const text = (contactBuyerMessage || '').trim();
    if (!text || !contactBuyerOrderId || !token) return;
    setContactBuyerSending(true);
    setError(null);
    adminSendContactBuyerMessage(contactBuyerOrderId, { text }, token)
      .then((msg) => {
        setContactBuyerConvo((prev) =>
          prev ? { ...prev, messages: [...(prev.messages || []), { ...msg, sender: { role: 'ADMIN' } }] } : prev
        );
        setContactBuyerMessage('');
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setContactBuyerSending(false));
  };

  const handleCloseContactBuyerModal = () => {
    setContactBuyerOrderId(null);
    setContactBuyerConvo(null);
    setContactBuyerMessage('');
  };

  const handleConfirmCryptoReceipt = (orderId) => {
    setConfirmingCryptoReceipt(orderId);
    setError(null);
    adminConfirmCryptoReceipt(orderId, token)
      .then(() => {
        loadCryptoReceipts();
        loadReceipts();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingCryptoReceipt(null));
  };

  const handleDeclineCryptoReceipt = (orderId) => {
    setDecliningCryptoReceipt(orderId);
    setError(null);
    adminDeclineCryptoReceipt(orderId, token)
      .then(() => {
        loadCryptoReceipts();
        loadReceipts();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setDecliningCryptoReceipt(null));
  };

  const handleConfirmIbanReceipt = (orderId) => {
    setConfirmingIbanReceipt(orderId);
    setError(null);
    adminConfirmIbanReceipt(orderId, token)
      .then(() => {
        loadIbanReceipts();
        loadReceipts();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingIbanReceipt(null));
  };

  const handleDeclineIbanReceipt = (orderId) => {
    setDecliningIbanReceipt(orderId);
    setError(null);
    adminDeclineIbanReceipt(orderId, token)
      .then(() => {
        loadIbanReceipts();
        loadReceipts();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setDecliningIbanReceipt(null));
  };

  const handleConfirmBalanceTopUp = (topUpId) => {
    setConfirmingBalanceTopUp(topUpId);
    setError(null);
    adminConfirmBalanceTopUpReceipt(topUpId, token)
      .then(() => loadBalanceTopUpReceipts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setConfirmingBalanceTopUp(null));
  };

  const handleDeclineBalanceTopUp = (topUpId) => {
    if (!confirm(t('declineReceiptConfirm'))) return;
    setDecliningBalanceTopUp(topUpId);
    setError(null);
    adminDeclineBalanceTopUpReceipt(topUpId, token)
      .then(() => loadBalanceTopUpReceipts())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setDecliningBalanceTopUp(null));
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 0 }, overflowX: 'hidden', maxWidth: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('pendingReceiptConfirmation')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('pendingReceipts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pendingReceiptsHint')}
          </Typography>
          {loadingReceipts ? (
            <Skeleton height={60} />
          ) : receipts.length === 0 ? (
            <Typography color="text.secondary">{t('noPendingReceipts')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>{t('buyerCardLast4')}</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Marked sent</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.orderId}>
                      <TableCell>
                        <Link href={`/${locale}/dashboard/orders/${r.orderId}`} target="_blank" rel="noopener">
                          {r.orderNumber ?? `${r.orderId.slice(0, 8)}…`}
                        </Link>
                      </TableCell>
                      <TableCell>{r.buyer?.email ?? r.buyer?.nickname ?? r.buyer?.id}</TableCell>
                      <TableCell>{r.buyerCardLast4 ?? '—'}</TableCell>
                      <TableCell>
                        {r.buyerAmount != null ? Number(r.buyerAmount).toFixed(2) : '—'} {r.buyerCurrency}
                      </TableCell>
                      <TableCell>{r.buyerMarkedSentAt ? new Date(r.buyerMarkedSentAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Box
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
                            variant="outlined"
                            onClick={() => handleOpenContactBuyer(r.orderId)}
                          >
                            {t('messageUser')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeclineReceipt(r.orderId)}
                            disabled={decliningReceipt === r.orderId || confirmingReceipt === r.orderId}
                          >
                            {decliningReceipt === r.orderId ? '…' : t('declineReceipt')}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleConfirmReceipt(r.orderId)}
                            disabled={confirmingReceipt === r.orderId}
                          >
                            {confirmingReceipt === r.orderId ? '…' : t('confirmReceipt')}
                          </Button>
                        </Box>
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
            {t('pendingCryptoReceipts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pendingCryptoReceiptsHint')}
          </Typography>
          {loadingCryptoReceipts ? (
            <Skeleton height={60} />
          ) : cryptoReceipts.length === 0 ? (
            <Typography color="text.secondary">{t('noPendingCryptoReceipts')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Wallet</TableCell>
                    <TableCell>Marked sent</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cryptoReceipts.map((r) => (
                    <TableRow key={r.orderId}>
                      <TableCell>
                        <Link href={`/${locale}/dashboard/orders/${r.orderId}`} target="_blank" rel="noopener">
                          {r.orderNumber ?? `${r.orderId.slice(0, 8)}…`}
                        </Link>
                      </TableCell>
                      <TableCell>{r.buyer?.email ?? r.buyer?.nickname ?? r.buyer?.id}</TableCell>
                      <TableCell>{r.buyerAmount != null ? Number(r.buyerAmount).toFixed(2) : '—'} {r.buyerCurrency}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 140 }}>{r.cryptoWalletAddress ? `${r.cryptoWalletAddress.slice(0, 8)}…${r.cryptoWalletAddress.slice(-6)}` : '—'}</TableCell>
                      <TableCell>{r.buyerMarkedSentAt ? new Date(r.buyerMarkedSentAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            justifyContent: 'flex-end',
                            '& .MuiButton-root': { minHeight: 44 },
                          }}
                        >
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDeclineCryptoReceipt(r.orderId)} disabled={decliningCryptoReceipt === r.orderId || confirmingCryptoReceipt === r.orderId}>
                            {decliningCryptoReceipt === r.orderId ? '…' : t('declineReceipt')}
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleConfirmCryptoReceipt(r.orderId)} disabled={confirmingCryptoReceipt === r.orderId}>
                            {confirmingCryptoReceipt === r.orderId ? '…' : t('confirmReceipt')}
                          </Button>
                        </Box>
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
            {t('pendingIbanReceipts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pendingIbanReceiptsHint')}
          </Typography>
          {loadingIbanReceipts ? (
            <Skeleton height={60} />
          ) : ibanReceipts.length === 0 ? (
            <Typography color="text.secondary">{t('noPendingIbanReceipts')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Marked sent</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ibanReceipts.map((r) => (
                    <TableRow key={r.orderId}>
                      <TableCell>
                        <Link href={`/${locale}/dashboard/orders/${r.orderId}`} target="_blank" rel="noopener">
                          {r.orderNumber ?? `${r.orderId.slice(0, 8)}…`}
                        </Link>
                      </TableCell>
                      <TableCell>{r.buyer?.email ?? r.buyer?.nickname ?? r.buyer?.id}</TableCell>
                      <TableCell>{r.buyerAmount != null ? Number(r.buyerAmount).toFixed(2) : '—'} {r.buyerCurrency}</TableCell>
                      <TableCell>{r.buyerMarkedSentAt ? new Date(r.buyerMarkedSentAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', '& .MuiButton-root': { minHeight: 44 } }}>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDeclineIbanReceipt(r.orderId)} disabled={decliningIbanReceipt === r.orderId || confirmingIbanReceipt === r.orderId}>
                            {decliningIbanReceipt === r.orderId ? '…' : t('declineReceipt')}
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleConfirmIbanReceipt(r.orderId)} disabled={confirmingIbanReceipt === r.orderId}>
                            {confirmingIbanReceipt === r.orderId ? '…' : t('confirmReceipt')}
                          </Button>
                        </Box>
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
            {t('pendingBalanceTopUpReceipts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pendingBalanceTopUpReceiptsHint')}
          </Typography>
          {loadingBalanceTopUpReceipts ? (
            <Skeleton height={60} />
          ) : balanceTopUpReceipts.length === 0 ? (
            <Typography color="text.secondary">{t('noPendingBalanceTopUpReceipts')}</Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('topUpId')}</TableCell>
                    <TableCell>{t('user')}</TableCell>
                    <TableCell>{t('topUpKind')}</TableCell>
                    <TableCell>{t('amount')}</TableCell>
                    <TableCell>Marked sent</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {balanceTopUpReceipts.map((r) => (
                    <TableRow key={r.topUpId}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {r.topUpId ? `${r.topUpId.slice(0, 8)}…` : '—'}
                      </TableCell>
                      <TableCell>{r.user?.email ?? r.user?.nickname ?? r.user?.id}</TableCell>
                      <TableCell>{r.kind} · {r.paymentMethod}</TableCell>
                      <TableCell>
                        {r.amount != null ? Number(r.amount).toFixed(2) : '—'} {r.currency}
                      </TableCell>
                      <TableCell>{r.buyerMarkedSentAt ? new Date(r.buyerMarkedSentAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', '& .MuiButton-root': { minHeight: 44 } }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeclineBalanceTopUp(r.topUpId)}
                            disabled={decliningBalanceTopUp === r.topUpId || confirmingBalanceTopUp === r.topUpId}
                          >
                            {decliningBalanceTopUp === r.topUpId ? '…' : t('declineReceipt')}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleConfirmBalanceTopUp(r.topUpId)}
                            disabled={confirmingBalanceTopUp === r.topUpId}
                          >
                            {confirmingBalanceTopUp === r.topUpId ? '…' : t('confirmReceipt')}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!contactBuyerOrderId} onClose={handleCloseContactBuyerModal} maxWidth="sm" fullWidth>
        <DialogTitle>{t('messageUser')} — Order {contactBuyerOrderId?.slice(0, 8)}…</DialogTitle>
        <DialogContent>
          {contactBuyerLoading ? (
            <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">Loading…</Typography></Box>
          ) : contactBuyerConvo ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('contactBuyerIntro')} <Link href={contactBuyerConvo.orderLink} target="_blank" rel="noopener">{contactBuyerConvo.orderLink}</Link>
              </Typography>
              <Box sx={{ maxHeight: 320, overflow: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                {(contactBuyerConvo.messages || []).map((m) => (
                  <Box key={m.id} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {m.sender?.role === 'ADMIN' || m.sender?.role === 'MODERATOR' ? 'Support' : (m.sender?.nickname || m.sender?.email || 'User')} · {new Date(m.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                  </Box>
                ))}
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={2}
                placeholder={t('contactBuyerPlaceholder')}
                value={contactBuyerMessage}
                onChange={(e) => setContactBuyerMessage(e.target.value)}
                disabled={contactBuyerSending}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContactBuyerModal}>{t('close')}</Button>
          {contactBuyerConvo && (
            <Button
              variant="contained"
              onClick={handleSendContactBuyerMessage}
              disabled={contactBuyerSending || !(contactBuyerMessage || '').trim()}
            >
              {contactBuyerSending ? '…' : t('send')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
