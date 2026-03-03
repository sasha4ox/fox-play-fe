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
import { formatAdena } from '@/lib/adenaFormat';

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
  const token = useAuthStore((s) => s.token);
  const { preferredCurrency } = useProfile();
  const currency = preferredCurrency ?? 'EUR';

  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantityAdena, setQuantityAdena] = useState(1);
  const [priceAdena, setPriceAdena] = useState(1);
  const [quantityError, setQuantityError] = useState(null);
  const [priceError, setPriceError] = useState(null);
  const [price, setPrice] = useState('');
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

  const MIN_KK = 1;
  const MIN_PRICE_PER_100KK = 0.01;
  const validateAdenaInputs = () => {
    let valid = true;
    if (isAdena) {
      const qOk = Number.isFinite(quantityAdena) && quantityAdena >= MIN_KK;
      const pOk = Number.isFinite(priceAdena) && priceAdena >= MIN_PRICE_PER_100KK;
      setQuantityError(qOk ? null : t('min1kk'));
      setPriceError(pOk ? null : t('minPriceFor100kk'));
      if (!qOk || !pOk) valid = false;
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !serverId) return;
    setSubmitError(null);
    if (isAdena && !validateAdenaInputs()) return;
    setSubmitting(true);
    const quantityNum = isAdena ? Math.floor(Number(quantityAdena) * 1_000_000) : 1;
    const priceFor100kk = Number(priceAdena) || 0;
    const priceNum = isAdena ? priceFor100kk / 100 : Number(price) || 0;
    const payload = {
      offerType,
      serverId,
      currency,
      title: isAdena ? 'Adena' : title,
      description: isAdena ? `Selling ${formatAdena(quantityNum)} adena` : description,
      quantity: quantityNum,
      price: priceNum,
      ...(customCategoryId && { customCategoryId }),
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
                  const raw = e.target.value.replace(',', '.');
                  const v = raw === '' ? '' : Number(raw);
                  setQuantityAdena(v);
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
                  endAdornment: <InputAdornment position="end">kk</InputAdornment>,
                }}
              />
              <TextField
                label={t('priceFor100kk', { currency })}
                type="text"
                inputMode="decimal"
                value={priceAdena}
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  const v = raw === '' ? '' : Number(raw);
                  setPriceAdena(v);
                  setPriceError(null);
                }}
                helperText={priceError}
                error={!!priceError}
                required
                sx={{
                  mb: 2,
                  width: '100%',
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                }}
              />
              {(() => {
                const currentPricePer100kk = Number(priceAdena) || 0;
                const recentPricesPer100kk = recentPrices.map((p) => p.pricePer100kk).filter((n) => n != null);
                const allPricesPer100kk = [...recentPricesPer100kk, currentPricePer100kk];
                const isLowestPrice = allPricesPer100kk.length > 0 && currentPricePer100kk <= Math.min(...allPricesPer100kk);
                const buyerWillPaySum = ((Number(quantityAdena) || 0) / 100 * (Number(priceAdena) || 0) * (1 + platformFeePercent / 100)).toFixed(2);
                return (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                      <strong>1)</strong> {t('youWillReceive')}: <strong>{((Number(quantityAdena) || 0) / 100 * (Number(priceAdena) || 0)).toFixed(2)} {currency}</strong>
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
                      <strong>3)</strong> {t('cost1kkk')}: <strong>{(10 * (Number(priceAdena) || 0)).toFixed(2)} {currency}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>4)</strong> {t('pricePer1kk')}: <strong>{((Number(priceAdena) || 0) / 100).toFixed(4)} {currency}</strong>
                    </Typography>
                    {recentPrices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {t('last3LowPrices')}
                        </Typography>
                        {recentPrices.map((p, i) => (
                          <Typography key={i} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {i + 1}) {t('userSellingPriceFor100kk', {
                              nickname: p.sellerNickname || '—',
                              quantityKk: p.quantityKk,
                              price: p.pricePer100kk != null ? Number(p.pricePer100kk).toFixed(2) : String(p.pricePerUnit ?? '—'),
                              currency: p.currency,
                            })}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
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
                type="number"
                label={`${t('price')} (${currency})`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputProps={{ min: 0 }}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
            </>
          )}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Button type="submit" variant="contained" color="secondary" disabled={submitting} sx={{ mt: 2, mb: 3 }}>
            {submitting ? t('creating') : t('createOfferButton')}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
