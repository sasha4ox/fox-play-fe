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
import { getDepositInfo, simulateDeposit, addTestCredit, createDepositOrder, createWithdraw, createCardPayoutRequest, getCardPaymentEnabled, getBalanceHistory } from '@/lib/api';
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
  const [balanceHistory, setBalanceHistory] = useState({ items: [], total: 0 });
  const [balanceHistoryLoading, setBalanceHistoryLoading] = useState(false);

  useEffect(() => {
    getCardPaymentEnabled().then(setCardPaymentEnabled).catch(() => setCardPaymentEnabled(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    setBalanceHistoryLoading(true);
    getBalanceHistory(token, { take: 50 })
      .then((data) => setBalanceHistory({ items: data?.items ?? [], total: data?.total ?? 0 }))
      .catch(() => setBalanceHistory({ items: [], total: 0 }))
      .finally(() => setBalanceHistoryLoading(false));
  }, [token]);

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
    if (preferredCurrency) setCardPayoutCurrency(preferredCurrency);
  }, [preferredCurrency]);

  useEffect(() => {
    if (preferredCurrency) setDepositCurrency(preferredCurrency);
  }, [preferredCurrency]);

  const cardPayoutCurr = cardPayoutCurrency || preferredCurrency || 'UAH';
  /** Total available in selected currency (all wallets converted to this currency). User can withdraw up to this in one request. */
  const totalAvailableInSelectedCurrency =
    Number(profile?.totalAvailableByCurrency?.[cardPayoutCurr]) ?? 0;

  const handleCardPayoutRequest = () => {
    if (!token) return;
    const amount = parseFloat(cardPayoutAmount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setCardPayoutError(t('cardPayoutAmountMin'));
      return;
    }
    if (totalAvailableInSelectedCurrency < amount) {
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

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 3, mb: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {t('balanceHistoryTitle')}
              </Typography>
              {cardPaymentEnabled && (
                <Button
                  component={Link}
                  href={`${base}/dashboard/balance/withdrawals`}
                  variant="contained"
                  color="secondary"
                  size="medium"
                  sx={{ textTransform: 'none' }}
                >
                  {t('viewWithdrawals')}
                </Button>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('balanceHistoryHint')}
            </Typography>
            {balanceHistoryLoading ? (
              <Skeleton height={120} sx={{ mb: 2 }} />
            ) : balanceHistory.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('noBalanceHistory')}</Typography>
            ) : (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  {balanceHistory.items.map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        py: 1.5,
                        borderBottom: idx < balanceHistory.items.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: { xs: '100%', sm: 100 } }}>
                        {new Date(item.date).toLocaleString(locale)}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: item.type === 'sale' ? 'success.main' : item.type === 'refund' ? 'info.main' : item.type === 'purchase' ? 'warning.main' : 'text.primary' }}>
                        {item.type === 'purchase' ? '−' : '+'}{item.amount} {item.currency}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(`balanceHistoryType_${item.type}`)}
                        {item.offerTitle ? ` · ${item.offerTitle}` : ''}
                      </Typography>
                      {item.otherParty && (
                        <Link href={`${base}/user/${item.otherParty.id}`} style={{ fontSize: '0.875rem' }}>
                          {item.otherParty.nickname || item.otherParty.id.slice(0, 8)}
                        </Link>
                      )}
                      {item.orderId && (
                        <Link href={`${base}/dashboard/orders/${item.orderId}`} style={{ fontSize: '0.875rem' }}>
                          {item.orderNumber ? `${t('order')} ${item.orderNumber}` : t('order')}
                        </Link>
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

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

            {profile?.whitebitEnabled && (
              <>
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
                      {depositInfo.whitebitEnabled ? (
                        <>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('whitebit')}</Typography>
                            <TextField
                              type="number"
                              label={t('amountInCurrency', { currency: depositCurrency || preferredCurrency || 'UAH' })}
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              inputProps={{ min: 1 }}
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
                      ) : (
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
              </>
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
                      inputProps={{ min: 1 }}
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
                <Box sx={{ maxWidth: 420 }}>
                  {/* Credit card */}
                  <Box
                    sx={{
                      aspectRatio: '1.586/1',
                      maxWidth: 420,
                      background: 'linear-gradient(145deg, #1b2838 0%, #2a475e 40%, #1b2838 100%)',
                      borderRadius: '16px',
                      p: 2.5,
                      color: '#fff',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
                        pointerEvents: 'none',
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 20,
                        right: 24,
                        width: 44,
                        height: 32,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                        pointerEvents: 'none',
                      },
                    }}
                  >
                    <Box sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 32,
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #c9a227 0%, #8b6914 100%)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          }}
                        />
                        <Typography component="span" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', fontWeight: 600 }}>
                          {cardPayoutCurr}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                          {t('cardPayoutCardNumber')}
                        </Typography>
                        <TextField
                          placeholder="1234 5678 9012 3456"
                          value={cardPayoutCardNumber}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 19);
                            const g = v.match(/.{1,4}/g) || [];
                            setCardPayoutCardNumber(g.join(' '));
                          }}
                          inputProps={{ maxLength: 19 }}
                          variant="standard"
                          fullWidth
                          sx={{
                            '& .MuiInput-root': { color: '#fff', fontSize: '1.125rem', letterSpacing: 3 },
                            '& .MuiInput-input': { py: 0.5 },
                            '& .MuiInput-underline:before': { borderColor: 'rgba(255,255,255,0.25)' },
                            '& .MuiInput-underline:after': { borderColor: 'rgba(255,255,255,0.6)' },
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                          {t('cardPayoutCardHolder')}
                        </Typography>
                        <TextField
                          placeholder="JOHN DOE"
                          value={cardPayoutCardHolder}
                          onChange={(e) => setCardPayoutCardHolder(e.target.value.toUpperCase())}
                          variant="standard"
                          fullWidth
                          sx={{
                            '& .MuiInput-root': { color: '#fff', fontSize: '0.95rem', letterSpacing: 1.5 },
                            '& .MuiInput-input': { py: 0.5, textTransform: 'uppercase' },
                            '& .MuiInput-underline:before': { borderColor: 'rgba(255,255,255,0.25)' },
                            '& .MuiInput-underline:after': { borderColor: 'rgba(255,255,255,0.6)' },
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  {/* Amount and submit below card */}
                  <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        type="number"
                        label={t('amountInCurrency', { currency: cardPayoutCurr })}
                        value={cardPayoutAmount}
                        onChange={(e) => setCardPayoutAmount(e.target.value)}
                        inputProps={{ min: 0.01 }}
                        size="small"
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => setCardPayoutAmount(totalAvailableInSelectedCurrency.toFixed(2))}
                        disabled={cardPayoutLoading || totalAvailableInSelectedCurrency < 0.01}
                        sx={{ textTransform: 'none', flexShrink: 0, mt: 0.25 }}
                      >
                        {t('withdrawAll')}
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t('youHaveInCurrency', { amount: totalAvailableInSelectedCurrency.toFixed(2), currency: cardPayoutCurr })}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCardPayoutRequest}
                      disabled={cardPayoutLoading || totalAvailableInSelectedCurrency < 0.01}
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
