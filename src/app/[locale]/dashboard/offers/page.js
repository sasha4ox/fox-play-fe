'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import { useAuthStore } from '@/store/authStore';
import { getMyOffers } from '@/lib/api';

const OFFER_TYPE_LABELS = { ADENA: 'Adena', ITEMS: 'Items', ACCOUNTS: 'Accounts', BOOSTING: 'Boosting', OTHER: 'Other' };

export default function MyOffersPage() {
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Alert severity="info">{t('loginToSeeOffers')}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
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
              const href =
                gameId && variantId && serverId
                  ? `/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`
                  : `/${locale}/dashboard`;
              const editHref =
                gameId && variantId && serverId
                  ? `/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}/edit`
                  : null;
              return (
                <Card key={offer.id} variant="outlined">
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} component={Link} href={href} sx={{ color: 'inherit', textDecoration: 'none' }}>
                      {offer.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType} · {offer.price} {offer.currency} · {t('qty')}: {offer.quantity}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <MuiLink component={Link} href={href} color="secondary" sx={{ mr: 1 }}>
                        {tCommon('view')}
                      </MuiLink>
                      {editHref && (
                        <MuiLink component={Link} href={editHref} color="secondary">
                          {tCommon('edit')}
                        </MuiLink>
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
