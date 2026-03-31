'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
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
import Chip from '@mui/material/Chip';
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
  getMyReportStatus,
  postReport,
} from '@/lib/api';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { playNewMessageSound } from '@/lib/notificationSound';
import { formatAdena } from '@/lib/adenaFormat';
import { getEffectiveUnitKk, formatPriceForUnit } from '@/lib/offerMinPrice';
import { getOrderStatusTextColor } from '@/lib/orderStatusColors';
import { pathGameVariantServer, pathToOfferDetail, getDefaultCategorySlug, getAllowedOfferTypesForServer } from '@/lib/games';

/**
 * @returns {string|null} OrderDetail i18n key for the current Safe Transfer step line.
 */
function getSafeTransferStepKey(order, { isBuyer, isSeller, isAssignedAgent, isModerator }) {
  const st = order?.safeTransfer;
  if (!st || isModerator) return null;
  const stStatus = st.status;
  const os = order?.status;
  const hasAgent = Boolean(st.agentProfileId && st.agentCharacterNick);

  if (os === 'CREATED') return 'safeTransferStepPayment';

  if (os === 'PAID' && stStatus === 'PENDING_ITEM' && !hasAgent) {
    if (isSeller) return 'safeTransferStepWaitAgentSeller';
    if (isBuyer) return 'safeTransferStepWaitAgentBuyer';
    if (isAssignedAgent) return null;
    return null;
  }

  if (os === 'PAID' && stStatus === 'PENDING_ITEM' && hasAgent) {
    if (isSeller) return 'safeTransferStepSendToAgentSeller';
    if (isBuyer) return 'safeTransferStepSendToAgentBuyer';
    if (isAssignedAgent) return 'safeTransferStepSendToAgentAgent';
    return null;
  }

  if (stStatus === 'ITEM_RECEIVED') {
    if (isSeller) return 'safeTransferStepItemReceivedSeller';
    if (isBuyer) return 'safeTransferStepItemReceivedBuyer';
    if (isAssignedAgent) return 'safeTransferStepItemReceivedAgent';
    return null;
  }

  if (stStatus === 'ITEM_DELIVERED') {
    return 'safeTransferStepItemDelivered';
  }

  return null;
}

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
  const [hasReported, setHasReported] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReason, setReportReason] = useState('FRAUD');
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [infoExpandedOnMobile, setInfoExpandedOnMobile] = useState(false);
  const [newMessageNotification, setNewMessageNotification] = useState(null);
  const tAdmin = useTranslations('Admin');

  const paymentFromUrl = searchParams.get('payment');
  const showPaymentSuccess = paymentFromUrl === 'success' && !paymentSuccessShown;

  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;
  const setOrderRef = useRef(setOrder);
  setOrderRef.current = setOrder;
  const currentUserIdRef = useRef(null);
  const pendingMessageIdRef = useRef(null);
  const { connected, onlineUserIds, typingUserIds, emitTyping, emitTypingStop } = useOrderSocket(orderId, token, {
    onMessage: (msg) => {
      const senderId = msg.senderId ?? msg.sender?.id;
      const isFromOther = senderId !== currentUserIdRef.current;
      const pendingId = pendingMessageIdRef.current;
      if (!isFromOther && pendingId) {
        pendingMessageIdRef.current = null;
        setMessagesRef.current((prev) =>
          prev.map((m) => (m.id === pendingId ? msg : m))
        );
        return;
      }
      if (isFromOther) {
        playNewMessageSound();
        const senderName = msg.sender?.nickname ?? msg.sender?.email ?? tCommon('user');
        setNewMessageNotification(senderName);
      }
      setMessagesRef.current((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
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
    let cancelled = false;
    getMyReportStatus(orderId, token)
      .then((r) => {
        if (!cancelled) setHasReported(!!r?.hasReported);
      })
      .catch(() => {
        if (!cancelled) setHasReported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

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

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, []);

  // Refetch order periodically so read receipts (Seen) update when the other user reads
  useEffect(() => {
    if (!orderId || !token) return;
    const interval = setInterval(refetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  const typingDebounceRef = useRef(null);
  const typingStopRef = useRef(null);
  const TYPING_DEBOUNCE_MS = 300;
  const TYPING_STOP_MS = 2000;

  const handleTextChange = useCallback(
    (e) => {
      const value = e.target.value;
      setText(value);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingDebounceRef.current = setTimeout(() => {
        typingDebounceRef.current = null;
        if (value.trim()) emitTyping();
      }, TYPING_DEBOUNCE_MS);
      typingStopRef.current = setTimeout(() => {
        typingStopRef.current = null;
        emitTypingStop();
      }, TYPING_STOP_MS);
    },
    [emitTyping, emitTypingStop]
  );

  function normalizeMessage(msg) {
    if (!msg) return null;
    return {
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt,
      senderId: msg.senderId ?? msg.sender?.id,
      sender: msg.sender,
      attachments: msg.attachments ?? [],
    };
  }

  const handleSend = async () => {
    if (!orderId || !token || (!text.trim() && files.length === 0)) return;
    emitTypingStop();
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingDebounceRef.current = null;
    typingStopRef.current = null;
    const textToSend = text.trim() || ' ';
    const filesToSend = [...files];
    const formData = new FormData();
    formData.append('text', textToSend);
    filesToSend.forEach((file) => formData.append('files', file));
    setText('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(true);
    setSendError(null);
    const currentUserIdForSend = user?.id ?? user?.userId;
    const pendingId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: pendingId,
      text: textToSend,
      createdAt: new Date().toISOString(),
      senderId: currentUserIdForSend,
      sender: user ?? undefined,
      attachments: [],
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    pendingMessageIdRef.current = pendingId;
    try {
      const created = await sendOrderMessage(orderId, formData, token);
      const normalized = normalizeMessage(created);
      if (normalized) {
        const stillPending = pendingMessageIdRef.current;
        if (stillPending) {
          setMessages((prev) =>
            prev.map((m) => (m.id === stillPending ? normalized : m))
          );
          pendingMessageIdRef.current = null;
        } else {
          setMessages((prev) =>
            prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]
          );
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      pendingMessageIdRef.current = null;
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
  const hasSafeTransfer = !!order?.safeTransfer;
  const isAssignedAgent = hasSafeTransfer && order.safeTransfer.agentProfile?.userId === currentUserId;

  const reportableTargets = useMemo(() => {
    if (!order || !currentUserId) return [];
    const agentUid = order.safeTransfer?.agentProfile?.userId;
    const list = [];
    if (order.buyerId && order.buyerId !== currentUserId) {
      list.push({
        id: order.buyerId,
        nickname: order.buyer?.nickname,
        roleKey: 'buyer',
      });
    }
    if (order.sellerId && order.sellerId !== currentUserId) {
      list.push({
        id: order.sellerId,
        nickname: order.seller?.nickname,
        roleKey: 'seller',
      });
    }
    if (agentUid && agentUid !== currentUserId) {
      list.push({
        id: agentUid,
        nickname: order.safeTransfer?.agentProfile?.user?.nickname,
        roleKey: 'agent',
      });
    }
    const seen = new Set();
    return list.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  }, [order, currentUserId]);

  const showReportButton =
    order &&
    token &&
    (isBuyer || isSeller || isAssignedAgent) &&
    !isModerator &&
    order.status !== 'CANCELED' &&
    hasReported === false &&
    reportableTargets.length > 0;

  const safeTransferStepKey =
    order && hasSafeTransfer
      ? getSafeTransferStepKey(order, { isBuyer, isSeller, isAssignedAgent, isModerator })
      : null;
  const sellerSafeTransferWaitingAgentNick =
    hasSafeTransfer &&
    isSeller &&
    order?.status === 'PAID' &&
    order?.safeTransfer?.status === 'PENDING_ITEM' &&
    !order?.safeTransfer?.agentCharacterNick;
  const sellerStReadyForDeliver =
    hasSafeTransfer &&
    order?.status === 'PAID' &&
    order?.safeTransfer?.status === 'PENDING_ITEM' &&
    Boolean(order?.safeTransfer?.agentProfileId && order?.safeTransfer?.agentCharacterNick);
  const buyerCanConfirmReceipt =
    !hasSafeTransfer || order?.safeTransfer?.status === 'ITEM_DELIVERED';
  const getPaymentPageHref = (method) => {
    if (method === 'CRYPTO_MANUAL') return `/${locale}/pay-crypto/${orderId}`;
    if (method === 'IBAN_MANUAL') return `/${locale}/dashboard/orders/${orderId}/iban-payment`;
    return `/${locale}/dashboard/orders/${orderId}/card-payment`;
  };

  const buyerPendingAdminConfirm = isBuyer && (order?.paymentMethod === 'CARD_MANUAL' || order?.paymentMethod === 'CRYPTO_MANUAL' || order?.paymentMethod === 'IBAN_MANUAL') && order?.status === 'CREATED';
  const sellerPendingAdminConfirm = isSeller && (order?.paymentMethod === 'CARD_MANUAL' || order?.paymentMethod === 'CRYPTO_MANUAL' || order?.paymentMethod === 'IBAN_MANUAL') && order?.status === 'CREATED';
  const pendingAdminConfirm = buyerPendingAdminConfirm || sellerPendingAdminConfirm;
  const chatBgColor = 'var(--background)';
  const canSellerDeliver =
    isSeller &&
    order &&
    ((!hasSafeTransfer && (order.status === 'CREATED' || order.status === 'PAID')) ||
      (hasSafeTransfer && order.status === 'PAID' && sellerStReadyForDeliver));
  const canBuyerCompleteOrDispute =
    isBuyer && order && order.status === 'DELIVERED' && buyerCanConfirmReceipt;
  const canModeratorComplete =
    isModerator &&
    !isBuyer &&
    order &&
    order.status === 'DELIVERED' &&
    buyerCanConfirmReceipt;
  const canSellerDecline =
    isSeller &&
    order &&
    ['CREATED', 'PAID', 'DELIVERED'].includes(order.status) &&
    (!hasSafeTransfer || order.safeTransfer?.status === 'PENDING_ITEM');
  const buyerCanAskToDecline =
    isBuyer &&
    order &&
    ['CREATED', 'PAID', 'DELIVERED'].includes(order.status);

  const handleMarkDelivered = async () => {
    if (!orderId || !token) return;
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

  const handleOpenReportModal = () => {
    if (reportableTargets.length === 0) return;
    setReportTargetId(reportableTargets[0].id);
    setReportReason('FRAUD');
    setReportComment('');
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!orderId || !token || !reportTargetId) return;
    setReportSubmitting(true);
    setActionError(null);
    setActionInfo(null);
    try {
      const body = {
        orderId,
        reportedId: reportTargetId,
        reason: reportReason,
      };
      if (reportComment.trim()) body.comment = reportComment.trim();
      await postReport(body, token);
      setReportModalOpen(false);
      setHasReported(true);
      setActionInfo(t('report.success'));
      setTimeout(() => setActionInfo(null), 6000);
    } catch (err) {
      if (err.status === 409 || err.code === 'already_reported') {
        setHasReported(true);
        setReportModalOpen(false);
        setActionInfo(t('report.already_reported'));
        setTimeout(() => setActionInfo(null), 8000);
      } else {
        setActionError(err.message || 'Failed to submit report');
      }
    } finally {
      setReportSubmitting(false);
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

  /** Returns { labelKey: 'buyer'|'seller'|'adminBadge'|'agentBadge', isAdmin: boolean } for message sender. */
  const getMessageSenderLabel = (msg) => {
    const senderId = msg.senderId ?? msg.sender?.id;
    if (senderId === order?.buyerId) return { labelKey: 'buyer', isAdmin: false };
    if (senderId === order?.sellerId) return { labelKey: 'seller', isAdmin: false };
    if (hasSafeTransfer && senderId === order.safeTransfer.agentProfile?.userId) return { labelKey: 'agentBadge', isAdmin: false };
    if (msg.sender?.role === 'ADMIN' || msg.sender?.role === 'MODERATOR') return { labelKey: 'adminBadge', isAdmin: true };
    return { labelKey: null, isAdmin: false };
  };

  const otherParty = order?.buyerId === currentUserId ? order?.seller : order?.buyer;
  const otherName = otherParty?.nickname ?? (isBuyer ? t('seller') : t('buyer'));
  const otherUserId = order?.buyerId === currentUserId ? order?.sellerId : order?.buyerId;
  const isOtherTyping = otherUserId && typingUserIds?.includes(otherUserId);
  const typingBuyerId = order?.buyerId && typingUserIds?.includes(order.buyerId);
  const typingSellerId = order?.sellerId && typingUserIds?.includes(order.sellerId);
  const SENDER_BUBBLE = '#1B4332';
  const ADMIN_BUBBLE_TINT = 'rgba(255, 193, 7, 0.25)';

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
        {isModerator ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Link href={order?.buyer?.id ? `/${locale}/user/${order.buyer.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Avatar
                  src={order?.buyer?.avatarUrl}
                  alt={order?.buyer?.nickname || ''}
                  sx={{ width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 }, bgcolor: SENDER_BUBBLE }}
                >
                  {(order?.buyer?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">{t('buyer')}</Typography>
                <Typography variant="body2" fontWeight={600} noWrap>{order?.buyer?.nickname ?? '—'}</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>·</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Link href={order?.seller?.id ? `/${locale}/user/${order.seller.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Avatar
                  src={order?.seller?.avatarUrl}
                  alt={order?.seller?.nickname || ''}
                  sx={{ width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 }, bgcolor: SENDER_BUBBLE }}
                >
                  {(order?.seller?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">{t('seller')}</Typography>
                <Typography variant="body2" fontWeight={600} noWrap>{order?.seller?.nickname ?? '—'}</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }} />
          </>
        ) : (
          <>
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
                <Typography variant="subtitle1" fontWeight={600} noWrap component={Link} href={`/${locale}/user/${otherParty.id}`} sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  {otherName}
                </Typography>
              ) : (
                <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ color: 'text.primary' }}>
                  {otherName}
                </Typography>
              )}
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                {connected ? t('online') : t('live')}
              </Typography>
              {hasSafeTransfer && isSeller && order.safeTransfer.agentCharacterNick && (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: '2px solid',
                    borderColor: 'info.main',
                    bgcolor: (theme) => `${theme.palette.info.main}18`,
                    maxWidth: '100%',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                    {t('agentInGameNick')}
                  </Typography>
                  <Typography variant="body2" color="info.dark" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                    {order.safeTransfer.agentCharacterNick}
                  </Typography>
                </Box>
              )}
              {hasSafeTransfer && isSeller && sellerSafeTransferWaitingAgentNick && (
                <Typography variant="caption" color="warning.dark" fontWeight={700} sx={{ mt: 0.5 }} display="block">
                  {t('safeTransferWaitingAgentNick')}
                </Typography>
              )}
              {order.buyerCharacterNick && (!hasSafeTransfer || !isSeller || isModerator || isAssignedAgent) && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
                  {t('buyerInGameNick')}:{' '}
                  <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {order.buyerCharacterNick}
                  </Typography>
                </Typography>
              )}
            </Box>
          </>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
          {showReportButton && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenReportModal}
              sx={{ mb: 0.5 }}
            >
              {t('report.button')}
            </Button>
          )}
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
      {actionInfo && <Alert severity="info" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }} onClose={() => setActionInfo(null)}>{actionInfo}</Alert>}
      {actionError && <Alert severity="error" sx={{ mx: { xs: 1, md: 2 }, mt: 1 }}>{actionError}</Alert>}
      <Snackbar
        open={!!newMessageNotification}
        autoHideDuration={4000}
        onClose={() => setNewMessageNotification(null)}
        message={newMessageNotification ? `${t('newMessageFrom', { defaultValue: 'New message from' })} ${newMessageNotification}` : ''}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 6 }}
      />
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
          {hasSafeTransfer && (
            <Box sx={{ mb: 2, p: 2, border: '2px solid', borderColor: 'info.main', borderRadius: 2, bgcolor: (theme) => `${theme.palette.info.main}12` }}>
              <Typography variant="subtitle2" fontWeight={700} color="info.main" sx={{ mb: 0.5 }}>
                {t('safeTransferBanner')}
              </Typography>
              {safeTransferStepKey && (
                <Typography variant="body2" fontWeight={600} color="info.dark" sx={{ mb: 1 }}>
                  {t(safeTransferStepKey)}
                </Typography>
              )}
              {isSeller && (
                <>
                  <Typography variant="body2" color="text.secondary">{t('safeTransferSellerHint')}</Typography>
                  {order.safeTransfer.agentCharacterNick && (
                    <Alert
                      severity="info"
                      icon={false}
                      sx={{
                        mt: 1.5,
                        py: 1.5,
                        px: 2,
                        border: '2px solid',
                        borderColor: 'info.main',
                        bgcolor: (theme) => `${theme.palette.info.main}18`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
                        {t('agentInGameNick')}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="info.dark" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                        {order.safeTransfer.agentCharacterNick}
                      </Typography>
                    </Alert>
                  )}
                  {sellerSafeTransferWaitingAgentNick && (
                    <Typography variant="body2" color="warning.dark" fontWeight={700} sx={{ mt: 1.5 }}>
                      {t('safeTransferWaitingAgentNick')}
                    </Typography>
                  )}
                </>
              )}
              {isBuyer && (
                <Typography variant="body2" color="text.secondary">{t('safeTransferBuyerHint')}</Typography>
              )}
              {isAssignedAgent && (
                <>
                  <Typography variant="body2" color="text.secondary">{t('safeTransferAgentHint')}</Typography>
                  {order.buyerCharacterNick && (
                    <Typography variant="body1" fontWeight={700} color="info.main" sx={{ mt: 1 }}>
                      {t('buyerInGameNick')}: {order.buyerCharacterNick}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}

          {order.offer && (
          <>
            {/* Block 1: Offer & what you're buying (buyer) / selling (seller) / deal (moderator) */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="overline" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {isModerator ? t('block1TitleModerator') : (isBuyer ? t('block1TitleBuyer') : t('block1TitleSeller'))}
              </Typography>
              {order.offer?.server?.gameVariant?.game?.name && order.offer?.server?.gameVariant?.name && order.offer?.server?.name && order.offer?.server?.gameVariant?.game?.id && order.offer?.server?.gameVariant?.id && order.offer?.server?.id && (
                <MuiLink
                  component={Link}
                  href={pathGameVariantServer(
                    locale,
                    order.offer.server.gameVariant.game,
                    order.offer.server.gameVariant,
                    order.offer.server,
                    getDefaultCategorySlug(getAllowedOfferTypesForServer(order.offer.server), order.offer.server)
                  )}
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
                    href={pathToOfferDetail(
                      locale,
                      order.offer.server.gameVariant.game,
                      order.offer.server.gameVariant,
                      order.offer.server,
                      order.offer.id
                    )}
                    underline="hover"
                    color="primary.main"
                  >
                    {t('viewOffer')}
                  </MuiLink>
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {isModerator ? t('sellerSellsToBuyer', { seller: order.seller?.nickname ?? '—', buyer: order.buyer?.nickname ?? '—' }) : (isBuyer ? t('youAreBuying') : t('youAreSelling'))}
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                {order.offer.title}
              </Typography>
              {order.offer.offerType === 'ADENA' ? (() => {
                const rawUnit = order.offer?.server?.adenaPriceUnitKk ?? order.offer?.server?.gameVariant?.game?.adenaPriceUnitKk ?? 100;
                const effectiveUnit = getEffectiveUnitKk(rawUnit);
                const unitLabel = rawUnit === 0 ? t('pricePer1k') : t('pricePerNkk', { n: rawUnit });
                return (
                  <Typography variant="body1" color="text.primary" fontWeight={600}>
                    {t('qty')}: {formatAdena(Number(order.quantity ?? 0))} · {unitLabel}: {formatPriceForUnit(Number(order.offer?.price ?? 0) * effectiveUnit)} {order.sellerCurrency ?? order.buyerCurrency}
                  </Typography>
                );
              })() : (
                <Typography variant="body1" color="text.primary" fontWeight={600}>
                  {t('qty')}: {order.quantity} · {Number(order.sellerAmount ?? 0).toFixed(2)} {order.sellerCurrency} {t('total')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {t('amountsFixedAtPurchase')}
              </Typography>
              {hasSafeTransfer && isSeller && order.safeTransfer.agentCharacterNick && (
                <Alert
                  severity="info"
                  icon={false}
                  sx={{
                    mt: 1,
                    py: 1.25,
                    border: '2px solid',
                    borderColor: 'info.main',
                    bgcolor: (theme) => `${theme.palette.info.main}18`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    {t('agentInGameNick')}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="info.dark" sx={{ wordBreak: 'break-word' }}>
                    {order.safeTransfer.agentCharacterNick}
                  </Typography>
                </Alert>
              )}
              {hasSafeTransfer && isSeller && sellerSafeTransferWaitingAgentNick && (
                <Typography variant="body2" color="warning.dark" fontWeight={700} display="block" sx={{ mt: 1 }}>
                  {t('safeTransferWaitingAgentNick')}
                </Typography>
              )}
              {order.buyerCharacterNick && (!hasSafeTransfer || !isSeller || isModerator || isAssignedAgent) && (
                <Typography variant="body1" color="text.primary" fontWeight={600} display="block" sx={{ mt: 0.5 }}>
                  {t('buyerInGameNick')}: {order.buyerCharacterNick}
                </Typography>
              )}
            </Box>

            {/* Block 2: Amount you pay (buyer) / receive (seller) / both (moderator) + adena/items give or get */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: (theme) => `${theme.palette.primary.main}08` }}>
              <Typography variant="overline" color="primary.main" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {isModerator ? t('block2TitleModerator') : (isBuyer ? t('block2TitleBuyer') : t('block2TitleSeller'))}
              </Typography>
              {isModerator && (
                <>
                  {order.buyerAmount != null && (
                    <Typography variant="body1" color="primary.main" fontWeight={700} sx={{ mb: 0.5 }}>
                      {t('buyer')}: {t('youPay')} {Number(order.buyerAmount).toFixed(2)} {order.buyerCurrency}
                      {' — '}
                      {order.transaction?.externalId ? t('fromCard') : t('fromBalance')}
                    </Typography>
                  )}
                  {order.sellerAmount != null && (
                    <Typography variant="body1" color="primary.main" fontWeight={700} sx={{ mb: 0.5 }}>
                      {t('seller')}: {t('youReceive')} {Number(order.sellerAmount).toFixed(2)} {order.sellerCurrency}
                      {' — '}
                      {order.transaction?.externalId ? t('toCard') : t('toBalance')}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('seller')} {t('youGiveToBuyer')}: {order.offer?.offerType === 'ADENA' ? formatAdena(Number(order.quantity ?? 0)) : order.quantity} {order.offer?.offerType === 'ADENA' ? 'adena' : order.offer?.offerType === 'COINS' ? t('coins') : (order.offer?.title ?? '')}
                  </Typography>
                </>
              )}
              {!isModerator && isSeller && order.sellerAmount != null && (
                <>
                  <Typography variant="body1" color="primary.main" fontWeight={700}>
                    {t('youReceive')}: {Number(order.sellerAmount).toFixed(2)} {order.sellerCurrency}
                    {' — '}
                    {order.transaction?.externalId ? t('toCard') : t('toBalance')}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('youGiveToBuyer')}: {order.offer?.offerType === 'ADENA' ? formatAdena(Number(order.quantity ?? 0)) : order.quantity} {order.offer?.offerType === 'ADENA' ? 'adena' : order.offer?.offerType === 'COINS' ? t('coins') : (order.offer?.title ?? '')}
                  </Typography>
                </>
              )}
              {!isModerator && isBuyer && order.buyerAmount != null && (
                <>
                  <Typography variant="body1" color="primary.main" fontWeight={700}>
                    {t('youPay')}: {Number(order.buyerAmount).toFixed(2)} {order.buyerCurrency}
                    {' — '}
                    {order.transaction?.externalId ? t('fromCard') : t('fromBalance')}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('youGetFromSeller')}: {order.offer?.offerType === 'ADENA' ? formatAdena(Number(order.quantity ?? 0)) : order.quantity} {order.offer?.offerType === 'ADENA' ? 'adena' : order.offer?.offerType === 'COINS' ? t('coins') : (order.offer?.title ?? '')}
                  </Typography>
                </>
              )}
              {hasSafeTransfer && isSeller && order.safeTransfer.agentCharacterNick && (
                <Alert
                  severity="info"
                  icon={false}
                  sx={{
                    mt: 1,
                    py: 1,
                    border: '2px solid',
                    borderColor: 'info.main',
                    bgcolor: (theme) => `${theme.palette.info.main}18`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    {t('agentInGameNick')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="info.dark" sx={{ wordBreak: 'break-word' }}>
                    {order.safeTransfer.agentCharacterNick}
                  </Typography>
                </Alert>
              )}
              {hasSafeTransfer && isSeller && sellerSafeTransferWaitingAgentNick && (
                <Typography variant="body2" color="warning.dark" fontWeight={700} sx={{ mt: 1 }}>
                  {t('safeTransferWaitingAgentNick')}
                </Typography>
              )}
              {order.buyerCharacterNick && (!hasSafeTransfer || !isSeller || isModerator || isAssignedAgent) && (
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
                disabled={deliverSubmitting}
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

        {canModeratorComplete && (
          <Box sx={{ mb: 2, p: 2, border: '2px solid', borderColor: 'info.main', borderRadius: 2, bgcolor: 'info.50', boxShadow: 1 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={700} color="info.dark">{t('adminModeratorCompleteTitle')}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{t('adminModeratorCompleteHint')}</Typography>
            <Button
              size="small"
              variant="contained"
              color="info"
              onClick={handleComplete}
              disabled={completeSubmitting}
            >
              {completeSubmitting ? t('completing') : t('adminModeratorCompleteButton')}
            </Button>
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
                href={getPaymentPageHref(order?.paymentMethod)}
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
        {isBuyer && order?.paymentMethod === 'CARD_MANUAL' && order?.status === 'CREATED' && order?.orderCardPayment && !order?.orderCardPayment?.buyerMarkedSentAt && (
          <Alert severity="warning" sx={{ mx: { xs: 1.5, md: 2 }, mt: 1, flexShrink: 0 }}>
            {t('cardPaymentBanner')}{' '}
            <Button component={Link} href={getPaymentPageHref(order?.paymentMethod)} size="small" variant="outlined" sx={{ mt: 0.5 }}>
              {t('openPaymentPage')}
            </Button>
          </Alert>
        )}
        {isBuyer && order?.paymentMethod === 'CRYPTO_MANUAL' && order?.status === 'CREATED' && order?.orderCryptoPayment && !order?.orderCryptoPayment?.buyerMarkedSentAt && (
          <Alert severity="warning" sx={{ mx: { xs: 1.5, md: 2 }, mt: 1, flexShrink: 0 }}>
            {t('cryptoPaymentBanner')}{' '}
            <Button component={Link} href={getPaymentPageHref(order?.paymentMethod)} size="small" variant="outlined" sx={{ mt: 0.5 }}>
              {t('openPaymentPage')}
            </Button>
          </Alert>
        )}
        {isBuyer && order?.paymentMethod === 'IBAN_MANUAL' && order?.status === 'CREATED' && order?.orderIbanPayment && !order?.orderIbanPayment?.buyerMarkedSentAt && (
          <Alert severity="warning" sx={{ mx: { xs: 1.5, md: 2 }, mt: 1, flexShrink: 0 }}>
            {t('ibanPaymentBanner')}{' '}
            <Button component={Link} href={getPaymentPageHref(order?.paymentMethod)} size="small" variant="outlined" sx={{ mt: 0.5 }}>
              {t('openPaymentPage')}
            </Button>
          </Alert>
        )}
        {!pendingAdminConfirm && isSeller && order?.status === 'PAID' && hasSafeTransfer && order?.safeTransfer?.status === 'PENDING_ITEM' && !sellerStReadyForDeliver && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                {t('flowBannerSafeTransferWaitAgentSellerTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerSafeTransferWaitAgentSellerDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && isSeller && order?.status === 'PAID' && (!hasSafeTransfer || sellerStReadyForDeliver) && (
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
                {hasSafeTransfer ? t('flowBannerSafeTransferSellerDeliverTitle') : t('flowBannerSellerDeliverTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {hasSafeTransfer ? t('flowBannerSafeTransferSellerDeliverDescription') : t('flowBannerSellerDeliverDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && isSeller && order?.status === 'DELIVERED' && (
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
                {t('flowBannerSellerWaitingBuyerConfirmTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerSellerWaitingBuyerConfirmDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && isBuyer && order?.status === 'DELIVERED' && hasSafeTransfer && !buyerCanConfirmReceipt && (
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'inherit', lineHeight: 1.3 }}>
                {t('flowBannerBuyerWaitAgentDeliveryTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', mt: 0.25 }}>
                {t('flowBannerBuyerWaitAgentDeliveryDescription')}
              </Typography>
            </Box>
          </Box>
        )}
        {!pendingAdminConfirm && isBuyer && order?.status === 'DELIVERED' && (!hasSafeTransfer || buyerCanConfirmReceipt) && (
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

        <Dialog
          open={reportModalOpen}
          onClose={() => !reportSubmitting && setReportModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('report.modal.title')}</DialogTitle>
          <DialogContent>
            {reportableTargets.length > 1 && (
              <FormControl component="fieldset" variant="standard" sx={{ mb: 2, width: '100%' }}>
                <FormLabel component="legend" sx={{ mb: 1 }}>
                  {t('report.modal.who')}
                </FormLabel>
                <RadioGroup value={reportTargetId} onChange={(e) => setReportTargetId(e.target.value)}>
                  {reportableTargets.map((tgt) => (
                    <FormControlLabel
                      key={tgt.id}
                      value={tgt.id}
                      control={<Radio />}
                      label={`${tgt.nickname ?? '—'} (${t(`report.role.${tgt.roleKey}`)})`}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="report-reason-label">{t('report.modal.reason')}</InputLabel>
              <Select
                labelId="report-reason-label"
                value={reportReason}
                label={t('report.modal.reason')}
                onChange={(e) => setReportReason(e.target.value)}
              >
                {['FRAUD', 'SCAM', 'ABUSIVE_BEHAVIOR', 'OTHER'].map((k) => (
                  <MenuItem key={k} value={k}>
                    {t(`report.reason.${k}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('report.modal.comment')}
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${reportComment.length}/500`}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReportModalOpen(false)} disabled={reportSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitReport}
              disabled={reportSubmitting || !reportTargetId}
            >
              {reportSubmitting ? tCommon('loading') : t('report.modal.submit')}
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
          {order?.status === 'PAID' && ['CARD_MANUAL', 'CRYPTO_MANUAL', 'IBAN_MANUAL'].includes(order?.paymentMethod) && (
            <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>
              {t('proofInChatHint')}
            </Alert>
          )}
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
            const { labelKey: senderLabelKey, isAdmin: senderIsAdmin } = getMessageSenderLabel(msg);
            const bubbleIsAdmin = senderIsAdmin;
            const bubbleIsAgent = senderLabelKey === 'agentBadge';
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: myMessage ? 'flex-end' : 'flex-start',
                  mb: 1.5,
                }}
              >
                <Box sx={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: myMessage ? 'flex-end' : 'flex-start' }}>
                  {senderLabelKey === 'agentBadge' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, px: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={t('agentBadge')} size="small" color="error" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main' }}>
                        {msg.sender?.nickname ?? msg.sender?.email ?? t('agentBadge')}
                      </Typography>
                    </Box>
                  ) : senderLabelKey ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, px: 0.5, fontWeight: 600 }}>
                      {t(senderLabelKey)}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderRadius: 2,
                      borderTopRightRadius: myMessage ? 4 : 12,
                      borderTopLeftRadius: myMessage ? 12 : 4,
                      bgcolor: bubbleIsAdmin
                        ? ADMIN_BUBBLE_TINT
                        : bubbleIsAgent
                          ? (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(239, 83, 80, 0.22)'
                                : 'rgba(211, 47, 47, 0.1)'
                          : (myMessage ? '#E8E8E8' : SENDER_BUBBLE),
                      color: bubbleIsAgent
                        ? 'text.primary'
                        : myMessage
                          ? '#1f1f1f'
                          : bubbleIsAdmin
                            ? 'text.primary'
                            : '#fff',
                      boxShadow: bubbleIsAdmin ? '0 1px 2px rgba(255,193,7,0.4)' : '0 1px 2px rgba(0,0,0,0.08)',
                      border: bubbleIsAdmin || bubbleIsAgent ? '1px solid' : 'none',
                      borderColor: bubbleIsAdmin ? 'warning.main' : bubbleIsAgent ? 'error.main' : 'transparent',
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
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      mt: 0.5,
                      color: bubbleIsAgent && myMessage
                        ? 'text.secondary'
                        : myMessage
                          ? '#5a5a5a'
                          : 'rgba(255,255,255,0.9)',
                    }}
                  >
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
              </Box>
            );
          })}
        </Box>

        {sendError && <Alert severity="error" sx={{ mx: { xs: 1, md: 2 }, mb: 1 }}>{sendError}</Alert>}
        {(isOtherTyping || (isModerator && (typingBuyerId || typingSellerId))) && (
          <Typography variant="caption" color="text.secondary" sx={{ px: { xs: 1.5, md: 2 }, py: 0.5 }}>
            {isModerator && typingBuyerId && !typingSellerId
              ? t('isTyping', { name: t('buyer') })
              : isModerator && typingSellerId && !typingBuyerId
                ? t('isTyping', { name: t('seller') })
                : isModerator && typingBuyerId && typingSellerId
                  ? t('isTyping', { name: `${t('buyer')} / ${t('seller')}` })
                  : t('isTyping', { name: otherName })}
          </Typography>
        )}
        {/* Input area – fixed at bottom of chat panel; agents can post as Agent (badge + styling). */}
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
            onChange={handleTextChange}
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
