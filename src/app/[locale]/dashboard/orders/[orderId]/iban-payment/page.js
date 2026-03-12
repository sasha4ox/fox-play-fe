'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { useAuthStore } from '@/store/authStore';
import { getOrderIbanPayment, markOrderIbanPaymentSent, extendOrderIbanPaymentDeadline } from '@/lib/api';
import ContentCopy from '@mui/icons-material/ContentCopy';

function useCountdown(deadlineAt) {
  const computeRemaining = () => {
    if (!deadlineAt) return null;
    const deadline = new Date(deadlineAt).getTime();
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  };
  const [remaining, setRemaining] = useState(() => computeRemaining());
  useEffect(() => {
    if (!deadlineAt) return;
    const deadline = new Date(deadlineAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
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

function CopyRow({ label, value, tCopy }) {
  const copy = () => {
    if (value && typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(value);
    }
  };
  if (!value) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          mb: 0.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <IconButton
          size="small"
          onClick={copy}
          aria-label={tCopy}
          sx={{ flexShrink: 0, minWidth: 44, minHeight: 44 }}
        >
          <ContentCopy fontSize="small" />
        </IconButton>
      </Box>
      <Typography
        variant="body1"
        sx={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function OrderIbanPaymentPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('IbanPayment');
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [extending, setExtending] = useState(false);

  const deadlineAt = data?.paymentDeadlineAt;
  const remaining = useCountdown(deadlineAt);
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!orderId || !token) return;
    setLoading(true);
    setError(null);
    getOrderIbanPayment(orderId, token)
      .then(setData)
      .catch((err) => {
        setError(err.message || 'Failed to load');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [orderId, token]);

  const handleExtendDeadline = () => {
    if (!orderId || !token) return;
    setExtending(true);
    setError(null);
    extendOrderIbanPaymentDeadline(orderId, token)
      .then(() => getOrderIbanPayment(orderId, token))
      .then((updated) => setData(updated))
      .catch((err) => setError(err.message || t('extendFailed')))
      .finally(() => setExtending(false));
  };

  const handleMarkSent = () => {
    if (!orderId || !token) return;
    setSending(true);
    setError(null);
    markOrderIbanPaymentSent(orderId, token)
      .then(() => getOrderIbanPayment(orderId, token))
      .then((updated) => {
        setData(updated);
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
  const showCredentials =
    (status === 'awaiting_payment' || status === 'awaiting_confirmation') &&
    (data?.iban || data?.bicSwift || data?.beneficiaryName || data?.beneficiaryBank || data?.bankName ||
      data?.accountCurrency || data?.taxId || data?.legalAddress || data?.correspondentAccount || data?.correspondentBank);
  const canMarkSent =
    status === 'awaiting_payment' && !expired && (data?.iban || data?.bicSwift);

  return (
    <Container maxWidth={{ xs: 'sm', md: 'md' }} sx={{ py: 4 }}>
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

      {data?.amount != null && data?.currency === 'EUR' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            {t('amount')}
          </Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {data.amount} EUR
          </Typography>
          {(status === 'awaiting_payment' || status === 'awaiting_confirmation') && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t('amountFeeNotice')}
            </Alert>
          )}
        </Box>
      )}

      {showCredentials && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {t('credentialsTitle')}
          </Typography>
          <CopyRow label={t('ibanLabel')} value={data.iban} tCopy={t('copy')} />
          <CopyRow label={t('accountCurrencyLabel')} value={data.accountCurrency} tCopy={t('copy')} />
          <CopyRow label={t('taxIdLabel')} value={data.taxId} tCopy={t('copy')} />
          <CopyRow label={t('beneficiaryNameLabel')} value={data.beneficiaryName} tCopy={t('copy')} />
          <CopyRow label={t('legalAddressLabel')} value={data.legalAddress} tCopy={t('copy')} />
          <CopyRow label={t('beneficiaryBankLabel')} value={data.beneficiaryBank ?? data.bankName} tCopy={t('copy')} />
          <CopyRow label={t('bicSwiftLabel')} value={data.bicSwift} tCopy={t('copy')} />
          <CopyRow label={t('correspondentAccountLabel')} value={data.correspondentAccount} tCopy={t('copy')} />
          <CopyRow label={t('correspondentBankLabel')} value={data.correspondentBank} tCopy={t('copy')} />
          {data.paymentReference && (
            <CopyRow label={t('paymentReferenceLabel')} value={data.paymentReference} tCopy={t('copy')} />
          )}
        </Paper>
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
            onClick={handleMarkSent}
            disabled={sending || expired}
            sx={{ minHeight: 44 }}
          >
            {sending ? '…' : t('iSentMoney')}
          </Button>
        )}
        <Button component={Link} href={base} variant="outlined" sx={{ minHeight: 44 }}>
          {status === 'confirmed' || status === 'expired' ? t('backToOrder') : t('openOrderChat')}
        </Button>
      </Box>
    </Container>
  );
}
