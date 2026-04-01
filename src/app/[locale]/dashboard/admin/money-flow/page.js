'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
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
  getAdminWhitebitEnabled,
  setAdminWhitebitEnabled,
  getAdminPlatformFeePercent,
  setAdminPlatformFeePercent,
  getAdminPlatformProfit,
  getAdminCards,
  createAdminCard,
  updateAdminCard,
  setAdminCardActive,
  deleteAdminCard,
  getAdminCardPaymentOrderNumberMessage,
  setAdminCardPaymentOrderNumberMessage,
  getAdminOperatorWordingMode,
  setAdminOperatorWordingMode,
  getAdminCryptoPaymentWallet,
  setAdminCryptoPaymentWallet,
  getAdminIbanPaymentEnabled,
  setAdminIbanPaymentEnabled,
  getAdminIbanPaymentConfig,
  setAdminIbanPaymentConfig,
  getAdminSepaPaymentEnabled,
  setAdminSepaPaymentEnabled,
  getAdminSepaPaymentConfig,
  setAdminSepaPaymentConfig,
} from '@/lib/api';

function maskCardNumber(num) {
  if (!num || num.length < 8) return '****';
  return `${num.slice(0, 4)} **** **** ${num.slice(-4)}`;
}

export default function AdminMoneyFlowPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(true);
  const [savingFlag, setSavingFlag] = useState(false);
  const [whitebitEnabled, setWhitebitEnabled] = useState(false);
  const [loadingWhitebitFlag, setLoadingWhitebitFlag] = useState(true);
  const [savingWhitebitFlag, setSavingWhitebitFlag] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState(20);
  const [platformFeePercentInput, setPlatformFeePercentInput] = useState('20');
  const [loadingFee, setLoadingFee] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [platformProfit, setPlatformProfit] = useState({ total: [], byCard: [] });
  const [loadingProfit, setLoadingProfit] = useState(true);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
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
  const [error, setError] = useState(null);
  const [orderNumberVisible, setOrderNumberVisible] = useState(false);
  const [orderNumberText, setOrderNumberText] = useState('');
  const [orderNumberTextInput, setOrderNumberTextInput] = useState('');
  const [loadingOrderNumberConfig, setLoadingOrderNumberConfig] = useState(true);
  const [savingOrderNumberConfig, setSavingOrderNumberConfig] = useState(false);
  const [operatorWordingMode, setOperatorWordingMode] = useState('INDIVIDUAL');
  const [loadingOperatorWordingMode, setLoadingOperatorWordingMode] = useState(true);
  const [savingOperatorWordingMode, setSavingOperatorWordingMode] = useState(false);
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [cryptoWalletInput, setCryptoWalletInput] = useState('');
  const [loadingCryptoWallet, setLoadingCryptoWallet] = useState(true);
  const [savingCryptoWallet, setSavingCryptoWallet] = useState(false);
  const [ibanPaymentEnabled, setIbanPaymentEnabled] = useState(false);
  const [loadingIbanFlag, setLoadingIbanFlag] = useState(true);
  const [savingIbanFlag, setSavingIbanFlag] = useState(false);
  const [ibanConfig, setIbanConfig] = useState({
    iban: '', bicSwift: '', beneficiaryName: '', beneficiaryBank: '',
    accountCurrency: '', taxId: '', legalAddress: '', correspondentAccount: '', correspondentBank: '',
    paymentReference: null,
  });
  const [ibanConfigInput, setIbanConfigInput] = useState({
    iban: '', bicSwift: '', beneficiaryName: '', beneficiaryBank: '',
    accountCurrency: '', taxId: '', legalAddress: '', correspondentAccount: '', correspondentBank: '',
    paymentReference: '',
  });
  const [loadingIbanConfig, setLoadingIbanConfig] = useState(true);
  const [savingIbanConfig, setSavingIbanConfig] = useState(false);
  const [sepaPaymentEnabled, setSepaPaymentEnabled] = useState(false);
  const [loadingSepaFlag, setLoadingSepaFlag] = useState(true);
  const [savingSepaFlag, setSavingSepaFlag] = useState(false);
  const [sepaConfigInput, setSepaConfigInput] = useState({
    iban: '',
    bicSwift: '',
    beneficiaryName: '',
    beneficiaryBank: '',
    referenceTemplate: '',
  });
  const [loadingSepaConfig, setLoadingSepaConfig] = useState(true);
  const [savingSepaConfig, setSavingSepaConfig] = useState(false);

  const loadFlag = () => {
    if (!token) return;
    setLoadingFlag(true);
    getAdminCardPaymentEnabled(token)
      .then(setCardPaymentEnabled)
      .catch(() => setCardPaymentEnabled(false))
      .finally(() => setLoadingFlag(false));
  };

  const loadWhitebitFlag = () => {
    if (!token) return;
    setLoadingWhitebitFlag(true);
    getAdminWhitebitEnabled(token)
      .then(setWhitebitEnabled)
      .catch(() => setWhitebitEnabled(false))
      .finally(() => setLoadingWhitebitFlag(false));
  };

  const loadPlatformFee = () => {
    if (!token) return;
    setLoadingFee(true);
    getAdminPlatformFeePercent(token)
      .then((p) => {
        setPlatformFeePercent(p);
        setPlatformFeePercentInput(String(p));
      })
      .catch(() => {})
      .finally(() => setLoadingFee(false));
  };

  const loadPlatformProfit = () => {
    if (!token) return;
    setLoadingProfit(true);
    getAdminPlatformProfit(token)
      .then((data) => setPlatformProfit({ total: data?.total ?? [], byCard: data?.byCard ?? [] }))
      .catch(() => setPlatformProfit({ total: [], byCard: [] }))
      .finally(() => setLoadingProfit(false));
  };

  const loadCards = () => {
    if (!token) return;
    setLoadingCards(true);
    getAdminCards(token)
      .then((data) => setCards(data?.cards ?? []))
      .catch(() => setCards([]))
      .finally(() => setLoadingCards(false));
  };

  const loadOrderNumberConfig = () => {
    if (!token) return;
    setLoadingOrderNumberConfig(true);
    getAdminCardPaymentOrderNumberMessage(token)
      .then((c) => {
        setOrderNumberVisible(!!c?.visible);
        setOrderNumberText(c?.text ?? '');
        setOrderNumberTextInput(c?.text ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingOrderNumberConfig(false));
  };

  const handleSaveOrderNumberConfig = () => {
    if (!token) return;
    setSavingOrderNumberConfig(true);
    setError(null);
    setAdminCardPaymentOrderNumberMessage(
      { visible: orderNumberVisible, text: orderNumberTextInput.trim() || undefined },
      token
    )
      .then((c) => {
        setOrderNumberVisible(!!c?.visible);
        setOrderNumberText(c?.text ?? '');
        setOrderNumberTextInput(c?.text ?? '');
      })
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingOrderNumberConfig(false));
  };

  const loadOperatorWordingMode = () => {
    if (!token) return;
    setLoadingOperatorWordingMode(true);
    getAdminOperatorWordingMode(token)
      .then(setOperatorWordingMode)
      .catch(() => setOperatorWordingMode('INDIVIDUAL'))
      .finally(() => setLoadingOperatorWordingMode(false));
  };

  const handleOperatorWordingModeChange = (nextMode) => {
    if (!token) return;
    const mode = nextMode === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
    setSavingOperatorWordingMode(true);
    setError(null);
    setAdminOperatorWordingMode(mode, token)
      .then((updated) => setOperatorWordingMode(updated))
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingOperatorWordingMode(false));
  };

  useEffect(() => {
    loadFlag();
    loadWhitebitFlag();
  }, [token]);
  useEffect(() => {
    loadPlatformFee();
    loadPlatformProfit();
  }, [token]);
  useEffect(() => {
    loadCards();
  }, [token]);
  useEffect(() => {
    loadOrderNumberConfig();
  }, [token]);

  useEffect(() => {
    loadOperatorWordingMode();
  }, [token]);

  const loadCryptoWallet = () => {
    if (!token) return;
    setLoadingCryptoWallet(true);
    getAdminCryptoPaymentWallet(token)
      .then((w) => {
        setCryptoWallet(w || '');
        setCryptoWalletInput(w || '');
      })
      .catch(() => setCryptoWallet(''))
      .finally(() => setLoadingCryptoWallet(false));
  };
  useEffect(() => {
    loadCryptoWallet();
  }, [token]);

  const loadIbanFlag = () => {
    if (!token) return;
    setLoadingIbanFlag(true);
    getAdminIbanPaymentEnabled(token)
      .then(setIbanPaymentEnabled)
      .catch(() => setIbanPaymentEnabled(false))
      .finally(() => setLoadingIbanFlag(false));
  };
  const loadIbanConfig = () => {
    if (!token) return;
    setLoadingIbanConfig(true);
    getAdminIbanPaymentConfig(token)
      .then((c) => {
        const beneficiaryBank = c?.beneficiaryBank ?? c?.bankName ?? '';
        setIbanConfig({
          iban: c?.iban ?? '', bicSwift: c?.bicSwift ?? '', beneficiaryName: c?.beneficiaryName ?? '', beneficiaryBank,
          accountCurrency: c?.accountCurrency ?? '', taxId: c?.taxId ?? '', legalAddress: c?.legalAddress ?? '',
          correspondentAccount: c?.correspondentAccount ?? '', correspondentBank: c?.correspondentBank ?? '',
          paymentReference: c?.paymentReference ?? null,
        });
        setIbanConfigInput({
          iban: c?.iban ?? '', bicSwift: c?.bicSwift ?? '', beneficiaryName: c?.beneficiaryName ?? '', beneficiaryBank,
          accountCurrency: c?.accountCurrency ?? '', taxId: c?.taxId ?? '', legalAddress: c?.legalAddress ?? '',
          correspondentAccount: c?.correspondentAccount ?? '', correspondentBank: c?.correspondentBank ?? '',
          paymentReference: c?.paymentReference ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoadingIbanConfig(false));
  };
  useEffect(() => {
    loadIbanFlag();
    loadIbanConfig();
  }, [token]);

  const loadSepaFlag = () => {
    if (!token) return;
    setLoadingSepaFlag(true);
    getAdminSepaPaymentEnabled(token)
      .then(setSepaPaymentEnabled)
      .catch(() => setSepaPaymentEnabled(false))
      .finally(() => setLoadingSepaFlag(false));
  };
  const loadSepaConfig = () => {
    if (!token) return;
    setLoadingSepaConfig(true);
    getAdminSepaPaymentConfig(token)
      .then((c) => {
        setSepaConfigInput({
          iban: c?.iban ?? '',
          bicSwift: c?.bicSwift ?? '',
          beneficiaryName: c?.beneficiaryName ?? '',
          beneficiaryBank: c?.beneficiaryBank ?? '',
          referenceTemplate: c?.referenceTemplate ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoadingSepaConfig(false));
  };
  useEffect(() => {
    loadSepaFlag();
    loadSepaConfig();
  }, [token]);

  const handleSaveIbanFlag = () => {
    if (!token) return;
    setSavingIbanFlag(true);
    setError(null);
    setAdminIbanPaymentEnabled(ibanPaymentEnabled, token)
      .then(setIbanPaymentEnabled)
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingIbanFlag(false));
  };
  const handleSaveIbanConfig = () => {
    if (!token) return;
    setSavingIbanConfig(true);
    setError(null);
    setAdminIbanPaymentConfig({
      iban: ibanConfigInput.iban.trim(),
      bicSwift: ibanConfigInput.bicSwift.trim(),
      beneficiaryName: ibanConfigInput.beneficiaryName.trim(),
      beneficiaryBank: ibanConfigInput.beneficiaryBank.trim(),
      accountCurrency: ibanConfigInput.accountCurrency.trim(),
      taxId: ibanConfigInput.taxId.trim(),
      legalAddress: ibanConfigInput.legalAddress.trim(),
      correspondentAccount: ibanConfigInput.correspondentAccount.trim(),
      correspondentBank: ibanConfigInput.correspondentBank.trim(),
      paymentReference: ibanConfigInput.paymentReference?.trim() || null,
    }, token)
      .then((c) => {
        setIbanConfig({
          iban: c?.iban ?? '', bicSwift: c?.bicSwift ?? '', beneficiaryName: c?.beneficiaryName ?? '', beneficiaryBank: c?.beneficiaryBank ?? '',
          accountCurrency: c?.accountCurrency ?? '', taxId: c?.taxId ?? '', legalAddress: c?.legalAddress ?? '',
          correspondentAccount: c?.correspondentAccount ?? '', correspondentBank: c?.correspondentBank ?? '',
          paymentReference: c?.paymentReference ?? null,
        });
        setIbanConfigInput({
          iban: c?.iban ?? '', bicSwift: c?.bicSwift ?? '', beneficiaryName: c?.beneficiaryName ?? '', beneficiaryBank: c?.beneficiaryBank ?? '',
          accountCurrency: c?.accountCurrency ?? '', taxId: c?.taxId ?? '', legalAddress: c?.legalAddress ?? '',
          correspondentAccount: c?.correspondentAccount ?? '', correspondentBank: c?.correspondentBank ?? '',
          paymentReference: c?.paymentReference ?? '',
        });
      })
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingIbanConfig(false));
  };

  const handleSaveSepaConfig = () => {
    if (!token) return;
    setSavingSepaConfig(true);
    setError(null);
    setAdminSepaPaymentConfig(
      {
        iban: sepaConfigInput.iban.trim(),
        bicSwift: sepaConfigInput.bicSwift.trim(),
        beneficiaryName: sepaConfigInput.beneficiaryName.trim(),
        beneficiaryBank: sepaConfigInput.beneficiaryBank.trim(),
        referenceTemplate: sepaConfigInput.referenceTemplate.trim(),
      },
      token
    )
      .then((c) => {
        setSepaConfigInput({
          iban: c?.iban ?? '',
          bicSwift: c?.bicSwift ?? '',
          beneficiaryName: c?.beneficiaryName ?? '',
          beneficiaryBank: c?.beneficiaryBank ?? '',
          referenceTemplate: c?.referenceTemplate ?? '',
        });
      })
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingSepaConfig(false));
  };

  const handleSaveCryptoWallet = () => {
    setSavingCryptoWallet(true);
    setError(null);
    setAdminCryptoPaymentWallet({ wallet: cryptoWalletInput.trim() }, token)
      .then((w) => {
        setCryptoWallet(w || '');
        setCryptoWalletInput(w || '');
      })
      .catch((err) => setError(err?.message || 'Failed to save'))
      .finally(() => setSavingCryptoWallet(false));
  };
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

  const handleToggleWhitebit = (e) => {
    const checked = e.target.checked;
    setSavingWhitebitFlag(true);
    setError(null);
    setAdminWhitebitEnabled(checked, token)
      .then(() => setWhitebitEnabled(checked))
      .catch((err) => {
        setError(err.message || 'Failed to update');
      })
      .finally(() => setSavingWhitebitFlag(false));
  };

  const handleSavePlatformFee = () => {
    const num = Number(platformFeePercentInput);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      setError(t('platformFeePercent') + ': 0–100');
      return;
    }
    setSavingFee(true);
    setError(null);
    setAdminPlatformFeePercent(num, token)
      .then((p) => {
        setPlatformFeePercent(p);
        setPlatformFeePercentInput(String(p));
      })
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setSavingFee(false));
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

  return (
    <Box sx={{ px: { xs: 1, sm: 0 }, overflowX: 'hidden', maxWidth: '100%' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('moneyFlow')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('platformFeePercent')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('platformFeePercentHint')}
          </Typography>
          {loadingFee ? (
            <Skeleton width={120} height={40} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                value={platformFeePercentInput}
                onChange={(e) => setPlatformFeePercentInput(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.5 }}
                sx={{ width: 100 }}
              />
              <Typography variant="body2">%</Typography>
              <Button variant="contained" size="small" onClick={handleSavePlatformFee} disabled={savingFee}>
                {savingFee ? '…' : t('save')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('platformProfit')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('platformProfitHint')}
          </Typography>
          {loadingProfit ? (
            <Skeleton height={60} />
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{t('platformProfitTotal')}:</strong>{' '}
                {platformProfit.total.length === 0
                  ? t('noPlatformProfit')
                  : platformProfit.total.map(({ currency, amount }) => `${amount} ${currency}`).join(', ')}
              </Typography>
              {platformProfit.byCard.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {t('platformProfitByCard')}
                  </Typography>
                  {platformProfit.byCard.map((card) => (
                    <Box key={card.cardId} sx={{ mb: 1, pl: 1 }}>
                      <Typography variant="body2">
                        **** {card.cardLast4} — {card.cardHolderName}:{' '}
                        {card.totals.length === 0 ? '—' : card.totals.map((x) => `${x.amount} ${x.currency}`).join(', ')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('whitebitEnabled')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('whitebitEnabledHint')}
          </Typography>
          {loadingWhitebitFlag ? (
            <Skeleton width={120} height={32} />
          ) : (
            <FormControlLabel
              control={
                <Switch
                  checked={whitebitEnabled}
                  onChange={handleToggleWhitebit}
                  disabled={savingWhitebitFlag}
                />
              }
              label={whitebitEnabled ? 'On' : 'Off'}
            />
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
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
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('orderNumberMessageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('orderNumberMessageHint')}
          </Typography>
          {loadingOrderNumberConfig ? (
            <Skeleton height={80} />
          ) : (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={orderNumberVisible}
                    onChange={(e) => setOrderNumberVisible(e.target.checked)}
                  />
                }
                label={t('orderNumberMessageVisible')}
                sx={{ display: 'block', mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={2}
                label={t('orderNumberMessageText')}
                placeholder={t('orderNumberMessagePlaceholder')}
                value={orderNumberTextInput}
                onChange={(e) => setOrderNumberTextInput(e.target.value)}
                helperText={t('orderNumberMessagePlaceholder')}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleSaveOrderNumberConfig} disabled={savingOrderNumberConfig}>
                {savingOrderNumberConfig ? '…' : t('save')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('operatorWordingModeTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('operatorWordingModeHint')}
          </Typography>
          {loadingOperatorWordingMode ? (
            <Skeleton width={320} height={40} />
          ) : (
            <RadioGroup
              row
              value={operatorWordingMode}
              onChange={(e) => handleOperatorWordingModeChange(e.target.value)}
              aria-label={t('operatorWordingModeTitle')}
            >
              <FormControlLabel
                value="INDIVIDUAL"
                control={<Radio disabled={savingOperatorWordingMode} />}
                label={t('operatorWordingModeIndividual')}
              />
              <FormControlLabel
                value="COMPANY"
                control={<Radio disabled={savingOperatorWordingMode} />}
                label={t('operatorWordingModeCompany')}
              />
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('cryptoPaymentWalletTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('cryptoPaymentWalletHint')}
          </Typography>
          {loadingCryptoWallet ? (
            <Skeleton width={320} height={40} />
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label={t('cryptoWalletLabel')}
                placeholder="TRC20 address"
                value={cryptoWalletInput}
                onChange={(e) => setCryptoWalletInput(e.target.value)}
                sx={{ minWidth: 280, flex: 1 }}
              />
              <Button variant="contained" onClick={handleSaveCryptoWallet} disabled={savingCryptoWallet}>
                {savingCryptoWallet ? '…' : t('save')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('ibanPaymentTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('ibanPaymentHint')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {loadingIbanFlag ? (
              <Skeleton width={120} height={40} />
            ) : (
              <FormControlLabel
                control={
                  <Switch
                    checked={ibanPaymentEnabled}
                    onChange={(e) => {
                      setIbanPaymentEnabled(e.target.checked);
                      setSavingIbanFlag(true);
                      setError(null);
                      setAdminIbanPaymentEnabled(e.target.checked, token)
                        .then(setIbanPaymentEnabled)
                        .catch((err) => setError(err?.message || 'Failed to save'))
                        .finally(() => setSavingIbanFlag(false));
                    }}
                    disabled={savingIbanFlag}
                  />
                }
                label={t('ibanPaymentEnabled')}
              />
            )}
          </Box>
          {loadingIbanConfig ? (
            <Skeleton height={200} />
          ) : (
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 }}>
              <TextField
                label={t('ibanLabel')}
                value={ibanConfigInput.iban}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, iban: e.target.value }))}
                placeholder="UA123456789012345678901234567"
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanAccountCurrencyLabel')}
                value={ibanConfigInput.accountCurrency}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, accountCurrency: e.target.value }))}
                placeholder="EUR"
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanTaxIdLabel')}
                value={ibanConfigInput.taxId}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, taxId: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanBeneficiaryNameLabel')}
                value={ibanConfigInput.beneficiaryName}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, beneficiaryName: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanLegalAddressLabel')}
                value={ibanConfigInput.legalAddress}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, legalAddress: e.target.value }))}
                size="small"
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label={t('ibanBeneficiaryBankLabel')}
                value={ibanConfigInput.beneficiaryBank}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, beneficiaryBank: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanBicSwiftLabel')}
                value={ibanConfigInput.bicSwift}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, bicSwift: e.target.value }))}
                placeholder="XXXXXXXX"
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanCorrespondentAccountLabel')}
                value={ibanConfigInput.correspondentAccount}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, correspondentAccount: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanCorrespondentBankLabel')}
                value={ibanConfigInput.correspondentBank}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, correspondentBank: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanPaymentReferenceLabel')}
                value={ibanConfigInput.paymentReference ?? ''}
                onChange={(e) => setIbanConfigInput((prev) => ({ ...prev, paymentReference: e.target.value }))}
                placeholder="Order {{orderId}}"
                size="small"
                fullWidth
                helperText={t('ibanPaymentReferenceHint')}
              />
              <Button variant="contained" onClick={handleSaveIbanConfig} disabled={savingIbanConfig} sx={{ alignSelf: 'flex-start' }}>
                {savingIbanConfig ? '…' : t('save')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('sepaPaymentTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('sepaPaymentHint')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {loadingSepaFlag ? (
              <Skeleton width={120} height={40} />
            ) : (
              <FormControlLabel
                control={
                  <Switch
                    checked={sepaPaymentEnabled}
                    onChange={(e) => {
                      setSepaPaymentEnabled(e.target.checked);
                      setSavingSepaFlag(true);
                      setError(null);
                      setAdminSepaPaymentEnabled(e.target.checked, token)
                        .then(setSepaPaymentEnabled)
                        .catch((err) => setError(err?.message || 'Failed to save'))
                        .finally(() => setSavingSepaFlag(false));
                    }}
                    disabled={savingSepaFlag}
                  />
                }
                label={t('sepaPaymentEnabled')}
              />
            )}
          </Box>
          {loadingSepaConfig ? (
            <Skeleton height={160} />
          ) : (
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 }}>
              <TextField
                label={t('ibanLabel')}
                value={sepaConfigInput.iban}
                onChange={(e) => setSepaConfigInput((prev) => ({ ...prev, iban: e.target.value }))}
                placeholder="DE89370400440532013000"
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanBicSwiftLabel')}
                value={sepaConfigInput.bicSwift}
                onChange={(e) => setSepaConfigInput((prev) => ({ ...prev, bicSwift: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanBeneficiaryNameLabel')}
                value={sepaConfigInput.beneficiaryName}
                onChange={(e) => setSepaConfigInput((prev) => ({ ...prev, beneficiaryName: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('ibanBeneficiaryBankLabel')}
                value={sepaConfigInput.beneficiaryBank}
                onChange={(e) => setSepaConfigInput((prev) => ({ ...prev, beneficiaryBank: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label={t('sepaReferenceTemplateLabel')}
                value={sepaConfigInput.referenceTemplate}
                onChange={(e) => setSepaConfigInput((prev) => ({ ...prev, referenceTemplate: e.target.value }))}
                placeholder="FoxPlay {{orderId}} {{amount}} {{currency}}"
                size="small"
                fullWidth
                helperText={t('sepaReferenceTemplateHint')}
              />
              <Button variant="contained" onClick={handleSaveSepaConfig} disabled={savingSepaConfig} sx={{ alignSelf: 'flex-start' }}>
                {savingSepaConfig ? '…' : t('save')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
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
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 520 }}>
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
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            justifyContent: 'flex-end',
                            '& .MuiButton-root': { minHeight: 44 },
                            '& .MuiIconButton-root': { minHeight: 44, minWidth: 44 },
                          }}
                        >
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
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
