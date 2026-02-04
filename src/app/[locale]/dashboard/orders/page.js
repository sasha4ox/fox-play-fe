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
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import { useAuthStore } from '@/store/authStore';
import { getMyOrderChats, getMyOfferThreads } from '@/lib/api';

export default function MyOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('Orders');
  const token = useAuthStore((s) => s.token);
  const [chatSummary, setChatSummary] = useState({ orders: [], unreadTotal: 0 });
  const [offerThreads, setOfferThreads] = useState({ asBuyer: [], asSeller: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      getMyOrderChats(token),
      getMyOfferThreads(token).catch(() => ({ asBuyer: [], asSeller: [] })),
    ])
      .then(([chats, threads]) => {
        setChatSummary(chats && typeof chats === 'object' ? { orders: chats.orders ?? [], unreadTotal: chats.unreadTotal ?? 0 } : { orders: [], unreadTotal: 0 });
        setOfferThreads(threads && typeof threads === 'object' && !Array.isArray(threads) ? threads : { asBuyer: [], asSeller: [] });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">{t('loginToSeeOrders')}</Alert>
        </Container>
      </Box>
    );
  }

  const allOrders = chatSummary.orders ?? [];
  // Use backend order (incomplete first, unread first, newest first); do not re-sort by seller/buyer
  const orderChatsList = allOrders;
  const hasAnySellerChats = allOrders.some((o) => o.isSeller);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
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
              {offerThreads.asBuyer?.map((thread) => {
                const g = thread.offer?.server?.gameVariant?.game?.id;
                const v = thread.offer?.server?.gameVariant?.id;
                const s = thread.offer?.server?.id;
                const href = g && v && s ? `/${locale}/game/${g}/${v}/${s}/offers/${thread.offerId}` : '#';
                return (
                  <Card key={`b-${thread.offerId}`} variant="outlined">
                    <CardActionArea component={Link} href={href}>
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {thread.offer?.title ?? t('offer')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('withSeller')}: {thread.otherParty?.nickname ?? thread.otherParty?.email ?? '—'}
                        </Typography>
                        {thread.lastMessage?.text && (
                          <Typography variant="body2" color="text.primary" display="block" sx={{ mt: 0.5, fontStyle: 'italic', fontWeight: 500 }} noWrap>
                            {thread.lastMessage.text}
                          </Typography>
                        )}
                        {thread.lastMessage?.createdAt && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, fontWeight: 500 }}>
                            {new Date(thread.lastMessage.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
              {offerThreads.asSeller?.map((thread) => {
                const g = thread.offer?.server?.gameVariant?.game?.id;
                const v = thread.offer?.server?.gameVariant?.id;
                const s = thread.offer?.server?.id;
                const href = g && v && s ? `/${locale}/game/${g}/${v}/${s}/offers/${thread.offerId}` : '#';
                return (
                  <Card key={`s-${thread.offerId}-${thread.buyerId}`} variant="outlined">
                    <CardActionArea component={Link} href={href}>
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {thread.offer?.title ?? t('offer')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('withBuyer')}: {thread.otherParty?.nickname ?? thread.otherParty?.email ?? '—'}
                        </Typography>
                        {thread.lastMessage?.text && (
                          <Typography variant="body2" color="text.primary" display="block" sx={{ mt: 0.5, fontStyle: 'italic', fontWeight: 500 }} noWrap>
                            {thread.lastMessage.text}
                          </Typography>
                        )}
                        {thread.lastMessage?.createdAt && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, fontWeight: 500 }}>
                            {new Date(thread.lastMessage.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Skeleton variant="text" width={120} height={28} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && allOrders.length === 0 && (
          <Typography color="text.secondary">{t('noOrderChats')}</Typography>
        )}
        {!loading && orderChatsList.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {hasAnySellerChats && (
              <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mb: -0.5 }}>
                {t('someoneBoughtYourItem')}
              </Typography>
            )}
            {orderChatsList.map((order) => {
              const other = order.otherParty;
              const lastDate = order.lastMessage?.createdAt ?? order.createdAt;
              const displayName = other?.nickname ?? other?.email ?? t('chat');
              const isSellerChat = order.isSeller;
              return (
                <Card
                  key={order.id}
                  variant="outlined"
                  sx={
                    isSellerChat
                      ? {
                          borderLeft: '4px solid',
                          borderColor: 'primary.main',
                          bgcolor: (theme) => `${theme.palette.primary.main}08`,
                        }
                      : {}
                  }
                >
                  <CardActionArea component={Link} href={`/${locale}/dashboard/orders/${order.id}`}>
                    <CardContent sx={{ py: 2, px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Badge badgeContent={order.unreadCount > 0 ? order.unreadCount : 0} color="error" invisible={order.unreadCount === 0}>
                        <Avatar
                          src={other?.avatarUrl}
                          sx={{ width: 48, height: 48, bgcolor: isSellerChat ? 'primary.main' : 'grey.600' }}
                        >
                          {(displayName || '?').charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {isSellerChat && (
                          <Typography variant="caption" color="primary.main" fontWeight={600} display="block" sx={{ mb: 0.25 }}>
                            {t('sale')}
                          </Typography>
                        )}
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {order.offer?.title ?? t('orderIdShort', { id: order.id?.slice(0, 8) ?? '' })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {displayName} · {t('status')}: {order.status ?? '—'}
                          {order.isSeller && order.sellerAmount != null && (
                            <> · {Number(order.sellerAmount).toFixed(2)} {order.sellerCurrency} → {order.payoutMethod === 'card' ? t('toCardShort') : t('toBalanceShort')}</>
                          )}
                        </Typography>
                        {order.lastMessage?.text && (
                          <Typography variant="body2" color="text.primary" noWrap display="block" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {order.lastMessage.text}
                          </Typography>
                        )}
                        {lastDate && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, fontWeight: 500 }}>
                            {new Date(lastDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        )}
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
