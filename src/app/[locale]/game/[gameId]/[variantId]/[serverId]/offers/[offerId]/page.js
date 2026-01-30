'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { fetchOfferById, createOrder, getOfferMessages, sendOfferMessage } from '@/lib/api';

const OFFER_TYPE_LABELS = { ADENA: 'Adena', ITEMS: 'Items', ACCOUNTS: 'Accounts', BOOSTING: 'Boosting', OTHER: 'Other' };

export default function OfferPDPPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const offerId = params?.offerId;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyCharacterNick, setBuyCharacterNick] = useState('');
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [offerMessages, setOfferMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = !!token;
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const currentUserId = user?.id ?? user?.userId;
  const isCreator = currentUserId && offer?.seller?.id && currentUserId === offer.seller.id;

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId)
      .then((data) => {
        setOffer(data);
        setBuyQuantity(1);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [offerId]);

  const [selectedThreadBuyerId, setSelectedThreadBuyerId] = useState(null);

  useEffect(() => {
    if (!offerId || !token) return;
    getOfferMessages(offerId, token, isCreator ? undefined : null)
      .then((data) => setOfferMessages(Array.isArray(data) ? data : []))
      .catch(() => setOfferMessages([]));
  }, [offerId, token, isCreator]);

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      openLoginModal(() => setBuyDialogOpen(true));
      return;
    }
    setBuyDialogOpen(true);
  };

  const handleBuySubmit = async () => {
    if (!offer || !token) return;
    const nick = (buyCharacterNick || '').trim();
    if (!nick) {
      setBuyError('In-game character nickname is required');
      return;
    }
    const qty = Math.min(Math.max(1, Math.floor(buyQuantity)), offer.quantity);
    setBuySubmitting(true);
    setBuyError(null);
    try {
      const order = await createOrder(
        { offerId: offer.id, quantity: qty, characterNick: nick },
        token
      );
      setBuyDialogOpen(false);
      setBuyCharacterNick('');
      // Redirect to the new order so the user sees it and can chat
      router.push(`/${locale}/dashboard/orders/${order.id}`);
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
        <Container maxWidth="sm">
          <Alert severity="error">{error || 'Offer not found.'}</Alert>
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} sx={{ display: 'inline-block', mt: 2 }}>
            ← Back to offers
          </MuiLink>
        </Container>
      </Box>
    );
  }

  const maxQty = Math.max(1, offer.quantity);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← Back to offers
        </MuiLink>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          {offer.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {offer.description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Price: {offer.price} {offer.currency} {offer.offerType === 'ADENA' ? 'per unit' : ''} · Quantity: {offer.quantity}
        </Typography>
        {offer.seller && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Seller: {offer.seller.nickname ?? offer.seller.email}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          {!isCreator && (
            <Button variant="contained" color="secondary" onClick={handleBuyClick} disabled={offer.quantity <= 0}>
              Buy
            </Button>
          )}
          {isCreator && (
            <Button component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}/edit`} variant="outlined" color="secondary">
              Edit offer
            </Button>
          )}
        </Box>

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
            {offer.title} · Max: {maxQty}
          </Typography>
          <TextField
            label="In-game character nickname"
            value={buyCharacterNick}
            onChange={(e) => setBuyCharacterNick(e.target.value)}
            placeholder="Your character name in game"
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            label="Quantity"
            value={buyQuantity}
            onChange={(e) => setBuyQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
            inputProps={{ min: 1, max: maxQty }}
            fullWidth
          />
          {buyError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {buyError}
              {buyError.toLowerCase().includes('insufficient') && (
                <Box sx={{ mt: 1 }}>
                  <MuiLink component={Link} href={`/${locale}/dashboard/balance`}>
                    Add funds to your balance →
                  </MuiLink>
                </Box>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBuySubmit} disabled={buySubmitting}>
            {buySubmitting ? 'Creating…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
