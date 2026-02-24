'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { useAuthStore } from '@/store/authStore';
import { getOrderCardPayment, markOrderCardPaymentSent } from '@/lib/api';

function formatCardNumber(num) {
  if (!num) return '';
  const s = num.replace(/\s/g, '');
  const groups = s.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

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

export default function OrderCardPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('CardPayment');
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [last4DialogOpen, setLast4DialogOpen] = useState(false);
  const [last4, setLast4] = useState('');

  const deadlineAt = data?.paymentDeadlineAt;
  const remaining = useCountdown(deadlineAt);
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!orderId || !token) return;
    setLoading(true);
    setError(null);
    getOrderCardPayment(orderId, token)
      .then(setData)
      .catch((err) => {
        setError(err.message || 'Failed to load');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [orderId, token]);

  const handleConfirmSentClick = () => {
    setLast4('');
    setLast4DialogOpen(true);
  };

  const handleLast4Submit = () => {
    const digits = last4.replace(/\D/g, '').slice(0, 4);
    if (digits.length !== 4) {
      setError(t('last4Required'));
      return;
    }
    if (!orderId || !token) return;
    setSending(true);
    setError(null);
    markOrderCardPaymentSent(orderId, { last4: digits }, token)
      .then(() => {
        setLast4DialogOpen(false);
        setLast4('');
        return getOrderCardPayment(orderId, token);
      })
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
  const showCard = data?.cardNumber && (status === 'awaiting_payment' || status === 'awaiting_confirmation');
  const canMarkSent = status === 'awaiting_payment' && !expired && data?.cardNumber;

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
        </Box>
      )}

      {data?.paymentComment && (status === 'awaiting_payment' || status === 'awaiting_confirmation') && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>{t('enterInTransferComment')}</Typography>
          <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {data.paymentComment}
          </Typography>
        </Alert>
      )}

      {showCard && (
        <Box
          sx={{
            maxWidth: 400,
            aspectRatio: '1.586/1',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: 3,
            p: 3,
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            mb: 3,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 20,
              left: 24,
              width: 40,
              height: 30,
              borderRadius: 1,
              background: 'linear-gradient(135deg, #d4af37 0%, #c5a028 50%, #b8960c 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
            },
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.8, letterSpacing: 2, position: 'relative', zIndex: 1 }}>
            {t('cardNumberLabel')}
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', letterSpacing: 2, my: 1, position: 'relative', zIndex: 1 }}>
            {formatCardNumber(data.cardNumber)}
          </Typography>
          <Box sx={{ mt: 2, position: 'relative', zIndex: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>{t('cardholderLabel')}</Typography>
            <Typography variant="body1" sx={{ textTransform: 'uppercase' }}>
              {data.cardHolderName || '—'}
            </Typography>
          </Box>
        </Box>
      )}

      {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && deadlineAt && (
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: expired ? 'error.50' : remaining !== null && remaining <= 60 ? 'warning.50' : 'primary.50',
            border: '1px solid',
            borderColor: expired ? 'error.200' : remaining !== null && remaining <= 60 ? 'warning.200' : 'primary.200',
          }}
        >
          <Typography variant="overline" sx={{ color: '#1a1a1a', display: 'block', mb: 0.5 }} fontWeight={600}>
            {t('timeRemaining')}
          </Typography>
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{
              fontFamily: 'monospace',
              letterSpacing: 2,
              color: expired ? 'error.main' : remaining !== null && remaining <= 60 ? 'warning.dark' : 'primary.dark',
            }}
          >
            {remaining !== null ? formatTime(remaining) : '—'}
          </Typography>
          {expired && (
            <Typography variant="body2" color="error.main" sx={{ mt: 1 }} fontWeight={600}>
              {t('deadlinePassed')}
            </Typography>
          )}
        </Box>
      )}

      {status === 'awaiting_confirmation' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('statusAwaitingConfirmation')}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
        {canMarkSent && (
          <Button
            variant="contained"
            size="large"
            onClick={handleConfirmSentClick}
            disabled={sending || expired}
          >
            {sending ? '…' : t('iSentMoney')}
          </Button>
        )}
        <Button component={Link} href={base} variant="outlined">
          {status === 'confirmed' || status === 'expired' ? t('backToOrder') : t('openOrderChat')}
        </Button>
      </Box>

      <Dialog open={last4DialogOpen} onClose={() => !sending && setLast4DialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('last4DialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('last4DialogHint')}
          </Typography>
          <TextField
            fullWidth
            label={t('last4Label')}
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '[0-9]*' }}
            placeholder="1234"
            error={last4.length > 0 && last4.replace(/\D/g, '').length !== 4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLast4DialogOpen(false)} disabled={sending}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleLast4Submit} disabled={sending || last4.replace(/\D/g, '').length !== 4}>
            {sending ? '…' : t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
