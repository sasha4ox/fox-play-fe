'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminCardPaymentEnabled,
  setAdminCardPaymentEnabled,
  getAdminCards,
  createAdminCard,
  updateAdminCard,
  setAdminCardActive,
  deleteAdminCard,
  getAdminPendingReceipts,
  getAdminPendingPayouts,
  adminConfirmReceipt,
  adminConfirmPayout,
  getAdminCardPayouts,
  adminCardPayoutComplete,
  adminCardPayoutFail,
} from '@/lib/api';
import Link from 'next/link';
import { useLocale } from 'next-intl';

function maskCardNumber(num) {
  if (!num || num.length < 8) return '****';
  return `${num.slice(0, 4)} **** **** ${num.slice(-4)}`;
}

export default function AdminMoneyFlowPage() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [savingFlag, setSavingFlag] = useState(false);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardHolder, setNewCardHolder] = useState('');
  const [newExpiryMonth, setNewExpiryMonth] = useState('');
  const [newExpiryYear, setNewExpiryYear] = useState('');
  const [newPaymentComment, setNewPaymentComment] = useState('');
  const [submittingCard, setSubmittingCard] = useState(false);
  const [editCardId, setEditCardId] = useState(null);
  const [editPaymentComment, setEditPaymentComment] = useState('');
  const [savingEditCard, setSavingEditCard] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(null);
  const [confirmingPayout, setConfirmingPayout] = useState(null);
  const [cardPayouts, setCardPayouts] = useState([]);
  const [loadingCardPayouts, setLoadingCardPayouts] = useState(true);
  const [cardPayoutStatusFilter, setCardPayoutStatusFilter] = useState('');
  const [confirmingCardPayoutComplete, setConfirmingCardPayoutComplete] = useState(null);
  const [confirmingCardPayoutFail, setConfirmingCardPayoutFail] = useState(null);
  const [error, setError] = useState(null);

  const loadFlag = () => {
    if (!token) return;
    setLoadingFlag(true);
    getAdminCardPaymentEnabled(token)
      .then(setCardPaymentEnabled)
      .catch(() => setCardPaymentEnabled(false))
      .finally(() => setLoadingFlag(false));
  };

  const loadCards = () => {
    if (!token) return;
    setLoadingCards(true);
    getAdminCards(token)
      .then((data) => setCards(data?.cards ?? []))
      .catch(() => setCards([]))
      .finally(() => setLoadingCards(false));
  };

  const loadReceipts = () => {
    if (!token) return;
    setLoadingReceipts(true);
    getAdminPendingReceipts(token)
      .then((data) => setReceipts(data?.items ?? []))
      .catch(() => setReceipts([]))
      .finally(() => setLoadingReceipts(false));
  };

  const loadPayouts = () => {
    if (!token) return;
    setLoadingPayouts(true);
    getAdminPendingPayouts(token)
      .then((data) => setPayouts(data?.items ?? []))
      .catch(() => setPayouts([]))
      .finally(() => setLoadingPayouts(false));
  };

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

  useEffect(() => {
    loadFlag();
  }, [token]);
  useEffect(() => {
    loadCards();
  }, [token]);
  useEffect(() => {
    loadReceipts();
    loadPayouts();
  }, [token]);
  useEffect(() => {
    loadCardPayouts();
  }, [token, cardPayoutStatusFilter]);

  const handleToggleCardPayment = (e) => {
    const checked = e.target.checked;
    setSavingFlag(true);
    setError(null);
    setAdminCardPaymentEnabled(checked, token)
      .then(() => setCardPaymentEnabled(checked))
      .catch((err) => {
        setError(err.message || 'Failed to update');
      })
      .finally(() => setSavingFlag(false));
  };

  const handleSetActive = (cardId) => {
    setError(null);
    setAdminCardActive(cardId, token)
      .then(() => loadCards())
      .catch((err) => setError(err.message || 'Failed'));
  };

  const handleDeleteCard = (cardId) => {
    if (!confirm(t('deleteCard') + '?')) return;
    setError(null);
    deleteAdminCard(cardId, token)
      .then(() => loadCards())
      .catch((err) => setError(err.message || 'Failed'));
  };

  const handleAddCard = () => {
    setSubmittingCard(true);
    setError(null);
    createAdminCard(
      {
        cardNumber: newCardNumber.replace(/\s/g, ''),
        cardHolderName: newCardHolder.trim(),
        expiryMonth: newExpiryMonth ? parseInt(newExpiryMonth, 10) : null,
        expiryYear: newExpiryYear ? parseInt(newExpiryYear, 10) : null,
        paymentComment: newPaymentComment.trim() || null,
      },
      token
    )
      .then(() => {
        setAddCardOpen(false);
        setNewCardNumber('');
        setNewCardHolder('');
        setNewExpiryMonth('');
        setNewExpiryYear('');
        setNewPaymentComment('');
        loadCards();
      })
      .catch((err) => setError(err.message || 'Failed to add card'))
      .finally(() => setSubmittingCard(false));
  };

  const handleOpenEditCard = (card) => {
    setEditCardId(card.id);
    setEditPaymentComment(card.paymentComment || '');
  };

  const handleSaveEditCard = () => {
    if (!editCardId) return;
    setSavingEditCard(true);
    setError(null);
    updateAdminCard(editCardId, { paymentComment: editPaymentComment.trim() || null }, token)
      .then(() => {
        setEditCardId(null);
        loadCards();
      })
      .catch((err) => setError(err.message || 'Failed to update'))
      .finally(() => setSavingEditCard(false));
  };

  const handleConfirmReceipt = (orderId) => {
    setConfirmingReceipt(orderId);
    setError(null);
    adminConfirmReceipt(orderId, token)
      .then(() => {
        loadReceipts();
        loadPayouts();
      })
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setConfirmingReceipt(null));
  };

  const handleConfirmPayout = (orderId) => {
    setConfirmingPayout(orderId);
    setError(null);
    adminConfirmPayout(orderId, token)
      .then(() => loadPayouts())
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setConfirmingPayout(null));
  };

  const handleCardPayoutComplete = (id) => {
    setConfirmingCardPayoutComplete(id);
    setError(null);
    adminCardPayoutComplete(id, token)
      .then(() => loadCardPayouts())
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setConfirmingCardPayoutComplete(null));
  };

  const handleCardPayoutFail = (id) => {
    setConfirmingCardPayoutFail(id);
    setError(null);
    adminCardPayoutFail(id, token)
      .then(() => loadCardPayouts())
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setConfirmingCardPayoutFail(null));
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('moneyFlow')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('cardPaymentEnabled')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('cardPaymentEnabledHint')}
          </Typography>
          {loadingFlag ? (
            <Skeleton width={120} height={32} />
          ) : (
            <FormControlLabel
              control={
                <Switch
                  checked={cardPaymentEnabled}
                  onChange={handleToggleCardPayment}
                  disabled={savingFlag}
                />
              }
              label={cardPaymentEnabled ? 'On' : 'Off'}
            />
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t('paymentCards')}
            </Typography>
            <Button variant="outlined" size="small" onClick={() => setAddCardOpen(true)}>
              {t('addCard')}
            </Button>
          </Box>
          {loadingCards ? (
            <Skeleton height={80} />
          ) : cards.length === 0 ? (
            <Typography color="text.secondary">{t('noCards')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('cardNumber')}</TableCell>
                  <TableCell>{t('cardHolderName')}</TableCell>
                  <TableCell>{t('paymentCommentLabel')}</TableCell>
                  <TableCell>{t('enabled')}</TableCell>
                  <TableCell align="right">{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{maskCardNumber(c.cardNumber)}</TableCell>
                    <TableCell>{c.cardHolderName}</TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>{c.paymentComment ? (c.paymentComment.length > 30 ? c.paymentComment.slice(0, 30) + '…' : c.paymentComment) : '—'}</TableCell>
                    <TableCell>{c.isActive ? '✓ Active' : '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleOpenEditCard(c)}>
                        {t('editCard')}
                      </Button>
                      {!c.isActive && (
                        <Button size="small" onClick={() => handleSetActive(c.id)}>
                          {t('setActive')}
                        </Button>
                      )}
                      <IconButton size="small" onClick={() => handleDeleteCard(c.id)} aria-label="Delete">
                        🗑
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
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
            <Table size="small">
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
                        {r.orderId.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>{r.buyer?.email ?? r.buyer?.nickname ?? r.buyer?.id}</TableCell>
                    <TableCell>{r.buyerCardLast4 ?? '—'}</TableCell>
                    <TableCell>
                      {r.buyerAmount} {r.buyerCurrency}
                    </TableCell>
                    <TableCell>{r.buyerMarkedSentAt ? new Date(r.buyerMarkedSentAt).toLocaleString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleConfirmReceipt(r.orderId)}
                        disabled={confirmingReceipt === r.orderId}
                      >
                        {confirmingReceipt === r.orderId ? '…' : t('confirmReceipt')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('pendingPayouts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pendingPayoutsHint')}
          </Typography>
          {loadingPayouts ? (
            <Skeleton height={60} />
          ) : payouts.length === 0 ? (
            <Typography color="text.secondary">{t('noPendingPayouts')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell align="right">{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.orderId}>
                    <TableCell>
                      <Link href={`/${locale}/dashboard/orders/${p.orderId}`} target="_blank" rel="noopener">
                        {p.orderId.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>{p.seller?.email ?? p.seller?.nickname ?? p.seller?.id}</TableCell>
                    <TableCell>
                      {p.sellerAmount} {p.sellerCurrency}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleConfirmPayout(p.orderId)}
                        disabled={confirmingPayout === p.orderId}
                      >
                        {confirmingPayout === p.orderId ? '…' : t('confirmPayout')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
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
              sx={{ minWidth: 160 }}
              SelectProps={{ native: true }}
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
            <Table size="small">
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
                        <>
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
                            sx={{ ml: 1 }}
                          >
                            {confirmingCardPayoutFail === r.id ? '…' : t('markFailed')}
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addCardOpen} onClose={() => !submittingCard && setAddCardOpen(false)}>
        <DialogTitle>{t('addCard')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('cardNumber')}
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
            margin="dense"
            placeholder="1234 5678 9012 3456"
          />
          <TextField
            fullWidth
            label={t('cardHolderName')}
            value={newCardHolder}
            onChange={(e) => setNewCardHolder(e.target.value)}
            margin="dense"
          />
          <TextField
            fullWidth
            label={t('paymentCommentLabel')}
            value={newPaymentComment}
            onChange={(e) => setNewPaymentComment(e.target.value)}
            margin="dense"
            placeholder={t('paymentCommentPlaceholder')}
            helperText={t('paymentCommentHint')}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              type="number"
              label={t('expiryMonth')}
              value={newExpiryMonth}
              onChange={(e) => setNewExpiryMonth(e.target.value)}
              inputProps={{ min: 1, max: 12 }}
              size="small"
              sx={{ width: 120 }}
            />
            <TextField
              type="number"
              label={t('expiryYear')}
              value={newExpiryYear}
              onChange={(e) => setNewExpiryYear(e.target.value)}
              inputProps={{ min: new Date().getFullYear() }}
              size="small"
              sx={{ width: 120 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCardOpen(false)} disabled={submittingCard}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddCard} disabled={submittingCard || !newCardNumber.trim() || !newCardHolder.trim()}>
            {submittingCard ? '…' : t('addCard')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editCardId} onClose={() => !savingEditCard && setEditCardId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editCardPaymentComment')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('paymentCommentLabel')}
            value={editPaymentComment}
            onChange={(e) => setEditPaymentComment(e.target.value)}
            margin="dense"
            placeholder={t('paymentCommentPlaceholder')}
            helperText={t('paymentCommentHint')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCardId(null)} disabled={savingEditCard}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEditCard} disabled={savingEditCard}>
            {savingEditCard ? '…' : t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
