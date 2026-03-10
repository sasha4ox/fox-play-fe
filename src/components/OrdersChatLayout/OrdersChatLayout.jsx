'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { getMyOrderChats } from '@/lib/api';
import { getOrderStatusTextColor } from '@/lib/orderStatusColors';
import Button from '@mui/material/Button';

/** Dark green used for sender bubbles (matches reference) */
const SENDER_BUBBLE = '#1B4332';
const HIGHLIGHT_BG = 'rgba(27, 67, 50, 0.18)';

const CHAT_ITEM_BG = 'var(--background)';

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
  const isIbanPaymentPage = pathname?.includes('/iban-payment');
  const rawOrders = chatSummary.orders ?? [];
  const sortedOrders = useMemo(
    () =>
      [...rawOrders].sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt || b.createdAt || 0).getTime() -
          new Date(a.lastMessage?.createdAt || a.createdAt || 0).getTime()
      ),
    [rawOrders]
  );
  const searchQuery = search.trim().toLowerCase();
  const filteredOrders = searchQuery
    ? sortedOrders.filter((o) => {
        const nick = String(o.otherParty?.nickname ?? (o.isSeller ? t('buyer') : t('seller'))).toLowerCase();
        const offerName = String(o.offer?.title ?? '').toLowerCase();
        const chatText = String(o.allMessagesText ?? o.lastMessage?.text ?? '').toLowerCase();
        return nick.includes(searchQuery) || offerName.includes(searchQuery) || chatText.includes(searchQuery);
      })
    : sortedOrders;

  const refetchChatList = useCallback(() => {
    if (!token) return;
    getMyOrderChats(token)
      .then((data) => {
        const orders = Array.isArray(data) ? data : (data?.orders ?? []);
        const unreadTotal = typeof data?.unreadTotal === 'number' ? data.unreadTotal : 0;
        setChatSummary({ orders, unreadTotal });
      })
      .catch(() => setChatSummary({ orders: [], unreadTotal: 0 }));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyOrderChats(token)
      .then((data) => {
        const orders = Array.isArray(data) ? data : (data?.orders ?? []);
        const unreadTotal = typeof data?.unreadTotal === 'number' ? data.unreadTotal : 0;
        setChatSummary({ orders, unreadTotal });
      })
      .catch(() => setChatSummary({ orders: [], unreadTotal: 0 }))
      .finally(() => setLoading(false));
  }, [token]);

  // Refetch chat list after user opens a chat so sidebar badge clears (GET messages marks as read on backend)
  useEffect(() => {
    if (!orderIdFromPath) return;
    const delayMs = 800;
    const timeoutId = setTimeout(refetchChatList, delayMs);
    return () => clearTimeout(timeoutId);
  }, [orderIdFromPath, refetchChatList]);

  const isOrdersRoot = pathname?.endsWith('/orders') || pathname?.match(/\/orders\/?$/);
  useEffect(() => {
    if (!isMobile && !loading && sortedOrders.length > 0 && isOrdersRoot) {
      router.replace(`/${locale}/dashboard/orders/${sortedOrders[0].id}`);
    }
  }, [isMobile, loading, sortedOrders, isOrdersRoot, locale, router]);

  if (!token) {
    return <Box sx={{ minHeight: '100vh', bgcolor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</Box>;
  }

  // Card / IBAN payment page: standalone, no chat sidebar
  if (isCardPaymentPage || isIbanPaymentPage) {
    return (
      <Box
        sx={{
          minHeight: { xs: 'calc(100vh - 56px)', md: 'calc(100vh - 64px)' },
          bgcolor: 'var(--background)',
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
        bgcolor: 'var(--background)',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Left panel – conversation list (hidden on mobile when chat is open); uses app theme */}
      <Box
        sx={{
          width: isMobile ? '100%' : 360,
          minWidth: isMobile ? undefined : 280,
          maxWidth: isMobile ? '100%' : '35%',
          bgcolor: 'var(--background)',
          borderRight: isMobile ? 'none' : '1px solid',
          borderColor: 'var(--second-color)',
          display: showList ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: isMobile && showList ? 1 : undefined,
        }}
      >
        {/* Search + admin inputs: theme background and text */}
        <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'var(--second-color)', bgcolor: 'var(--background)' }}>
          <InputBase
            placeholder={t('searchChatsPlaceholder') || t('searchChats') || 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<SearchIcon sx={{ color: 'var(--text-second-color)', mr: 1.5, fontSize: 20 }} />}
            sx={{
              width: '100%',
              py: 1,
              px: 1.5,
              borderRadius: 2,
              bgcolor: 'var(--second-color)',
              color: 'var(--third-color)',
              fontSize: '0.9rem',
              '& .MuiInputBase-input': { color: 'var(--third-color)' },
              '& .MuiInputBase-input::placeholder': { color: 'var(--text-second-color)', opacity: 1 },
            }}
          />
        </Box>
        {isAdminOrMod && (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', gap: 0.5, alignItems: 'center', bgcolor: 'var(--background)' }}>
              <InputBase
                placeholder={t('openOrderById')}
                value={adminOrderId}
                onChange={(e) => setAdminOrderId((e.target.value || '').trim())}
                size="small"
                sx={{
                  flex: 1,
                  bgcolor: 'var(--second-color)',
                  color: 'var(--third-color)',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  fontSize: '0.8rem',
                  '& .MuiInputBase-input': { color: 'var(--third-color)' },
                  '& .MuiInputBase-input::placeholder': { color: 'var(--text-second-color)', opacity: 1 },
                }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const id = adminOrderId.trim();
                  if (id) router.push(`/${locale}/dashboard/orders/${id}`);
                }}
                disabled={!adminOrderId.trim()}
                sx={{
                  borderColor: 'var(--fourth-color)',
                  color: 'var(--third-color)',
                  '&:hover': { borderColor: 'var(--third-color)', bgcolor: 'var(--second-color)' },
                }}
              >
                {t('open')}
              </Button>
            </Box>
            <Divider sx={{ borderColor: 'var(--second-color)' }} />
          </>
        )}
        {/* Messages section: theme background and text */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'var(--background)' }}>
          <Typography variant="h6" fontWeight={700} sx={{ px: 2, py: 1.5, color: 'var(--third-color)' }}>
            {t('chats')}
          </Typography>
          <Divider sx={{ borderColor: 'var(--second-color)' }} />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: 'var(--second-color)' }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={24} sx={{ bgcolor: 'var(--second-color)' }} />
                      <Skeleton variant="text" width="80%" height={18} sx={{ mt: 0.5, bgcolor: 'var(--second-color)' }} />
                    </Box>
                  </Box>
                ))}
              </>
            )}
            {!loading && filteredOrders.length === 0 && (
              <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: 'var(--text-second-color)' }}>
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
                if (isToday) return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
                const isThisYear = date.getFullYear() === now.getFullYear();
                return isThisYear
                  ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                  : date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
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
                      bgcolor: isSelected
                        ? theme.palette.action.selected
                        : order.isUnopened
                          ? 'rgba(25, 118, 210, 0.06)'
                          : CHAT_ITEM_BG,
                      color: 'var(--third-color)',
                      '&:hover': { filter: 'brightness(0.97)' },
                      borderLeft: isSelected ? '4px solid' : order.isUnopened ? '4px solid' : '4px solid transparent',
                      borderColor: order.isUnopened ? 'primary.main' : SENDER_BUBBLE,
                      boxShadow: isSelected ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <Badge
                      badgeContent={order.unreadCount > 0 ? order.unreadCount : 0}
                      color="error"
                      invisible={order.unreadCount === 0}
                    >
                      <Avatar
                        src={other?.avatarUrl}
                        alt={other?.nickname || other?.email || t('chats')}
                        sx={{ width: 48, height: 48, flexShrink: 0, bgcolor: order.isSeller ? 'primary.main' : 'grey.600' }}
                      >
                        {(displayName || '?').charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                          {order.isUnopened && (
                            <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} titleAccess={tSales('newOrder')} />
                          )}
                          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ color: 'var(--chat-color)' }}>
                            {displayName}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ flexShrink: 0, fontSize: '0.7rem', color: 'var(--text-second-color)' }}>
                          {formatDate(lastDate)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem', color: 'var(--text-second-color)' }}>
                        {order.offer?.title || t('offer')}
                      </Typography>
                      <Divider sx={{ my: 0.75, borderColor: 'var(--second-color)' }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        {order.status && (
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 700, color: getOrderStatusTextColor(order.status, order.paymentMethod) }}>
                            {tSales(`status_${order.status}`)}
                          </Typography>
                        )}
                        {lastText && (
                          <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', maxWidth: 140, color: 'var(--text-second-color)' }}>
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
      </Box>

      {/* Right panel – chat content (hidden on mobile when no chat selected) */}
      <Box
        sx={{
          flex: 1,
          display: showChat ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'var(--background)',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
