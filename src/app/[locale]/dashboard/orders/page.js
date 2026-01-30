'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import { useAuthStore } from '@/store/authStore';
import { getMyOrdersAsBuyer, getMyOrdersAsSeller, getMyOfferThreads } from '@/lib/api';

export default function MyOrdersPage() {
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [offerThreads, setOfferThreads] = useState({ asBuyer: [], asSeller: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      getMyOrdersAsBuyer(token),
      getMyOrdersAsSeller(token),
      getMyOfferThreads(token).catch(() => ({ asBuyer: [], asSeller: [] })),
    ])
      .then(([buyer, seller, threads]) => {
        setBuyerOrders(Array.isArray(buyer) ? buyer : []);
        setSellerOrders(Array.isArray(seller) ? seller : []);
        setOfferThreads(threads && typeof threads === 'object' && !Array.isArray(threads) ? threads : { asBuyer: [], asSeller: [] });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Alert severity="info">{t('loginToSeeOrders')}</Alert>
        </Container>
      </Box>
    );
  }

  const allOrders = [...buyerOrders, ...sellerOrders].filter(
    (o, i, arr) => arr.findIndex((x) => x.id === o.id) === i
  );
  allOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <Link href={`/${locale}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            {t('dashboard')}
          </MuiLink>
        </Link>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {t('chats')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('orderChatsHint')}
        </Typography>

        {!loading && (offerThreads.asBuyer?.length > 0 || offerThreads.asSeller?.length > 0) && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t('preOrderConversations')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('preOrderHint')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {offerThreads.asBuyer?.map((t) => {
                const g = t.offer?.server?.gameVariant?.game?.id;
                const v = t.offer?.server?.gameVariant?.id;
                const s = t.offer?.server?.id;
                const href = g && v && s ? `/${locale}/game/${g}/${v}/${s}/offers/${t.offerId}` : '#';
                return (
                  <Card key={`b-${t.offerId}`} variant="outlined">
                    <CardActionArea component={Link} href={href}>
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {t.offer?.title ?? t('offer')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('withSeller')}: {t.otherParty?.nickname ?? t.otherParty?.email ?? '—'}
                        </Typography>
                        {t.lastMessage?.text && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }} noWrap>
                            {t.lastMessage.text}
                          </Typography>
                        )}
                        {t.lastMessage?.createdAt && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            {new Date(t.lastMessage.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
              {offerThreads.asSeller?.map((t) => {
                const g = t.offer?.server?.gameVariant?.game?.id;
                const v = t.offer?.server?.gameVariant?.id;
                const s = t.offer?.server?.id;
                const href = g && v && s ? `/${locale}/game/${g}/${v}/${s}/offers/${t.offerId}` : '#';
                return (
                  <Card key={`s-${t.offerId}-${t.buyerId}`} variant="outlined">
                    <CardActionArea component={Link} href={href}>
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {t.offer?.title ?? t('offer')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('withBuyer')}: {t.otherParty?.nickname ?? t.otherParty?.email ?? '—'}
                        </Typography>
                        {t.lastMessage?.text && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }} noWrap>
                            {t.lastMessage.text}
                          </Typography>
                        )}
                        {t.lastMessage?.createdAt && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            {new Date(t.lastMessage.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          </Box>
        )}

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t('orderChats')}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && allOrders.length === 0 && (
          <Typography color="text.secondary">{t('noOrderChats')}</Typography>
        )}
        {!loading && allOrders.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {allOrders.map((order) => (
              <Card key={order.id} variant="outlined">
                <CardActionArea component={Link} href={`/${locale}/dashboard/orders/${order.id}`}>
                  <CardContent sx={{ py: 2, px: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t('orderIdShort', { id: order.id?.slice(0, 8) ?? '' })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('status')}: {order.status ?? '—'} · {t('chat')}
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
