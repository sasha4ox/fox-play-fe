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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Rating from '@mui/material/Rating';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree, getServerFromTree, isSimpleGame } from '@/lib/games';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOffersByServer, addRecentServer, deleteOffer } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk } from '@/lib/offerMinPrice';
import { logClientError } from '@/lib/clientLogger';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ALL_OFFER_TYPES = ['ADENA', 'COINS', 'ITEMS', 'ACCOUNTS', 'BOOSTING', 'OTHER'];
const STANDARD_CATEGORY_NAMES = new Set(['adena', 'coins', 'items', 'accounts', 'boosting', 'other']);

export default function GameOffersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('OffersList');
  const tOffers = useTranslations('Offers');
  const tCommon = useTranslations('Common');
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading, error: gamesError } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const adenaPriceUnitKk = server?.adenaPriceUnitKk ?? game?.adenaPriceUnitKk ?? 100;
  const effectiveUnitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  const unitLabel = adenaPriceUnitKk === 0 ? t('pricePer1k') : t('pricePerNkk', { n: adenaPriceUnitKk });
  const serverTypes = server?.enabledOfferTypes && server.enabledOfferTypes.length > 0
    ? server.enabledOfferTypes
    : null;
  const customCategoriesOnly = (server?.customCategories ?? []).filter(
    (c) => !STANDARD_CATEGORY_NAMES.has(c.name.toLowerCase())
  );
  const allowedOfferTypes = serverTypes ?? [...ALL_OFFER_TYPES, ...customCategoriesOnly.map((c) => c.id)];
  const isAuthenticated = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { preferredCurrency, profile } = useProfile();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isAdminOrMod = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ADENA');
  const [sortBy, setSortBy] = useState('price');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteDialogOfferId, setDeleteDialogOfferId] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (serverId && token) {
      addRecentServer(serverId, token).catch(() => {});
    }
  }, [serverId, token]);

  useEffect(() => {
    if (allowedOfferTypes?.length && !allowedOfferTypes.includes(categoryFilter)) {
      setCategoryFilter(allowedOfferTypes.includes('ADENA') ? 'ADENA' : allowedOfferTypes[0]);
    }
  }, [allowedOfferTypes, categoryFilter]);

  useEffect(() => {
    if (!serverId) return;
    setOffersLoading(true);
    setOffersError(null);
    const params = {
      offerType: categoryFilter || undefined, // can be standard type or custom category UUID
      displayCurrency: preferredCurrency ?? 'USD',
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

  const refetchOffers = () => {
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
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialogOfferId || !token) return;
    setDeleteInProgress(true);
    setDeleteError(null);
    try {
      await deleteOffer(deleteDialogOfferId, token);
      setDeleteDialogOfferId(null);
      refetchOffers();
    } catch (err) {
      logClientError(err);
      setDeleteError(err.message);
    } finally {
      setDeleteInProgress(false);
    }
  };

  const tOfferDetail = useTranslations('OfferDetail');

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
  const variants = game?.variants ?? [];
  const singleServer = servers.length === 1;
  const singleVariant = variants.length === 1;
  const isSimple = isSimpleGame(game);

  let backHref, backLabel;
  if (isSimple || (singleVariant && singleServer)) {
    backHref = `/${locale}/dashboard`;
    backLabel = t('backToGames');
  } else if (singleServer) {
    backHref = `/${locale}/game/${gameId}`;
    backLabel = t('backToVariants');
  } else {
    backHref = `/${locale}/game/${gameId}/${variantId}`;
    backLabel = t('backToServers');
  }

  const categoryLabel = (typeOrId) => {
    if (!typeOrId) return typeOrId;
    if (ALL_OFFER_TYPES.includes(typeOrId)) return tOffers(typeOrId.toLowerCase());
    const custom = server?.customCategories?.find((c) => c.id === typeOrId);
    return custom?.name ?? typeOrId;
  };
  const getOfferCategoryLabel = (offer) =>
    offer?.customCategory?.name ?? categoryLabel(offer?.offerType);

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
        <Button
          component={Link}
          href={backHref}
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          size="small"
          color="inherit"
          sx={{
            mb: 2,
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 2,
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          {backLabel}
        </Button>
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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {t('categoryFilter')}:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {allowedOfferTypes.map((type) => (
              <Button
                key={type}
                size="small"
                variant={categoryFilter === type ? 'contained' : 'outlined'}
                color={categoryFilter === type ? 'primary' : 'inherit'}
                onClick={() => setCategoryFilter(type)}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: categoryFilter === type ? 600 : 400,
                  ...(categoryFilter === type && {
                    boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}25`,
                  }),
                }}
              >
                {categoryLabel(type)}
              </Button>
            ))}
          </Box>
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
                      {unitLabel} {sortBy === 'price' ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                    </Button>
                  </Box>
                  {sortedOffers.map((offer) => {
                    const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
                    const priceForDisplay = pricePer1kk * effectiveUnitKk;
                    const currency = offer.displayCurrency ?? offer.currency ?? '';
                    const availabilityKk = formatAdena(offer.quantity ?? 0);
                    const seller = offer.seller;
                    const sellerNickname = seller?.nickname ?? seller?.email ?? '—';
                    const isPriceBelowMin = categoryFilter === 'ADENA' && priceForDisplay < getMinPriceForUnit(currency, adenaPriceUnitKk);
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
                                {unitLabel}: {priceForDisplay.toFixed(2)} {currency}
                              </Typography>
                              {isPriceBelowMin && (
                                <Typography variant="caption" color="warning.main" fontWeight={600}>
                                  {t('priceBelowMinimum')}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                        {isAdminOrMod && token && (
                          <Box sx={{ display: 'flex', gap: 0.5, px: 1, pb: 1 }} onClick={(e) => e.stopPropagation()}>
                            <IconButton component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}/edit`} size="small" aria-label={tOfferDetail('editOffer')}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" aria-label={tOfferDetail('deleteOffer')} onClick={() => setDeleteDialogOfferId(offer.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
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
                          {unitLabel}
                          {sortBy === 'price' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                        </Box>
                      </TableCell>
                      {isAdminOrMod && token && <TableCell sx={{ fontWeight: 600, width: 80 }} align="right" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedOffers.map((offer) => {
                      const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
                      const priceForDisplay = pricePer1kk * effectiveUnitKk;
                      const currency = offer.displayCurrency ?? offer.currency ?? '';
                      const availabilityKk = formatAdena(offer.quantity ?? 0);
                      const seller = offer.seller;
                      const sellerNickname = seller?.nickname ?? seller?.email ?? '—';
                      const isPriceBelowMin = categoryFilter === 'ADENA' && priceForDisplay < getMinPriceForUnit(currency, adenaPriceUnitKk);
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {priceForDisplay.toFixed(2)} {currency}
                              </Typography>
                              {isPriceBelowMin && (
                                <Typography variant="caption" color="warning.main" fontWeight={600}>
                                  {t('priceBelowMinimum')}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          {isAdminOrMod && token && (
                            <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ width: 80 }}>
                              <IconButton component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}/edit`} size="small" aria-label={tOfferDetail('editOffer')}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" aria-label={tOfferDetail('deleteOffer')} onClick={() => setDeleteDialogOfferId(offer.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          )}
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
                                {getOfferCategoryLabel(offer)}
                                {seller && ` · ${t('byCreator')} ${sellerName}`}
                              </Typography>
                              <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                                {displayPrice}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                      {isAdminOrMod && token && (
                        <Box sx={{ display: 'flex', gap: 0.5, px: 1, pb: 1 }} onClick={(e) => e.stopPropagation()}>
                          <IconButton component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offer.id}/edit`} size="small" aria-label={tOfferDetail('editOffer')}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" aria-label={tOfferDetail('deleteOffer')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDialogOfferId(offer.id); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        )}

        <Dialog open={!!deleteDialogOfferId} onClose={() => !deleteInProgress && setDeleteDialogOfferId(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{tOfferDetail('deleteOffer')}</DialogTitle>
          <DialogContent>
            {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
            <Typography>{tOfferDetail('deleteOfferConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOfferId(null)} disabled={deleteInProgress}>{tCommon('cancel')}</Button>
            <Button color="error" variant="contained" onClick={handleDeleteConfirm} disabled={deleteInProgress}>
              {deleteInProgress ? tCommon('loading') : tOfferDetail('deleteOffer')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
