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
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOfferById, updateOffer, getPlatformFeePercent, fetchOfferRecentPrices } from '@/lib/api';
import { parseAdenaInput } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk } from '@/lib/offerMinPrice';

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('EditOffer');
  const tNew = useTranslations('NewOffer');
  const tCommon = useTranslations('Common');
  const offerId = params?.offerId;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [quantityAdena, setQuantityAdena] = useState('1');
  const [priceAdena, setPriceAdena] = useState('1');
  const [quantityError, setQuantityError] = useState(null);
  const [priceError, setPriceError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [platformFeePercent, setPlatformFeePercent] = useState(20);
  const [recentPrices, setRecentPrices] = useState([]);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { preferredCurrency, profile } = useProfile();
  const currency = offer?.displayCurrency ?? offer?.currency ?? preferredCurrency ?? 'EUR';
  const isAdena = offer?.offerType === 'ADENA';
  const adenaPriceUnitKk = offer?.server?.adenaPriceUnitKk ?? offer?.server?.gameVariant?.game?.adenaPriceUnitKk ?? 100;
  const effectiveUnitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  const unitLabel = adenaPriceUnitKk === 0 ? tNew('pricePer1k') : tNew('pricePerNkk', { n: adenaPriceUnitKk, currency });
  const isAdminOrMod = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId, token ?? null)
      .then((data) => {
        setOffer(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        if (data.offerType === 'ADENA') {
          const q = Number(data.quantity ?? 0);
          const p = Number(data.displayPrice ?? data.price ?? 0);
          const rawUnit = data.server?.adenaPriceUnitKk ?? data.server?.gameVariant?.game?.adenaPriceUnitKk ?? 100;
          const unitKk = getEffectiveUnitKk(rawUnit);
          setQuantityAdena(String(rawUnit === 0 ? (q / 1000 || 1) : (q / 1_000_000 || 1)));
          setPriceAdena(String(p * unitKk || 1)); // backend: price per 1kk → display: price per unit
        } else {
          setQuantity(Number(data.quantity ?? 1));
          setPrice(String(data.price ?? ''));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [offerId, token]);

  useEffect(() => {
    getPlatformFeePercent().then(setPlatformFeePercent).catch(() => {});
  }, []);

  useEffect(() => {
    if (!serverId || !isAdena) return;
    fetchOfferRecentPrices({
      serverId,
      offerType: 'ADENA',
      displayCurrency: currency,
    })
      .then((data) => setRecentPrices(data?.prices ?? []))
      .catch(() => setRecentPrices([]));
  }, [serverId, isAdena, currency]);

  const isCreator = user?.id && offer?.seller?.id && user.id === offer.seller.id;

  /** Parse price per unit string (accepts 1.25, 1,75). Returns NaN if invalid. */
  const parsePricePerUnit = (str) => {
    if (str == null || String(str).trim() === '') return NaN;
    return parseFloat(String(str).trim().replace(',', '.'));
  };

  /** Parse quantity string to adena amount. When unit is 1k: plain number = k (×1000). When unit is kk: plain number = kk (×1M). Also accepts "100k", "2kk", etc. Returns null if invalid. */
  const parseQuantityAdena = (str) => {
    if (str == null || String(str).trim() === '') return null;
    const s = String(str).trim().toLowerCase();
    if (/k/.test(s)) {
      const adena = parseAdenaInput(String(str));
      return adena != null ? adena : null;
    }
    const num = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;
    const multiplier = adenaPriceUnitKk === 0 ? 1_000 : 1_000_000;
    return Math.floor(num * multiplier);
  };

  const minQuantityAdena = adenaPriceUnitKk === 0 ? 1000 : 1_000_000;
  const minPricePerUnit = getMinPriceForUnit(currency, adenaPriceUnitKk);

  const validateAdenaInputs = () => {
    if (!isAdena) return true;
    const qtyAdena = parseQuantityAdena(quantityAdena);
    const qOk = qtyAdena != null && qtyAdena >= minQuantityAdena;
    const priceVal = parsePricePerUnit(priceAdena);
    const pOk = Number.isFinite(priceVal) && priceVal >= minPricePerUnit;
    setQuantityError(qOk ? null : (adenaPriceUnitKk === 0 ? tNew('min1k') : tNew('min1kk')));
    setPriceError(pOk ? null : (adenaPriceUnitKk === 0 ? tNew('minPriceFor1k') : tNew('minPriceFor100kk')));
    return qOk && pOk;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offer || !token || (!isCreator && !isAdminOrMod)) return;
    if (isAdena && !validateAdenaInputs()) return;
    if (!isAdena) {
      const parsedPrice = parseFloat(String(price).trim().replace(',', '.'));
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = isAdena
        ? {
            title,
            description,
            quantity: Math.floor(parseQuantityAdena(quantityAdena) ?? minQuantityAdena),
            price: parsePricePerUnit(priceAdena) / effectiveUnitKk,
          }
        : {
            title,
            description,
            quantity: Number(quantity) || 1,
            price: parseFloat(String(price).trim().replace(',', '.')) || 0,
          };
      await updateOffer(offer.id, payload, token);
      router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`);
    } catch (err) {
      setSubmitError(err.message || t('failedUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <Alert severity="error">{error || t('offerNotFound')}</Alert>
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} sx={{ display: 'inline-block', mt: 2 }}>{tCommon('back')}</MuiLink>
        </Container>
      </Box>
    );
  }

  if (!isCreator && !isAdminOrMod) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{t('onlyEditOwn')}</Alert>
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`} sx={{ display: 'inline-block', mt: 2 }}>{t('backToOffer')}</MuiLink>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          {t('backToOffer')}
        </MuiLink>
        {isAdminOrMod && !isCreator && (
          <Alert severity="info" sx={{ mb: 2 }}>{t('editingAsAdmin')}</Alert>
        )}
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {t('editOffer')}
        </Typography>

        <form onSubmit={handleSubmit}>
          {isAdena ? (
            <Box sx={{ maxWidth: 360 }}>
              <TextField
                label={tNew('amountOfAdena')}
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
                fullWidth
                sx={{
                  mb: 0.5,
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
                      {tNew('buyerWillPay')}: <strong>{buyerWillPaySum} {currency}</strong> ({tNew('includesPlatformFee', { percent: platformFeePercent })})
                    </Typography>
                    <Box sx={{ mt: 0, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>1)</strong> {tNew('youWillReceive')}: <strong>{(quantityKk / effectiveUnitKk * priceNum).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>2)</strong> {tNew('buyerWillPay')}:{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: isLowestPrice ? 'success.main' : 'inherit' }}>{buyerWillPaySum} {currency}</Box>
                        {' '}({tNew('includesPlatformFee', { percent: platformFeePercent })})
                        {isLowestPrice && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'success.main', fontSize: '0.875rem' }}>
                            {tNew('lowerPriceGoodJob')}
                          </Box>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>3)</strong> {tNew('cost1kkk')}: <strong>{((1000 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>4)</strong> {tNew('cost100k')}: <strong>{((100 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(2)} {currency}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        <strong>5)</strong> {tNew('cost1kk')}: <strong>{((1 / effectiveUnitKk) * priceNum * feeMultiplier).toFixed(4)} {currency}</strong>
                      </Typography>
                      {recentPrices.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>
                            {tNew('last3LowPrices')}
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
                                ? tNew('sellingPricePer1kSuffixWithK', {
                                    quantityK: p.quantityKk * 1000,
                                    price: (p.pricePerUnitKk ?? p.pricePer100kk) != null ? Number(p.pricePerUnitKk ?? p.pricePer100kk).toFixed(2) : String(p.pricePerUnit ?? '—'),
                                    currency: p.currency,
                                  })
                                : tNew('sellingPricePerNkkSuffix', {
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
          ) : (
            <>
              <TextField type="number" label={t('quantity')} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ min: 1 }} fullWidth sx={{ mb: 2 }} required />
              <TextField
                type="text"
                inputMode="decimal"
                label={`${t('price')} (${currency})`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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

          <TextField label={t('title')} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={{ mb: 2 }} required />
          <TextField label={t('description')} value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={4} fullWidth sx={{ mb: 2 }} required />

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
          >
            {submitting ? t('saving') : tCommon('save')}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
