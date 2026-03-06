'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { getOrderCryptoPayment, markOrderCryptoPaymentSent, getCardPaymentOrderNumberMessage } from '@/lib/api';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

function useCountdown(deadlineAt) {
  const computeRemaining = () => {
    if (!deadlineAt) return null;
    const deadline = new Date(deadlineAt).getTime();
    const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    return left;
  };
  const [remaining, setRemaining] = useState(() => computeRemaining());
  useEffect(() => {
    if (!deadlineAt) return;
    const deadline = new Date(deadlineAt).getTime();
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemaining(left);
      return left;
    };
    setRemaining(tick());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);
  return remaining;
}

function formatTime(seconds) {
  if (seconds == null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function OrderCryptoPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('CryptoPayment');
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [orderNumberConfig, setOrderNumberConfig] = useState({ visible: false, text: '' });
  const [orderNumberConfirmed, setOrderNumberConfirmed] = useState(false);

  const deadlineAt = data?.paymentDeadlineAt;
  const remaining = useCountdown(deadlineAt);
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!orderId || !token) return;
    setLoading(true);
    setError(null);
    getOrderCryptoPayment(orderId, token)
      .then(setData)
      .catch((err) => {
        setError(err.message || 'Failed to load');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [orderId, token]);

  useEffect(() => {
    getCardPaymentOrderNumberMessage()
      .then(setOrderNumberConfig)
      .catch(() => setOrderNumberConfig({ visible: false, text: '' }));
  }, []);

  const handleConfirmSentClick = () => {
    if (!orderId || !token) return;
    setSending(true);
    setError(null);
    markOrderCryptoPaymentSent(orderId, token)
      .then(() => getOrderCryptoPayment(orderId, token))
      .then((updated) => {
        setData(updated);
        router.push(`/${locale}/dashboard/orders/${orderId}`);
      })
      .catch((err) => setError(err.message || t('failed')))
      .finally(() => setSending(false));
  };

  if (loading && !data) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const base = `/${locale}/dashboard/orders/${orderId}`;
  const status = data?.status;
  const showWallet = data?.cryptoWalletAddress && (status === 'awaiting_payment' || status === 'awaiting_confirmation');
  const requireOrderNumberConfirm = orderNumberConfig.visible;
  const canMarkSent =
    status === 'awaiting_payment' &&
    !expired &&
    data?.cryptoWalletAddress &&
    (!requireOrderNumberConfirm || orderNumberConfirmed);
  const displayOrderNumber = data?.orderNumber ?? orderId ?? '';
  const orderNumberMessage = orderNumberConfig.text.replace(/\{\{\s*orderId\s*\}\}/gi, displayOrderNumber);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('instruction')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data?.status === 'confirmed' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('statusConfirmed')}
        </Alert>
      )}

      {data?.status === 'expired' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('statusExpired')}
        </Alert>
      )}

      {data?.amount != null && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">{t('amount')}</Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {data.amount} {data.currency}
          </Typography>
          {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t('amountFeeNotice')}
            </Alert>
          )}
        </Box>
      )}

      {orderNumberConfig.visible && orderNumberMessage && (status === 'awaiting_payment' || status === 'awaiting_confirmation') && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            {t('orderNumberTitle')}
          </Typography>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem', letterSpacing: 0.5, color: 'text.primary', flex: 1, minWidth: 0 }}>
                {orderNumberMessage}
              </Typography>
              <Button size="medium" variant="outlined" color="primary" sx={{ flexShrink: 0, minHeight: 44 }} onClick={() => orderNumberMessage && navigator?.clipboard?.writeText?.(orderNumberMessage)}>
                {t('copy')}
              </Button>
            </Box>
            <FormControlLabel control={<Checkbox checked={orderNumberConfirmed} onChange={(e) => setOrderNumberConfirmed(e.target.checked)} color="primary" />} label={t('orderNumberConfirmLabel')} sx={{ mt: 2, display: 'block' }} />
          </Paper>
        </Box>
      )}

      {showWallet && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('walletLabel')}</Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 600 }}>
            {data.cryptoWalletAddress}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('networkHint')}</Typography>
        </Paper>
      )}

      {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && deadlineAt && (
        <Box sx={{ textAlign: 'center', mb: 3, p: 2, borderRadius: 2, bgcolor: expired ? 'error.50' : remaining !== null && remaining <= 60 ? 'warning.50' : 'primary.50', border: '1px solid', borderColor: expired ? 'error.200' : remaining !== null && remaining <= 60 ? 'warning.200' : 'primary.200' }}>
          <Typography variant="overline" sx={{ color: '#1a1a1a', display: 'block', mb: 0.5 }} fontWeight={600}>{t('timeRemaining')}</Typography>
          <Typography variant="h2" fontWeight={800} sx={{ fontFamily: 'monospace', letterSpacing: 2, color: expired ? 'error.main' : remaining !== null && remaining <= 60 ? 'warning.dark' : 'primary.dark' }}>
            {remaining !== null ? formatTime(remaining) : '—'}
          </Typography>
          {expired && <Typography variant="body2" color="error.main" sx={{ mt: 1 }} fontWeight={600}>{t('deadlinePassed')}</Typography>}
        </Box>
      )}

      {status === 'awaiting_confirmation' && (
        <Alert severity="info" sx={{ mb: 2 }}>{t('statusAwaitingConfirmation')}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
        {canMarkSent && (
          <Button variant="contained" size="large" onClick={handleConfirmSentClick} disabled={sending || expired}>
            {sending ? '…' : t('iSentMoney')}
          </Button>
        )}
        <Button component={Link} href={base} variant="outlined">
          {status === 'confirmed' || status === 'expired' ? t('backToOrder') : t('openOrderChat')}
        </Button>
      </Box>
    </Container>
  );
}
