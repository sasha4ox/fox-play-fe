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
import IconButton from '@mui/material/IconButton';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { useAuthStore } from '@/store/authStore';
import { getOrderCryptoPayment, markOrderCryptoPaymentSent, extendOrderCryptoPaymentDeadline } from '@/lib/api';

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

export default function PayCryptoPage() {
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
  const [extending, setExtending] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyAddress = () => {
    if (!data?.cryptoWalletAddress) return;
    if (typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(data.cryptoWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExtendDeadline = () => {
    if (!orderId || !token) return;
    setExtending(true);
    setError(null);
    extendOrderCryptoPaymentDeadline(orderId, token)
      .then(() => getOrderCryptoPayment(orderId, token))
      .then((updated) => setData(updated))
      .catch((err) => setError(err.message || t('extendFailed')))
      .finally(() => setExtending(false));
  };

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

  const orderLink = `/${locale}/dashboard/orders/${orderId}`;
  const status = data?.status;
  const showWallet = data?.cryptoWalletAddress && (status === 'awaiting_payment' || status === 'awaiting_confirmation');
  const canMarkSent =
    status === 'awaiting_payment' &&
    !expired &&
    data?.cryptoWalletAddress;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
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
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary">{t('amount')}</Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {data.amount} {data.currency}
          </Typography>
          <Alert severity="info" sx={{ mt: 1.5 }} variant="outlined">
            {t('amountInUsdNotice')}
          </Alert>
          {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t('amountFeeNotice')}
            </Alert>
          )}
        </Box>
      )}

      {showWallet && (
        <Box
          sx={{
            mb: 3,
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%)',
            color: '#fff',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset',
            p: 3,
            position: 'relative',
          }}
        >
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1.5, display: 'block', mb: 1.5 }}>
            {t('walletLabel')}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontFamily: 'monospace',
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              fontWeight: 600,
              letterSpacing: 0.5,
              wordBreak: 'break-all',
              lineHeight: 1.6,
              color: '#fff',
              userSelect: 'all',
            }}
          >
            {data.cryptoWalletAddress}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="medium"
              startIcon={<ContentCopyRounded />}
              onClick={handleCopyAddress}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                textTransform: 'none',
                minHeight: 44,
              }}
            >
              {copied ? t('copied') : t('copy')}
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.85 }}>
            {t('networkHint')}
          </Typography>
        </Box>
      )}

      {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && deadlineAt && (
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            p: 3,
            borderRadius: 2,
            bgcolor: expired ? 'error.50' : remaining !== null && remaining <= 60 ? 'warning.50' : 'primary.50',
            border: '1px solid',
            borderColor: expired ? 'error.200' : remaining !== null && remaining <= 60 ? 'warning.200' : 'primary.200',
          }}
        >
          <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }} fontWeight={600}>
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
          {expired && status !== 'confirmed' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error.main" fontWeight={600} sx={{ mb: 1.5 }}>
                {t('deadlinePassed')}
              </Typography>
              <Button
                variant="contained"
                color="warning"
                size="large"
                onClick={handleExtendDeadline}
                disabled={extending}
                sx={{ minHeight: 44 }}
              >
                {extending ? '…' : t('stillWantToPay')}
              </Button>
            </Box>
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
            sx={{ textTransform: 'none', minHeight: 48 }}
          >
            {sending ? '…' : t('iSentMoney')}
          </Button>
        )}
        <Button component={Link} href={orderLink} variant="outlined" sx={{ minHeight: 48 }}>
          {status === 'confirmed' || status === 'expired' ? t('backToOrder') : t('openOrderChat')}
        </Button>
      </Box>
    </Container>
  );
}
