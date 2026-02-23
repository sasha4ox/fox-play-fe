'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { getOrderCardPayment, markOrderCardPaymentSent } from '@/lib/api';

function formatCardNumber(num) {
  if (!num) return '';
  const s = num.replace(/\s/g, '');
  const groups = s.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

function useCountdown(deadlineAt) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!deadlineAt) return;
    const deadline = new Date(deadlineAt).getTime();
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemaining(left);
    };
    tick();
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
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

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

  const handleMarkSent = () => {
    if (!orderId || !token) return;
    setSending(true);
    setError(null);
    markOrderCardPaymentSent(orderId, token)
      .then(() => getOrderCardPayment(orderId, token))
      .then(setData)
      .catch((err) => setError(err.message || 'Failed'))
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
        Pay by card
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Send the exact amount to the card below within the time limit. Then press &quot;I sent money&quot;.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data?.status === 'confirmed' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Payment confirmed. You can continue to the order.
        </Alert>
      )}

      {data?.status === 'expired' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The payment time has expired. Please contact support or open the order to see next steps.
        </Alert>
      )}

      {data?.amount != null && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">Amount</Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {data.amount} {data.currency}
          </Typography>
        </Box>
      )}

      {showCard && (
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: 3,
            p: 3,
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            mb: 3,
            position: 'relative',
            overflow: 'hidden',
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
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.8, letterSpacing: 2 }}>
            CARD NUMBER
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', letterSpacing: 2, my: 1 }}>
            {formatCardNumber(data.cardNumber)}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>CARDHOLDER</Typography>
              <Typography variant="body1" sx={{ textTransform: 'uppercase' }}>
                {data.cardHolderName || '—'}
              </Typography>
            </Box>
            {(data.expiryMonth != null || data.expiryYear != null) && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>EXPIRES</Typography>
                <Typography variant="body1">
                  {[data.expiryMonth, data.expiryYear].filter(Boolean).join('/')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {status === 'awaiting_payment' && deadlineAt && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="overline" color="text.secondary">Time remaining</Typography>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{
              fontFamily: 'monospace',
              color: expired ? 'error.main' : remaining <= 60 ? 'warning.main' : 'text.primary',
            }}
          >
            {formatTime(remaining)}
          </Typography>
          {expired && (
            <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
              Deadline passed. Please contact support.
            </Typography>
          )}
        </Box>
      )}

      {status === 'awaiting_confirmation' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You marked that you sent the money. We will confirm when we receive it. You can check the order status in the order chat.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
        {canMarkSent && (
          <Button
            variant="contained"
            size="large"
            onClick={handleMarkSent}
            disabled={sending || expired}
          >
            {sending ? '…' : 'I sent money'}
          </Button>
        )}
        <Button component={Link} href={base} variant="outlined">
          {status === 'confirmed' || status === 'expired' ? 'Back to order' : 'Open order chat'}
        </Button>
      </Box>
    </Container>
  );
}
