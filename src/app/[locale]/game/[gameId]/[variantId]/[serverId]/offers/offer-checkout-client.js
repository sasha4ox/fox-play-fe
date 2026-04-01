'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOfferById, createOrder, getAvailablePaymentMethods, getSafeTransferAvailability } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk, formatPriceForUnit } from '@/lib/offerMinPrice';
import { useGames } from '@/hooks/useGames';
import {
  getGameFromTree,
  getVariantFromTree,
  getServerFromTree,
  pathGameVariantServer,
  pathToOfferDetail,
  filterValueToCategorySlug,
  getAllowedOfferTypesForServer,
  getDefaultCategorySlug,
  isUuidSegment,
} from '@/lib/games';

export default function OfferCheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('OfferDetail');
  const tOffers = useTranslations('Offers');
  const tCommon = useTranslations('Common');
  const offerId = params?.segment;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const resolvedServerId = server?.id ?? serverId;

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyQuantityKk, setBuyQuantityKk] = useState(1);
  const [buyQuantityKkStr, setBuyQuantityKkStr] = useState('1');
  const [buyQuantityStr, setBuyQuantityStr] = useState('1');
  const [buyCharacterNick, setBuyCharacterNick] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { profile, primaryBalance } = useProfile();
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const currentUserId = user?.id ?? user?.userId;
  const isCreator = currentUserId && offer?.seller?.id && currentUserId === offer.seller.id;
  const preferredCurrency = profile?.preferredCurrency;

  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [cryptoPaymentEnabled, setCryptoPaymentEnabled] = useState(false);
  const [ibanPaymentEnabled, setIbanPaymentEnabled] = useState(false);
  const [sepaPaymentEnabled, setSepaPaymentEnabled] = useState(false);
  const [stAvailable, setStAvailable] = useState(false);
  const [stEnabled, setStEnabled] = useState(false);

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId, token, { displayCurrency: token ? undefined : 'USD' })
      .then((data) => {
        setOffer(data);
        const isCoinsType = data?.offerType === 'COINS';
        const isAdenaType = data?.offerType === 'ADENA';
        if (isCoinsType) {
          const initCoins = data?.minSellQuantity != null ? Number(data.minSellQuantity) : 1;
          setBuyQuantity(Math.max(1, Math.min(initCoins, Number(data.quantity) || 1)));
          setBuyQuantityStr(String(Math.max(1, Math.min(initCoins, Number(data.quantity) || 1))));
        } else {
          setBuyQuantity(1);
        }
        const initKk = data?.minSellQuantity != null ? Number(data.minSellQuantity) / 1_000_000 : 1;
        setBuyQuantityKk(initKk);
        setBuyQuantityKkStr(String(initKk));
        if (!isCoinsType && !isAdenaType) {
          setBuyQuantityStr('1');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [offerId, token, preferredCurrency]);

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

  useEffect(() => {
    if (!offer || !token || isCreator || !resolvedServerId) return;
    getSafeTransferAvailability(resolvedServerId, token, offer.seller?.id)
      .then((data) => setStAvailable(!!data?.available))
      .catch(() => setStAvailable(false));
  }, [offer, token, isCreator, resolvedServerId]);

  const parseKkFromStr = (s) => {
    const n = Number(String(s ?? '').replace(',', '.').trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const calcBuyQty = () => {
    if (!offer) return 1;
    const isAdena = offer.offerType === 'ADENA';
    const isCoins = offer.offerType === 'COINS';
    const minSellQty = (isAdena || isCoins) && offer.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
    if (isAdena) {
      const kk = parseKkFromStr(buyQuantityKkStr);
      const kkNum = Number.isFinite(kk) ? kk : buyQuantityKk;
      return Math.min(Number(offer.quantity), Math.max(minSellQty, Math.floor(kkNum * 1_000_000)));
    }
    const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
    const q = Number.isFinite(qRaw) ? Math.floor(qRaw) : buyQuantity;
    return Math.min(Math.max(minSellQty, q), Number(offer.quantity));
  };

  const computeBuyMoney = () => {
    if (!offer) {
      return { dealAmount: 0, stFee: 0, totalToPay: 0, currency: '' };
    }
    const isAdena = offer.offerType === 'ADENA';
    const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
    const unitPrice = pricePer1kk;
    const kk = parseKkFromStr(buyQuantityKkStr);
    const kkNum = Number.isFinite(kk) ? kk : buyQuantityKk;
    const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
    const qNum = Number.isFinite(qRaw) ? qRaw : buyQuantity;
    const dealAmount = isAdena ? kkNum * pricePer1kk : qNum * unitPrice;
    const usesDisplay = offer.displayPrice != null && offer.displayCurrency != null;
    const minStFee = usesDisplay
      ? (offer.safeTransferMinFeeInDisplay ?? offer.safeTransferMinFeeInSellerCurrency ?? 5)
      : (offer.safeTransferMinFeeInSellerCurrency ?? 5);
    const stFee = Math.round(Math.max(dealAmount * 0.05, minStFee) * 100) / 100;
    const totalToPay = stEnabled ? dealAmount + stFee : dealAmount;
    const currency = offer.displayCurrency ?? offer.currency ?? '';
    return { dealAmount, stFee, totalToPay, currency };
  };

  const validateBuyQuantity = () => {
    if (!offer) return 'Invalid offer';
    if (offer.offerType === 'ADENA') {
      const maxKk = (offer.quantity ?? 0) / 1_000_000;
      const minKk = offer.minSellQuantity != null ? Number(offer.minSellQuantity) / 1_000_000 : 0.001;
      const kk = parseKkFromStr(buyQuantityKkStr);
      if (buyQuantityKkStr.trim() === '' || !Number.isFinite(kk)) {
        return t('toBeReceived') ? `${t('toBeReceived')}: invalid` : 'Enter a valid amount';
      }
      if (kk < minKk || kk > maxKk) {
        return t('toBeReceived') ? `${t('toBeReceived')}: out of range` : 'Amount out of range';
      }
    } else if (offer.offerType !== 'COINS') {
      const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
      if (buyQuantityStr.trim() === '' || !Number.isFinite(qRaw)) {
        return t('quantity') ? `${t('quantity')}: invalid` : 'Enter a valid quantity';
      }
      const minSellQty = offer.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
      const q = Math.floor(qRaw);
      if (q < minSellQty || q > Number(offer.quantity)) {
        return t('quantity') ? `${t('quantity')}: out of range` : 'Quantity out of range';
      }
    }
    return null;
  };

  const submitOrder = async (paymentMethod, redirectPath) => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const qErr = validateBuyQuantity();
    if (qErr) {
      setBuyError(qErr);
      return;
    }
    const qty = calcBuyQty();
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      if (stEnabled) body.safeTransfer = true;
      if (paymentMethod) body.paymentMethod = paymentMethod;
      const order = await createOrder(body, token);
      router.push(redirectPath(order.id));
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };

  const pathGame = game ?? offer?.server?.gameVariant?.game;
  const pathVariant = variant ?? offer?.server?.gameVariant;
  const pathServer = server ?? offer?.server;
  const backHref =
    pathGame && pathVariant && pathServer && offerId
      ? pathToOfferDetail(locale, pathGame, pathVariant, pathServer, offerId)
      : `/${locale}/dashboard`;

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error || !offer) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{error || 'Offer not found.'}</Alert>
          <MuiLink component={Link} href={backHref} sx={{ display: 'inline-block', mt: 2 }}>
            ← Back
          </MuiLink>
        </Container>
      </Box>
    );
  }

  if (isCreator) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">{t('checkoutSellerCannotBuy')}</Alert>
          <Button component={Link} href={backHref} sx={{ mt: 2 }}>
            {t('backToOffers')}
          </Button>
        </Container>
      </Box>
    );
  }

  const maxQty = Math.max(1, offer.quantity);
  const isAdenaOffer = offer.offerType === 'ADENA';
  const maxKk = isAdenaOffer ? offer.quantity / 1_000_000 : null;
  const offerCurrency = offer.displayCurrency ?? offer.currency ?? '';
  const adenaPriceUnitKk = offer?.server?.adenaPriceUnitKk ?? offer?.server?.gameVariant?.game?.adenaPriceUnitKk ?? 100;
  const effectiveUnitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  const priceRaw = offer.displayPrice ?? offer.price;
  const pNum = typeof priceRaw === 'object' && priceRaw != null && typeof priceRaw.toString === 'function'
    ? Number(priceRaw.toString())
    : Number(priceRaw) || 0;
  const priceForUnitForMin = pNum * effectiveUnitKk;
  const isPriceBelowMin = isAdenaOffer && priceForUnitForMin < getMinPriceForUnit(offerCurrency, adenaPriceUnitKk);

  const { totalToPay, currency } = computeBuyMoney();
  const availableBalance = Number(primaryBalance?.available ?? 0);
  const hasEnoughBalance = offerCurrency && totalToPay > 0 && availableBalance >= totalToPay;
  const kkOk =
    !isAdenaOffer ||
    (() => {
      const kk = parseKkFromStr(buyQuantityKkStr);
      return buyQuantityKkStr.trim() !== '' && Number.isFinite(kk) && kk > 0;
    })();
  const qtyOk =
    isAdenaOffer ||
    (() => {
      const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
      return buyQuantityStr.trim() !== '' && Number.isFinite(qRaw) && Math.floor(qRaw) >= 1;
    })();
  const baseDisabled = buySubmitting || isPriceBelowMin || !kkOk || !qtyOk;

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
        <MuiLink component={Link} href={backHref} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          {t('backToOffers')}
        </MuiLink>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('checkoutTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {offer.title}
          {isAdenaOffer && maxKk != null ? ` · Max: ${maxKk} kk` : ` · Max: ${maxQty}`}
        </Typography>

        {cryptoPaymentEnabled && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<Chip label={t('checkoutFastestBadge')} color="success" size="small" sx={{ fontWeight: 700 }} />}>
            {t('checkoutCryptoFastest')}
          </Alert>
        )}

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t('checkoutOrderDetails')}
            </Typography>
            <TextField
              label={t('yourInGameNick')}
              value={buyCharacterNick}
              onChange={(e) => setBuyCharacterNick(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 64 }}
              sx={{ mb: 2 }}
            />
            {isAdenaOffer ? (
              <>
                <TextField
                  type="text"
                  inputMode="decimal"
                  label={t('toBeReceived')}
                  value={buyQuantityKkStr}
                  onChange={(e) => setBuyQuantityKkStr(e.target.value)}
                  onBlur={() => {
                    const kk = parseKkFromStr(buyQuantityKkStr);
                    const minKk = offer.minSellQuantity != null ? Number(offer.minSellQuantity) / 1_000_000 : 0.001;
                    if (buyQuantityKkStr.trim() === '' || !Number.isFinite(kk)) {
                      setBuyQuantityKk(minKk);
                      setBuyQuantityKkStr(String(minKk));
                      return;
                    }
                    const clamped = Math.min(maxKk, Math.max(minKk, kk));
                    setBuyQuantityKk(clamped);
                    setBuyQuantityKkStr(String(clamped));
                  }}
                  InputProps={{ endAdornment: <InputAdornment position="end">kk</InputAdornment> }}
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {offer.minSellQuantity != null && (
                    <>
                      {t('minPurchase')}: {formatAdena(Number(offer.minSellQuantity))} ·{' '}
                    </>
                  )}
                  Max: {formatAdena(offer.quantity ?? 0)}
                </Typography>
              </>
            ) : (
              <TextField
                type="text"
                inputMode="numeric"
                label={t('quantity')}
                value={buyQuantityStr}
                onChange={(e) => setBuyQuantityStr(e.target.value)}
                onBlur={() => {
                  const minSellQty = offer.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
                  const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
                  if (buyQuantityStr.trim() === '' || !Number.isFinite(qRaw)) {
                    setBuyQuantity(minSellQty);
                    setBuyQuantityStr(String(minSellQty));
                    return;
                  }
                  const q = Math.min(maxQty, Math.max(minSellQty, Math.floor(qRaw)));
                  setBuyQuantity(q);
                  setBuyQuantityStr(String(q));
                }}
                fullWidth
                sx={{ mb: 2 }}
              />
            )}
            <Typography variant="body1" sx={{ mb: 1 }}>
              {t('youWillPay')}:{' '}
              <strong>{Number.isFinite(totalToPay) ? totalToPay.toFixed(2) : '—'} {currency}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {t('bankFeeHint')}
            </Typography>
            {stAvailable && (
              <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'info.main', borderRadius: 1, bgcolor: (theme) => `${theme.palette.info.main}08` }}>
                <FormControlLabel
                  control={<Switch checked={stEnabled} onChange={(e) => setStEnabled(e.target.checked)} color="info" />}
                  label={<Typography variant="body2" fontWeight={600}>{t('safeTransferLabel')}</Typography>}
                />
                <Typography variant="caption" color="text.secondary" display="block" component="div" sx={{ ml: 4.5 }}>
                  {t.rich('safeTransferHintRich', {
                    learnMore: (chunks) => (
                      <MuiLink component={Link} href={`/${locale}/how-safe-transfer-works`} underline="hover" color="info.main">
                        {chunks}
                      </MuiLink>
                    ),
                  })}
                </Typography>
                {stEnabled && (() => {
                  const { dealAmount, stFee, totalToPay: tot, currency: cur } = computeBuyMoney();
                  return (
                    <Box sx={{ ml: 4.5, mt: 0.5 }}>
                      <Typography variant="body2" color="info.main" fontWeight={600}>
                        {t('safeTransferFee', { fee: stFee.toFixed(2), currency: cur })}
                      </Typography>
                      <Typography variant="body2" color="info.main">
                        {t('safeTransferTotal', { total: tot.toFixed(2), currency: cur })}
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}
          </CardContent>
        </Card>

        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t('checkoutPaymentMethods')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('checkoutPaymentIntro')}
        </Typography>

        {buyError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {buyError}
            {buyError.toLowerCase().includes('insufficient') && (
              <Box sx={{ mt: 1 }}>
                <MuiLink component={Link} href={`/${locale}/dashboard/balance`}>
                  {t('checkoutAddFundsLink')}
                </MuiLink>
              </Box>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {t('payWithBalance')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('checkoutHintBalance')}
              </Typography>
              <Button
                variant="contained"
                disabled={baseDisabled || !hasEnoughBalance}
                onClick={() => ensureAuth(() => submitOrder(undefined, (id) => `/${locale}/dashboard/orders/${id}`))}
              >
                {buySubmitting ? tCommon('loading') : t('payWithBalance')}
              </Button>
              {!hasEnoughBalance && token && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  {t('insufficientBalance')}
                </Typography>
              )}
            </CardContent>
          </Card>

          {cardPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {t('payByCard')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('checkoutHintCard')}
                </Typography>
                <Button
                  variant="contained"
                  disabled={baseDisabled}
                  onClick={() => ensureAuth(() => submitOrder('CARD_MANUAL', (id) => `/${locale}/dashboard/orders/${id}/card-payment`))}
                >
                  {buySubmitting ? tCommon('loading') : t('payByCard')}
                </Button>
              </CardContent>
            </Card>
          )}

          {cryptoPaymentEnabled && (
            <Card variant="outlined" sx={{ borderColor: 'success.main', borderWidth: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('payWithCrypto')}
                  </Typography>
                  <Chip label={t('checkoutFastestBadge')} color="success" size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('checkoutHintCrypto')}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {t('payWithCryptoUsdNotice')}
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={baseDisabled}
                  onClick={() => ensureAuth(() => submitOrder('CRYPTO_MANUAL', (id) => `/${locale}/pay-crypto/${id}`))}
                >
                  {buySubmitting ? tCommon('loading') : t('payWithCrypto')}
                </Button>
              </CardContent>
            </Card>
          )}

          {ibanPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {t('payViaIban')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('checkoutHintIban')}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={baseDisabled}
                  onClick={() => ensureAuth(() => submitOrder('IBAN_MANUAL', (id) => `/${locale}/dashboard/orders/${id}/iban-payment`))}
                >
                  {buySubmitting ? tCommon('loading') : t('payViaIban')}
                </Button>
              </CardContent>
            </Card>
          )}

          {sepaPaymentEnabled && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  {t('payViaSepa')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('checkoutHintSepa')}
                </Typography>
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  {t('checkoutSepaTiming')}
                </Alert>
                <Button
                  variant="outlined"
                  disabled={baseDisabled}
                  onClick={() => ensureAuth(() => submitOrder('SEPA_MANUAL', (id) => `/${locale}/dashboard/orders/${id}/iban-payment`))}
                >
                  {buySubmitting ? tCommon('loading') : t('payViaSepa')}
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
