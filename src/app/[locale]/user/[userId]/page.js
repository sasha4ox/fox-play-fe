'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Rating from '@mui/material/Rating';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLocale, useTranslations } from 'next-intl';
import { getPublicProfile, getOffersBySeller, getFeedbacksByUserId } from '@/lib/api';
import { pathToOfferDetail } from '@/lib/games';

export default function UserProfilePage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('UserProfile');
  const userId = params?.userId;
  const [user, setUser] = useState(null);
  const [offers, setOffers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offersExpanded, setOffersExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getPublicProfile(userId).catch(() => null),
      getOffersBySeller(userId).catch(() => []),
      getFeedbacksByUserId(userId).catch(() => []),
    ])
      .then(([u, o, f]) => {
        setUser(u || null);
        setOffers(Array.isArray(o) ? o : []);
        setFeedbacks(Array.isArray(f) ? f : []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Skeleton height={80} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography color="text.secondary">{t('userNotFound')}</Typography>
      </Container>
    );
  }

  const base = `/${locale}`;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar src={user.avatarUrl} alt={user.nickname || user.id} sx={{ width: 64, height: 64 }}>
          {(user.nickname || user.id).charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {user.nickname || user.id.slice(0, 8)}
          </Typography>
          {user.rating != null && (
            <Rating value={user.rating} precision={0.5} readOnly size="small" sx={{ mt: 0.5 }} />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1,
          cursor: 'pointer',
          '&:hover': { opacity: 0.85 },
        }}
        onClick={() => setOffersExpanded((v) => !v)}
        role="button"
        aria-expanded={offersExpanded}
      >
        <Typography variant="h6" fontWeight={600}>
          {t('offers')}{offers.length > 0 ? ` (${offers.length})` : ''}
        </Typography>
        <IconButton size="small" aria-label={offersExpanded ? t('hideOffers') : t('showOffers')} sx={{ p: 0.25 }}>
          {offersExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={offersExpanded}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('offersHint')}
        </Typography>
        {offers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('noOffers')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={
                  offer.server?.gameVariant?.game && offer.server?.gameVariant && offer.server
                    ? pathToOfferDetail(
                        locale,
                        offer.server.gameVariant.game,
                        offer.server.gameVariant,
                        offer.server,
                        offer.id
                      )
                    : `${base}/dashboard`
                }
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card variant="outlined" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{offer.title}</Typography>
                      {offer.server?.gameVariant?.game?.name && (
                        <Chip size="small" label={`${offer.server.gameVariant.game.name} → ${offer.server?.gameVariant?.name || ''} → ${offer.server?.name || ''}`} variant="outlined" />
                      )}
                      <Typography variant="body2" color="primary">
                        {offer.displayPrice != null ? `${offer.displayPrice} ${offer.currency}` : `${offer.price} ${offer.currency}`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Box>
        )}
      </Collapse>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
        {t('reviews')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('reviewsHint')}
      </Typography>
      {feedbacks.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('noReviews')}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {feedbacks.map((f) => (
            <Card key={f.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Rating value={f.rating} readOnly size="small" />
                  {f.fromUser?.id ? (
                    <MuiLink
                      component={Link}
                      href={`/${locale}/user/${f.fromUser.id}`}
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {f.fromUser?.nickname || f.fromUser.id.slice(0, 8)}
                    </MuiLink>
                  ) : (
                    <Typography component="span" variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary' }}>
                      {f.fromUser?.nickname || f.fromUser?.id?.slice(0, 8)}
                    </Typography>
                  )}
                  <Typography component="span" variant="caption" color="text.secondary">
                    · {new Date(f.createdAt).toLocaleDateString(locale)}
                  </Typography>
                </Box>
                {f.gameFullName && (f.gameId && f.variantId && f.serverId ? (
                  <MuiLink
                    component={Link}
                    href={`/${locale}/game/${f.gameId}/${f.variantId}/${f.serverId}/offers/adena`}
                    underline="hover"
                    sx={{ display: 'inline-block', mb: 1, fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    {f.gameFullName}
                  </MuiLink>
                ) : (
                  <Chip
                    label={f.gameFullName}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1, fontWeight: 500, fontSize: '0.75rem' }}
                  />
                ))}
                {f.offerTitle && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: f.comment ? 1 : 0 }}>
                    {t('sold')}: {f.offerTitle}
                  </Typography>
                )}
                {f.comment && (
                  <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.5 }}>{f.comment}</Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
