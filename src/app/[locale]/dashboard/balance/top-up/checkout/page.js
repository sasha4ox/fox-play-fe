'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { getAvailablePaymentMethods, createBalanceManualTopUp } from '@/lib/api';

function BalanceTopUpCheckoutInner() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations('Balance');
  const tOffer = useTranslations('OfferDetail');
  const tCommon = useTranslations('Common');
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [cryptoPaymentEnabled, setCryptoPaymentEnabled] = useState(false);
  const [ibanPaymentEnabled, setIbanPaymentEnabled] = useState(false);
  const [sepaPaymentEnabled, setSepaPaymentEnabled] = useState(false);

  useEffect(() => {
    const a = searchParams.get('amount');
    if (a) setAmountStr(a);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    getAvailablePaymentMethods(token)
      .then((methods) => {
        setCardPaymentEnabled(methods.cardPaymentEnabled);
        setCryptoPaymentEnabled(methods.cryptoPaymentEnabled);
        setIbanPaymentEnabled(methods.ibanPaymentEnabled);
        setSepaPaymentEnabled(methods.sepaPaymentEnabled === true);
      })
      .catch(() => {
        setCardPaymentEnabled(false);
        setCryptoPaymentEnabled(false);
        setIbanPaymentEnabled(false);
        setSepaPaymentEnabled(false);
      });
  }, [token]);

  const base = `/${locale}/dashboard/balance`;
  const anyMethod = cardPaymentEnabled || cryptoPaymentEnabled || ibanPaymentEnabled || sepaPaymentEnabled;

  const parseAmount = () => {
    const n = Number(String(amountStr ?? '').replace(',', '.').trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const submit = (paymentMethod, currency) => {
    const n = parseAmount();
    if (!Number.isFinite(n) || n <= 0) {
      setError(t('manualTopUpInvalidAmount'));
      return;
    }
    if (!token) {
      openLoginModal(() => {});
      return;
    }
    setSubmitting(true);
    setError(null);
    createBalanceManualTopUp({ amount: n, currency, paymentMethod }, token)
      .then(({ id }) => {
        if (!id) throw new Error('No top-up id');
        if (paymentMethod === 'CARD_MANUAL') {
          router.push(`/${locale}/dashboard/balance/top-up/${id}/card-payment`);
        } else if (paymentMethod === 'CRYPTO_MANUAL') {
          router.push(`/${locale}/dashboard/balance/top-up/${id}/crypto-payment`);
        } else {
          router.push(`/${locale}/dashboard/balance/top-up/${id}/bank-payment`);
        }
      })
      .catch((err) => setError(err.message || t('manualTopUpFailed')))
      .finally(() => setSubmitting(false));
  };

  const ensureAuth = (fn) => {
    if (!token) {
      openLoginModal(() => fn());
      return;
    }
    fn();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3, px: 2 }}>
      <Container maxWidth="md">
        <MuiLink component={Link} href={base} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          {t('manualTopUpBack')}
        </MuiLink>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('manualTopUpCheckoutTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('manualTopUpCheckoutIntro')}
        </Typography>

        {cryptoPaymentEnabled && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<Chip label={tOffer('checkoutFastestBadge')} color="success" size="small" sx={{ fontWeight: 700 }} />}>
            {tOffer('checkoutCryptoFastest')}
          </Alert>
        )}

        {!token && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('loginToView')}
          </Alert>
        )}

        {token && !anyMethod && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('manualTopUpNoMethods')}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t('manualTopUpAmountLabel')}
            </Typography>
            <TextField
              type="text"
              inputMode="decimal"
              label={t('manualTopUpAmountHint')}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              fullWidth
              sx={{ maxWidth: 360 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {t('manualTopUpCurrencyPerMethod')}
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="h6" fontWeight={600} gutterBottom>
          {tOffer('checkoutPaymentMethods')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('manualTopUpMethodsIntro')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cardPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {tOffer('payByCard')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tOffer('checkoutHintCard')}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {t('manualTopUpCurrencyUah')}
                </Typography>
                <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={() => ensureAuth(() => submit('CARD_MANUAL', 'UAH'))}
                >
                  {submitting ? tCommon('loading') : tOffer('payByCard')}
                </Button>
              </CardContent>
            </Card>
          )}

          {cryptoPaymentEnabled && (
            <Card variant="outlined" sx={{ borderColor: 'success.main', borderWidth: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {tOffer('payWithCrypto')}
                  </Typography>
                  <Chip label={tOffer('checkoutFastestBadge')} color="success" size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tOffer('checkoutHintCrypto')}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {tOffer('payWithCryptoUsdNotice')}
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={submitting}
                  onClick={() => ensureAuth(() => submit('CRYPTO_MANUAL', 'USD'))}
                >
                  {submitting ? tCommon('loading') : tOffer('payWithCrypto')}
                </Button>
              </CardContent>
            </Card>
          )}

          {ibanPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {tOffer('payViaIban')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tOffer('checkoutHintIban')}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {t('manualTopUpCurrencyEur')}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => ensureAuth(() => submit('IBAN_MANUAL', 'EUR'))}
                >
                  {submitting ? tCommon('loading') : tOffer('payViaIban')}
                </Button>
              </CardContent>
            </Card>
          )}

          {sepaPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {tOffer('payViaSepa')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {tOffer('checkoutHintSepa')}
                </Typography>
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  {tOffer('checkoutSepaTiming')}
                </Alert>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {t('manualTopUpCurrencyEur')}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => ensureAuth(() => submit('SEPA_MANUAL', 'EUR'))}
                >
                  {submitting ? tCommon('loading') : tOffer('payViaSepa')}
                </Button>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 1 }} />
        </Box>
      </Container>
    </Box>
  );
}

export default function BalanceTopUpCheckoutPage() {
  return (
    <Suspense
      fallback={(
        <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="secondary" />
        </Box>
      )}
    >
      <BalanceTopUpCheckoutInner />
    </Suspense>
  );
}
