'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import {
  getGameFromTree,
  getVariantFromTree,
  getServerFromTree,
  pathGameVariantServer,
  getDefaultCategorySlug,
  getAllowedOfferTypesForServer,
  isUuidSegment,
} from '@/lib/games';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { createOffer, getPlatformFeePercent, fetchOfferRecentPrices } from '@/lib/api';
import { formatAdena, parseAdenaInput } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk, formatPriceForUnit } from '@/lib/offerMinPrice';

export default function NewOfferPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NewOffer');
  const tOffers = useTranslations('Offers');
  const gameId = params?.gameId;
  const ALL_OFFER_TYPES = [
    { value: 'ADENA', label: tOffers('adena') },
    { value: 'COINS', label: tOffers('coins') },
    { value: 'ITEMS', label: tOffers('items') },
    { value: 'ACCOUNTS', label: tOffers('accounts') },
    { value: 'BOOSTING', label: tOffers('boosting') },
    { value: 'OTHER', label: tOffers('other') },
  ];
  const STANDARD_CATEGORY_NAMES = new Set(['adena', 'coins', 'items', 'accounts', 'boosting', 'other']);
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading, error: gamesError } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const resolvedServerId = server?.id ?? (isUuidSegment(serverId) ? serverId : null);
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

  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

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
  const [quantityCoins, setQuantityCoins] = useState('1');
  const [priceCoins, setPriceCoins] = useState('1');
  const [quantityCoinsError, setQuantityCoinsError] = useState(null);
  const [priceCoinsError, setPriceCoinsError] = useState(null);
  const [minSellQuantityCoins, setMinSellQuantityCoins] = useState('');
  const [minSellQuantityCoinsError, setMinSellQuantityCoinsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [platformFeePercent, setPlatformFeePercent] = useState(20);
  const [recentPrices, setRecentPrices] = useState([]);

  useEffect(() => {
    getPlatformFeePercent().then(setPlatformFeePercent).catch(() => {});
  }, []);

  useEffect(() => {
    if (!game || !variant || !server || gamesLoading) return;
    const uuidPath =
      (isUuidSegment(gameId) && gameId === game.id) ||
      (isUuidSegment(variantId) && variantId === variant.id) ||
      (isUuidSegment(serverId) && serverId === server.id);
    if (!uuidPath) return;
    const q = categoryFromUrl ? `?category=${encodeURIComponent(categoryFromUrl)}` : '';
    router.replace(`${pathGameVariantServer(locale, game, variant, server, null)}/new${q}`);
  }, [game, variant, server, gameId, variantId, serverId, gamesLoading, locale, router, categoryFromUrl]);

  useEffect(() => {
    if (!categoryFromUrl || OFFER_TYPES.length === 0) return;
    const index = OFFER_TYPES.findIndex((t) => t.value === categoryFromUrl);
    if (index >= 0) setTab(index);
  }, [categoryFromUrl, OFFER_TYPES.length]);

  useEffect(() => {
    if (!resolvedServerId) return;
    const offerType = OFFER_TYPES[tab]?.value;
    const customCategoryId = OFFER_TYPES[tab]?.custom ? OFFER_TYPES[tab].value : null;
    fetchOfferRecentPrices({
      serverId: resolvedServerId,
      offerType: offerType && !OFFER_TYPES[tab]?.custom ? offerType : undefined,
      customCategoryId: customCategoryId || undefined,
      displayCurrency: currency,
    })
      .then((data) => setRecentPrices(data?.prices ?? []))
      .catch(() => setRecentPrices([]));
  }, [resolvedServerId, tab, currency]);

  const selectedTab = OFFER_TYPES[tab];
  const offerType = selectedTab?.custom ? 'OTHER' : (selectedTab?.value ?? 'OTHER');
  const customCategoryId = selectedTab?.custom ? selectedTab.value : null;
  const isAdena = !selectedTab?.custom && selectedTab?.value === 'ADENA';
  const isCoins = !selectedTab?.custom && selectedTab?.value === 'COINS';

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

  const validateCoinsInputs = () => {
    let valid = true;
    if (isCoins) {
      const qty = parseInt(String(quantityCoins).trim(), 10);
      const qOk = Number.isInteger(qty) && qty >= 1;
      const priceVal = parsePricePerUnit(priceCoins);
      const pOk = Number.isFinite(priceVal) && priceVal >= 0;
      setQuantityCoinsError(qOk ? null : t('minQuantityCoins'));
      setPriceCoinsError(pOk ? null : t('invalidPrice'));
      if (!qOk || !pOk) valid = false;
      if (minSellQuantityCoins.trim() !== '') {
        const minQty = parseInt(String(minSellQuantityCoins).trim(), 10);
        const totalQty = qOk ? parseInt(String(quantityCoins).trim(), 10) : 0;
        const minQtyOk = Number.isInteger(minQty) && minQty >= 1 && minQty <= totalQty;
        setMinSellQuantityCoinsError(minQtyOk ? null : t('minSellQuantityError'));
        if (!minQtyOk) valid = false;
      } else {
        setMinSellQuantityCoinsError(null);
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
    if (!token || !resolvedServerId) return;
    setSubmitError(null);
    setPriceErrorNonAdena(null);
    if (isAdena && !validateAdenaInputs()) return;
    if (isCoins && !validateCoinsInputs()) return;
    if (!isAdena && !isCoins) {
      const parsedPrice = parseDecimalPrice(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setPriceErrorNonAdena(t('invalidPrice'));
        return;
      }
    }
    setSubmitting(true);
    const quantityNum = isAdena ? (parseQuantityAdena(quantityAdena) ?? minQuantityAdena) : (isCoins ? Math.max(1, parseInt(String(quantityCoins).trim(), 10) || 1) : 1);
    const priceForUnit = isAdena ? parsePricePerUnit(priceAdena) : (isCoins ? parsePricePerUnit(priceCoins) : 0);
    const priceNum = isAdena ? (Number.isFinite(priceForUnit) ? priceForUnit / effectiveUnitKk : 0) : (isCoins ? (Number.isFinite(priceForUnit) ? priceForUnit : 0) : parseDecimalPrice(price) || 0);
    const minSellQtyNum = isAdena && minSellQuantityAdena.trim() !== ''
      ? (parseQuantityAdena(minSellQuantityAdena) ?? null)
      : (isCoins && minSellQuantityCoins.trim() !== '' ? (parseInt(String(minSellQuantityCoins).trim(), 10) || null) : null);
    const payload = {
      offerType,
      serverId: resolvedServerId,
      currency,
      title: isAdena ? 'Adena' : (isCoins ? 'Coins' : title),
      description: isAdena ? `Selling ${formatAdena(quantityNum)} adena` : (isCoins ? `Selling ${quantityNum} coins` : description),
      quantity: quantityNum,
      price: priceNum,
      ...(customCategoryId && { customCategoryId }),
      ...((isAdena || isCoins) && minSellQtyNum != null && { minSellQuantity: minSellQtyNum }),
    };
    try {
      await createOffer(payload, token);
      router.push(
        pathGameVariantServer(
          locale,
          game,
          variant,
          server,
          getDefaultCategorySlug(getAllowedOfferTypesForServer(server), server)
        )
      );
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
        <MuiLink
          component={Link}
          href={pathGameVariantServer(
            locale,
            game,
            variant,
            server,
            getDefaultCategorySlug(getAllowedOfferTypesForServer(server), server)
          )}
          color="secondary"
          sx={{ display: 'inline-block', mb: 2 }}
        >
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
            <Box sx={{ mx: 'auto' }}>
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
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
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
                inputProps={{ step: '0.01', min: 0 }}
                value={priceAdena}
                onChange={(e) => {
                  setPriceAdena(e.target.value);
                  setPriceError(null);
                }}
                helperText={priceError}
                error={!!priceError}
                required
                fullWidth
                sx={{
                  mb: 0.5,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
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
                      {t('buyerWillPay')}: <strong>{buyerWillPaySum} {currency}</strong>
                    </Typography>
                    <Box sx={{ mt: 0, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>1)</strong> {t('youWillReceive')}: <strong>{(quantityKk / effectiveUnitKk * priceNum).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>2)</strong> {t('buyerWillPay')}:{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: isLowestPrice ? 'success.main' : 'inherit' }}>{buyerWillPaySum} {currency}</Box>
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
                                    price: (p.pricePerUnitKk ?? p.pricePer100kk) != null ? formatPriceForUnit(Number(p.pricePerUnitKk ?? p.pricePer100kk)) : String(p.pricePerUnit ?? '—'),
                                    currency: p.currency,
                                  })
                                : t('sellingPricePerNkkSuffix', {
                                    quantityKk: p.quantityKk,
                                    price: (p.pricePerUnitKk ?? p.pricePer100kk) != null ? formatPriceForUnit(Number(p.pricePerUnitKk ?? p.pricePer100kk)) : String(p.pricePerUnit ?? '—'),
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
                fullWidth
                sx={{
                  mt: 2,
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{adenaPriceUnitKk === 0 ? 'k' : 'kk'}</InputAdornment>,
                }}
              />
            </Box>
          )}
          {isCoins && (
            <Box sx={{ mx: 'auto' }}>
              <TextField
                label={t('amountOfCoins')}
                type="number"
                inputMode="numeric"
                value={quantityCoins}
                onChange={(e) => {
                  setQuantityCoins(e.target.value);
                  setQuantityCoinsError(null);
                }}
                helperText={quantityCoinsError}
                error={!!quantityCoinsError}
                required
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                inputProps={{ min: 1, step: 1 }}
              />
              <TextField
                label={t('pricePer1Coin', { currency })}
                type="text"
                inputMode="decimal"
                inputProps={{ step: '0.01', min: 0 }}
                value={priceCoins}
                onChange={(e) => {
                  setPriceCoins(e.target.value);
                  setPriceCoinsError(null);
                }}
                helperText={priceCoinsError}
                error={!!priceCoinsError}
                required
                fullWidth
                sx={{
                  mb: 0.5,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('buyerWillPay')}: <strong>{((parseInt(String(quantityCoins).trim(), 10) || 0) * (parsePricePerUnit(priceCoins) || 0) * (1 + platformFeePercent / 100)).toFixed(2)} {currency}</strong>
              </Typography>
              <TextField
                label={t('minSellQuantity')}
                type="number"
                inputMode="numeric"
                value={minSellQuantityCoins}
                onChange={(e) => {
                  setMinSellQuantityCoins(e.target.value);
                  setMinSellQuantityCoinsError(null);
                }}
                helperText={minSellQuantityCoinsError || t('minSellQuantityHint')}
                error={!!minSellQuantityCoinsError}
                fullWidth
                sx={{
                  mt: 2,
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                inputProps={{ min: 1, step: 1 }}
              />
            </Box>
          )}
          {!isAdena && !isCoins && (
            <Box sx={{ mx: 'auto' }}>
              <TextField
                label={t('title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                }}
                required
              />
              <TextField
                label={t('description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={4}
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                }}
                required
              />
              <TextField
                type="text"
                inputMode="decimal"
                inputProps={{ step: '0.01', min: 0 }}
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
                  mb: 0.5,
                  '& .MuiInputBase-input': { py: 1.5, fontSize: '1rem' },
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                required
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('buyerWillPay')}: <strong>{((parseDecimalPrice(price) || 0) * (1 + platformFeePercent / 100)).toFixed(2)} {currency}</strong>
              </Typography>
            </Box>
          )}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={
              submitting ||
              (isAdena &&
                (!Number.isFinite(parsePricePerUnit(priceAdena)) || parsePricePerUnit(priceAdena) < minPricePerUnit)) ||
              (isCoins &&
                (!Number.isInteger(parseInt(String(quantityCoins).trim(), 10)) || parseInt(String(quantityCoins).trim(), 10) < 1 || !Number.isFinite(parsePricePerUnit(priceCoins)) || parsePricePerUnit(priceCoins) < 0))
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
