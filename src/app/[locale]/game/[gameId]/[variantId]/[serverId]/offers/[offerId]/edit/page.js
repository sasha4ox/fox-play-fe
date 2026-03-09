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
import { fetchOfferById, updateOffer } from '@/lib/api';
import { parseAdenaInput } from '@/lib/adenaFormat';
import { getMinPriceFor100kk } from '@/lib/offerMinPrice';

const MIN_KK = 1;

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
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { preferredCurrency, profile } = useProfile();
  const currency = offer?.displayCurrency ?? offer?.currency ?? preferredCurrency ?? 'EUR';
  const isAdena = offer?.offerType === 'ADENA';
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
          setQuantityAdena(String(q / 1_000_000 || 1));
          setPriceAdena(String(p * 100 || 1)); // backend: price per 1kk → display: price for 100kk
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

  const isCreator = user?.id && offer?.seller?.id && user.id === offer.seller.id;

  /** Parse price per 100kk string (accepts 1.25, 1,75). Returns NaN if invalid. */
  const parsePricePer100kk = (str) => {
    if (str == null || String(str).trim() === '') return NaN;
    return parseFloat(String(str).trim().replace(',', '.'));
  };

  /** Parse quantity string to adena amount: "1", "1.5", "1,5", "2kk". Returns null if invalid. */
  const parseQuantityAdena = (str) => {
    if (str == null || String(str).trim() === '') return null;
    const s = String(str).trim().toLowerCase();
    if (/k/.test(s)) {
      const adena = parseAdenaInput(String(str));
      return adena != null ? adena : null;
    }
    const kk = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(kk) || kk <= 0) return null;
    return Math.floor(kk * 1_000_000);
  };

  const minPricePer100kk = getMinPriceFor100kk(currency);

  const validateAdenaInputs = () => {
    if (!isAdena) return true;
    const qtyAdena = parseQuantityAdena(quantityAdena);
    const qtyKk = qtyAdena != null ? qtyAdena / 1_000_000 : 0;
    const qOk = qtyAdena != null && qtyKk >= MIN_KK;
    const priceVal = parsePricePer100kk(priceAdena);
    const pOk = Number.isFinite(priceVal) && priceVal >= minPricePer100kk;
    setQuantityError(qOk ? null : tNew('min1kk'));
    setPriceError(pOk ? null : tNew('minPriceFor100kk'));
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
            quantity: Math.floor(parseQuantityAdena(quantityAdena) ?? 1_000_000),
            price: parsePricePer100kk(priceAdena) / 100,
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
                  endAdornment: <InputAdornment position="end">kk</InputAdornment>,
                }}
              />
              <TextField
                label={tNew('priceFor100kk', { currency })}
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
                  mb: 2,
                  '& input': { MozAppearance: 'textfield' },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                }}
              />
              <Box sx={{ mt: 1, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  <strong>1)</strong> {tNew('youWillReceive')}: <strong>{(((parseQuantityAdena(quantityAdena) ?? 0) / 1_000_000 / 100) * (parsePricePer100kk(priceAdena) || 0)).toFixed(2)} {currency}</strong>
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  <strong>2)</strong> {tNew('cost1kkk')}: <strong>{(10 * (parsePricePer100kk(priceAdena) || 0)).toFixed(2)} {currency}</strong>
                </Typography>
                <Typography variant="body2" color="text.primary">
                  <strong>3)</strong> {tNew('pricePer1kk')}: <strong>{((parsePricePer100kk(priceAdena) || 0) / 100).toFixed(4)} {currency}</strong>
                </Typography>
              </Box>
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
                (!Number.isFinite(parsePricePer100kk(priceAdena)) || parsePricePer100kk(priceAdena) < minPricePer100kk))
            }
          >
            {submitting ? t('saving') : tCommon('save')}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
