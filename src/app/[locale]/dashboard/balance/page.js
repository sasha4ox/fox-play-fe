'use client';

import { useState, useEffect, useRef } from 'react';
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
import { getDepositInfo, simulateDeposit, addTestCredit, createDepositOrder, createWithdraw, createCardPayoutRequest, createCryptoPayoutRequest, createIbanPayoutRequest, getAvailablePaymentMethods, getBalanceHistory, getSavedCards, getSavedWallets, updatePreferredCurrency } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useTranslations } from 'next-intl';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Enable2FAModal from '@/components/Enable2FAModal/Enable2FAModal';
import VerifyTOTPModal from '@/components/VerifyTOTPModal/VerifyTOTPModal';

const CRYPTO_FEE_RATE = 0.03;
const CRYPTO_PAYOUT_MIN_RECEIVE = 11;
function cryptoFeeOnGross(gross) {
  return Math.round(Number(gross) * CRYPTO_FEE_RATE * 100) / 100;
}
function cryptoNetFromGross(gross) {
  const g = Number(gross);
  return Math.round((g - cryptoFeeOnGross(g)) * 100) / 100;
}
/** Smallest gross debit (USD) such that net to wallet is at least CRYPTO_PAYOUT_MIN_RECEIVE; must match backend rounding. */
const CRYPTO_MIN_GROSS_USD = (() => {
  for (let cents = 100; cents <= 1000000; cents += 1) {
    const g = cents / 100;
    if (cryptoNetFromGross(g) >= CRYPTO_PAYOUT_MIN_RECEIVE - 1e-9) return g;
  }
  return CRYPTO_PAYOUT_MIN_RECEIVE;
})();

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
  const [ibanPaymentEnabled, setIbanPaymentEnabled] = useState(false);
  const [cryptoPaymentEnabled, setCryptoPaymentEnabled] = useState(false);
  const [withdrawSection, setWithdrawSection] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [savedWallets, setSavedWallets] = useState([]);
  const [savedMethodsLoading, setSavedMethodsLoading] = useState(false);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState('');
  const [selectedSavedWalletId, setSelectedSavedWalletId] = useState('');
  const [cryptoPayoutAmount, setCryptoPayoutAmount] = useState('');
  const [cryptoPayoutCurrency, setCryptoPayoutCurrency] = useState('');
  const [cryptoPayoutWallet, setCryptoPayoutWallet] = useState('');
  const [cryptoPayoutLoading, setCryptoPayoutLoading] = useState(false);
  const [cryptoPayoutError, setCryptoPayoutError] = useState(null);
  const [cryptoPayoutSuccess, setCryptoPayoutSuccess] = useState(null);
  const [ibanPayoutAmount, setIbanPayoutAmount] = useState('');
  const [ibanPayoutIban, setIbanPayoutIban] = useState('');
  const [ibanPayoutBicSwift, setIbanPayoutBicSwift] = useState('');
  const [ibanPayoutBeneficiaryName, setIbanPayoutBeneficiaryName] = useState('');
  const [ibanPayoutError, setIbanPayoutError] = useState(null);
  const [ibanPayoutSuccess, setIbanPayoutSuccess] = useState(null);
  const [balanceHistory, setBalanceHistory] = useState({ items: [], total: 0, status: 'idle' });
  const [enable2FAModalOpen, setEnable2FAModalOpen] = useState(false);
  const [verifyTOTPModalOpen, setVerifyTOTPModalOpen] = useState(false);
  const [pendingWithdrawAction, setPendingWithdrawAction] = useState(null);
  const [pendingSectionAfter2FA, setPendingSectionAfter2FA] = useState(null);
  const [verifyTOTPError, setVerifyTOTPError] = useState(null);
  const [verifyTOTPSubmitting, setVerifyTOTPSubmitting] = useState(false);
  const [isSettingCurrencyForCard, setIsSettingCurrencyForCard] = useState(false);
  const [cryptoCopiedHint, setCryptoCopiedHint] = useState(false);
  const didApplyDefaultCryptoWithdraw = useRef(false);

  const cardDigitsOnly = cardPayoutCardNumber.replace(/\D/g, '').slice(0, 19);
  const panPreviewLen = Math.max(16, Math.ceil(Math.max(cardDigitsOnly.length, 1) / 4) * 4);
  let cardPanPreview = '';
  for (let i = 0; i < panPreviewLen; i += 1) {
    if (i > 0 && i % 4 === 0) cardPanPreview += ' ';
    cardPanPreview += cardDigitsOnly[i] !== undefined ? cardDigitsOnly[i] : '•';
  }

  const inputOutlineSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      bgcolor: 'background.paper',
      '& fieldset': { borderColor: 'divider' },
      '&:hover fieldset': { borderColor: 'action.active' },
    },
  };

  useEffect(() => {
    if (!token) return;
    getAvailablePaymentMethods(token).then((methods) => {
      setCardPaymentEnabled(methods.cardPaymentEnabled);
      setIbanPaymentEnabled(methods.ibanPaymentEnabled);
      setCryptoPaymentEnabled(methods.cryptoPaymentEnabled);
    }).catch(() => {
      setCardPaymentEnabled(false);
      setIbanPaymentEnabled(false);
      setCryptoPaymentEnabled(false);
    });
  }, [token]);

  useEffect(() => {
    if (!cryptoPaymentEnabled || !profile?.twoFactorEnabled) return;
    if (didApplyDefaultCryptoWithdraw.current) return;
    didApplyDefaultCryptoWithdraw.current = true;
    setWithdrawSection('crypto');
    setCryptoPayoutCurrency('USD');
  }, [cryptoPaymentEnabled, profile?.twoFactorEnabled]);

  useEffect(() => {
    if (!token) return;
    setSavedMethodsLoading(true);
    Promise.all([getSavedCards(token), getSavedWallets(token)])
      .then(([cardsRes, walletsRes]) => {
        setSavedCards(cardsRes?.items ?? []);
        setSavedWallets(walletsRes?.items ?? []);
      })
      .catch(() => {
        setSavedCards([]);
        setSavedWallets([]);
      })
      .finally(() => setSavedMethodsLoading(false));
  }, [token]);

  const balanceHistoryLoading = !!token && balanceHistory.status === 'idle';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getBalanceHistory(token, { take: 50, currency: preferredCurrency ?? undefined })
      .then((data) => {
        if (!cancelled) setBalanceHistory({ items: data?.items ?? [], total: data?.total ?? 0, status: 'success' });
      })
      .catch(() => {
        if (!cancelled) setBalanceHistory({ items: [], total: 0, status: 'error' });
      });
    return () => { cancelled = true; };
  }, [token, preferredCurrency]);

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
  const cryptoPayoutCurr = cryptoPayoutCurrency || preferredCurrency || 'USD';
  /** Total available in selected currency (all wallets converted to this currency). User can withdraw up to this in one request. */
  const totalAvailableInSelectedCurrency =
    Number(profile?.totalAvailableByCurrency?.[cardPayoutCurr]) ?? 0;
  const totalAvailableForCrypto = Number(profile?.totalAvailableByCurrency?.[cryptoPayoutCurr]) ?? 0;

  const CARD_PAYOUT_FEE_RATE = 0.06;
  const cardPayoutFeeFromGross = (gross) => Math.round(Number(gross) * CARD_PAYOUT_FEE_RATE * 100) / 100;
  const cardPayoutGrossNum = parseFloat(cardPayoutAmount);
  const cardPayoutFeeDisplay =
    Number.isFinite(cardPayoutGrossNum) && cardPayoutGrossNum > 0
      ? cardPayoutFeeFromGross(cardPayoutGrossNum)
      : 0;
  const cardPayoutReceiveDisplay =
    Number.isFinite(cardPayoutGrossNum) && cardPayoutGrossNum > 0
      ? Math.round((cardPayoutGrossNum - cardPayoutFeeDisplay) * 100) / 100
      : 0;
  const cardPayoutSummaryVisible =
    Number.isFinite(cardPayoutGrossNum) && cardPayoutGrossNum > 0 && cardPayoutReceiveDisplay > 0;

  const cryptoGrossNum = parseFloat(cryptoPayoutAmount);
  const cryptoFeeDisplay =
    Number.isFinite(cryptoGrossNum) && cryptoGrossNum > 0 ? cryptoFeeOnGross(cryptoGrossNum) : 0;
  const cryptoNetReceiveDisplay =
    Number.isFinite(cryptoGrossNum) && cryptoGrossNum > 0 ? cryptoNetFromGross(cryptoGrossNum) : 0;
  const cryptoTotalDebitDisplay = Number.isFinite(cryptoGrossNum) && cryptoGrossNum > 0 ? cryptoGrossNum : 0;
  const minCryptoTotalNeeded = CRYPTO_MIN_GROSS_USD;
  const maxCryptoPayoutStr = (() => {
    const avail = totalAvailableForCrypto;
    if (!Number.isFinite(avail) || avail < minCryptoTotalNeeded) return '';
    let g = Math.floor(avail * 100) / 100;
    for (let i = 0; i < 200000 && g >= CRYPTO_MIN_GROSS_USD - 1e-9; i += 1) {
      if (g <= avail + 1e-8 && cryptoNetFromGross(g) >= CRYPTO_PAYOUT_MIN_RECEIVE - 1e-9) return g.toFixed(2);
      g = Math.round((g - 0.01) * 100) / 100;
    }
    return '';
  })();
  const cryptoHighlightFieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'grey.800',
      color: 'grey.100',
      boxShadow: (theme) => `0 0 0 1px ${theme.palette.warning.main}40`,
      '& fieldset': { borderColor: 'warning.main', borderWidth: 2 },
      '&:hover fieldset': { borderColor: 'warning.light' },
      '&.Mui-focused fieldset': { borderColor: 'warning.main' },
    },
  };

  /** Opens Enable 2FA or Verify TOTP modal and sets pending withdraw action. */
  const requestWithdraw2FA = (action) => {
    setPendingWithdrawAction(action);
    setVerifyTOTPError(null);
    if (profile?.twoFactorEnabled) {
      setVerifyTOTPModalOpen(true);
    } else {
      setEnable2FAModalOpen(true);
    }
  };

  const handleEnable2FASuccess = () => {
    setEnable2FAModalOpen(false);
    if (pendingSectionAfter2FA) {
      setWithdrawSection(pendingSectionAfter2FA);
      setPendingSectionAfter2FA(null);
      refetch();
    } else {
      refetch().then(() => setVerifyTOTPModalOpen(true));
    }
  };

  const handleVerifyTOTPSubmit = (totpCode) => {
    if (!token || !pendingWithdrawAction) return;
    setVerifyTOTPError(null);
    setVerifyTOTPSubmitting(true);
    const { type, body } = pendingWithdrawAction;
    const run = () => {
      if (type === 'whitebit') return createWithdraw(body, token, totpCode);
      if (type === 'card') return createCardPayoutRequest(body, token, totpCode);
      if (type === 'crypto') return createCryptoPayoutRequest(body, token, totpCode);
      if (type === 'iban') return createIbanPayoutRequest(body, token, totpCode);
      return Promise.reject(new Error('Unknown withdraw type'));
    };
    run()
      .then(() => {
        setVerifyTOTPModalOpen(false);
        setPendingWithdrawAction(null);
        if (type === 'whitebit') {
          setWithdrawSuccess(t('withdrawSuccess'));
          setWithdrawWbAmount('');
          setWithdrawWbIban('');
          setWithdrawWbFirstName('');
          setWithdrawWbLastName('');
          setWithdrawWbTin('');
        } else if (type === 'card') {
          setCardPayoutSuccess(t('cardPayoutSuccess'));
          setCardPayoutAmount('');
          setCardPayoutCardNumber('');
          setCardPayoutCardHolder('');
        } else if (type === 'crypto') {
          setCryptoPayoutSuccess(t('withdrawCryptoSuccess'));
          setCryptoPayoutAmount('');
          setCryptoPayoutWallet('');
        } else if (type === 'iban') {
          setIbanPayoutSuccess(t('withdrawIbanSuccess'));
          setIbanPayoutAmount('');
          setIbanPayoutIban('');
          setIbanPayoutBicSwift('');
          setIbanPayoutBeneficiaryName('');
        }
        refetch();
      })
      .catch((e) => {
        setVerifyTOTPError(e?.code === 'TOTP_INVALID' ? t('verifyTOTPInvalidCode') : (e?.message || t('withdrawFailed')));
      })
      .finally(() => setVerifyTOTPSubmitting(false));
  };

  const handleCryptoPayoutRequest = () => {
    const gross = parseFloat(cryptoPayoutAmount);
    if (!Number.isFinite(gross) || gross < CRYPTO_MIN_GROSS_USD - 1e-9 || cryptoNetFromGross(gross) < CRYPTO_PAYOUT_MIN_RECEIVE - 1e-9) {
      setCryptoPayoutError(t('cryptoWithdrawMinAmount', { minGross: CRYPTO_MIN_GROSS_USD.toFixed(2) }));
      return;
    }
    const wallet = (cryptoPayoutWallet || '').trim();
    if (!wallet || wallet.length < 20) {
      setCryptoPayoutError(t('withdrawCryptoWalletLabel') + ' is required (min 20 characters).');
      return;
    }
    if (totalAvailableForCrypto < gross - 1e-8) {
      setCryptoPayoutError(t('cryptoWithdrawNeedMoreBalance'));
      return;
    }
    setCryptoPayoutError(null);
    setCryptoPayoutSuccess(null);
    requestWithdraw2FA({ type: 'crypto', body: { amount: gross, currency: 'USD', walletAddress: wallet } });
  };

  const copyCryptoAddress = () => {
    const w = (cryptoPayoutWallet || '').trim();
    if (!w || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(w).then(() => {
      setCryptoCopiedHint(true);
      window.setTimeout(() => setCryptoCopiedHint(false), 2500);
    }).catch(() => {});
  };

  const handleSavedCardSelect = (id) => {
    setSelectedSavedCardId(id);
    if (!id) {
      setCardPayoutCardHolder('');
      setCardPayoutCardNumber('');
      return;
    }
    const card = savedCards.find((c) => c.id === id);
    if (!card) return;
    setCardPayoutCardHolder(card.cardHolderName || '');
    const digits = (card.cardNumber || '').toString().replace(/\D/g, '');
    const grouped = digits.match(/.{1,4}/g) || [];
    setCardPayoutCardNumber(grouped.join(' '));
  };

  const handleSavedWalletSelect = (id) => {
    setSelectedSavedWalletId(id);
    if (!id) return;
    const wallet = savedWallets.find((w) => w.id === id);
    if (!wallet) return;
    setCryptoPayoutWallet(wallet.walletAddress || '');
  };

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
    requestWithdraw2FA({
      type: 'card',
      body: { amount, currency: 'UAH', cardNumber, cardHolderName: cardHolder },
    });
  };

  const totalAvailableForIban = Number(profile?.totalAvailableByCurrency?.['EUR']) ?? 0;

  const handleIbanPayoutRequest = () => {
    if (!token) return;
    const amount = parseFloat(ibanPayoutAmount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setIbanPayoutError(t('cardPayoutAmountMin'));
      return;
    }
    if (totalAvailableForIban < amount) {
      setIbanPayoutError(t('cardPayoutInsufficient'));
      return;
    }
    const iban = (ibanPayoutIban || '').replace(/\s/g, '').trim();
    const beneficiaryName = (ibanPayoutBeneficiaryName || '').trim();
    if (iban.length < 15 || !beneficiaryName) {
      setIbanPayoutError(t('ibanPayoutFieldsRequired'));
      return;
    }
    setIbanPayoutError(null);
    setIbanPayoutSuccess(null);
    requestWithdraw2FA({
      type: 'iban',
      body: {
        amount,
        currency: 'EUR',
        iban,
        bicSwift: (ibanPayoutBicSwift || '').trim() || undefined,
        beneficiaryName,
      },
    });
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
    requestWithdraw2FA({
      type: 'whitebit',
      body: { amount, currency: 'UAH', iban, provider: 'whitebit', firstName, lastName, tin },
    });
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
              {(cardPaymentEnabled || ibanPaymentEnabled || cryptoPaymentEnabled) && (
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
            ) : balanceHistory.status === 'success' && balanceHistory.items.length === 0 ? (
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
                      <Typography variant="body2" fontWeight={600} sx={{ color: item.type === 'sale' ? 'success.main' : item.type === 'refund' ? 'info.main' : (item.type === 'purchase' || item.type === 'withdrawal' || item.type === 'payout_lock') ? 'warning.main' : 'text.primary' }}>
                        {(item.type === 'purchase' || item.type === 'withdrawal' || item.type === 'payout_lock') ? '−' : '+'}{item.amount} {item.currency}
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

            {(cardPaymentEnabled || ibanPaymentEnabled || cryptoPaymentEnabled) && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('withdrawTitle')}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0,
                    mb: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  {cardPaymentEnabled && (
                    <Button
                      variant="text"
                      color="inherit"
                      disabled={isSettingCurrencyForCard}
                      onClick={async () => {
                        if (withdrawSection === 'card') {
                          setWithdrawSection(null);
                          return;
                        }
                        if (preferredCurrency !== 'UAH' && token) {
                          setIsSettingCurrencyForCard(true);
                          try {
                            await updatePreferredCurrency('UAH', token);
                            await refetch();
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSettingCurrencyForCard(false);
                          }
                        }
                        if (!profile?.twoFactorEnabled) {
                          setPendingSectionAfter2FA('card');
                          setEnable2FAModalOpen(true);
                        } else {
                          setWithdrawSection('card');
                        }
                      }}
                      sx={{
                        textTransform: 'none',
                        minHeight: 44,
                        px: 2,
                        borderRadius: 0,
                        borderBottom: 3,
                        borderColor: withdrawSection === 'card' ? 'primary.main' : 'transparent',
                        color: withdrawSection === 'card' ? 'primary.main' : 'text.secondary',
                        mb: '-2px',
                        fontWeight: withdrawSection === 'card' ? 600 : 500,
                      }}
                    >
                      {t('withdrawOnCard')}
                    </Button>
                  )}
                  {ibanPaymentEnabled && (
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        if (!profile?.twoFactorEnabled) {
                          setPendingSectionAfter2FA('iban');
                          setEnable2FAModalOpen(true);
                        } else {
                          setWithdrawSection(withdrawSection === 'iban' ? null : 'iban');
                        }
                      }}
                      sx={{
                        textTransform: 'none',
                        minHeight: 44,
                        px: 2,
                        borderRadius: 0,
                        borderBottom: 3,
                        borderColor: withdrawSection === 'iban' ? 'primary.main' : 'transparent',
                        color: withdrawSection === 'iban' ? 'primary.main' : 'text.secondary',
                        mb: '-2px',
                        fontWeight: withdrawSection === 'iban' ? 600 : 500,
                      }}
                    >
                      {t('withdrawToIban')}
                    </Button>
                  )}
                  {cryptoPaymentEnabled && (
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        if (!profile?.twoFactorEnabled) {
                          setPendingSectionAfter2FA('crypto');
                          setEnable2FAModalOpen(true);
                        } else if (withdrawSection === 'crypto') {
                          setWithdrawSection(null);
                        } else {
                          setWithdrawSection('crypto');
                          setCryptoPayoutCurrency('USD');
                        }
                      }}
                      sx={{
                        textTransform: 'none',
                        minHeight: 44,
                        px: 2,
                        borderRadius: 0,
                        borderBottom: 3,
                        borderColor: withdrawSection === 'crypto' ? 'warning.main' : 'transparent',
                        color: withdrawSection === 'crypto' ? 'warning.main' : 'text.secondary',
                        mb: '-2px',
                        fontWeight: withdrawSection === 'crypto' ? 600 : 500,
                      }}
                    >
                      {t('withdrawWithCrypto')}
                    </Button>
                  )}
                </Box>

                {withdrawSection === 'card' && cardPaymentEnabled && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('withdrawToCardTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('withdrawToCardHint')}
                    </Typography>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      {t('withdrawCardFeeExplanation')}
                    </Alert>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      {t('cardPayoutFeeNotice')}
                    </Alert>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {t('cardPayoutDaysNotice')}
                    </Alert>
                    {!profile?.twoFactorEnabled && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {t('twoFactorRequiredHint')}
                      </Alert>
                    )}
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
                <Box sx={{ maxWidth: 420, mx: 'auto' }}>
                  <Box
                    sx={{
                      aspectRatio: '1.586/1',
                      maxWidth: 420,
                      mx: 'auto',
                      background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)',
                      borderRadius: '14px',
                      p: 2.5,
                      color: '#fff',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 34,
                            borderRadius: 1,
                            background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        />
                        <Box
                          component="svg"
                          viewBox="0 0 24 16"
                          sx={{ width: 28, height: 18, opacity: 0.95 }}
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M4 8c2-3 6-3 8 0M8 4c1.5 2.5 1.5 5.5 0 8M12 2c2 4 2 8 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </Box>
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontStyle: 'italic',
                          letterSpacing: 2,
                          fontSize: '1.1rem',
                          color: '#fff',
                        }}
                      >
                        VISA
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        letterSpacing: { xs: 2, sm: 3 },
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 500,
                        mb: 2,
                        minHeight: '1.5em',
                      }}
                    >
                      {cardPanPreview}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {t('cardPayoutPreviewName')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cardPayoutCardHolder.trim() || '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {t('cardPayoutPreviewCurrency')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{cardPayoutCurr}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      select
                      label={t('useSavedCard')}
                      value={selectedSavedCardId}
                      onChange={(e) => handleSavedCardSelect(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      SelectProps={{ native: true }}
                      disabled={savedMethodsLoading || savedCards.length === 0}
                      helperText={savedCards.length === 0 ? t('noSavedCards') : t('savedCardAutofillHint')}
                      variant="outlined"
                      size="medium"
                      fullWidth
                      sx={inputOutlineSx}
                    >
                      <option value="">{t('manualEntry')}</option>
                      {savedCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {`**** ${c.last4} - ${c.cardHolderName}${c.label ? ` (${c.label})` : ''}`}
                        </option>
                      ))}
                    </TextField>
                    <TextField
                      placeholder={t('cardPayoutPlaceholderHolder')}
                      value={cardPayoutCardHolder}
                      onChange={(e) => setCardPayoutCardHolder(e.target.value.toUpperCase())}
                      variant="outlined"
                      size="medium"
                      fullWidth
                      sx={inputOutlineSx}
                      inputProps={{ style: { textTransform: 'uppercase' } }}
                    />
                    <TextField
                      placeholder={t('cardPayoutPlaceholderNumber')}
                      value={cardPayoutCardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 19);
                        const g = v.match(/.{1,4}/g) || [];
                        setCardPayoutCardNumber(g.join(' '));
                      }}
                      inputProps={{ maxLength: 23 }}
                      variant="outlined"
                      size="medium"
                      fullWidth
                      sx={inputOutlineSx}
                    />
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
                      <TextField
                        type="number"
                        placeholder={t('cardPayoutPlaceholderAmount', { currency: cardPayoutCurr })}
                        value={cardPayoutAmount}
                        onChange={(e) => setCardPayoutAmount(e.target.value)}
                        inputProps={{ min: 0.01, step: 'any' }}
                        variant="outlined"
                        size="medium"
                        fullWidth
                        sx={inputOutlineSx}
                      />
                      <Button
                        variant="contained"
                        onClick={() => setCardPayoutAmount(totalAvailableInSelectedCurrency.toFixed(2))}
                        disabled={cardPayoutLoading || totalAvailableInSelectedCurrency < 0.01}
                        sx={{
                          textTransform: 'uppercase',
                          flexShrink: 0,
                          minWidth: 88,
                          fontWeight: 700,
                          bgcolor: 'warning.main',
                          color: 'warning.contrastText',
                          '&:hover': { bgcolor: 'warning.dark' },
                        }}
                      >
                        {t('withdrawMax')}
                      </Button>
                    </Box>
                    {cardPayoutSummaryVisible && (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.25,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('cardPayoutSummaryReceive')}:{' '}
                          <Box component="span" color="primary.main" fontWeight={700}>
                            {cardPayoutReceiveDisplay.toFixed(2)} {cardPayoutCurr}
                          </Box>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {t('cardPayoutSummaryFee')}: {cardPayoutFeeDisplay.toFixed(2)} {cardPayoutCurr}
                        </Typography>
                        <Typography variant="caption" color="text.primary" display="block" sx={{ mt: 0.5 }} fontWeight={600}>
                          {t('cardPayoutSummaryTotalFromBalance')}: {cardPayoutGrossNum.toFixed(2)} {cardPayoutCurr}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {t('youHaveInCurrency', { amount: totalAvailableInSelectedCurrency.toFixed(2), currency: cardPayoutCurr })}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCardPayoutRequest}
                      disabled={cardPayoutLoading || totalAvailableInSelectedCurrency < 0.01}
                      sx={{ textTransform: 'none', py: 1.25 }}
                    >
                      {cardPayoutLoading ? t('withdrawSubmitting') : t('withdrawToCardSubmit')}
                    </Button>
                  </Box>
                </Box>
              </Box>
                )}

                {withdrawSection === 'iban' && ibanPaymentEnabled && (
                  <Box sx={{ mb: 3, maxWidth: 420 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('withdrawToIban')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('withdrawToIbanHint')}
                    </Typography>
                    {ibanPayoutSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }} onClose={() => setIbanPayoutSuccess(null)}>
                        {ibanPayoutSuccess}
                      </Alert>
                    )}
                    {ibanPayoutError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setIbanPayoutError(null)}>
                        {ibanPayoutError}
                      </Alert>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('totalIn', { currency: 'EUR' })}: {totalAvailableForIban.toFixed(2)} EUR
                    </Typography>
                    <TextField
                      type="number"
                      label={t('amount')}
                      value={ibanPayoutAmount}
                      onChange={(e) => setIbanPayoutAmount(e.target.value)}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('ibanLabel')}
                      value={ibanPayoutIban}
                      onChange={(e) => setIbanPayoutIban(e.target.value)}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('bicSwiftLabel')}
                      value={ibanPayoutBicSwift}
                      onChange={(e) => setIbanPayoutBicSwift(e.target.value)}
                      placeholder="COBADEFFXXX"
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label={t('beneficiaryNameLabel')}
                      value={ibanPayoutBeneficiaryName}
                      onChange={(e) => setIbanPayoutBeneficiaryName(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleIbanPayoutRequest}
                      disabled={totalAvailableForIban < 0.01}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('withdrawSubmit')}
                    </Button>
                  </Box>
                )}

                {withdrawSection === 'crypto' && cryptoPaymentEnabled && (
                  <Box sx={{ mb: 3, width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom textAlign={{ xs: 'center', md: 'left' }}>
                      {t('withdrawWithCrypto')}
                    </Typography>
                    <Alert severity="info" sx={{ mb: 1.5 }} variant="outlined">
                      {t('withdrawCryptoUsdOnly')}
                    </Alert>
                    {!profile?.twoFactorEnabled && (
                      <Alert severity="info" sx={{ mb: 1.5 }}>
                        {t('twoFactorRequiredHint')}
                      </Alert>
                    )}
                    {cryptoPayoutSuccess && (
                      <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setCryptoPayoutSuccess(null)}>
                        {cryptoPayoutSuccess}
                      </Alert>
                    )}
                    {cryptoPayoutError && (
                      <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setCryptoPayoutError(null)}>
                        {cryptoPayoutError}
                      </Alert>
                    )}

                    <Box
                      sx={{
                        bgcolor: 'grey.900',
                        color: 'grey.100',
                        borderRadius: 2,
                        p: { xs: 2, sm: 3 },
                        border: '1px solid',
                        borderColor: 'grey.800',
                        width: '100%',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                          columnGap: { xs: 0, md: 3 },
                          rowGap: 2.5,
                        }}
                      >
                        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                          <Typography variant="body2" fontWeight={600} color="grey.300">
                            {t('cryptoWithdrawStepCoin')}
                          </Typography>
                          <Box
                            sx={{
                              mt: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              py: 1.25,
                              px: 1.5,
                              bgcolor: 'grey.800',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.700',
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: '#26a17b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              ₮
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={700} color="grey.100">
                                USDT
                              </Typography>
                              <Typography variant="caption" color="grey.500">
                                TetherUS
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="body2" fontWeight={600} color="grey.300">
                            {t('cryptoWithdrawStepAddress')}
                          </Typography>
                          <Box sx={{ mt: 0.75, borderBottom: 2, borderColor: 'warning.main', alignSelf: 'flex-start', width: 'fit-content', pb: 0.25 }}>
                            <Typography variant="caption" color="warning.main" fontWeight={600}>
                              {t('cryptoWithdrawTabAddress')}
                            </Typography>
                          </Box>
                          <TextField
                          select
                          label={t('useSavedCryptoWallet')}
                          value={selectedSavedWalletId}
                          onChange={(e) => handleSavedWalletSelect(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          SelectProps={{ native: true }}
                          disabled={savedMethodsLoading || savedWallets.length === 0}
                          variant="outlined"
                          size="small"
                          helperText={savedWallets.length === 0 ? t('noSavedCryptoWallets') : t('savedWalletAutofillHint')}
                          fullWidth
                          sx={{ mt: 1 }}
                        >
                          <option value="">{t('manualEntry')}</option>
                          {savedWallets.map((w) => (
                            <option key={w.id} value={w.id}>
                              {`${w.walletAddress.length > 16 ? `${w.walletAddress.slice(0, 8)}...${w.walletAddress.slice(-6)}` : w.walletAddress}${w.label ? ` (${w.label})` : ''}`}
                            </option>
                          ))}
                        </TextField>
                        <TextField
                          value={cryptoPayoutWallet}
                          onChange={(e) => setCryptoPayoutWallet(e.target.value)}
                          placeholder={t('cryptoWithdrawAddressPlaceholder')}
                          fullWidth
                          size="small"
                          inputProps={{ maxLength: 64 }}
                          sx={{
                            mt: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'grey.800',
                              color: 'grey.100',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: '0.8125rem',
                              boxShadow: (theme) => `0 0 0 1px ${theme.palette.warning.main}40`,
                              '& fieldset': { borderColor: 'warning.main', borderWidth: 2 },
                              '&:hover fieldset': { borderColor: 'warning.light' },
                              '&.Mui-focused fieldset': { borderColor: 'warning.main' },
                            },
                          }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={copyCryptoAddress}
                                  edge="end"
                                  size="small"
                                  aria-label={t('cryptoWithdrawCopy')}
                                  sx={{ color: 'warning.light' }}
                                  disabled={!cryptoPayoutWallet.trim()}
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                        {cryptoCopiedHint && (
                          <Typography variant="caption" sx={{ color: 'success.light', display: 'block', mt: 0.5 }}>
                            {t('cryptoWithdrawCopied')}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            mt: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 1.25,
                            px: 1.5,
                            bgcolor: 'grey.800',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.700',
                          }}
                        >
                          <Typography variant="body2" color="grey.200">
                            {t('cryptoWithdrawNetworkLabel')}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="grey.100">
                            TRX Tron (TRC20)
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 1.5, lineHeight: 1.5 }}>
                          {t('cryptoWithdrawCaution')}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" fontWeight={600} color="grey.300">
                          {t('cryptoWithdrawStepAmount')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', mt: 1.5 }}>
                          <TextField
                            type="number"
                            placeholder={t('cryptoWithdrawAmountPlaceholder', { minGross: CRYPTO_MIN_GROSS_USD.toFixed(2) })}
                            value={cryptoPayoutAmount}
                            onChange={(e) => setCryptoPayoutAmount(e.target.value)}
                            inputProps={{ min: CRYPTO_MIN_GROSS_USD, step: 'any' }}
                            size="small"
                            fullWidth
                            sx={cryptoHighlightFieldSx}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end" sx={{ color: 'grey.500', mr: 0 }}>
                                  USDT
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={() => maxCryptoPayoutStr && setCryptoPayoutAmount(maxCryptoPayoutStr)}
                            disabled={
                              cryptoPayoutLoading || !maxCryptoPayoutStr || totalAvailableForCrypto < minCryptoTotalNeeded
                            }
                            sx={{
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              minWidth: 72,
                              fontWeight: 700,
                              bgcolor: 'warning.main',
                              color: 'grey.900',
                              '&:hover': { bgcolor: 'warning.dark' },
                            }}
                          >
                            {t('withdrawMax')}
                          </Button>
                        </Box>
                        {cryptoTotalDebitDisplay > 0 && (
                          <Box sx={{ mt: 1.5, p: 1.25, bgcolor: 'grey.800', borderRadius: 1, border: '1px solid', borderColor: 'grey.700' }}>
                            <Typography variant="caption" color="grey.400" display="block">
                              {t('cryptoWithdrawSummaryReceive')}:{' '}
                              <Box component="span" color="warning.light" fontWeight={700}>
                                {cryptoNetReceiveDisplay.toFixed(2)} USDT
                              </Box>
                            </Typography>
                            <Typography variant="caption" color="grey.400" display="block" sx={{ mt: 0.5 }}>
                              {t('cryptoWithdrawSummaryFee')}: {cryptoFeeDisplay.toFixed(2)} USD
                            </Typography>
                            <Typography variant="caption" color="grey.300" display="block" sx={{ mt: 0.5 }} fontWeight={600}>
                              {t('cryptoWithdrawSummaryTotal')}: {cryptoTotalDebitDisplay.toFixed(2)} USD
                            </Typography>
                          </Box>
                        )}
                        {cryptoTotalDebitDisplay > 0 && (
                          <Typography variant="caption" color="grey.500" sx={{ display: 'block', mt: 0.75, lineHeight: 1.45 }}>
                            {t('cryptoWithdrawFeeNote')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="grey.500" sx={{ display: 'block', mt: 1 }}>
                          {t('youHaveInCurrency', { amount: totalAvailableForCrypto.toFixed(2), currency: 'USD' })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 1.5, lineHeight: 1.5 }}>
                          {t('cryptoWithdrawTestAdvice')}
                        </Typography>
                      </Box>

                        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={handleCryptoPayoutRequest}
                            disabled={
                              cryptoPayoutLoading ||
                              totalAvailableForCrypto < minCryptoTotalNeeded ||
                              !Number.isFinite(cryptoGrossNum) ||
                              cryptoGrossNum < CRYPTO_MIN_GROSS_USD - 1e-9 ||
                              cryptoNetFromGross(cryptoGrossNum) < CRYPTO_PAYOUT_MIN_RECEIVE - 1e-9 ||
                              cryptoGrossNum > totalAvailableForCrypto + 1e-8
                            }
                            sx={{
                              textTransform: 'none',
                              mt: 0,
                              py: 1.25,
                              bgcolor: 'warning.main',
                              color: 'grey.900',
                              fontWeight: 600,
                              '&:hover': { bgcolor: 'warning.dark' },
                            }}
                          >
                            {cryptoPayoutLoading ? t('withdrawSubmitting') : t('withdrawCryptoSubmit')}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Container>

      <Enable2FAModal
        open={enable2FAModalOpen}
        onClose={() => {
          setEnable2FAModalOpen(false);
          setPendingSectionAfter2FA(null);
        }}
        onSuccess={handleEnable2FASuccess}
        token={token}
        requiredForWithdraw={!!pendingWithdrawAction || !!pendingSectionAfter2FA}
      />
      <VerifyTOTPModal
        open={verifyTOTPModalOpen}
        onClose={() => { setVerifyTOTPModalOpen(false); setPendingWithdrawAction(null); setVerifyTOTPError(null); }}
        onSubmit={handleVerifyTOTPSubmit}
        error={verifyTOTPError}
        submitting={verifyTOTPSubmitting}
      />
    </Box>
  );
}
