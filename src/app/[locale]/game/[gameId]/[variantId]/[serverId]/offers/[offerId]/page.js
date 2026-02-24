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
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Rating from '@mui/material/Rating';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { fetchOfferById, createOrder, getCardPaymentEnabled, getOfferMessages, sendOfferMessage, getFeedbacksByUserId } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';

export default function OfferPDPPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('OfferDetail');
  const tOffers = useTranslations('Offers');
  const tCommon = useTranslations('Common');
  const tEdit = useTranslations('EditOffer');
  const offerId = params?.offerId;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const OFFER_TYPE_LABELS = { ADENA: tOffers('adena'), ITEMS: tOffers('items'), ACCOUNTS: tOffers('accounts'), BOOSTING: tOffers('boosting'), OTHER: tOffers('other') };
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyQuantityKk, setBuyQuantityKk] = useState(1);
  const [buyCharacterNick, setBuyCharacterNick] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [offerMessages, setOfferMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { profile } = useProfile();
  const isAuthenticated = !!token;
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const currentUserId = user?.id ?? user?.userId;
  const isCreator = currentUserId && offer?.seller?.id && currentUserId === offer.seller.id;

  const preferredCurrency = profile?.preferredCurrency;

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId, token, { displayCurrency: token ? undefined : 'USD' })
      .then((data) => {
        setOffer(data);
        setBuyQuantity(1);
        setBuyQuantityKk(1);
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
  const [payWithCard, setPayWithCard] = useState(false);

  useEffect(() => {
    if (!offerId || !token) return;
    getOfferMessages(offerId, token, isCreator ? undefined : null)
      .then((data) => setOfferMessages(Array.isArray(data) ? data : []))
      .catch(() => setOfferMessages([]));
  }, [offerId, token, isCreator]);

  useEffect(() => {
    getCardPaymentEnabled().then(setCardPaymentEnabled).catch(() => setCardPaymentEnabled(false));
  }, []);

  useEffect(() => {
    if (!feedbacksDialogOpen || !offer?.seller?.id) return;
    setFeedbacksLoading(true);
    getFeedbacksByUserId(offer.seller.id)
      .then((data) => setFeedbacks(Array.isArray(data) ? data : []))
      .catch(() => setFeedbacks([]))
      .finally(() => setFeedbacksLoading(false));
  }, [feedbacksDialogOpen, offer?.seller?.id]);

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      openLoginModal(() => setBuyDialogOpen(true));
      return;
    }
    setBuyQuantity(1);
    setBuyQuantityKk(1);
    setBuyDialogOpen(true);
  };

  const handleBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError(t('inGameNickRequired'));
      return;
    }
    const isAdena = offer.offerType === 'ADENA';
    const qty = isAdena
      ? Math.min(offer.quantity, Math.max(1, Math.floor(buyQuantityKk * 1_000_000)))
      : Math.min(Math.max(1, Math.floor(buyQuantity)), offer.quantity);
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const body = { offerId: offer.id, quantity: qty, characterNick: nick };
      if (payWithCard) body.paymentMethod = 'CARD_MANUAL';
      const order = await createOrder(body, token);
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      if (payWithCard) {
        router.push(`/${locale}/dashboard/orders/${order.id}/card-payment`);
      } else {
        router.push(`/${locale}/dashboard/orders/${order.id}`);
      }
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
      const body = { text: messageText.trim() };
      if (isCreator && selectedThreadBuyerId) body.buyerId = selectedThreadBuyerId;
      const msg = await sendOfferMessage(offerId, body, token);
      setOfferMessages((prev) => [...prev, msg]);
      setMessageText('');
    } catch (err) {
      setMessageError(err.message || 'Failed to send');
    } finally {
      setMessageSending(false);
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
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} sx={{ display: 'inline-block', mt: 2 }}>
            ← Back to offers
          </MuiLink>
        </Container>
      </Box>
    );
  }

  const maxQty = Math.max(1, offer.quantity);
  const isAdenaOffer = offer.offerType === 'ADENA';
  const maxKk = isAdenaOffer ? offer.quantity : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
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
                  {offer.seller.id && (
                    <Button size="small" variant="text" color="secondary" sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none' }} onClick={() => setFeedbacksDialogOpen(true)}>
                      {t('seeReviews')}
                    </Button>
                  )}
                </Box>
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
          const pricePer1kk = p < 0.001 && p > 0 ? p * 1_000_000 : p;
          const priceFor100kkDisplay = pricePer1kk * 100;
          const totalIfBuyFull = quantityKk * (priceFor100kkDisplay / 100);
          return (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('availabilityKk')}</Typography>
                    <Typography variant="h6" fontWeight={600}>{formatAdena(q)}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('availabilityKkHint')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('priceFor100kk')}</Typography>
                    <Typography variant="h6" fontWeight={600} color="primary.main">
                      {priceFor100kkDisplay.toFixed(2)} {currency}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">{t('priceIfBuyFull')}</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {totalIfBuyFull.toFixed(2)} {currency}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })()}

        {!isAdenaOffer && (
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

        {!isAdenaOffer && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {offer.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
          {!isCreator && (
            <Button variant="contained" color="secondary" onClick={handleBuyClick} disabled={offer.quantity <= 0}>
              {t('buy')}
            </Button>
          )}
          {isCreator && (
            <Button component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}/edit`} variant="outlined" color="secondary">
              {tEdit('editOffer')}
            </Button>
          )}
        </Box>

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
              {isCreator ? 'Conversations with buyers. Only you and that buyer see each thread.' : 'Ask a question before buying. Only you and the seller see this. Messages appear in the order chat after you buy.'}
            </Typography>
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
            {displayedMessages.length > 0 && (
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
            sx={{ mb: 2 }}
          />
          {isAdenaOffer ? (
            <>
              <TextField
                type="number"
                inputMode="decimal"
                label={t('toBeReceived')}
                value={buyQuantityKk}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Allow empty input while typing
                  if (inputValue === '') {
                    setBuyQuantityKk(0);
                    return;
                  }
                  const value = Number(inputValue);
                  if (!Number.isFinite(value) || value < 0) return;
                  const maxKk = (offer?.quantity ?? 0) / 1_000_000;
                  setBuyQuantityKk(Math.min(maxKk, value));
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">kk</InputAdornment>,
                }}
                inputProps={{ 
                  min: 0.001, 
                  max: (offer?.quantity ?? 0) / 1_000_000
                }}
                placeholder="10"
                fullWidth
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.75rem' }}>
                Max available: {formatAdena(offer?.quantity ?? 0)}
              </Typography>
            </>
          ) : (
            <TextField
              type="number"
              label={t('quantity')}
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
              inputProps={{ min: 1, max: maxQty }}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}
          {isAdenaOffer && (() => {
            const pricePer1kk = Number(offer.displayPrice ?? offer.price) || 0;
            const totalToPay = buyQuantityKk * pricePer1kk;
            const currency = offer.displayCurrency ?? offer.currency ?? '';
            return (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('youWillPay')}: <strong>{totalToPay.toFixed(2)} {currency}</strong>
              </Typography>
            );
          })()}
          {!isAdenaOffer && offer && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('youWillPay')}: <strong>{(buyQuantity * (Number(offer.displayPrice ?? offer.price) || 0)).toFixed(2)} {offer.displayCurrency ?? offer.currency ?? ''}</strong>
            </Typography>
          )}
          {cardPaymentEnabled && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={payWithCard}
                  onChange={(e) => setPayWithCard(e.target.checked)}
                />
              }
              label={t('payByCard') || 'Pay by card (transfer to provided card)'}
              sx={{ mb: 1 }}
            />
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
          <Button variant="contained" onClick={handleBuySubmit} disabled={buySubmitting || (isAdenaOffer ? buyQuantityKk <= 0 : buyQuantity < 1)}>
            {buySubmitting ? 'Creating…' : payWithCard ? (t('payByCard') || 'Pay by card') : t('payWithBalance')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
