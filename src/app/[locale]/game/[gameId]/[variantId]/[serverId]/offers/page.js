'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree, getServerFromTree } from '@/lib/games';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { fetchOffersByServer, addRecentServer } from '@/lib/api';

const OFFER_TYPE_LABELS = { ADENA: 'Adena', ITEMS: 'Items', ACCOUNTS: 'Accounts', BOOSTING: 'Boosting', OTHER: 'Other' };

export default function GameOffersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('OffersList');
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading, error: gamesError } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const isAuthenticated = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);

  useEffect(() => {
    if (serverId && token) {
      addRecentServer(serverId, token).catch(() => {});
    }
  }, [serverId, token]);

  useEffect(() => {
    if (!serverId) return;
    setOffersLoading(true);
    setOffersError(null);
    fetchOffersByServer(serverId, token)
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
        setOffersLoading(false);
      })
      .catch((err) => {
        setOffersError(err.message);
        setOffersLoading(false);
      });
  }, [serverId, token]);

  const handleSellItems = () => {
    if (!isAuthenticated) {
      openLoginModal(() => router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/new`));
      return;
    }
    router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/new`);
  };

  if (gamesLoading || !game || !variant || !server) {
    if (gamesError)
      return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
          <Container>
            <Alert severity="error">{gamesError}</Alert>
            <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>{t('backToGames')}</MuiLink>
          </Container>
        </Box>
      );
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  const breadcrumb = `${game.name} → ${variant.name} → ${server.name}`;
  const servers = variant?.servers ?? [];
  const singleServer = servers.length === 1;
  const backHref = singleServer ? `/${locale}/game/${gameId}` : `/${locale}/game/${gameId}/${variantId}`;
  const backLabel = singleServer ? t('backToVariants') : t('backToServers');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink component={Link} href={backHref} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          {backLabel}
        </MuiLink>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('offersFor', { server: server?.name ?? '' })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {breadcrumb}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Button variant="contained" color="secondary" onClick={handleSellItems}>
            {isAuthenticated ? t('sellItems') : t('loginToSell')}
          </Button>
        </Box>

        {offersLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress color="secondary" size={24} />
          </Box>
        )}
        {offersError && <Alert severity="error" sx={{ mb: 2 }}>{offersError}</Alert>}
        {!offersLoading && !offersError && offers.length === 0 && (
          <Typography color="text.secondary">{t('noOffers')}</Typography>
        )}
        {!offersLoading && offers.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {offers.map((offer) => (
              <Card key={offer.id} variant="outlined">
                <CardActionArea component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`}>
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {offer.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                      {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType} · {offer.quantity}
                      {' · '}
                      {offer.displayPrice != null && offer.displayCurrency
                        ? `${offer.displayPrice} ${offer.displayCurrency} (${offer.price} ${offer.currency})`
                        : `${offer.price} ${offer.currency}`}
                      {offer.seller && (
                        <>
                          {' · by '}
                          {offer.seller.nickname ?? offer.seller.email ?? '—'}
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.25,
                              ml: 0.5,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: offer.seller.isOnline ? 'success.main' : 'text.disabled',
                              }}
                            />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {offer.seller.isOnline ? t('sellerOnline') : t('sellerOffline')}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
