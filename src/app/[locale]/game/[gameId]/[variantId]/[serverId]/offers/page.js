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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Rating from '@mui/material/Rating';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ADENA');
  const [sortBy, setSortBy] = useState('availability');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (serverId && token) {
      addRecentServer(serverId, token).catch(() => {});
    }
  }, [serverId, token]);

  useEffect(() => {
    if (!serverId) return;
    setOffersLoading(true);
    setOffersError(null);
    const params = {
      offerType: categoryFilter || undefined,
      displayCurrency: token ? undefined : 'USD',
    };
    fetchOffersByServer(serverId, token, params)
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
        setOffersLoading(false);
      })
      .catch((err) => {
        setOffersError(err.message);
        setOffersLoading(false);
      });
  }, [serverId, token, preferredCurrency, categoryFilter]);

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

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'availability' ? 'desc' : 'asc');
    }
  };

  const sortedOffers =
    categoryFilter === 'ADENA' && offers.length > 0
      ? [...offers].sort((a, b) => {
          const mult = sortDir === 'asc' ? 1 : -1;
          if (sortBy === 'availability') {
            return mult * ((a.quantity ?? 0) - (b.quantity ?? 0));
          }
          const priceA = Number(a.displayPrice ?? a.price) ?? 0;
          const priceB = Number(b.displayPrice ?? b.price) ?? 0;
          return mult * (priceA - priceB);
        })
      : offers;

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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
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
          <>
            {categoryFilter === 'ADENA' ? (
              isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Button
                      size="small"
                      variant={sortBy === 'availability' ? 'contained' : 'outlined'}
                      onClick={() => handleSort('availability')}
                    >
                      {t('availability')} {sortBy === 'availability' ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
                    </Button>
                    <Button
                      size="small"
                      variant={sortBy === 'price' ? 'contained' : 'outlined'}
                      onClick={() => handleSort('price')}
                    >
                      {t('priceFor100kk')} {sortBy === 'price' ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                    </Button>
                  </Box>
                  {sortedOffers.map((offer) => {
                    const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
                    const priceFor100kk = pricePer1kk * 100;
                    const currency = offer.displayCurrency ?? offer.currency ?? '';
                    const availabilityKk = formatAdena(offer.quantity ?? 0);
                    const seller = offer.seller;
                    const sellerNickname = seller?.nickname ?? seller?.email ?? '—';
                    return (
                      <Card key={offer.id} variant="outlined">
                        <CardActionArea
                          onClick={() => router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`)}
                        >
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                              {seller && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, width: 72, flexShrink: 0 }}>
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
                                      alt={sellerNickname}
                                      sx={{ width: 40, height: 40 }}
                                    >
                                      {(seller.nickname || seller.email || '?').charAt(0).toUpperCase()}
                                    </Avatar>
                                  </Badge>
                                  <Box sx={{ minHeight: 16, width: '100%', display: 'flex', justifyContent: 'center' }}>{seller?.rating != null && Number(seller.rating) > 0 && <Rating value={Number(seller.rating)} precision={0.5} readOnly size="small" sx={{ fontSize: '0.75rem' }} />}</Box>
                                </Box>
                              )}
                              <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {sellerNickname}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'baseline' }}>
                              <Typography variant="body2" color="text.secondary">
                                {t('availability')}: <strong>{availabilityKk}</strong>
                              </Typography>
                              <Typography variant="body2" color="primary.main" fontWeight={600}>
                                {t('priceFor100kk')}: {priceFor100kk.toFixed(2)} {currency}
                              </Typography>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
              <Card variant="outlined" sx={{ overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>{t('seller')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, minWidth: 100 }} align="center">
                        <Box
                          component="span"
                          onClick={(e) => { e.stopPropagation(); handleSort('availability'); }}
                          sx={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                          title={sortBy === 'availability' && sortDir === 'asc' ? t('sortAsc') : t('sortDesc')}
                        >
                          {t('availability')}
                          {sortBy === 'availability' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, minWidth: 120 }} align="right">
                        <Box
                          component="span"
                          onClick={(e) => { e.stopPropagation(); handleSort('price'); }}
                          sx={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                          title={sortBy === 'price' && sortDir === 'asc' ? t('sortAsc') : t('sortDesc')}
                        >
                          {t('priceFor100kk')}
                          {sortBy === 'price' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedOffers.map((offer) => {
                      const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
                      const priceFor100kk = pricePer1kk * 100;
                      const currency = offer.displayCurrency ?? offer.currency ?? '';
                      const availabilityKk = formatAdena(offer.quantity ?? 0);
                      const seller = offer.seller;
                      const sellerNickname = seller?.nickname ?? seller?.email ?? '—';
                      return (
                        <TableRow
                          key={offer.id}
                          onClick={() => router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              {seller && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: 56, flexShrink: 0 }}>
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
                                      alt={sellerNickname}
                                      sx={{ width: 28, height: 28 }}
                                    >
                                      {(seller.nickname || seller.email || '?').charAt(0).toUpperCase()}
                                    </Avatar>
                                  </Badge>
                                  <Box sx={{ minHeight: 14, width: '100%', display: 'flex', justifyContent: 'center' }}>{seller?.rating != null && Number(seller.rating) > 0 && <Rating value={Number(seller.rating)} precision={0.5} readOnly size="small" sx={{ fontSize: '0.65rem' }} />}</Box>
                                </Box>
                              )}
                              <Typography variant="body2" fontWeight={500} sx={{ pt: 0.25 }}>
                                {sellerNickname}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: '130px' }} align="center">
                            <Typography variant="body2" fontWeight={500}>
                              {availabilityKk}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '170px' }} align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {priceFor100kk.toFixed(2)} {currency}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
              )
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {offers.map((offer) => {
                  const displayPrice = offer.displayPrice != null && offer.displayCurrency
                    ? `${Number(offer.displayPrice).toFixed(2)} ${offer.displayCurrency}`
                    : `${offer.price} ${offer.currency}`;
                  const seller = offer.seller;
                  const sellerName = seller?.nickname ?? seller?.email ?? '—';
                  return (
                    <Card key={offer.id} variant="outlined">
                      <CardActionArea component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}`}>
                        <CardContent sx={{ py: 2, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            {seller && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, width: 72, flexShrink: 0 }}>
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
                                <Box sx={{ minHeight: 16, width: '100%', display: 'flex', justifyContent: 'center' }}>{seller?.rating != null && Number(seller.rating) > 0 && <Rating value={Number(seller.rating)} precision={0.5} readOnly size="small" sx={{ fontSize: '0.75rem' }} />}</Box>
                              </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {offer.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {categoryLabel(offer.offerType)}
                                {seller && ` · ${t('byCreator')} ${sellerName}`}
                              </Typography>
                              <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                                {displayPrice}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
