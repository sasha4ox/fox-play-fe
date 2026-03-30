'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOfferById, createOrder, getAvailablePaymentMethods, getOfferMessages, sendOfferMessage, startOfferChat, getOfferInquiryOrderId, getFeedbacksByUserId, deleteOffer, getSafeTransferAvailability } from '@/lib/api';
import { logClientError } from '@/lib/clientLogger';
import { formatAdena } from '@/lib/adenaFormat';
import { getMinPriceForUnit, getEffectiveUnitKk, formatPriceForUnit } from '@/lib/offerMinPrice';
import { useGames } from '@/hooks/useGames';
import {
  getGameFromTree,
  getVariantFromTree,
  getServerFromTree,
  pathGameVariantServer,
  pathToOfferDetail,
  pathToOfferEdit,
  filterValueToCategorySlug,
  getAllowedOfferTypesForServer,
  getDefaultCategorySlug,
  isUuidSegment,
} from '@/lib/games';

export default function OfferPDPPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('OfferDetail');
  const tOffers = useTranslations('Offers');
  const tCommon = useTranslations('Common');
  const tEdit = useTranslations('EditOffer');
  const offerId = params?.segment;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const { tree, loading: gamesLoading } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;
  const resolvedServerId = server?.id ?? serverId;
  const OFFER_TYPE_LABELS = { ADENA: tOffers('adena'), COINS: tOffers('coins'), ITEMS: tOffers('items'), ACCOUNTS: tOffers('accounts'), BOOSTING: tOffers('boosting'), OTHER: tOffers('other') };
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyQuantityKk, setBuyQuantityKk] = useState(1);
  /** Controlled string so user can clear the field while typing; synced to buyQuantityKk on blur. */
  const [buyQuantityKkStr, setBuyQuantityKkStr] = useState('1');
  const [buyQuantityStr, setBuyQuantityStr] = useState('1');
  const [buyCharacterNick, setBuyCharacterNick] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [offerMessages, setOfferMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { profile, balances, primaryBalance } = useProfile();
  const isAuthenticated = !!token;
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const currentUserId = user?.id ?? user?.userId;
  const isCreator = currentUserId && offer?.seller?.id && currentUserId === offer.seller.id;
  const isAdminOrMod = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';

  const preferredCurrency = profile?.preferredCurrency;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId, token, { displayCurrency: token ? undefined : 'USD' })
      .then((data) => {
        setOffer(data);
        setBuyQuantity(1);
        setBuyQuantityKk(1);
        setBuyQuantityKkStr('1');
        setBuyQuantityStr('1');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [offerId, token, preferredCurrency]);


  const [selectedThreadBuyerId, setSelectedThreadBuyerId] = useState(null);
  const [feedbacksDialogOpen, setFeedbacksDialogOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [paymentDeclinedDismissed, setPaymentDeclinedDismissed] = useState(false);
  const showPaymentDeclined = searchParams.get('payment') === 'declined' && !paymentDeclinedDismissed;
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [cryptoPaymentEnabled, setCryptoPaymentEnabled] = useState(false);
  const [ibanPaymentEnabled, setIbanPaymentEnabled] = useState(false);
  const [inquiryOrderId, setInquiryOrderId] = useState(null);
  const [stAvailable, setStAvailable] = useState(false);
  const [stEnabled, setStEnabled] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAvailablePaymentMethods(token).then((methods) => {
      setCardPaymentEnabled(methods.cardPaymentEnabled);
      setCryptoPaymentEnabled(methods.cryptoPaymentEnabled);
      setIbanPaymentEnabled(methods.ibanPaymentEnabled);
    }).catch(() => {
      setCardPaymentEnabled(false);
      setCryptoPaymentEnabled(false);
      setIbanPaymentEnabled(false);
    });
  }, [token]);

  useEffect(() => {
    if (!offer || !token || isCreator || !resolvedServerId) return;
    getSafeTransferAvailability(resolvedServerId, token, offer.seller?.id)
      .then((data) => setStAvailable(!!data?.available))
      .catch(() => setStAvailable(false));
  }, [offer, token, isCreator, resolvedServerId]);

  useEffect(() => {
    if (!offerId || !token) return;
    getOfferMessages(offerId, token, isCreator ? undefined : null)
      .then((data) => setOfferMessages(Array.isArray(data) ? data : []))
      .catch(() => setOfferMessages([]));
  }, [offerId, token, isCreator]);

  useEffect(() => {
    if (!offerId || !token || isCreator) return;
    getOfferInquiryOrderId(offerId, token)
      .then((data) => setInquiryOrderId(data?.orderId ?? null))
      .catch(() => setInquiryOrderId(null));
  }, [offerId, token, isCreator]);

  useEffect(() => {
    if (!feedbacksDialogOpen || !offer?.seller?.id) return;
    setFeedbacksLoading(true);
    getFeedbacksByUserId(offer.seller.id)
      .then((data) => setFeedbacks(Array.isArray(data) ? data : []))
      .catch(() => setFeedbacks([]))
      .finally(() => setFeedbacksLoading(false));
  }, [feedbacksDialogOpen, offer?.seller?.id]);

  useEffect(() => {
    if (!game || !variant || !server || gamesLoading || !offerId || !isUuidSegment(offerId)) return;
    const uuidPath =
      (isUuidSegment(gameId) && gameId === game.id) ||
      (isUuidSegment(variantId) && variantId === variant.id) ||
      (isUuidSegment(serverId) && serverId === server.id);
    if (!uuidPath) return;
    router.replace(pathToOfferDetail(locale, game, variant, server, offerId));
  }, [game, variant, server, gameId, variantId, serverId, gamesLoading, locale, router, offerId]);

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      openLoginModal(() => setBuyDialogOpen(true));
      return;
    }
    const isCoinsType = offer?.offerType === 'COINS';
    const isAdenaType = offer?.offerType === 'ADENA';
    if (isCoinsType) {
      const initCoins = (offer?.minSellQuantity != null ? Number(offer.minSellQuantity) : 1);
      setBuyQuantity(Math.max(1, Math.min(initCoins, Number(offer.quantity) || 1)));
    } else {
      setBuyQuantity(1);
    }
    const initKk = offer?.minSellQuantity != null
      ? Number(offer.minSellQuantity) / 1_000_000
      : 1;
    setBuyQuantityKk(initKk);
    setBuyQuantityKkStr(String(initKk));
    if (isCoinsType) {
      const initCoins = (offer?.minSellQuantity != null ? Number(offer.minSellQuantity) : 1);
      const q = Math.max(1, Math.min(initCoins, Number(offer.quantity) || 1));
      setBuyQuantity(q);
      setBuyQuantityStr(String(q));
    } else if (!isAdenaType) {
      setBuyQuantity(1);
      setBuyQuantityStr('1');
    }
    setStEnabled(false);
    setBuyDialogOpen(true);
  };

  const parseKkFromStr = (s) => {
    const n = Number(String(s ?? '').replace(',', '.').trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const calcBuyQty = () => {
    const isAdena = offer?.offerType === 'ADENA';
    const isCoins = offer?.offerType === 'COINS';
    const minSellQty = (isAdena || isCoins) && offer?.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
    if (isAdena) {
      const kk = parseKkFromStr(buyQuantityKkStr);
      const kkNum = Number.isFinite(kk) ? kk : buyQuantityKk;
      return Math.min(Number(offer.quantity), Math.max(minSellQty, Math.floor(kkNum * 1_000_000)));
    }
    const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
    const q = Number.isFinite(qRaw) ? Math.floor(qRaw) : buyQuantity;
    return Math.min(Math.max(minSellQty, q), Number(offer.quantity));
  };

  /** Deal subtotal, optional ST fee, and total buyer pays (matches Safe Transfer block). */
  const computeBuyMoney = () => {
    if (!offer) {
      return { dealAmount: 0, stFee: 0, totalToPay: 0, currency: '' };
    }
    const isAdena = offer.offerType === 'ADENA';
    const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
    const unitPrice = pricePer1kk;
    const kk = parseKkFromStr(buyQuantityKkStr);
    const kkNum = Number.isFinite(kk) ? kk : buyQuantityKk;
    const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
    const qNum = Number.isFinite(qRaw) ? qRaw : buyQuantity;
    const dealAmount = isAdena ? kkNum * pricePer1kk : qNum * unitPrice;
    const usesDisplay = offer.displayPrice != null && offer.displayCurrency != null;
    const minStFee = usesDisplay
      ? (offer.safeTransferMinFeeInDisplay ?? offer.safeTransferMinFeeInSellerCurrency ?? 5)
      : (offer.safeTransferMinFeeInSellerCurrency ?? 5);
    const stFee = Math.round(Math.max(dealAmount * 0.05, minStFee) * 100) / 100;
    const totalToPay = stEnabled ? dealAmount + stFee : dealAmount;
    const currency = offer.displayCurrency ?? offer.currency ?? '';
    return { dealAmount, stFee, totalToPay, currency };
  };

  const validateBuyQuantity = () => {
    if (!offer) return 'Invalid offer';
    if (offer.offerType === 'ADENA') {
      const maxKk = (offer.quantity ?? 0) / 1_000_000;
      const minKk = offer.minSellQuantity != null ? Number(offer.minSellQuantity) / 1_000_000 : 0.001;
      const kk = parseKkFromStr(buyQuantityKkStr);
      if (buyQuantityKkStr.trim() === '' || !Number.isFinite(kk)) {
        return t('toBeReceived') ? `${t('toBeReceived')}: invalid` : 'Enter a valid amount';
      }
      if (kk < minKk || kk > maxKk) {
        return t('toBeReceived') ? `${t('toBeReceived')}: out of range` : 'Amount out of range';
      }
    } else {
      const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
      if (buyQuantityStr.trim() === '' || !Number.isFinite(qRaw)) {
        return t('quantity') ? `${t('quantity')}: invalid` : 'Enter a valid quantity';
      }
      const minSellQty = offer.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
      const q = Math.floor(qRaw);
      if (q < minSellQty || q > Number(offer.quantity)) {
        return t('quantity') ? `${t('quantity')}: out of range` : 'Quantity out of range';
      }
    }
    return null;
  };

  const handleBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const qErr = validateBuyQuantity();
    if (qErr) {
      setBuyError(qErr);
      return;
    }
    const qty = calcBuyQty();
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      if (stEnabled) body.safeTransfer = true;
      const order = await createOrder(body, token);
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      router.push(`/${locale}/dashboard/orders/${order.id}`);
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };

  const handleManuauCardBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const qErr = validateBuyQuantity();
    if (qErr) {
      setBuyError(qErr);
      return;
    }
    const qty = calcBuyQty();
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      body.paymentMethod = 'CARD_MANUAL';
      if (stEnabled) body.safeTransfer = true;
      const order = await createOrder(body, token);
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      router.push(`/${locale}/dashboard/orders/${order.id}/card-payment`);
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };

  const handleCryptoBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const qErr = validateBuyQuantity();
    if (qErr) {
      setBuyError(qErr);
      return;
    }
    const qty = calcBuyQty();
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      body.paymentMethod = 'CRYPTO_MANUAL';
      if (stEnabled) body.safeTransfer = true;
      const order = await createOrder(body, token);
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      router.push(`/${locale}/pay-crypto/${order.id}`);
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };

  const handleIbanBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const qErr = validateBuyQuantity();
    if (qErr) {
      setBuyError(qErr);
      return;
    }
    const qty = calcBuyQty();
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      body.paymentMethod = 'IBAN_MANUAL';
      if (stEnabled) body.safeTransfer = true;
      const order = await createOrder(body, token);
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      router.push(`/${locale}/dashboard/orders/${order.id}/iban-payment`);
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };


  const handleSendMessage = async () => {
    if (!offerId || !token || !messageText.trim()) return;
    if (isCreator && !selectedThreadBuyerId) {
      setMessageError('Select a conversation to reply to.');
      return;
    }
    setMessageSending(true);
    setMessageError(null);
    try {
      if (isCreator) {
        const body = { text: messageText.trim(), buyerId: selectedThreadBuyerId };
        const msg = await sendOfferMessage(offerId, body, token);
        setOfferMessages((prev) => [...prev, msg]);
        setMessageText('');
      } else {
        const { orderId } = await startOfferChat(offerId, { text: messageText.trim() }, token);
        setMessageText('');
        router.push(`/${locale}/dashboard/orders/${orderId}`);
        return;
      }
    } catch (err) {
      setMessageError(err.message || 'Failed to send');
    } finally {
      setMessageSending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!offerId || !token) return;
    setDeleteInProgress(true);
    setDeleteError(null);
    try {
      await deleteOffer(offerId, token);
      setDeleteDialogOpen(false);
      if (game && variant && server) {
        router.push(
          pathGameVariantServer(
            locale,
            game,
            variant,
            server,
            getDefaultCategorySlug(getAllowedOfferTypesForServer(server), server)
          )
        );
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      logClientError(err);
      setDeleteError(err.message);
    } finally {
      setDeleteInProgress(false);
    }
  };

  const threadBuyerIds = isCreator && offerMessages.length
    ? [...new Set(offerMessages.map((m) => m.buyerId).filter(Boolean))]
    : [];
  useEffect(() => {
    if (isCreator && threadBuyerIds.length > 0 && !selectedThreadBuyerId) {
      setSelectedThreadBuyerId(threadBuyerIds[0]);
    }
  }, [isCreator, threadBuyerIds.length, selectedThreadBuyerId]);
  const displayedMessages = isCreator && selectedThreadBuyerId
    ? offerMessages.filter((m) => m.buyerId === selectedThreadBuyerId)
    : offerMessages;
  const selectedThreadBuyerLabel = isCreator && selectedThreadBuyerId && offerMessages.length
    ? (offerMessages.find((m) => m.senderId === selectedThreadBuyerId)?.sender?.nickname ||
       offerMessages.find((m) => m.senderId === selectedThreadBuyerId)?.sender?.email ||
       selectedThreadBuyerId)
    : null;

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
        <Container >
          <Alert severity="error">{error || 'Offer not found.'}</Alert>
          <MuiLink
            component={Link}
            href={
              game && variant && server
                ? pathGameVariantServer(
                    locale,
                    game,
                    variant,
                    server,
                    getDefaultCategorySlug(getAllowedOfferTypesForServer(server), server)
                  )
                : `/${locale}/game/${gameId}/${variantId}/${serverId}/offers/adena`
            }
            sx={{ display: 'inline-block', mt: 2 }}
          >
            ← Back to offers
          </MuiLink>
        </Container>
      </Box>
    );
  }

  const maxQty = Math.max(1, offer.quantity);
  const isAdenaOffer = offer.offerType === 'ADENA';
  const isCoinsOffer = offer.offerType === 'COINS';
  const maxKk = isAdenaOffer ? offer.quantity : null;
  const offerCurrency = offer.displayCurrency ?? offer.currency ?? '';
  const adenaPriceUnitKk = offer?.server?.adenaPriceUnitKk ?? offer?.server?.gameVariant?.game?.adenaPriceUnitKk ?? 100;
  const effectiveUnitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  const unitLabel = adenaPriceUnitKk === 0 ? t('pricePer1k') : t('pricePerNkk', { n: adenaPriceUnitKk });
  const priceRaw = offer.displayPrice ?? offer.price;
  const pNum = typeof priceRaw === 'object' && priceRaw != null && typeof priceRaw.toString === 'function'
    ? Number(priceRaw.toString())
    : Number(priceRaw) || 0;
  const pricePer1kkForMin = pNum;
  const priceForUnitForMin = pricePer1kkForMin * effectiveUnitKk;
  const isPriceBelowMin = isAdenaOffer && priceForUnitForMin < getMinPriceForUnit(offerCurrency, adenaPriceUnitKk);

  const pathGame = game ?? offer?.server?.gameVariant?.game;
  const pathVariant = variant ?? offer?.server?.gameVariant;
  const pathServer = server ?? offer?.server;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink
          component={Link}
          href={pathGameVariantServer(
            locale,
            pathGame,
            pathVariant,
            pathServer,
            filterValueToCategorySlug(offer.offerType, pathServer)
          )}
          color="secondary"
          sx={{ display: 'inline-block', mb: 2 }}
        >
          {t('backToOffers')}
        </MuiLink>

        {showPaymentDeclined && (
          <Alert severity="warning" onClose={() => setPaymentDeclinedDismissed(true)} sx={{ mb: 2 }}>
            {t('paymentDeclinedMessage')}
          </Alert>
        )}

        <Typography variant="h4" fontWeight={600} gutterBottom>
          {offer.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType}
        </Typography>

        {offer.seller && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {t('seller')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {offer.seller.id ? (
                  <Link
                    href={`/${locale}/user/${offer.seller.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
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
                          src={offer.seller.avatarUrl || undefined}
                          alt={offer.seller.nickname ?? offer.seller.email}
                          sx={{ width: 48, height: 48 }}
                        >
                          {(offer.seller.nickname || offer.seller.email || '?').charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                      {offer.seller.rating != null && Number(offer.seller.rating) > 0 && (
                        <Rating value={Number(offer.seller.rating)} precision={0.5} readOnly size="small" sx={{ fontSize: '0.8rem' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {offer.seller.nickname ?? offer.seller.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {offer.seller.isOnline ? t('sellerOnline') : t('sellerOffline')}
                      </Typography>
                    </Box>
                  </Link>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
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
                          src={offer.seller.avatarUrl || undefined}
                          alt={offer.seller.nickname ?? offer.seller.email}
                          sx={{ width: 48, height: 48 }}
                        >
                          {(offer.seller.nickname || offer.seller.email || '?').charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                      {offer.seller.rating != null && Number(offer.seller.rating) > 0 && (
                        <Rating value={Number(offer.seller.rating)} precision={0.5} readOnly size="small" sx={{ fontSize: '0.8rem' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {offer.seller.nickname ?? offer.seller.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {offer.seller.isOnline ? t('sellerOnline') : t('sellerOffline')}
                      </Typography>
                    </Box>
                  </>
                )}
                {offer.seller.id && (
                  <Button size="small" variant="text" color="secondary" sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none' }} onClick={() => setFeedbacksDialogOpen(true)}>
                    {t('seeReviews')}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {isAdenaOffer && (() => {
          const q = Number(offer.quantity) || 0;
          const priceRaw = offer.displayPrice ?? offer.price;
          const p = typeof priceRaw === 'object' && priceRaw != null && typeof priceRaw.toString === 'function'
            ? Number(priceRaw.toString())
            : Number(priceRaw) || 0;
          const quantityKk = q / 1_000_000;
          const currency = offer.displayCurrency ?? offer.currency ?? '';
          const pricePer1kk = p;
          const priceForDisplay = pricePer1kk * effectiveUnitKk;
          const totalIfBuyFull = quantityKk * pricePer1kk;
          const isPriceBelowMinLocal = priceForDisplay < getMinPriceForUnit(currency, adenaPriceUnitKk);
          return (
            <>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">{t('availabilityKk')}</Typography>
                      <Typography variant="h6" fontWeight={600}>{formatAdena(q)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('availabilityKkHint')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="overline" color="text.secondary">{unitLabel}</Typography>
                      <Typography variant="h6" fontWeight={600} color="primary.main">
                        {formatPriceForUnit(priceForDisplay)} {currency}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="overline" color="text.secondary">{t('priceIfBuyFull')}</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {totalIfBuyFull.toFixed(2)} {currency}
                      </Typography>
                    </Box>
                    {offer.minSellQuantity != null && (
                      <Box>
                        <Typography variant="overline" color="text.secondary">{t('minPurchase')}</Typography>
                        <Typography variant="h6" fontWeight={600}>{formatAdena(Number(offer.minSellQuantity))}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
              {isPriceBelowMinLocal && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('priceBelowMinCannotBuy')}
                </Alert>
              )}
            </>
          );
        })()}

        {isCoinsOffer && (() => {
          const q = Number(offer.quantity) || 0;
          const priceRaw = offer.displayPrice ?? offer.price;
          const p = typeof priceRaw === 'object' && priceRaw != null && typeof priceRaw.toString === 'function'
            ? Number(priceRaw.toString())
            : Number(priceRaw) || 0;
          const currency = offer.displayCurrency ?? offer.currency ?? '';
          const totalIfBuyFull = q * p;
          return (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('availabilityCoins')}</Typography>
                    <Typography variant="h6" fontWeight={600}>{q.toLocaleString()} {tOffers('coins')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('pricePer1Coin')}</Typography>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {p.toFixed(2)} {currency}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('priceIfBuyFull')}</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {totalIfBuyFull.toFixed(2)} {currency}
                    </Typography>
                  </Box>
                  {offer.minSellQuantity != null && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">{t('minPurchase')}</Typography>
                      <Typography variant="h6" fontWeight={600}>{Number(offer.minSellQuantity).toLocaleString()} {tOffers('coins')}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })()}

        {!isAdenaOffer && !isCoinsOffer && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">
                Price: {offer.displayPrice != null && offer.displayCurrency
                  ? `${offer.displayPrice} ${offer.displayCurrency}`
                  : `${offer.price} ${offer.currency}`}
                {' · '}Quantity: {offer.quantity}
              </Typography>
            </CardContent>
          </Card>
        )}

        {!isAdenaOffer && !isCoinsOffer && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {offer.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
          {!isCreator && (
            <Button variant="contained" color="secondary" onClick={handleBuyClick} disabled={offer.quantity <= 0 || isPriceBelowMin}>
              {t('buy')}
            </Button>
          )}
          {(isCreator || isAdminOrMod) && (
            <Button component={Link} href={pathToOfferEdit(locale, pathGame, pathVariant, pathServer, offerId)} variant="outlined" color="secondary">
              {tEdit('editOffer')}
            </Button>
          )}
          {isAdminOrMod && (
            <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>
              {t('deleteOffer')}
            </Button>
          )}
        </Box>

        <Dialog open={deleteDialogOpen} onClose={() => !deleteInProgress && setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('deleteOffer')}</DialogTitle>
          <DialogContent>
            {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
            <Typography>{t('deleteOfferConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteInProgress}>{tCommon('cancel')}</Button>
            <Button color="error" variant="contained" onClick={handleDeleteConfirm} disabled={deleteInProgress}>
              {deleteInProgress ? tCommon('loading') : t('deleteOffer')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={feedbacksDialogOpen} onClose={() => setFeedbacksDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('reviewsTitle')}</DialogTitle>
          <DialogContent>
            {feedbacksLoading ? (
              <Typography color="text.secondary">{tCommon('loading') || 'Loading…'}</Typography>
            ) : feedbacks.length === 0 ? (
              <Typography color="text.secondary">{t('noReviews')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                {feedbacks.map((fb) => (
                  <Box key={fb.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Rating value={fb.rating} readOnly size="small" sx={{ fontSize: '0.875rem' }} />
                      <Typography variant="caption" color="text.secondary">
                        {t('reviewFrom')}: {fb.fromUser?.nickname ?? '—'} · {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' }) : ''}
                      </Typography>
                    </Box>
                    {fb.comment && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{fb.comment}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFeedbacksDialogOpen(false)}>{tCommon('close') || 'Close'}</Button>
          </DialogActions>
        </Dialog>

        {isAuthenticated && (
          <Box sx={{ mt: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {isCreator ? 'Messages about this offer' : 'Message seller'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {isCreator ? 'Conversations with buyers. Only you and that buyer see each thread.' : t('messageSellerHint')}
            </Typography>
            {!isCreator && inquiryOrderId && (
              <Button component={Link} href={`/${locale}/dashboard/orders/${inquiryOrderId}`} variant="outlined" size="small" sx={{ mb: 1.5 }}>
                {t('continueConversation')}
              </Button>
            )}
            {isCreator && threadBuyerIds.length > 1 && (
              <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                <InputLabel>Conversation with</InputLabel>
                <Select
                  value={selectedThreadBuyerId || ''}
                  label="Conversation with"
                  onChange={(e) => setSelectedThreadBuyerId(e.target.value || null)}
                >
                  {threadBuyerIds.map((bid) => {
                    const m = offerMessages.find((msg) => msg.senderId === bid);
                    const label = m?.sender?.nickname ?? m?.sender?.email ?? bid?.slice(0, 8);
                    return <MenuItem key={bid} value={bid}>{label}</MenuItem>;
                  })}
                </Select>
              </FormControl>
            )}
            {isCreator && displayedMessages.length > 0 && (
              <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2, py: 1 }}>
                {displayedMessages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      textAlign: msg.sender?.id === currentUserId ? 'right' : 'left',
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      {msg.sender?.nickname ?? msg.sender?.email ?? 'User'}
                      {msg.createdAt && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, opacity: 0.9 }}>
                          · {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </Typography>
                      )}
                    </Typography>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: msg.sender?.id === currentUserId ? 'primary.main' : 'action.hover',
                        color: msg.sender?.id === currentUserId ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body2">{msg.text}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                size="small"
                fullWidth
                multiline
                maxRows={2}
                variant="outlined"
              />
              <Button variant="contained" color="secondary" onClick={handleSendMessage} disabled={messageSending || !messageText.trim() || (isCreator && !selectedThreadBuyerId)}>
                Send
              </Button>
            </Box>
            {messageError && <Alert severity="error" sx={{ mt: 1 }}>{messageError}</Alert>}
          </Box>
        )}
      </Container>

      <Dialog open={buyDialogOpen} onClose={() => setBuyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Buy</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {offer.title}
            {isAdenaOffer ? ` · Max: ${maxKk} kk` : ` · Max: ${maxQty}`}
          </Typography>
          <TextField
            label={t('yourInGameNick')}
            value={buyCharacterNick}
            onChange={(e) => setBuyCharacterNick(e.target.value)}
            placeholder={t('yourInGameNick')}
            fullWidth
            required
            inputProps={{ maxLength: 64 }}
            sx={{ mb: 2 }}
          />
          {isAdenaOffer ? (
            <>
              {(() => {
                const maxKk = (offer?.quantity ?? 0) / 1_000_000;
                const minKk = offer?.minSellQuantity != null
                  ? Number(offer.minSellQuantity) / 1_000_000
                  : 0.001;
                return (
                  <>
                    <TextField
                      type="text"
                      inputMode="decimal"
                      label={t('toBeReceived')}
                      value={buyQuantityKkStr}
                      onChange={(e) => setBuyQuantityKkStr(e.target.value)}
                      onBlur={() => {
                        const kk = parseKkFromStr(buyQuantityKkStr);
                        if (buyQuantityKkStr.trim() === '' || !Number.isFinite(kk)) {
                          setBuyQuantityKk(minKk);
                          setBuyQuantityKkStr(String(minKk));
                          return;
                        }
                        const clamped = Math.min(maxKk, Math.max(minKk, kk));
                        setBuyQuantityKk(clamped);
                        setBuyQuantityKkStr(String(clamped));
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">kk</InputAdornment>,
                      }}
                      inputProps={{
                        inputMode: 'decimal',
                      }}
                      placeholder={String(minKk)}
                      fullWidth
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.75rem' }}>
                      {offer?.minSellQuantity != null && (
                        <>{t('minPurchase')}: {formatAdena(Number(offer.minSellQuantity))}{' · '}</>
                      )}
                      Max available: {formatAdena(offer?.quantity ?? 0)}
                    </Typography>
                  </>
                );
              })()}
            </>
          ) : (
            <TextField
              type="text"
              inputMode="numeric"
              label={t('quantity')}
              value={buyQuantityStr}
              onChange={(e) => setBuyQuantityStr(e.target.value)}
              onBlur={() => {
                const minSellQty = offer?.minSellQuantity != null ? Number(offer.minSellQuantity) : 1;
                const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
                if (buyQuantityStr.trim() === '' || !Number.isFinite(qRaw)) {
                  setBuyQuantity(minSellQty);
                  setBuyQuantityStr(String(minSellQty));
                  return;
                }
                const q = Math.min(maxQty, Math.max(minSellQty, Math.floor(qRaw)));
                setBuyQuantity(q);
                setBuyQuantityStr(String(q));
              }}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}
          {isAdenaOffer && (() => {
            const { totalToPay, currency } = computeBuyMoney();
            return (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('youWillPay')}: <strong>{Number.isFinite(totalToPay) ? totalToPay.toFixed(2) : '—'} {currency}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {t('bankFeeHint')}
                </Typography>
              </Box>
            );
          })()}
          {!isAdenaOffer && offer && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('youWillPay')}: <strong>{(() => {
                  const { totalToPay, currency } = computeBuyMoney();
                  return `${Number.isFinite(totalToPay) ? totalToPay.toFixed(2) : '—'} ${currency}`;
                })()}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {t('bankFeeHint')}
              </Typography>
            </Box>
          )}
          {stAvailable && !isCreator && (
            <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'info.main', borderRadius: 1, bgcolor: (theme) => `${theme.palette.info.main}08` }}>
              <FormControlLabel
                control={<Switch checked={stEnabled} onChange={(e) => setStEnabled(e.target.checked)} color="info" />}
                label={<Typography variant="body2" fontWeight={600}>{t('safeTransferLabel')}</Typography>}
              />
              <Typography variant="caption" color="text.secondary" display="block" component="div" sx={{ ml: 4.5 }}>
                {t.rich('safeTransferHintRich', {
                  learnMore: (chunks) => (
                    <MuiLink component={Link} href={`/${locale}/how-safe-transfer-works`} underline="hover" color="info.main">
                      {chunks}
                    </MuiLink>
                  ),
                })}
              </Typography>
              {stEnabled && (() => {
                const { dealAmount, stFee, totalToPay, currency } = computeBuyMoney();
                return (
                  <Box sx={{ ml: 4.5, mt: 0.5 }}>
                    <Typography variant="body2" color="info.main" fontWeight={600}>
                      {t('safeTransferFee', { fee: stFee.toFixed(2), currency })}
                    </Typography>
                    <Typography variant="body2" color="info.main">
                      {t('safeTransferTotal', { total: totalToPay.toFixed(2), currency })}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          )}
          {buyError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {buyError}
              {buyError.toLowerCase().includes('insufficient') && !payWithCard && (
                <Box sx={{ mt: 1 }}>
                  <MuiLink component={Link} href={`/${locale}/dashboard/balance`}>
                    Add funds to your balance →
                  </MuiLink>
                </Box>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
          {(() => {
            const offerCurrency = offer?.displayCurrency ?? offer?.currency ?? '';
            const { totalToPay } = computeBuyMoney();
            const availableBalance = Number(primaryBalance?.available ?? 0);
            const hasEnoughBalance = offerCurrency && totalToPay > 0 && availableBalance >= totalToPay;
            const kkOk = !isAdenaOffer || (() => {
              const kk = parseKkFromStr(buyQuantityKkStr);
              return buyQuantityKkStr.trim() !== '' && Number.isFinite(kk) && kk > 0;
            })();
            const qtyOk = isAdenaOffer || (() => {
              const qRaw = Number(String(buyQuantityStr ?? '').replace(',', '.').trim());
              return buyQuantityStr.trim() !== '' && Number.isFinite(qRaw) && Math.floor(qRaw) >= 1;
            })();
            const dialogSubmitDisabled = buySubmitting || isPriceBelowMin || !kkOk || !qtyOk;
            return (
              <Tooltip title={!hasEnoughBalance ? (t('insufficientBalance') || 'Insufficient balance') : ''}>
                <span>
                  <Button
                    variant="contained"
                    onClick={handleBuySubmit}
                    disabled={dialogSubmitDisabled || !hasEnoughBalance}
                  >
                    {buySubmitting ? 'Creating…' : t('payWithBalance')}
                  </Button>
                </span>
              </Tooltip>
            );
          })()}
          {cardPaymentEnabled && (
            <Button variant="contained" onClick={handleManuauCardBuySubmit} disabled={buySubmitting || isPriceBelowMin || (isAdenaOffer ? (buyQuantityKkStr.trim() === '' || !Number.isFinite(parseKkFromStr(buyQuantityKkStr)) || parseKkFromStr(buyQuantityKkStr) <= 0) : (buyQuantityStr.trim() === '' || !Number.isFinite(Number(buyQuantityStr)) || Math.floor(Number(buyQuantityStr)) < 1))}>
              {buySubmitting ? 'Creating…' : (t('payByCard') || 'Pay by card')}
            </Button>
          )}
          {cryptoPaymentEnabled && (
            <Tooltip title={t('payWithCryptoUsdNotice')}>
              <Button variant="contained" color="secondary" onClick={handleCryptoBuySubmit} disabled={buySubmitting || isPriceBelowMin || (isAdenaOffer ? (buyQuantityKkStr.trim() === '' || !Number.isFinite(parseKkFromStr(buyQuantityKkStr)) || parseKkFromStr(buyQuantityKkStr) <= 0) : (buyQuantityStr.trim() === '' || !Number.isFinite(Number(String(buyQuantityStr).replace(',', '.'))) || Math.floor(Number(String(buyQuantityStr).replace(',', '.'))) < 1))}>
                {buySubmitting ? 'Creating…' : (t('payWithCrypto') || 'Pay with Crypto')}
              </Button>
            </Tooltip>
          )}
          {ibanPaymentEnabled && (
            <Button variant="contained" color="secondary" onClick={handleIbanBuySubmit} disabled={buySubmitting || isPriceBelowMin || (isAdenaOffer ? (buyQuantityKkStr.trim() === '' || !Number.isFinite(parseKkFromStr(buyQuantityKkStr)) || parseKkFromStr(buyQuantityKkStr) <= 0) : (buyQuantityStr.trim() === '' || !Number.isFinite(Number(String(buyQuantityStr).replace(',', '.'))) || Math.floor(Number(String(buyQuantityStr).replace(',', '.'))) < 1))}>
              {buySubmitting ? 'Creating…' : (t('payViaIban') || 'Pay via IBAN (EUR)')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
