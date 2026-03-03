'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { getMyOrderChats } from '@/lib/api';
import Button from '@mui/material/Button';

/** Dark green used for sender bubbles (matches reference) */
const SENDER_BUBBLE = '#1B4332';
const HIGHLIGHT_BG = 'rgba(27, 67, 50, 0.18)';

export default function OrdersChatLayout({ children }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = useTranslations('Orders');
  const tSales = useTranslations('Sales');
  const token = useAuthStore((s) => s.token);
  const { profile } = useProfile();
  const isAdminOrMod = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';
  const [chatSummary, setChatSummary] = useState({ orders: [], unreadTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adminOrderId, setAdminOrderId] = useState('');

  const orderIdFromPath = pathname?.match(/\/orders\/([a-f0-9-]+)/i)?.[1];
  const isCardPaymentPage = pathname?.includes('/card-payment');
  const allOrders = chatSummary.orders ?? [];
  const searchQuery = search.trim().toLowerCase();
  const filteredOrders = searchQuery
    ? allOrders.filter((o) => {
        const nick = String(o.otherParty?.nickname ?? (o.isSeller ? t('buyer') : t('seller'))).toLowerCase();
        const offerName = String(o.offer?.title ?? '').toLowerCase();
        const chatText = String(o.allMessagesText ?? o.lastMessage?.text ?? '').toLowerCase();
        return nick.includes(searchQuery) || offerName.includes(searchQuery) || chatText.includes(searchQuery);
      })
    : allOrders;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMyOrderChats(token)
      .then((data) => {
        const orders = Array.isArray(data) ? data : (data?.orders ?? []);
        const unreadTotal = typeof data?.unreadTotal === 'number' ? data.unreadTotal : 0;
        setChatSummary({ orders, unreadTotal });
      })
      .catch(() => setChatSummary({ orders: [], unreadTotal: 0 }))
      .finally(() => setLoading(false));
  }, [token]);

  const isOrdersRoot = pathname?.endsWith('/orders') || pathname?.match(/\/orders\/?$/);
  useEffect(() => {
    if (!isMobile && !loading && allOrders.length > 0 && isOrdersRoot) {
      router.replace(`/${locale}/dashboard/orders/${allOrders[0].id}`);
    }
  }, [isMobile, loading, allOrders, isOrdersRoot, locale, router]);

  if (!token) {
    return <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</Box>;
  }

  // Card payment page: standalone, no chat sidebar
  if (isCardPaymentPage) {
    return (
      <Box
        sx={{
          minHeight: { xs: 'calc(100vh - 56px)', md: 'calc(100vh - 64px)' },
          bgcolor: '#f5f5f5',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    );
  }

  const showList = !orderIdFromPath || !isMobile;
  const showChat = orderIdFromPath || !isMobile;

  return (
    <Box
      sx={{
        display: 'flex',
        height: { xs: 'calc(100vh - 56px)', md: 'calc(100vh - 64px)' },
        minHeight: { xs: 400, md: 500 },
        bgcolor: '#fafafa',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Left panel – conversation list (hidden on mobile when chat is open); background aligned with chat area */}
      <Box
        sx={{
          width: isMobile ? '100%' : 360,
          minWidth: isMobile ? undefined : 280,
          maxWidth: isMobile ? '100%' : '35%',
          bgcolor: '#f5f5f5',
          borderRight: isMobile ? 'none' : '1px solid',
          borderColor: 'divider',
          display: showList ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: isMobile && showList ? 1 : undefined,
        }}
      >
        <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f5f5f5' }}>
          <InputBase
            placeholder={t('searchChatsPlaceholder') || t('searchChats') || 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }} />}
            sx={{
              width: '100%',
              py: 1,
              px: 1.5,
              borderRadius: 2,
              bgcolor: 'background.paper',
              fontSize: '0.9rem',
            }}
          />
        </Box>
        {isAdminOrMod && (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <InputBase
                placeholder={t('openOrderById')}
                value={adminOrderId}
                onChange={(e) => setAdminOrderId((e.target.value || '').trim())}
                size="small"
                sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: 1, px: 1, py: 0.5, fontSize: '0.8rem' }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const id = adminOrderId.trim();
                  if (id) router.push(`/${locale}/dashboard/orders/${id}`);
                }}
                disabled={!adminOrderId.trim()}
              >
                {t('open')}
              </Button>
            </Box>
            <Divider />
          </>
        )}
        <Typography variant="h6" fontWeight={700} sx={{ px: 2, py: 1.5 }}>
          {t('chats')}
        </Typography>
        <Divider />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="80%" height={18} sx={{ mt: 0.5 }} />
                  </Box>
                </Box>
              ))}
            </>
          )}
          {!loading && filteredOrders.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              {t('noOrderChats')}
            </Typography>
          )}
          {!loading &&
            filteredOrders.map((order) => {
              const other = order.otherParty;
              const displayName = other?.nickname ?? (order.isSeller ? t('buyer') : t('seller'));
              const lastText = order.lastMessage?.text ?? '';
              const lastDate = order.lastMessage?.createdAt ?? order.createdAt;
              const isSelected = order.id === orderIdFromPath;
              const formatDate = (d) => {
                if (!d) return '';
                const date = new Date(d);
                const now = new Date();
                const isToday = date.toDateString() === now.toDateString();
                if (isToday) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                const isThisYear = date.getFullYear() === now.getFullYear();
                return isThisYear
                  ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                  : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              };
              return (
                <Link
                  key={order.id}
                  href={`/${locale}/dashboard/orders/${order.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: { xs: 1.5, md: 2 },
                      px: { xs: 1.5, md: 2 },
                      py: { xs: 1.5, md: 1.75 },
                      cursor: 'pointer',
                      bgcolor: isSelected ? HIGHLIGHT_BG : 'transparent',
                      '&:hover': { bgcolor: isSelected ? HIGHLIGHT_BG : 'action.hover' },
                      borderLeft: isSelected ? '4px solid' : '4px solid transparent',
                      borderColor: SENDER_BUBBLE,
                      boxShadow: isSelected ? 'inset 0 0 0 1px rgba(27, 67, 50, 0.2)' : 'none',
                    }}
                  >
                    <Badge
                      badgeContent={order.unreadCount > 0 ? order.unreadCount : 0}
                      color="error"
                      invisible={order.unreadCount === 0}
                    >
                      <Avatar
                        src={other?.avatarUrl}
                        sx={{ width: 48, height: 48, flexShrink: 0, bgcolor: order.isSeller ? 'primary.main' : 'grey.600' }}
                      >
                        {(displayName || '?').charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.25 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.7rem' }}>
                          {formatDate(lastDate)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                        {order.offer?.title || t('offer')}
                      </Typography>
                      <Divider sx={{ my: 0.75 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        {order.status && (
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'primary.main', fontWeight: 600 }}>
                            {tSales(`status_${order.status}`)}
                          </Typography>
                        )}
                        {lastText && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem', maxWidth: 140 }}>
                            {lastText}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Link>
              );
            })}
        </Box>
      </Box>

      {/* Right panel – chat content (hidden on mobile when no chat selected) */}
      <Box
        sx={{
          flex: 1,
          display: showChat ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
