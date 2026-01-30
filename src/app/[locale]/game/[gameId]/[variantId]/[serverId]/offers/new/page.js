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
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const offerType = OFFER_TYPES[tab]?.value ?? 'OTHER';
  const isAdena = offerType === 'ADENA';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !serverId) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      offerType,
      serverId,
      currency,
      title: isAdena ? 'Adena' : title,
      description: isAdena ? `Selling ${quantity} adena` : description,
      quantity: isAdena ? Number(quantity) : 1,
      price: Number(price) || 0,
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
        <Container maxWidth="sm">
          <Alert severity="error">{gamesError}</Alert>
          <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>← Back</MuiLink>
        </Container>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Alert severity="info">{t('loginToCreate')}</Alert>
          <MuiLink component={Link} href={`/${locale}`} sx={{ display: 'inline-block', mt: 2 }}>{t('goToLogin')}</MuiLink>
        </Container>
      </Box>
    );
  }

  const breadcrumb = `${game.name} → ${variant.name} → ${server.name}`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
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
            <>
              <TextField
                type="number"
                label={t('amountOfAdena')}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputProps={{ min: 1 }}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
              <TextField
                type="number"
                label={t('pricePerUnit', { currency })}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                sx={{ mb: 2 }}
                required
              />
            </>
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
