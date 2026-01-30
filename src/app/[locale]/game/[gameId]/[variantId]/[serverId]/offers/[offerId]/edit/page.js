'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { fetchOfferById, updateOffer } from '@/lib/api';

export default function EditOfferPage() {
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    fetchOfferById(offerId)
      .then((data) => {
        setOffer(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setQuantity(data.quantity ?? 1);
        setPrice(String(data.price ?? ''));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [offerId]);

  const isCreator = user?.id && offer?.seller?.id && user.id === offer.seller.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offer || !token || !isCreator) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateOffer(
        offer.id,
        {
          title,
          description,
          quantity: Number(quantity) || 1,
          price: Number(price) || 0,
        },
        token
      );
      router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`);
    } catch (err) {
      setSubmitError(err.message || 'Failed to update offer');
    } finally {
      setSubmitting(false);
    }
  };

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
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`} sx={{ display: 'inline-block', mt: 2 }}>← Back</MuiLink>
        </Container>
      </Box>
    );
  }

  if (!isCreator) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Alert severity="error">You can only edit your own offers.</Alert>
          <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`} sx={{ display: 'inline-block', mt: 2 }}>← Back to offer</MuiLink>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <MuiLink component={Link} href={`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${offerId}`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← Back to offer
        </MuiLink>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Edit offer
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={{ mb: 2 }} required />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={4} fullWidth sx={{ mb: 2 }} required />
          <TextField type="number" label="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ min: 1 }} fullWidth sx={{ mb: 2 }} required />
          <TextField type="number" label="Price" value={price} onChange={(e) => setPrice(e.target.value)} inputProps={{ min: 0, step: 0.01 }} fullWidth sx={{ mb: 2 }} required />
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Button type="submit" variant="contained" color="secondary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Container>
    </Box>
  );
}
