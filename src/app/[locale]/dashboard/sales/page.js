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
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuthStore } from '@/store/authStore';
import { getMyOrdersAsBuyer, getMyOrdersAsSeller, getMyOrderChats, getUnreadCount } from '@/lib/api';
import { formatAdena } from '@/lib/adenaFormat';

const SOLD_STATUS_OPTIONS = ['', 'CREATED', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELED', 'DISPUTED'];

const orderCardBgByStatus = {
  COMPLETED: { bgcolor: 'rgba(25, 118, 210, 0.12)', borderLeft: '4px solid', borderLeftColor: '#1976d2' },
  CREATED: { bgcolor: 'rgba(139, 195, 74, 0.2)', borderLeft: '4px solid', borderLeftColor: '#8bc34a' },
  PAID: { bgcolor: 'rgba(76, 175, 80, 0.15)', borderLeft: '4px solid', borderLeftColor: '#4caf50' },
  DELIVERED: { bgcolor: 'rgba(255, 235, 59, 0.25)', borderLeft: '4px solid', borderLeftColor: '#ffeb3b' },
  DISPUTED: { bgcolor: 'rgba(244, 67, 54, 0.12)', borderLeft: '4px solid', borderLeftColor: '#f44336' },
  CANCELED: { bgcolor: 'rgba(158, 158, 158, 0.15)', borderLeft: '4px solid', borderLeftColor: '#9e9e9e' },
};

function getOrderCardSx(order, unread) {
  const byStatus = order?.status ? orderCardBgByStatus[order.status] : {};
  const unreadSx = unread > 0 ? { borderLeft: '4px solid', borderLeftColor: 'primary.main' } : {};
  return { ...byStatus, ...unreadSx };
}

export default function MyOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('Sales');
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState(0); // 0 = Bought, 1 = Sold
  const [soldStatusFilter, setSoldStatusFilter] = useState('');
  const [bought, setBought] = useState([]);
  const [sold, setSold] = useState([]);
  const [unreadByOrderId, setUnreadByOrderId] = useState({});
  const [sellerOrderCount, setSellerOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getMyOrdersAsBuyer(token),
      getMyOrdersAsSeller(token, soldStatusFilter ? { status: soldStatusFilter } : {}),
    ])
      .then(([buyerList, sellerList]) => {
        setBought(Array.isArray(buyerList) ? buyerList : []);
        setSold(Array.isArray(sellerList) ? sellerList : []);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [token, soldStatusFilter]);

  useEffect(() => {
    if (!token) return;
    getMyOrderChats(token)
      .then((data) => {
        const orders = data?.orders ?? [];
        const map = {};
        orders.forEach((o) => {
          if (o.id != null && (o.unreadCount ?? 0) > 0) map[o.id] = o.unreadCount;
        });
        setUnreadByOrderId(map);
      })
      .catch(() => setUnreadByOrderId({}));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getUnreadCount(token)
      .then((data) => setSellerOrderCount(data?.sellerOrderCount ?? 0))
      .catch(() => setSellerOrderCount(0));
  }, [token]);

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">{t('loginToSee')}</Alert>
        </Container>
      </Box>
    );
  }

  const sortByCreatedAtDesc = (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  const boughtSorted = [...bought].sort(sortByCreatedAtDesc);
  const soldSorted = [...sold].sort(sortByCreatedAtDesc);

  const formatOrderQty = (order) => {
    const qty = order.quantity ?? 1;
    if (order.offer?.offerType === 'ADENA') return formatAdena(qty);
    return String(qty);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <Link href={`/${locale}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            {t('dashboard')}
          </MuiLink>
        </Link>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('hint')}
        </Typography>

        {sellerOrderCount > 0 && (
          <Alert severity="info" sx={{ mb: 2 }} variant="outlined">
            {t('badgeHint', { count: sellerOrderCount })}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            label={
              <Badge badgeContent={bought.length} color="primary" max={99}>
                <span>{t('tabBought')}</span>
              </Badge>
            }
            id="orders-tab-bought"
            aria-controls="orders-panel-bought"
          />
          <Tab
            label={
              <Badge badgeContent={sold.length} color="primary" max={99}>
                <span>{t('tabSold')}</span>
              </Badge>
            }
            id="orders-tab-sold"
            aria-controls="orders-panel-sold"
          />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Skeleton variant="text" width={180} height={28} />
                  <Skeleton variant="text" width="70%" height={20} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {!loading && tab === 0 && (
          <Box id="orders-panel-bought" role="tabpanel" aria-labelledby="orders-tab-bought" sx={{ mt: 1 }}>
            {bought.length === 0 ? (
              <Typography color="text.secondary">{t('noBought')}</Typography>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {t('newestFirst')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {boughtSorted.map((order) => {
                    const paidWithCard = order.transaction?.externalId != null;
                    const sellerName = order.seller?.nickname ?? order.seller?.email ?? '—';
                    const statusLabel = order.status ? t(`status_${order.status}`) : '—';
                    const unread = unreadByOrderId[order.id] ?? 0;
                    return (
                      <Card key={order.id} variant="outlined" sx={getOrderCardSx(order, unread)}>
                        <CardActionArea component={Link} href={`/${locale}/dashboard/orders/${order.id}`}>
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {order.offer?.title ?? order.id?.slice(0, 8)}
                              </Typography>
                              {unread > 0 && (
                                <Badge badgeContent={unread} color="error" max={99}>
                                  <Typography variant="caption" color="error.main" fontWeight={600}>
                                    {t('unreadMessages')}
                                  </Typography>
                                </Badge>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              {t('boughtFrom')}: {sellerName} · Qty: {formatOrderQty(order)} · {t('status')}:{' '}
                              {order.status ? (
                                <Tooltip title={t(`statusMeaning_${order.status}`)} placement="top" enterTouchDelay={0} leaveTouchDelay={5000}>
                                  <Box component="span" sx={{ borderBottom: '1px dotted currentColor', cursor: 'help' }}>{statusLabel}</Box>
                                </Tooltip>
                              ) : (
                                statusLabel
                              )}
                            </Typography>
                            {order.createdAt && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                {t('orderDate')}: {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                              </Typography>
                            )}
                            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                              {t('youPaid')}: {Number(order.buyerAmount ?? 0).toFixed(2)} {order.buyerCurrency ?? ''}
                              {' — '}
                              {paidWithCard ? t('paidWithCard') : t('paidWithBalance')}
                            </Typography>
                            <Button size="small" sx={{ mt: 1 }} component="span">
                              {t('openChat')}
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              </>
            )}
          </Box>
        )}

        {!loading && tab === 1 && (
          <Box id="orders-panel-sold" role="tabpanel" aria-labelledby="orders-tab-sold" sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>{t('filterByStatus')}</InputLabel>
                <Select
                  value={soldStatusFilter}
                  label={t('filterByStatus')}
                  onChange={(e) => setSoldStatusFilter(e.target.value)}
                >
                  <MenuItem value="">{t('statusAll')}</MenuItem>
                  {SOLD_STATUS_OPTIONS.filter((s) => s).map((status) => (
                    <MenuItem key={status} value={status}>
                      {t(`status_${status}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip
                title={
                  <Box component="span" sx={{ display: 'block', maxWidth: 320, py: 0.5 }}>
                    <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>{t('statusMeaningsTitle')}</Typography>
                    {SOLD_STATUS_OPTIONS.filter((s) => s).map((status) => (
                      <Typography key={status} variant="body2" component="span" display="block" sx={{ mt: 1, whiteSpace: 'normal' }}>
                        <strong>{t(`status_${status}`)}:</strong> {t(`statusMeaning_${status}`)}
                      </Typography>
                    ))}
                  </Box>
                }
                placement="bottom-start"
                arrow
                enterTouchDelay={0}
                leaveTouchDelay={5000}
                slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -4] } }] } }}
              >
                <IconButton size="small" color="primary" aria-label={t('statusMeaningsTitle')} sx={{ ml: 0.25 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {sold.length === 0 ? (
              <Typography color="text.secondary">{t('noSales')}</Typography>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {t('newestFirst')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {soldSorted.map((order) => {
                    const payoutToCard = order.transaction?.externalId != null;
                    const buyerName = order.buyer?.nickname ?? order.buyer?.email ?? '—';
                    const statusLabel = order.status ? t(`status_${order.status}`) : '—';
                    const unread = unreadByOrderId[order.id] ?? 0;
                    return (
                      <Card key={order.id} variant="outlined" sx={getOrderCardSx(order, unread)}>
                        <CardActionArea component={Link} href={`/${locale}/dashboard/orders/${order.id}`}>
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {order.offer?.title ?? order.id?.slice(0, 8)}
                              </Typography>
                              {unread > 0 && (
                                <Badge badgeContent={unread} color="error" max={99}>
                                  <Typography variant="caption" color="error.main" fontWeight={600}>
                                    {t('unreadMessages')}
                                  </Typography>
                                </Badge>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              {t('soldTo')}: {buyerName} · Qty: {formatOrderQty(order)} · {t('status')}:{' '}
                              {order.status ? (
                                <Tooltip title={t(`statusMeaning_${order.status}`)} placement="top" enterTouchDelay={0} leaveTouchDelay={5000}>
                                  <Box component="span" sx={{ borderBottom: '1px dotted currentColor', cursor: 'help' }}>{statusLabel}</Box>
                                </Tooltip>
                              ) : (
                                statusLabel
                              )}
                            </Typography>
                            {order.createdAt && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                {t('orderDate')}: {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                              </Typography>
                            )}
                            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                              {t('youReceive')}: {Number(order.sellerAmount ?? 0).toFixed(2)} {order.sellerCurrency ?? ''}
                              {' — '}
                              {payoutToCard ? t('toCard') : t('toBalance')}
                            </Typography>
                            <Button size="small" sx={{ mt: 1 }} component="span">
                              {t('openChat')}
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              </>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
