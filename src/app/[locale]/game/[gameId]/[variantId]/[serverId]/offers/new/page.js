'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree, getServerFromTree } from '@/lib/games';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { createOffer, getPlatformFeePercent, fetchOfferRecentPrices } from '@/lib/api';
import { formatAdena, parseAdenaInput } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk } from '@/lib/offerMinPrice';

export default function NewOfferPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NewOffer');
  const tOffers = useTranslations('Offers');
  const gameId = params?.gameId;
  const ALL_OFFER_TYPES = [
    { value: 'ADENA', label: tOffers('adena') },
    { value: 'ITEMS', label: tOffers('items') },
    { value: 'ACCOUNTS', label: tOffers('accounts') },
    { value: 'BOOSTING', label: tOffers('boosting') },
    { value: 'OTHER', label: tOffers('other') },
  ];
  const STANDARD_CATEGORY_NAMES = new Set(['adena', 'items', 'accounts', 'boosting', 'other']);
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading, error: gamesError } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const adenaPriceUnitKk = server?.adenaPriceUnitKk ?? game?.adenaPriceUnitKk ?? 100;
  const effectiveUnitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  const token = useAuthStore((s) => s.token);
  const { preferredCurrency } = useProfile();
  const currency = preferredCurrency ?? 'EUR';
  const unitLabel = adenaPriceUnitKk === 0 ? t('pricePer1k') : t('pricePerNkk', { n: adenaPriceUnitKk, currency });
  const serverTypes = server?.enabledOfferTypes && server.enabledOfferTypes.length > 0
    ? server.enabledOfferTypes
    : null;
  const customCategoriesOnly = (server?.customCategories ?? []).filter(
    (c) => !STANDARD_CATEGORY_NAMES.has(c.name.toLowerCase())
  );
  const allowedOfferTypes = serverTypes ?? [...ALL_OFFER_TYPES.map((t) => t.value), ...customCategoriesOnly.map((c) => c.id)];
  const standardTabs = ALL_OFFER_TYPES.filter((t) => allowedOfferTypes.includes(t.value));
  const customTabs = customCategoriesOnly.map((c) => ({ value: c.id, label: c.name, custom: true }));
  const OFFER_TYPES = [...standardTabs, ...customTabs];

  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantityAdena, setQuantityAdena] = useState('1');
  const [priceAdena, setPriceAdena] = useState('1');
  const [quantityError, setQuantityError] = useState(null);
  const [priceError, setPriceError] = useState(null);
  const [price, setPrice] = useState('');
  const [priceErrorNonAdena, setPriceErrorNonAdena] = useState(null);
  const [minSellQuantityAdena, setMinSellQuantityAdena] = useState('');
  const [minSellQuantityError, setMinSellQuantityError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [platformFeePercent, setPlatformFeePercent] = useState(20);
  const [recentPrices, setRecentPrices] = useState([]);

  useEffect(() => {
    getPlatformFeePercent().then(setPlatformFeePercent).catch(() => {});
  }, []);

  useEffect(() => {
    if (!serverId) return;
    const offerType = OFFER_TYPES[tab]?.value;
    const customCategoryId = OFFER_TYPES[tab]?.custom ? OFFER_TYPES[tab].value : null;
    fetchOfferRecentPrices({
      serverId,
      offerType: offerType && !OFFER_TYPES[tab]?.custom ? offerType : undefined,
      customCategoryId: customCategoryId || undefined,
      displayCurrency: currency,
    })
      .then((data) => setRecentPrices(data?.prices ?? []))
      .catch(() => setRecentPrices([]));
  }, [serverId, tab, currency]);

  const selectedTab = OFFER_TYPES[tab];
  const offerType = selectedTab?.custom ? 'OTHER' : (selectedTab?.value ?? 'OTHER');
  const customCategoryId = selectedTab?.custom ? selectedTab.value : null;
  const isAdena = !selectedTab?.custom && selectedTab?.value === 'ADENA';

  const minQuantityAdena = adenaPriceUnitKk === 0 ? 1000 : 1_000_000;
  const minPricePerUnit = getMinPriceForUnit(currency, adenaPriceUnitKk);

  /** Parse quantity string to adena amount. When unit is 1k: plain number = k (×1000). When unit is kk: plain number = kk (×1M). Also accepts "100k", "2kk", etc. Returns null if invalid. */
  const parseQuantityAdena = (str) => {
    if (str == null || String(str).trim() === '') return null;
    const s = String(str).trim().toLowerCase();
    if (/k/.test(s)) {
      const adena = parseAdenaInput(String(str));
      return adena != null ? adena : null;
    }
    const num = parseFloat(String(str).trim().replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;
    const multiplier = adenaPriceUnitKk === 0 ? 1_000 : 1_000_000;
    return Math.floor(num * multiplier);
  };

  /** Parse price per unit (adenaPriceUnitKk) string to number. Returns NaN if invalid. */
  const parsePricePerUnit = (str) => {
    if (str == null || String(str).trim() === '') return NaN;
    return parseFloat(String(str).trim().replace(',', '.'));
  };

  const validateAdenaInputs = () => {
    let valid = true;
    if (isAdena) {
      const qtyAdena = parseQuantityAdena(quantityAdena);
      const qOk = qtyAdena != null && qtyAdena >= minQuantityAdena;
      const priceVal = parsePricePerUnit(priceAdena);
      const pOk = Number.isFinite(priceVal) && priceVal >= minPricePerUnit;
      setQuantityError(qOk ? null : (adenaPriceUnitKk === 0 ? t('min1k') : t('min1kk')));
      setPriceError(pOk ? null : (adenaPriceUnitKk === 0 ? t('minPriceFor1k') : t('minPriceFor100kk')));
      if (!qOk || !pOk) valid = false;
      // Validate optional minSellQuantity
      if (minSellQuantityAdena.trim() !== '') {
        const minQty = parseQuantityAdena(minSellQuantityAdena);
        const totalQty = qtyAdena ?? 0;
        const minQtyOk = minQty != null && minQty >= minQuantityAdena && minQty <= totalQty;
        setMinSellQuantityError(minQtyOk ? null : t('minSellQuantityError'));
        if (!minQtyOk) valid = false;
      } else {
        setMinSellQuantityError(null);
      }
    }
    return valid;
  };

  const parseDecimalPrice = (value) => {
    if (value == null || String(value).trim() === '') return NaN;
    const normalized = String(value).trim().replace(',', '.');
    return parseFloat(normalized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !serverId) return;
    setSubmitError(null);
    setPriceErrorNonAdena(null);
    if (isAdena && !validateAdenaInputs()) return;
    if (!isAdena) {
      const parsedPrice = parseDecimalPrice(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setPriceErrorNonAdena(t('invalidPrice'));
        return;
      }
    }
    setSubmitting(true);
    const quantityNum = isAdena ? (parseQuantityAdena(quantityAdena) ?? minQuantityAdena) : 1;
    const priceForUnit = isAdena ? parsePricePerUnit(priceAdena) : 0;
    const priceNum = isAdena ? (Number.isFinite(priceForUnit) ? priceForUnit / effectiveUnitKk : 0) : parseDecimalPrice(price) || 0;
    const minSellQtyNum = isAdena && minSellQuantityAdena.trim() !== ''
      ? (parseQuantityAdena(minSellQuantityAdena) ?? null)
      : null;
    const payload = {
      offerType,
      serverId,
      currency,
      title: isAdena ? 'Adena' : title,
      description: isAdena ? `Selling ${formatAdena(quantityNum)} adena` : description,
      quantity: quantityNum,
      price: priceNum,
      ...(customCategoryId && { customCategoryId }),
      ...(isAdena && minSellQtyNum != null && { minSellQuantity: minSellQtyNum }),
    };
    try {
      await createOffer(payload, token);
      router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (gamesLoading || !game || !variant || !server) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (gamesError) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{gamesError}</Alert>
          <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>← Back</MuiLink>
        </Container>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">{t('loginToCreate')}</Alert>
          <MuiLink component={Link} href={`/${locale}`} sx={{ display: 'inline-block', mt: 2 }}>{t('goToLogin')}</MuiLink>
        </Container>
      </Box>
    );
  }

  const breadcrumb = `${game.name} → ${variant.name} → ${server.name}`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← Back to offers
        </MuiLink>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Sell items
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {breadcrumb}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('listingIn', { currency })}
        </Alert>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          {OFFER_TYPES.map((tabItem, i) => (
            <Tab key={tabItem.value} label={tabItem.label} value={i} />
          ))}
        </Tabs>

        <form onSubmit={handleSubmit}>
          {isAdena && (
            <Box sx={{ maxWidth: 260 }}>
              <TextField
                label={t('amountOfAdena')}
                type="text"
                inputMode="decimal"
                value={quantityAdena}
                onChange={(e) => {
                  setQuantityAdena(e.target.value);
                  setQuantityError(null);
                }}
                helperText={quantityError}
                error={!!quantityError}
                required
                sx={{
                  mb: 2,
                  width: '100%',
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{adenaPriceUnitKk === 0 ? 'k' : 'kk'}</InputAdornment>,
                }}
              />
              <TextField
                label={t('minSellQuantity')}
                type="text"
                inputMode="decimal"
                value={minSellQuantityAdena}
                onChange={(e) => {
                  setMinSellQuantityAdena(e.target.value);
                  setMinSellQuantityError(null);
                }}
                helperText={minSellQuantityError || t('minSellQuantityHint')}
                error={!!minSellQuantityError}
                sx={{
                  mb: 2,
                  width: '100%',
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{adenaPriceUnitKk === 0 ? 'k' : 'kk'}</InputAdornment>,
                }}
              />
              <TextField
                label={unitLabel}
                type="text"
                inputMode="decimal"
                value={priceAdena}
                onChange={(e) => {
                  setPriceAdena(e.target.value);
                  setPriceError(null);
                }}
                helperText={priceError}
                error={!!priceError}
                required
                sx={{
                  mb: 0.5,
                  width: '100%',
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                }}
              />
              {(() => {
                const currentPricePerUnit = parsePricePerUnit(priceAdena);
                const priceNum = Number.isFinite(currentPricePerUnit) ? currentPricePerUnit : 0;
                const qtyAdena = parseQuantityAdena(quantityAdena);
                const quantityKk = qtyAdena != null ? qtyAdena / 1_000_000 : 0;
                const recentPricesPerUnit = recentPrices.map((p) => p.pricePerUnitKk ?? p.pricePer100kk).filter((n) => n != null);
                const allPricesPerUnit = [...recentPricesPerUnit, priceNum];
                const isLowestPrice = allPricesPerUnit.length > 0 && priceNum <= Math.min(...allPricesPerUnit);
                const buyerWillPaySum = (quantityKk / effectiveUnitKk * priceNum * (1 + platformFeePercent / 100)).toFixed(2);
                const feeMultiplier = 1 + platformFeePercent / 100;
                const hasOtherPrices = recentPricesPerUnit.length > 0;
                return (
                  <>
                    <Typography
                      variant="body2"
                      component="p"
                      sx={{
                        mb: 2,
                        color: hasOtherPrices ? (isLowestPrice ? 'success.main' : 'error.main') : 'text.secondary',
                        fontWeight: 500,
                      }}
                    >
                      {t('buyerWillPay')}: <strong>{buyerWillPaySum} {currency}</strong> ({t('includesPlatformFee', { percent: platformFeePercent })})
                    </Typography>
                    <Box sx={{ mt: 0, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>1)</strong> {t('youWillReceive')}: <strong>{(quantityKk / effectiveUnitKk * priceNum).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>2)</strong> {t('buyerWillPay')}:{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: isLowestPrice ? 'success.main' : 'inherit' }}>{buyerWillPaySum} {currency}</Box>
                        {' '}({t('includesPlatformFee', { percent: platformFeePercent })})
                        {isLowestPrice && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'success.main', fontSize: '0.875rem' }}>
                            {t('lowerPriceGoodJob')}
                          </Box>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>3)</strong> {t('cost1kkk')}: <strong>{((1000 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>4)</strong> {t('cost100k')}: <strong>{((100 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>5)</strong> {t('cost1kk')}: <strong>{((1 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(4)} {currency}</strong>
                      </Typography>
                      {recentPrices.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>
                            {t('last3LowPrices')}
                          </Typography>
                          {recentPrices.map((p, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                              <Typography component="span" variant="body2" color="text.secondary">
                                {i + 1})
                              </Typography>
                              {p.sellerId ? (
                                <MuiLink
                                  component={Link}
                                  href={`/${locale}/user/${p.sellerId}`}
                                  sx={{
                                    fontWeight: 600,
                                    minHeight: 44,
                                    minWidth: 44,
                                    py: 0.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    '&:hover': { textDecoration: 'underline' },
                                  }}
                                  aria-label={`Profile of ${p.sellerNickname || 'seller'}`}
                                >
                                  {p.sellerNickname || '—'}
                                </MuiLink>
                              ) : (
                                <Typography component="span" variant="body2" color="text.secondary" fontWeight={600}>
                                  {p.sellerNickname || '—'}
                                </Typography>
                              )}
                              <Typography component="span" variant="body2" color="text.secondary">
                                {(p.adenaPriceUnitKk ?? adenaPriceUnitKk) === 0
                                ? t('sellingPricePer1kSuffixWithK', {
                                    quantityK: p.quantityKk * 1000,
                                    price: (p.pricePerUnitKk ?? p.pricePer100kk) != null ? Number(p.pricePerUnitKk ?? p.pricePer100kk).toFixed(2) : String(p.pricePerUnit ?? '—'),
                                    currency: p.currency,
                                  })
                                : t('sellingPricePerNkkSuffix', {
                                    quantityKk: p.quantityKk,
                                    price: (p.pricePerUnitKk ?? p.pricePer100kk) != null ? Number(p.pricePerUnitKk ?? p.pricePer100kk).toFixed(2) : String(p.pricePerUnit ?? '—'),
                                    currency: p.currency,
                                    n: p.adenaPriceUnitKk ?? adenaPriceUnitKk,
                                  })}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </>
                );
              })()}
            </Box>
          )}
          {!isAdena && (
            <>
              <TextField
                label={t('title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
              <TextField
                label={t('description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={4}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
              <TextField
                type="text"
                inputMode="decimal"
                label={`${t('price')} (${currency})`}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPriceErrorNonAdena(null);
                }}
                helperText={priceErrorNonAdena}
                error={!!priceErrorNonAdena}
                fullWidth
                sx={{
                  mb: 2,
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                required
              />
            </>
          )}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={
              submitting ||
              (isAdena &&
                (!Number.isFinite(parsePricePerUnit(priceAdena)) || parsePricePerUnit(priceAdena) < minPricePerUnit))
            }
            sx={{ mt: 2, mb: 3 }}
          >
            {submitting ? t('creating') : t('createOfferButton')}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
