'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import {
  getOrderById,
  getOrderMessages,
  sendOrderMessage,
  markOrderDelivered,
  completeOrder as apiCompleteOrder,
  cancelOrder as apiCancelOrder,
  leaveOrderFeedback,
  openDispute,
  resolveDispute,
} from '@/lib/api';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { playNewMessageSound } from '@/lib/notificationSound';
import { formatAdena } from '@/lib/adenaFormat';
import { getOrderStatusTextColor } from '@/lib/orderStatusColors';

export default function OrderChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = useTranslations('OrderDetail');
  const tCommon = useTranslations('Common');
  const tOrders = useTranslations('Orders');
  const tSales = useTranslations('Sales');
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const base = `/${locale}`;
  const { profile } = useProfile();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const messagesContainerRef = useRef(null);
  const [actionError, setActionError] = useState(null);
  const [actionInfo, setActionInfo] = useState(null);
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);
  const [deliverProofFiles, setDeliverProofFiles] = useState([]);
  const deliverProofInputRef = useRef(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const disputeFileInputRef = useRef(null);
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveVerdictDialog, setResolveVerdictDialog] = useState({ open: false, action: null });
  const [resolveVerdictText, setResolveVerdictText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [paymentSuccessShown, setPaymentSuccessShown] = useState(false);
  const [infoExpandedOnMobile, setInfoExpandedOnMobile] = useState(false);
  const tAdmin = useTranslations('Admin');

  const paymentFromUrl = searchParams.get('payment');
  const showPaymentSuccess = paymentFromUrl === 'success' && !paymentSuccessShown;

  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;
  const setOrderRef = useRef(setOrder);
  setOrderRef.current = setOrder;
  const currentUserIdRef = useRef(null);
  const { connected, onlineUserIds } = useOrderSocket(orderId, token, {
    onMessage: (msg) => {
      const senderId = msg.senderId ?? msg.sender?.id;
      const isFromOther = senderId !== currentUserIdRef.current;
      setMessagesRef.current((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (isFromOther) playNewMessageSound();
        return [...prev, msg];
      });
    },
    onOrderRead: (payload) => {
      if (!payload?.userId || !payload?.lastReadAt) return;
      setOrderRef.current?.((prev) => {
        if (!prev) return prev;
        const existing = prev.orderReads ?? [];
        const idx = existing.findIndex((r) => r.userId === payload.userId);
        const newRead = { userId: payload.userId, lastReadAt: payload.lastReadAt };
        const nextReads = idx >= 0
          ? existing.map((r, i) => (i === idx ? newRead : r))
          : [...existing, newRead];
        return { ...prev, orderReads: nextReads };
      });
    },
    onOrderActivity: () => {
      if (!orderId || !token) return;
      getOrderById(orderId, token).then(setOrder).catch(() => {});
      getOrderMessages(orderId, token).then((msgs) => setMessages(Array.isArray(msgs) ? msgs : [])).catch(() => {});
    },
  });

  const refetchOrder = () => {
    if (!orderId || !token) return;
    getOrderById(orderId, token).then(setOrder).catch(() => {});
  };

  useEffect(() => {
    if (!orderId || !token) return;
    setLoading(true);
    Promise.all([getOrderById(orderId, token), getOrderMessages(orderId, token)])
      .then(([ord, msgs]) => {
        setOrder(ord);
        setMessages(Array.isArray(msgs) ? msgs : []);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refetchUnread'));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Refetch order periodically so read receipts (Seen) update when the other user reads
  useEffect(() => {
    if (!orderId || !token) return;
    const interval = setInterval(refetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  const handleSend = async () => {
    if (!orderId || !token || (!text.trim() && files.length === 0)) return;
    setSending(true);
    setSendError(null);
    const formData = new FormData();
    formData.append('text', text.trim() || ' ');
    files.forEach((file) => formData.append('files', file));
    try {
      await sendOrderMessage(orderId, formData, token);
      setText('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refetch messages so the new one appears (socket may not echo to sender)
      getOrderMessages(orderId, token).then((msgs) => setMessages(Array.isArray(msgs) ? msgs : [])).catch(() => {});
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const currentUserId = user?.id ?? user?.userId;
  currentUserIdRef.current = currentUserId;
  const role = profile?.role ?? user?.role;
  const isModerator = role === 'ADMIN' || role === 'MODERATOR';
  const isSeller = order && currentUserId && (order.sellerId === currentUserId || order.seller?.id === currentUserId);
  const isBuyer = order && currentUserId && (order.buyerId === currentUserId || order.buyer?.id === currentUserId);
  const buyerPendingAdminConfirm = isBuyer && (order?.paymentMethod === 'CARD_MANUAL' || order?.paymentMethod === 'CRYPTO_MANUAL' || order?.paymentMethod === 'IBAN_MANUAL') && order?.status === 'CREATED';
  const sellerPendingAdminConfirm = isSeller && (order?.paymentMethod === 'CARD_MANUAL' || order?.paymentMethod === 'CRYPTO_MANUAL' || order?.paymentMethod === 'IBAN_MANUAL') && order?.status === 'CREATED';
  const pendingAdminConfirm = buyerPendingAdminConfirm || sellerPendingAdminConfirm;
  const chatBgColor = 'var(--background)';
  const canSellerDeliver =
    isSeller &&
    order &&
    (order.status === 'CREATED' || order.status === 'PAID');
  const canBuyerCompleteOrDispute =
    isBuyer && order && order.status === 'DELIVERED';
  const canSellerDecline =
    isSeller &&
    order &&
    ['CREATED', 'PAID', 'DELIVERED'].includes(order.status);
  const buyerCanAskToDecline =
    isBuyer &&
    order &&
    ['CREATED', 'PAID', 'DELIVERED'].includes(order.status);

  const handleMarkDelivered = async () => {
    if (!orderId || !token || deliverProofFiles.length === 0) {
      setActionError(t('attachProofError'));
      return;
    }
    setDeliverSubmitting(true);
    setActionError(null);
    const formData = new FormData();
    deliverProofFiles.forEach((f) => formData.append('files', f));
    try {
      await markOrderDelivered(orderId, formData, token);
      setDeliverProofFiles([]);
      if (deliverProofInputRef.current) deliverProofInputRef.current.value = '';
      refetchOrder();
      // Refetch messages so the "Order delivered" message with proof images shows immediately for both seller and buyer
      getOrderMessages(orderId, token).then((msgs) => setMessages(Array.isArray(msgs) ? msgs : [])).catch(() => {});
    } catch (err) {
      setActionError(err.message || 'Failed to mark as delivered');
    } finally {
      setDeliverSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!orderId || !token) return;
    setCompleteSubmitting(true);
    setActionError(null);
    try {
      await apiCompleteOrder(orderId, token);
      refetchOrder();
    } catch (err) {
      setActionError(err.message || 'Failed to complete order');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || !token) return;
    setCancelSubmitting(true);
    setActionError(null);
    try {
      await apiCancelOrder(orderId, token);
      setDeclineDialogOpen(false);
      const [updatedOrder, updatedMessages] = await Promise.all([
        getOrderById(orderId, token),
        getOrderMessages(orderId, token),
      ]);
      setOrder(updatedOrder);
      setMessages(updatedMessages ?? []);
    } catch (err) {
      setActionError(err.message || 'Failed to cancel order');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const openResolveVerdictDialog = (action) => {
    setResolveVerdictDialog({ open: true, action });
    setResolveVerdictText('');
    setActionError(null);
  };

  const closeResolveVerdictDialog = () => {
    setResolveVerdictDialog({ open: false, action: null });
    setResolveVerdictText('');
  };

  const handleResolveDisputeSubmit = async () => {
    const verdict = (resolveVerdictText || '').trim();
    if (!verdict || !resolveVerdictDialog.action || !order?.dispute?.id || !token) {
      if (!verdict) setActionError(tAdmin('verdictRequired'));
      return;
    }
    setResolveSubmitting(true);
    setActionError(null);
    setActionInfo(null);
    try {
      const result = await resolveDispute(order.dispute.id, { action: resolveVerdictDialog.action, verdict }, token);
      closeResolveVerdictDialog();
      refetchOrder();
      if (result?.noFundsMoved) {
        setActionInfo(t('disputeClosedNoFundsMoved'));
        setTimeout(() => setActionInfo(null), 8000);
      }
    } catch (err) {
      refetchOrder();
      const msg = err.message || '';
      const isSoft = /already resolved|hold|settled|Refresh|not found/i.test(msg);
      if (isSoft) {
        setActionInfo(t('disputeAlreadyResolvedHint'));
        setTimeout(() => setActionInfo(null), 8000);
      } else {
        setActionError(msg || 'Failed to resolve dispute');
      }
    } finally {
      setResolveSubmitting(false);
    }
  };

  const currentUserLeftFeedback = order?.feedbacks?.some((f) => f.fromUserId === currentUserId) ?? false;
  const handleLeaveFeedback = async () => {
    if (!orderId || !token) return;
    const rating = Math.min(5, Math.max(1, Math.round(Number(feedbackRating))));
    setFeedbackSubmitting(true);
    setActionError(null);
    try {
      await leaveOrderFeedback(orderId, { rating, comment: feedbackComment.trim() || undefined }, token);
      setFeedbackComment('');
      refetchOrder();
    } catch (err) {
      setActionError(err.message || 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!orderId || !token) return;
    const reason = (disputeReason || '').trim();
    if (!reason) {
      setActionError(t('enterDisputeReason'));
      return;
    }
    if (!disputeFiles.length) {
      setActionError('Please attach at least one image as evidence.');
      return;
    }
    setDisputeSubmitting(true);
    setActionError(null);
    const formData = new FormData();
    formData.append('reason', reason);
    disputeFiles.forEach((f) => formData.append('files', f));
    try {
      await openDispute(orderId, formData, token);
      setDisputeDialogOpen(false);
      setDisputeReason('');
      setDisputeFiles([]);
      if (disputeFileInputRef.current) disputeFileInputRef.current.value = '';
      refetchOrder();
    } catch (err) {
      setActionError(err.message || t('failedOpenDispute'));
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: '#f5f5f5',
          p: 4,
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={600} color="text.primary" gutterBottom>
          {t('orderChat')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 360, mb: 3 }}>
          {t('loginToChatHint')}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          sx={{ textTransform: 'none', px: 3 }}
          onClick={() => openLoginModal(() => router.push(`${base}/dashboard/orders/${orderId}`))}
        >
          {t('loginToOpenChat')}
        </Button>
        <Button
          component={Link}
          href={base}
          sx={{ mt: 2, textTransform: 'none' }}
        >
          {t('backToHome')}
        </Button>
      </Box>
    );
  }

  if (loading && !order) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{error || t('orderNotFound')}</Alert>
          <Button component={Link} href={`/${locale}/dashboard/orders`} sx={{ mt: 2 }}>
            {tOrders('myOrders')}
          </Button>
        </Container>
      </Box>
    );
  }

  const isMe = (senderId) => currentUserId && senderId === currentUserId;

  const otherParty = order?.buyerId === currentUserId ? order?.seller : order?.buyer;
  const otherName = otherParty?.nickname ?? (isBuyer ? t('seller') : t('buyer'));
  const SENDER_BUBBLE = '#1B4332';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f5f5f5' }}>
      {/* Chat header – fixed at top */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, md: 2 },
          py: { xs: 1, md: 1.5 },
          px: { xs: 1.5, md: 2 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {isMobile && (
          <IconButton component={Link} href={`/${locale}/dashboard/orders`} size="small" sx={{ flexShrink: 0 }} aria-label={tOrders('chats')}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Link href={otherParty?.id ? `/${locale}/user/${otherParty.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Avatar
            src={otherParty?.avatarUrl}
            alt={otherParty?.nickname || otherParty?.email || ''}
            sx={{ width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 }, bgcolor: SENDER_BUBBLE }}
          >
            {(otherName || '?').charAt(0).toUpperCase()}
          </Avatar>
        </Link>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {otherParty?.id ? (
            <Typography variant="subtitle1" fontWeight={600} noWrap component={Link} href={`/${locale}/user/${otherParty.id}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              {otherName}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {otherName}
            </Typography>
          )}
          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            {connected ? t('online') : t('live')}
          </Typography>
          {order.buyerCharacterNick && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
              {t('buyerInGameNick')}:{' '}
              <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {order.buyerCharacterNick}
              </Typography>
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
            {order.offer?.title || tOrders('offer')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {tOrders('status')}:{' '}
            {order.status ? (
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 700, color: getOrderStatusTextColor(order.status, order.paymentMethod) }}>
                {tSales(`status_${order.status}`)}
              </Box>
            ) : (
              '—'
            )}
          </Typography>
          {order?.paymentMethod === 'CRYPTO_MANUAL' && order?.orderCryptoPayment?.adminConfirmedReceivedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              {order.orderCryptoPayment.paymentConfirmedBy === 'AUTO'
                ? t('paymentConfirmedAutomatically')
                : t('paymentConfirmedByAdmin')}
              {order.orderCryptoPayment.cryptoTransactionHash && (
                <>
                  {' · '}
                  <MuiLink
                    href={`https://tronscan.org/#/transaction/${order.orderCryptoPayment.cryptoTransactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ fontSize: 'inherit' }}
                  >
                    {t('viewOnTronscan')}
                  </MuiLink>
                </>
              )}
            </Typography>
          )}
          {order?.paymentMethod === 'IBAN_MANUAL' && order?.orderIbanPayment?.adminConfirmedReceivedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              {t('paymentConfirmedByAdmin')}
            </Typography>
          )}
        </Box>
      </Box>
      {showPaymentSuccess && (
        <Alert severity="success" onClose={() => setPaymentSuccessShown(true)} sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>
          {t('paymentSuccessMessage')}
        </Alert>
      )}
      {isBuyer && order?.paymentMethod === 'CARD_MANUAL' && order?.status === 'CREATED' && order?.orderCardPayment && !order?.orderCardPayment?.buyerMarkedSentAt && (
        <Alert severity="warning" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>
          {t('cardPaymentBanner')}{' '}
          <Button component={Link} href={`/${locale}/dashboard/orders/${orderId}/card-payment`} size="small" variant="outlined" sx={{ mt: 0.5 }}>
            {t('openPaymentPage')}
          </Button>
        </Alert>
      )}
      {isBuyer && order?.paymentMethod === 'CRYPTO_MANUAL' && order?.status === 'CREATED' && order?.orderCryptoPayment && !order?.orderCryptoPayment?.buyerMarkedSentAt && (
        <Alert severity="warning" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>
          {t('cryptoPaymentBanner')}{' '}
          <Button component={Link} href={`/${locale}/pay-crypto/${orderId}`} size="small" variant="outlined" sx={{ mt: 0.5 }}>
            {t('openPaymentPage')}
          </Button>
        </Alert>
      )}
      {isBuyer && order?.paymentMethod === 'IBAN_MANUAL' && order?.status === 'CREATED' && order?.orderIbanPayment && !order?.orderIbanPayment?.buyerMarkedSentAt && (
        <Alert severity="warning" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>
          {t('ibanPaymentBanner')}{' '}
          <Button component={Link} href={`/${locale}/dashboard/orders/${orderId}/iban-payment`} size="small" variant="outlined" sx={{ mt: 0.5 }}>
            {t('openPaymentPage')}
          </Button>
        </Alert>
      )}
      {actionInfo && <Alert severity="info" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }} onClose={() => setActionInfo(null)}>{actionInfo}</Alert>}
      {actionError && <Alert severity="error" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>{actionError}</Alert>}
      <>
      {/* Two-panel layout: info + chat. Desktop: both panels fill height; info scrolls internally, chat fills remaining. Mobile: info collapsible on top. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
        }}
      >
        {/* Left panel – Order info (scrolls internally on desktop; collapsible on mobile; on mobile cap height so chat gets more space) */}
        <Box
          sx={{
            width: isMobile ? '100%' : 340,
            minWidth: isMobile ? undefined : 280,
            maxWidth: isMobile ? '100%' : '40%',
            maxHeight: isMobile && infoExpandedOnMobile ? '42%' : (isMobile ? 'auto' : '100%'),
            bgcolor: 'background.paper',
            borderRight: isMobile ? 'none' : '1px solid',
            borderBottom: isMobile ? '1px solid' : 'none',
            borderColor: 'divider',
            overflow: 'auto',
            flexShrink: 0,
            minHeight: 0,
          }}
        >
          {isMobile && (
            <Button
              fullWidth
              size="small"
              onClick={() => setInfoExpandedOnMobile((v) => !v)}
              endIcon={infoExpandedOnMobile ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ justifyContent: 'space-between', py: 1.25, px: 2, borderRadius: 0 }}
            >
              {infoExpandedOnMobile ? t('hideOrderDetails') : t('orderDetails')}
            </Button>
          )}
          <Box sx={{ p: { xs: isMobile ? 2 : 1.5, md: 2 }, pt: isMobile ? 0 : undefined, display: isMobile && !infoExpandedOnMobile ? 'none' : 'block' }}>
          {order.offer && (
          <>
            {/* Block 1: Offer & what you're buying (buyer) / selling (seller) */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="overline" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {isBuyer ? t('block1TitleBuyer') : t('block1TitleSeller')}
              </Typography>
              {order.offer?.server?.gameVariant?.game?.name && order.offer?.server?.gameVariant?.name && order.offer?.server?.name && order.offer?.server?.gameVariant?.game?.id && order.offer?.server?.gameVariant?.id && order.offer?.server?.id && (
                <MuiLink
                  component={Link}
                  href={`/${locale}/game/${order.offer.server.gameVariant.game.id}/${order.offer.server.gameVariant.id}/${order.offer.server.id}/offers`}
                  underline="none"
                  color="primary.main"
                  sx={{ display: 'inline-block', mb: 1, '&:hover': { textDecoration: 'underline' } }}
                >
                  <Typography component="span" variant="subtitle1" fontWeight={700}>
                    {t('game')}: {order.offer.server.gameVariant.game.name} → {order.offer.server.gameVariant.name} → {order.offer.server.name}
                  </Typography>
                </MuiLink>
              )}
              {order.offer?.id && order.offer?.server?.gameVariant?.game?.id && order.offer?.server?.gameVariant?.id && order.offer?.server?.id && (
                <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {t('orderForThisOffer')}{' '}
                  <MuiLink
                    component={Link}
                    href={`/${locale}/game/${order.offer.server.gameVariant.game.id}/${order.offer.server.gameVariant.id}/${order.offer.server.id}/offers/${order.offer.id}`}
                    underline="hover"
                    color="primary.main"
                  >
                    {t('viewOffer')}
                  </MuiLink>
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {isBuyer ? t('youAreBuying') : t('youAreSelling')}
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                {order.offer.title}
              </Typography>
              {order.offer.offerType === 'ADENA' ? (
                <Typography variant="body1" color="text.primary" fontWeight={600}>
                  {t('qty')}: {formatAdena(Number(order.quantity ?? 0))} · {t('priceFor100kk')}: {Number(order.offer?.price ?? 0) * 100} {order.sellerCurrency ?? order.buyerCurrency}
                </Typography>
              ) : (
                <Typography variant="body1" color="text.primary" fontWeight={600}>
                  {t('qty')}: {order.quantity} · {Number(order.sellerAmount ?? 0).toFixed(2)} {order.sellerCurrency} {t('total')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {t('amountsFixedAtPurchase')}
              </Typography>
              {order.buyerCharacterNick && (
                <Typography variant="body1" color="text.primary" fontWeight={600} display="block" sx={{ mt: 0.5 }}>
                  {t('buyerInGameNick')}: {order.buyerCharacterNick}
                </Typography>
              )}
            </Box>

            {/* Block 2: Amount you pay (buyer) / receive (seller) + adena/items give or get */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: (theme) => `${theme.palette.primary.main}08` }}>
              <Typography variant="overline" color="primary.main" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {isBuyer ? t('block2TitleBuyer') : t('block2TitleSeller')}
              </Typography>
              {isSeller && order.sellerAmount != null && (
                <>
                  <Typography variant="body1" color="primary.main" fontWeight={700}>
                    {t('youReceive')}: {Number(order.sellerAmount).toFixed(2)} {order.sellerCurrency}
                    {' — '}
                    {order.transaction?.externalId ? t('toCard') : t('toBalance')}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('youGiveToBuyer')}: {order.offer?.offerType === 'ADENA' ? formatAdena(Number(order.quantity ?? 0)) : order.quantity} {order.offer?.offerType === 'ADENA' ? 'adena' : (order.offer?.title ?? '')}
                  </Typography>
                </>
              )}
              {isBuyer && order.buyerAmount != null && (
                <>
                  <Typography variant="body1" color="primary.main" fontWeight={700}>
                    {t('youPay')}: {Number(order.buyerAmount).toFixed(2)} {order.buyerCurrency}
                    {' — '}
                    {order.transaction?.externalId ? t('fromCard') : t('fromBalance')}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('youGetFromSeller')}: {order.offer?.offerType === 'ADENA' ? formatAdena(Number(order.quantity ?? 0)) : order.quantity} {order.offer?.offerType === 'ADENA' ? 'adena' : (order.offer?.title ?? '')}
                  </Typography>
                </>
              )}
              {order.buyerCharacterNick && (
                <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 1 }}>
                  {t('inGameNickLabel')}: {order.buyerCharacterNick}
                </Typography>
              )}
            </Box>
          </>
        )}

        {canSellerDeliver && (
          <Box sx={{ mb: 2, p: 2, border: '2px solid', borderColor: 'primary.main', borderRadius: 2, bgcolor: 'primary.50', boxShadow: 1 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={700} color="primary.dark">{t('iTransferred')}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('uploadProofHint')}
            </Typography>
            <input
              type="file"
              ref={deliverProofInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => setDeliverProofFiles(Array.from(e.target.files || []))}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => deliverProofInputRef.current?.click()}
              >
                {deliverProofFiles.length ? `${deliverProofFiles.length} image(s)` : 'Choose proof image(s)'}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={handleMarkDelivered}
                disabled={deliverSubmitting || deliverProofFiles.length === 0}
              >
                {deliverSubmitting ? t('submitting') : t('confirmDelivered')}
              </Button>
            </Box>
          </Box>
        )}

        {canBuyerCompleteOrDispute && (
          <Box sx={{ mb: 2, p: 2, border: '2px solid', borderColor: 'success.main', borderRadius: 2, bgcolor: 'success.50', boxShadow: 1 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={700} color="success.dark">{t('confirmReceiptOrDispute')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={handleComplete}
                disabled={completeSubmitting}
              >
                {completeSubmitting ? t('completing') : t('iReceivedComplete')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setDisputeDialogOpen(true)}
              >
                {t('notReceivedDispute')}
              </Button>
            </Box>
          </Box>
        )}

        {canSellerDecline && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>{t('declineOrderTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('declineOrderHint')}</Typography>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setDeclineDialogOpen(true)}
              disabled={cancelSubmitting}
            >
              {t('declineOrder')}
            </Button>
          </Box>
        )}
        <Dialog open={declineDialogOpen} onClose={() => !cancelSubmitting && setDeclineDialogOpen(false)}>
          <DialogTitle>{t('declineOrderTitle')}</DialogTitle>
          <DialogContent>
            <Typography>{t('declineOrderConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeclineDialogOpen(false)} disabled={cancelSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button variant="contained" color="error" onClick={handleCancelOrder} disabled={cancelSubmitting}>
              {cancelSubmitting ? t('submitting') : t('declineOrder')}
            </Button>
          </DialogActions>
        </Dialog>

        {buyerCanAskToDecline && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('askSellerToDecline')}
          </Typography>
        )}

        {order.status === 'COMPLETED' && (
          <Alert severity="success" sx={{ mb: 2 }}>Order completed. Seller has been paid.</Alert>
        )}

        {order.status === 'COMPLETED' && !currentUserLeftFeedback && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'warning.main', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>{t('feedbackMandatory')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('feedbackMandatoryHint')}</Typography>
            <FormControl size="small" fullWidth sx={{ mb: 1.5, minWidth: 120 }}>
              <InputLabel>{t('feedbackRating')}</InputLabel>
              <Select
                value={feedbackRating}
                label={t('feedbackRating')}
                onChange={(e) => setFeedbackRating(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('feedbackComment')}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              sx={{ mb: 1.5 }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLeaveFeedback}
              disabled={feedbackSubmitting}
            >
              {feedbackSubmitting ? t('submitting') : t('feedbackSubmit')}
            </Button>
          </Box>
        )}

        {order.status === 'DISPUTED' && (
          <Alert severity="warning" sx={{ mb: 2 }}>{t('orderDisputed')}</Alert>
        )}

        {/* Dispute: reason, evidence (visible to seller), and verdict when resolved */}
        {order?.dispute && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: order.dispute.status === 'RESOLVED' ? 'success.main' : 'warning.main', borderRadius: 1, bgcolor: 'action.hover' }}>
            {order.dispute.status === 'RESOLVED' && (
              <Typography variant="overline" color="success.main" fontWeight={600} display="block" gutterBottom>{t('disputeResolved')}</Typography>
            )}
            <Typography variant="subtitle2" color="text.primary" gutterBottom>{t('disputeReasonLabel')}</Typography>
            <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>{order.dispute.reason || '—'}</Typography>
            {order.dispute.openedBy && (order.buyer?.id === order.dispute.openedBy || order.buyerId === order.dispute.openedBy) && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{t('disputeOpenedByBuyer')}</Typography>
            )}
            {order.dispute.attachments?.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{t('disputeEvidenceVisibleToSeller')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {order.dispute.attachments.map((att) => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <Box
                        component="img"
                        src={att.url}
                        alt=""
                        sx={{ maxWidth: 200, maxHeight: 150, borderRadius: 1, border: '1px solid', borderColor: 'divider', objectFit: 'cover' }}
                      />
                    </a>
                  ))}
                </Box>
              </Box>
            )}
            {order.dispute.status === 'RESOLVED' && order.dispute.verdict && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.primary" gutterBottom>{t('disputeVerdictLabel')}</Typography>
                <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>{order.dispute.verdict}</Typography>
              </Box>
            )}
          </Box>
        )}

        {isModerator && (
          <Alert severity="info" sx={{ mb: 2 }}>{t('viewingAsModerator')}</Alert>
        )}

        {isModerator && order?.status === 'DISPUTED' && order?.dispute?.id && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>{t('resolveDisputeTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('resolveDisputeHint')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => openResolveVerdictDialog('RELEASE')}
                disabled={resolveSubmitting}
              >
                {t('releaseToSeller')}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => openResolveVerdictDialog('REFUND')}
                disabled={resolveSubmitting}
              >
                {t('refundBuyer')}
              </Button>
            </Box>
          </Box>
        )}
          </Box>
        </Box>

        {/* Right panel – Chat (fills remaining height; on mobile ensure minimum space for chat; green when payment confirmed, red tint when waiting confirmation) */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            ...(isMobile && { minHeight: '55vh' }),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: chatBgColor,
          }}
        >
        {pendingAdminConfirm && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
              background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                  {t('paymentUnderReviewBannerTitle')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                  {buyerPendingAdminConfirm ? t('paymentUnderReviewBannerBuyer') : t('paymentUnderReviewBannerSeller')}
                </Typography>
              </Box>
            </Box>
            {buyerPendingAdminConfirm && (
              <Button
                component={Link}
                href={`/${locale}/dashboard/orders/${orderId}/card-payment`}
                size="small"
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  borderColor: 'rgba(255,255,255,0.8)',
                  color: '#fff',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                {t('openPaymentPage')}
              </Button>
            )}
          </Box>
        )}
        {!pendingAdminConfirm && isSeller && order?.status === 'PAID' && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                {t('flowBannerSellerDeliverTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerSellerDeliverDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && isBuyer && order?.status === 'DELIVERED' && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                {t('flowBannerBuyerConfirmTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerBuyerConfirmDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && order?.status === 'COMPLETED' && !currentUserLeftFeedback && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                {t('flowBannerFeedbackTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerFeedbackDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        <Dialog open={resolveVerdictDialog.open} onClose={closeResolveVerdictDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {resolveVerdictDialog.action === 'RELEASE' ? t('releaseToSeller') : t('refundBuyer')} — {tAdmin('verdictRequired')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{tAdmin('verdictHint')}</Typography>
            <TextField
              label={tAdmin('verdict')}
              value={resolveVerdictText}
              onChange={(e) => setResolveVerdictText(e.target.value)}
              fullWidth
              multiline
              rows={3}
              required
              placeholder={tAdmin('verdictPlaceholder')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeResolveVerdictDialog}>{tAdmin('cancel')}</Button>
            <Button variant="contained" onClick={handleResolveDisputeSubmit} disabled={resolveSubmitting || !resolveVerdictText.trim()}>
              {resolveSubmitting ? tAdmin('submitting') : (resolveVerdictDialog.action === 'RELEASE' ? t('releaseToSeller') : t('refundBuyer'))}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Messages header + chat background color legend */}
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1.5, md: 2 }, pt: 1.5, pb: 0.5 }}>
          <Typography variant="h6" fontWeight={600}>
            {t('messages')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Tooltip title={t('chatLegendPendingConfirm')}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#fff8e6',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Tooltip>
            <Tooltip title={t('chatLegendPaidOrDone')}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#e8f5e9',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Tooltip>
            <Tooltip title={t('chatLegendCreatedOrOther')}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#f5f5f5',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Tooltip>
          </Box>
        </Box>
        {/* Messages area – reference style: dark green for sender, light grey for me; background matches chat panel (green/red/grey) */}
        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            minHeight: { xs: 260, md: 200 },
            overflow: 'auto',
            p: { xs: 1.5, md: 2 },
            bgcolor: chatBgColor,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {messages.length === 0 && (
            <Typography color="text.secondary" variant="body2" sx={{ alignSelf: 'center', mt: 4 }}>
              {t('noMessages')}
            </Typography>
          )}
          {[...messages]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((msg) => {
            const myMessage = isMe(msg.senderId ?? msg.sender?.id);
            const otherUserId = order?.buyerId === currentUserId ? order?.sellerId : order?.buyerId;
            const otherRead = order?.orderReads?.find((r) => r.userId === otherUserId);
            const seen = myMessage && otherRead && msg.createdAt && new Date(otherRead.lastReadAt) >= new Date(msg.createdAt);
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: myMessage ? 'flex-end' : 'flex-start',
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '75%',
                    px: 2,
                    py: 1.25,
                    borderRadius: 2,
                    borderTopRightRadius: myMessage ? 4 : 12,
                    borderTopLeftRadius: myMessage ? 12 : 4,
                    bgcolor: myMessage ? '#E8E8E8' : SENDER_BUBBLE,
                    color: myMessage ? '#1f1f1f' : '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                  </Typography>
                  {msg.attachments?.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {msg.attachments.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer">
                          <Box
                            component="img"
                            src={att.url}
                            alt=""
                            sx={{ maxWidth: 180, maxHeight: 140, borderRadius: 1, objectFit: 'cover' }}
                          />
                        </a>
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5, color: myMessage ? '#5a5a5a' : 'rgba(255,255,255,0.9)' }}>
                    {msg.createdAt && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {new Date(msg.createdAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                      </Typography>
                    )}
                    {myMessage && (
                      seen
                        ? <DoneAllIcon sx={{ fontSize: 14, color: 'primary.main' }} titleAccess={t('read')} />
                        : <DoneIcon sx={{ fontSize: 14 }} titleAccess={t('sent')} />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {sendError && <Alert severity="error" sx={{ mx: { xs: 1, md: 2 }, mb: 1 }}>{sendError}</Alert>}
        {/* Input area – fixed at bottom of chat panel, always visible on mobile */}
        <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: { xs: 1.5, md: 2 },
          pb: { xs: 'max(12px, env(safe-area-inset-bottom))', md: 2 },
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        }}
      >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            title={t('attachImage')}
            sx={{ color: 'text.secondary' }}
          >
            <AttachFileIcon />
          </IconButton>
          <TextField
            placeholder={t('messagePlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            multiline
            maxRows={4}
            size="small"
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'action.hover',
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={sending || (!text.trim() && files.length === 0)}
            sx={{
              bgcolor: SENDER_BUBBLE,
              color: '#fff',
              '&:hover': { bgcolor: '#2d6a4f' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
        {files.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>
            {t('imagesAttached', { count: files.length })}
          </Typography>
        )}

        <Dialog open={disputeDialogOpen} onClose={() => setDisputeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('openDispute')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('disputeDialogHint')}
            </Typography>
            <TextField
              label={t('reason')}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <input
              type="file"
              ref={disputeFileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => setDisputeFiles(Array.from(e.target.files || []))}
            />
            <Button
              variant="outlined"
              onClick={() => disputeFileInputRef.current?.click()}
              sx={{ mb: 1 }}
            >
              {disputeFiles.length ? t('imagesCount', { count: disputeFiles.length }) : t('attachEvidence')}
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisputeDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleOpenDispute} disabled={disputeSubmitting || !disputeReason.trim() || disputeFiles.length === 0}>
              {disputeSubmitting ? t('submitting') : t('openDispute')}
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Box>
      </>
    </Box>
  );
}
