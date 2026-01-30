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
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { fetchOfferById, createOrder } from '@/lib/api';

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
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = !!token;
  const openLoginModal = useLoginModalStore((s) => s.openModal);

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

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      openLoginModal(() => setBuyDialogOpen(true));
      return;
    }
    setBuyDialogOpen(true);
  };

  const handleBuySubmit = async () => {
    if (!offer || !token) return;
    const qty = Math.min(Math.max(1, Math.floor(buyQuantity)), offer.quantity);
    setBuySubmitting(true);
    setBuyError(null);
    try {
      await createOrder({ offerId: offer.id, quantity: qty }, token);
      setBuyDialogOpen(false);
      router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`);
    } catch (err) {
      setBuyError(err.message || 'Failed to create order');
    } finally {
      setBuySubmitting(false);
    }
  };

  const isCreator = user?.id && offer?.seller?.id && user.id === offer.seller.id;

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
            Seller: {offer.seller.email}
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
      </Container>

      <Dialog open={buyDialogOpen} onClose={() => setBuyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Buy</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {offer.title} · Max: {maxQty}
          </Typography>
          <TextField
            type="number"
            label="Quantity"
            value={buyQuantity}
            onChange={(e) => setBuyQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
            inputProps={{ min: 1, max: maxQty }}
            fullWidth
          />
          {buyError && <Alert severity="error" sx={{ mt: 2 }}>{buyError}</Alert>}
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
