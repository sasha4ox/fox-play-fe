'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useAuthStore } from '@/store/authStore';
import { getMyOffers, updateOffer } from '@/lib/api';
import { formatAdena, formatPricePer1Adena } from '@/lib/adenaFormat';
import { formatPriceForUnit } from '@/lib/offerMinPrice';
import { logClientError } from '@/lib/clientLogger';

const OFFER_TYPE_LABELS = { ADENA: 'Adena', ITEMS: 'Items', ACCOUNTS: 'Accounts', BOOSTING: 'Boosting', OTHER: 'Other' };

export default function MyOffersPage() {
  const locale = useLocale();
  const t = useTranslations('Offers');
  const tCommon = useTranslations('Common');
  const token = useAuthStore((s) => s.token);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMyOffers(token)
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleToggleStatus = (offer) => {
    const newStatus = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingId(offer.id);
    updateOffer(offer.id, { status: newStatus }, token)
      .then((updated) => {
        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, status: updated.status } : o))
        );
      })
      .catch((err) => {
        setError(err.message);
        logClientError(err);
      })
      .finally(() => setTogglingId(null));
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">{t('loginToSeeOffers')}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <Link href={`/${locale}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            {t('dashboard')}
          </MuiLink>
        </Link>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {t('myOffers')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('offersHint')}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Skeleton variant="text" width="70%" height={28} />
                  <Skeleton variant="text" width="50%" height={20} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && offers.length === 0 && (
          <Typography color="text.secondary">{t('noOffers')}</Typography>
        )}
        {!loading && offers.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {offers.map((offer) => {
              const gameId = offer.server?.gameVariant?.game?.id;
              const variantId = offer.server?.gameVariant?.id;
              const serverId = offer.server?.id;
              const gameName = offer.server?.gameVariant?.game?.name;
              const variantName = offer.server?.gameVariant?.name;
              const serverName = offer.server?.name;
              const offersListHref =
                gameId && variantId && serverId
                  ? `/${locale}/game/${gameId}/${variantId}/${serverId}/offers`
                  : null;
              const href =
                gameId && variantId && serverId
                  ? `/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`
                  : `/${locale}/dashboard`;
              const editHref =
                gameId && variantId && serverId
                  ? `/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}/edit`
                  : null;
              const isAdena = offer.offerType === 'ADENA';
              const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
              const currency = offer.displayCurrency ?? offer.currency;
              return (
                <Card key={offer.id} variant="outlined">
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600} component={Link} href={href} sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {offer.title}
                      </Typography>
                      {offer.status != null && (
                        <Chip
                          size="small"
                          label={offer.status === 'ACTIVE' ? t('offerActive') : t('offerInactive')}
                          color={offer.status === 'ACTIVE' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      )}
                    </Box>
                    {offersListHref && (gameName || serverName) && (
                      <Box sx={{ mb: 1 }}>
                        <MuiLink component={Link} href={offersListHref} color="secondary" sx={{ fontSize: '0.875rem' }}>
                          {t('gameServer')}: {gameName ?? ''} → {variantName ?? ''} → {serverName ?? ''}
                        </MuiLink>
                      </Box>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType} · {offer.displayPrice != null ? `${offer.displayPrice} ${currency}` : `${offer.price} ${offer.currency}`} · {t('qty')}: {isAdena ? formatAdena(Number(offer.quantity)) : offer.quantity}
                    </Typography>
                    {isAdena && pricePer1kk > 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {t('per100kk')}: {formatPriceForUnit(pricePer1kk * 100)} {currency} · {t('per1kkk')}: {formatPriceForUnit(pricePer1kk * 1000)} {currency} · {t('per1Adena')}: {formatPricePer1Adena(pricePer1kk)} {currency}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                      <MuiLink component={Link} href={href} color="secondary" sx={{ mr: 1 }}>
                        {tCommon('view')}
                      </MuiLink>
                      {editHref && (
                        <MuiLink component={Link} href={editHref} color="secondary">
                          {tCommon('edit')}
                        </MuiLink>
                      )}
                      {offer.status != null && (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={offer.status === 'ACTIVE'}
                              onChange={() => handleToggleStatus(offer)}
                              disabled={togglingId === offer.id}
                              size="small"
                            />
                          }
                          label={t('toggleOfferStatus')}
                          sx={{ ml: 0 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
