'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Link from 'next/link';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import TextField from '@mui/material/TextField';
import { getDepositInfo, simulateDeposit, addTestCredit, createDepositOrder, createWithdraw, createCardPayoutRequest, getCardPaymentEnabled } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useTranslations } from 'next-intl';

export default function BalancePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Balance');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const {
    profile,
    preferredCurrency,
    primaryBalance,
    balances,
    loading,
    error,
    refetch,
  } = useProfile();

  const [depositInfo, setDepositInfo] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('UAH');
  const [createDepositLoading, setCreateDepositLoading] = useState(false);
  const [createDepositError, setCreateDepositError] = useState(null);
  const [testCreditLoading, setTestCreditLoading] = useState(false);
  const [testCreditError, setTestCreditError] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawIban, setWithdrawIban] = useState('');
  const [withdrawOkpo, setWithdrawOkpo] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [withdrawWbAmount, setWithdrawWbAmount] = useState('');
  const [withdrawWbIban, setWithdrawWbIban] = useState('');
  const [withdrawWbFirstName, setWithdrawWbFirstName] = useState('');
  const [withdrawWbLastName, setWithdrawWbLastName] = useState('');
  const [withdrawWbTin, setWithdrawWbTin] = useState('');
  const [cardPayoutAmount, setCardPayoutAmount] = useState('');
  const [cardPayoutCardNumber, setCardPayoutCardNumber] = useState('');
  const [cardPayoutCardHolder, setCardPayoutCardHolder] = useState('');
  const [cardPayoutCurrency, setCardPayoutCurrency] = useState('');
  const [cardPayoutLoading, setCardPayoutLoading] = useState(false);
  const [cardPayoutError, setCardPayoutError] = useState(null);
  const [cardPayoutSuccess, setCardPayoutSuccess] = useState(null);
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);

  useEffect(() => {
    getCardPaymentEnabled().then(setCardPaymentEnabled).catch(() => setCardPaymentEnabled(false));
  }, []);

  const handleLoadDepositInfo = () => {
    if (!token) return;
    setDepositLoading(true);
    getDepositInfo(token)
      .then((info) => setDepositInfo(info))
      .catch(() => setDepositInfo(null))
      .finally(() => setDepositLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getDepositInfo(token)
      .then((info) => { if (!cancelled) setDepositInfo(info); })
      .catch(() => { if (!cancelled) setDepositInfo(null); });
    return () => { cancelled = true; };
  }, [token]);

  const handleSimulateDeposit = () => {
    if (!token) return;
    setSimulateLoading(true);
    simulateDeposit(token)
      .then(() => refetch())
      .catch((e) => console.error(e))
      .finally(() => setSimulateLoading(false));
  };

  const handleTestCredit = () => {
    if (!token) return;
    setTestCreditLoading(true);
    setTestCreditError(null);
    addTestCredit(token)
      .then(() => refetch())
      .catch((e) => setTestCreditError(e.message || t('testCreditFailed')))
      .finally(() => setTestCreditLoading(false));
  };

  const uahBalance = balances.find((b) => b.currency === 'UAH');
  const uahAvailable = uahBalance ? Number(uahBalance.available) : 0;

  useEffect(() => {
    if (preferredCurrency && !cardPayoutCurrency) setCardPayoutCurrency(preferredCurrency);
  }, [preferredCurrency, cardPayoutCurrency]);

  const cardPayoutCurr = cardPayoutCurrency || preferredCurrency || 'UAH';
  const cardPayoutBalance = balances.find((b) => b.currency === cardPayoutCurr);
  const cardPayoutAvailable = cardPayoutBalance ? Number(cardPayoutBalance.available) : 0;

  const handleCardPayoutRequest = () => {
    if (!token) return;
    const amount = parseFloat(cardPayoutAmount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setCardPayoutError(t('cardPayoutAmountMin'));
      return;
    }
    if (cardPayoutAvailable < amount) {
      setCardPayoutError(t('cardPayoutInsufficient'));
      return;
    }
    const cardNumber = cardPayoutCardNumber.replace(/\s/g, '').trim();
    const cardHolder = cardPayoutCardHolder.trim();
    if (cardNumber.length < 12 || !cardHolder) {
      setCardPayoutError(t('cardPayoutCardRequired'));
      return;
    }
    setCardPayoutError(null);
    setCardPayoutSuccess(null);
    setCardPayoutLoading(true);
    createCardPayoutRequest(
      { amount, currency: cardPayoutCurr, cardNumber, cardHolderName: cardHolder },
      token,
    )
      .then(() => {
        setCardPayoutSuccess(t('cardPayoutSuccess'));
        setCardPayoutAmount('');
        setCardPayoutCardNumber('');
        setCardPayoutCardHolder('');
        refetch();
      })
      .catch((e) => setCardPayoutError(e.message || t('cardPayoutFailed')))
      .finally(() => setCardPayoutLoading(false));
  };

  const handleWithdrawWhitebit = () => {
    if (!token || !profile?.whitebitEnabled) return;
    const amount = parseFloat(withdrawWbAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setWithdrawError(t('withdrawRequiredWhitebit'));
      return;
    }
    if (uahAvailable < amount) {
      setWithdrawError(t('withdrawInsufficient'));
      return;
    }
    const iban = withdrawWbIban.trim();
    const firstName = withdrawWbFirstName.trim();
    const lastName = withdrawWbLastName.trim();
    const tin = withdrawWbTin.replace(/\D/g, '');
    if (!iban || !firstName || !lastName || tin.length !== 10) {
      setWithdrawError(t('withdrawRequiredWhitebit'));
      return;
    }
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setWithdrawLoading(true);
    createWithdraw(
      { amount, currency: 'UAH', iban, provider: 'whitebit', firstName, lastName, tin },
      token,
    )
      .then(() => {
        setWithdrawSuccess(t('withdrawSuccess'));
        setWithdrawWbAmount('');
        setWithdrawWbIban('');
        setWithdrawWbFirstName('');
        setWithdrawWbLastName('');
        setWithdrawWbTin('');
        refetch();
      })
      .catch((e) => setWithdrawError(e.message || t('withdrawFailed')))
      .finally(() => setWithdrawLoading(false));
  };

  const handleCreateDeposit = () => {
    if (!token || !depositInfo?.whitebitEnabled) return;
    const amount = parseFloat(depositAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setCreateDepositError(t('enterAmountMin'));
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const returnUrl = `${origin}${base}/dashboard/balance?deposit=success`;
    const cancelUrl = `${origin}${base}/dashboard/balance?deposit=cancel`;
    setCreateDepositError(null);
    setCreateDepositLoading(true);
    const params = { amount, returnUrl, cancelUrl, provider: 'whitebit', currency: depositCurrency };
    createDepositOrder(params, token)
      .then((data) => {
        const url = data?.depositUrl || data?.checkoutUrl;
        if (url) window.location.href = url;
        else setCreateDepositError(t('noPaymentUrl'));
      })
      .catch((e) => setCreateDepositError(e.message || t('failedDeposit')))
      .finally(() => setCreateDepositLoading(false));
  };

  if (!isAuth) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t('title')}
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('loginToView')}
          </Alert>
          <Button
            variant="contained"
            color="secondary"
            sx={{ mt: 2, textTransform: 'none' }}
            onClick={() => openLoginModal(() => router.push(`${base}/dashboard/balance`))}
          >
            {t('login')}
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <Link href={`${base}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            {t('dashboard')}
          </MuiLink>
        </Link>

        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('yourBalance')}
        </Typography>

        {loading && (
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={140} height={36} />
              </CardContent>
            </Card>
            <Skeleton variant="text" width="40%" height={28} sx={{ mt: 3, mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width={180} height={40} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && profile && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              {t('changeCurrencyHint')}
            </Typography>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  {t('totalIn', { currency: preferredCurrency ?? '—' })}
                </Typography>
                <Typography variant="h4" fontWeight={600} color="text.primary">
                  {primaryBalance ? primaryBalance.available.toFixed(2) : '0.00'} {preferredCurrency ?? ''}
                </Typography>
                {primaryBalance && primaryBalance.frozen > 0 && (
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {t('frozen')}: {primaryBalance.frozen.toFixed(2)} {preferredCurrency}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {balances.length > 1 && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('otherCurrencies')}
              </Typography>
            )}
            {balances
              .filter((b) => b.currency !== preferredCurrency)
              .map((b) => (
                <Box key={b.currency} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {b.currency}
                  </Typography>
                  <Typography variant="body2">
                    {Number(b.available).toFixed(2)} (frozen: {Number(b.frozen).toFixed(2)})
                  </Typography>
                </Box>
              ))}

            {depositInfo?.testCreditEnabled && (
              <Card variant="outlined" sx={{ mt: 2, mb: 3, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} color="primary.main" gutterBottom>
                    {t('testCreditTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('testCreditHint', { amount: depositInfo.testCreditAmount ?? 2000, currency: preferredCurrency ?? 'USD' })}
                  </Typography>
                  {testCreditError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTestCreditError(null)}>
                      {testCreditError}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTestCredit}
                    disabled={testCreditLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    {testCreditLoading ? t('adding') : t('getTestCredit', { amount: depositInfo.testCreditAmount ?? 2000, currency: preferredCurrency ?? 'USD' })}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Typography variant="h6" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
              {t('uploadBalance')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('depositHint')}
            </Typography>
            {!depositInfo ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleLoadDepositInfo}
                disabled={depositLoading}
                sx={{ textTransform: 'none' }}
              >
                {depositLoading ? t('loading') : t('depositOptions')}
              </Button>
            ) : (
              <Card variant="outlined" sx={{ mt: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {depositInfo.instructions}
                  </Typography>
                  {depositInfo.mock && (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleSimulateDeposit}
                      disabled={simulateLoading}
                      sx={{ textTransform: 'none', mt: 1, mb: depositInfo.whitebitEnabled ? 2 : 0 }}
                    >
                      {simulateLoading ? t('adding') : t('simulateDeposit', { amount: depositInfo.mockAmount ?? 100 })}
                    </Button>
                  )}
                  {depositInfo.whitebitEnabled && (
                    <>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('whitebit')}</Typography>
                        <TextField
                          type="number"
                          label={t('amount')}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          inputProps={{ min: 1, step: 1 }}
                          size="small"
                          sx={{ mr: 1, width: 100 }}
                        />
                        <TextField
                          select
                          label={t('currency')}
                          value={depositCurrency}
                          onChange={(e) => setDepositCurrency(e.target.value)}
                          size="small"
                          sx={{ mr: 1, minWidth: 90 }}
                          SelectProps={{ native: true }}
                        >
                          <option value="UAH">UAH</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </TextField>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleCreateDeposit}
                          disabled={createDepositLoading}
                          sx={{ textTransform: 'none' }}
                        >
                          {createDepositLoading ? t('creating') : t('depositViaWhitebit')}
                        </Button>
                      </Box>
                      {createDepositError && (
                        <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                          {createDepositError}
                        </Typography>
                      )}
                    </>
                  )}
                  {!depositInfo.whitebitEnabled && !depositInfo.mock && (
                    <Button
                      component="a"
                      href={depositInfo.whitebitPayUrl || 'https://whitebit.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      color="secondary"
                      sx={{ textTransform: 'none', mt: 1 }}
                    >
                      {t('openWhitebit')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {profile?.whitebitEnabled && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('withdrawWhitebitTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('withdrawWhitebitHint')}
                </Typography>
                {uahBalance != null && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('totalIn', { currency: 'UAH' })}: {uahAvailable.toFixed(2)} UAH
                  </Typography>
                )}
                {withdrawSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setWithdrawSuccess(null)}>
                    {withdrawSuccess}
                  </Alert>
                )}
                {withdrawError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setWithdrawError(null)}>
                    {withdrawError}
                  </Alert>
                )}
                <Card variant="outlined" sx={{ maxWidth: 480 }}>
                  <CardContent>
                    <TextField
                      type="number"
                      label={t('withdrawAmount')}
                      value={withdrawWbAmount}
                      onChange={(e) => setWithdrawWbAmount(e.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('withdrawIban')}
                      placeholder={t('withdrawIbanPlaceholder')}
                      value={withdrawWbIban}
                      onChange={(e) => setWithdrawWbIban(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('withdrawFirstName')}
                      value={withdrawWbFirstName}
                      onChange={(e) => setWithdrawWbFirstName(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('withdrawLastName')}
                      value={withdrawWbLastName}
                      onChange={(e) => setWithdrawWbLastName(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('withdrawTin')}
                      placeholder={t('withdrawTinPlaceholder')}
                      value={withdrawWbTin}
                      onChange={(e) => setWithdrawWbTin(e.target.value)}
                      inputProps={{ maxLength: 10 }}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleWithdrawWhitebit}
                      disabled={withdrawLoading || uahAvailable < 1}
                      sx={{ textTransform: 'none' }}
                    >
                      {withdrawLoading ? t('withdrawSubmitting') : t('withdrawSubmit')}
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            )}

            {cardPaymentEnabled && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('withdrawToCardTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('withdrawToCardHint')}
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('cardPayoutFeeNotice')}
                </Alert>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('cardPayoutDaysNotice')}
                </Alert>
                {cardPayoutSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCardPayoutSuccess(null)}>
                    {cardPayoutSuccess}
                  </Alert>
                )}
                {cardPayoutError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCardPayoutError(null)}>
                    {cardPayoutError}
                  </Alert>
                )}
                <Box
                  sx={{
                    maxWidth: 480,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    borderRadius: 3,
                    p: 3,
                    color: '#fff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      bgcolor: 'rgba(255,255,255,0.95)',
                      color: 'text.primary',
                      borderRadius: 2,
                      p: 2,
                      mt: 1,
                    }}
                  >
                    <TextField
                      select
                      label={t('currency')}
                      value={cardPayoutCurr}
                      onChange={(e) => setCardPayoutCurrency(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                      SelectProps={{ native: true }}
                    >
                      <option value="UAH">UAH</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="RUB">RUB</option>
                    </TextField>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {t('totalIn', { currency: cardPayoutCurr })}: {cardPayoutAvailable.toFixed(2)} {cardPayoutCurr}
                    </Typography>
                    <TextField
                      type="number"
                      label={t('withdrawAmount')}
                      value={cardPayoutAmount}
                      onChange={(e) => setCardPayoutAmount(e.target.value)}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('cardPayoutCardNumber')}
                      placeholder="1234 5678 9012 3456"
                      value={cardPayoutCardNumber}
                      onChange={(e) => setCardPayoutCardNumber(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('cardPayoutCardHolder')}
                      value={cardPayoutCardHolder}
                      onChange={(e) => setCardPayoutCardHolder(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCardPayoutRequest}
                      disabled={cardPayoutLoading || cardPayoutAvailable < 0.01}
                      sx={{ textTransform: 'none' }}
                    >
                      {cardPayoutLoading ? t('withdrawSubmitting') : t('withdrawToCardSubmit')}
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
