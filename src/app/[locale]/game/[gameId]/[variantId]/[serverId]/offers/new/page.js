'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { createOffer } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';

export default function NewOfferPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NewOffer');
  const tOffers = useTranslations('Offers');
  const gameId = params?.gameId;
  const OFFER_TYPES = [
    { value: 'ADENA', label: tOffers('adena') },
    { value: 'ITEMS', label: tOffers('items') },
    { value: 'ACCOUNTS', label: tOffers('accounts') },
    { value: 'BOOSTING', label: tOffers('boosting') },
    { value: 'OTHER', label: tOffers('other') },
  ];
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading, error: gamesError } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
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

  const offerType = OFFER_TYPES[tab]?.value ?? 'OTHER';
  const isAdena = offerType === 'ADENA';

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
          {OFFER_TYPES.map((t, i) => (
            <Tab key={t.value} label={t.label} value={i} />
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
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  <strong>1)</strong> {t('youWillReceive')}: <strong>{((Number(quantityAdena) || 0) / 100 * (Number(priceAdena) || 0)).toFixed(2)} {currency}</strong>
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  <strong>2)</strong> {t('cost1kkk')}: <strong>{(10 * (Number(priceAdena) || 0)).toFixed(2)} {currency}</strong>
                </Typography>
                <Typography variant="body2" color="text.primary">
                  <strong>3)</strong> {t('pricePer1kk')}: <strong>{((Number(priceAdena) || 0) / 100).toFixed(4)} {currency}</strong>
                </Typography>
              </Box>
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
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
            </>
          )}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Button type="submit" variant="contained" color="secondary" disabled={submitting}>
            {submitting ? t('creating') : t('createOfferButton')}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
