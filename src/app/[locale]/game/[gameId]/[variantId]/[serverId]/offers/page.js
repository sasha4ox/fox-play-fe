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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree, getServerFromTree } from '@/lib/games';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOffersByServer, addRecentServer } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';

const OFFER_TYPES = ['ADENA', 'ITEMS', 'ACCOUNTS', 'BOOSTING', 'OTHER'];

export default function GameOffersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('OffersList');
  const tOffers = useTranslations('Offers');
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
  const { preferredCurrency } = useProfile();

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ADENA');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  useEffect(() => {
    if (serverId && token) {
      addRecentServer(serverId, token).catch(() => {});
    }
  }, [serverId, token]);

  useEffect(() => {
    if (!serverId) return;
    setOffersLoading(true);
    setOffersError(null);
    const params = { offerType: categoryFilter || undefined };
    const pMin = priceMin !== '' && !Number.isNaN(Number(priceMin)) ? Number(priceMin) : undefined;
    const pMax = priceMax !== '' && !Number.isNaN(Number(priceMax)) ? Number(priceMax) : undefined;
    if (pMin != null) params.priceMin = pMin;
    if (pMax != null) params.priceMax = pMax;
    fetchOffersByServer(serverId, token, params)
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
        setOffersLoading(false);
      })
      .catch((err) => {
        setOffersError(err.message);
        setOffersLoading(false);
      });
  }, [serverId, token, preferredCurrency, categoryFilter, priceMin, priceMax]);

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

  const categoryLabel = (type) => (type ? tOffers(type.toLowerCase()) : type);

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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('categoryFilter')}</InputLabel>
            <Select
              value={categoryFilter}
              label={t('categoryFilter')}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {OFFER_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {categoryLabel(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label={t('priceMinPer1kk')}
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            label={t('priceMaxPer1kk')}
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 120 }}
          />
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
            {offers.map((offer) => {
              const isAdena = offer.offerType === 'ADENA';
              const displayPrice = offer.displayPrice != null && offer.displayCurrency
                ? `${Number(offer.displayPrice).toFixed(2)} ${offer.displayCurrency}`
                : `${offer.price} ${offer.currency}`;
              const pricePer1kk = isAdena ? displayPrice : null;
              const totalAdena = isAdena ? formatAdena(offer.quantity ?? 0) : null;
              const seller = offer.seller;
              const sellerName = seller?.nickname ?? seller?.email ?? '—';
              return (
                <Card key={offer.id} variant="outlined">
                  <CardActionArea component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`}>
                    <CardContent sx={{ py: 2, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        {seller && (
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            variant="dot"
                            sx={{
                              '& .MuiBadge-badge': {
                                bgcolor: offer.seller.isOnline ? 'success.main' : 'grey.400',
                                border: '2px solid',
                                borderColor: 'background.paper',
                              },
                            }}
                          >
                            <Avatar
                              src={seller.avatarUrl || undefined}
                              alt={sellerName}
                              sx={{ width: 40, height: 40 }}
                            >
                              {(seller.nickname || seller.email || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {offer.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {categoryLabel(offer.offerType)}
                            {seller && ` · ${t('byCreator')} ${sellerName}`}
                          </Typography>
                          {isAdena ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                              <Typography variant="body2" fontWeight={600} color="primary.main">
                                {t('totalAdena')}: {totalAdena}
                              </Typography>
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {t('pricePer1kk')}: {pricePer1kk}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                              {displayPrice}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
