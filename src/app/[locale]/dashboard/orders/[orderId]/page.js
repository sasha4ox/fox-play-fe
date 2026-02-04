'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
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
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import {
  getOrderById,
  getOrderMessages,
  sendOrderMessage,
  markOrderDelivered,
  completeOrder as apiCompleteOrder,
  leaveOrderFeedback,
  openDispute,
  resolveDispute,
} from '@/lib/api';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { formatAdena } from '@/lib/adenaFormat';

export default function OrderChatPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('OrderDetail');
  const tCommon = useTranslations('Common');
  const tOrders = useTranslations('Orders');
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
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
  const messagesEndRef = useRef(null);
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
  const tAdmin = useTranslations('Admin');

  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;
  const { connected, onlineUserIds } = useOrderSocket(orderId, token, {
    onMessage: (msg) => {
      setMessagesRef.current((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
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
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  const role = profile?.role ?? user?.role;
  const isModerator = role === 'ADMIN' || role === 'MODERATOR';
  const isSeller = order && currentUserId && (order.sellerId === currentUserId || order.seller?.id === currentUserId);
  const isBuyer = order && currentUserId && (order.buyerId === currentUserId || order.buyer?.id === currentUserId);
  const canSellerDeliver =
    isSeller &&
    order &&
    (order.status === 'CREATED' || order.status === 'PAID');
  const canBuyerCompleteOrDispute =
    isBuyer && order && order.status === 'DELIVERED';

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
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info">Log in to open chat.</Alert>
        </Container>
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 2, px: 2, display: 'flex', flexDirection: 'column' }}>
      <Container sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link href={`/${locale}/dashboard/orders`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 1 }}>
            {tOrders('chats')}
          </MuiLink>
        </Link>
        {/* Unique UI: order / sold-item chat banner */}
        <Box
          sx={{
            mb: 2,
            py: 1.5,
            px: 2,
            borderRadius: 1,
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}14 0%, ${theme.palette.secondary.main}12 100%)`,
            border: '1px solid',
            borderColor: 'primary.main',
            borderLeftWidth: 4,
          }}
        >
          <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: 1 }}>
            {t('orderChatBadge')}
          </Typography>
          <Typography variant="h6" fontWeight={600} sx={{ mt: 0.25 }}>
            {t('orderChat')}
            {order.offer?.title && (
              <Typography component="span" variant="body2" color="text.secondary" fontWeight={400} sx={{ ml: 1 }}>
                · {order.offer.title}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            {tOrders('status')}: <strong>{order.status}</strong>
          </Typography>
          {connected && (
            <Typography variant="caption" color="success.main">{t('live')}</Typography>
          )}
          {Array.isArray(onlineUserIds) && onlineUserIds.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {t('online')}: {[order.buyerId, order.sellerId]
                .filter((id) => onlineUserIds.includes(id))
                .map((id) => (id === order.buyerId ? t('buyer') : t('seller')))
                .join(', ')}
            </Typography>
          )}
        </Box>

        {order.offer && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {isBuyer ? t('youAreBuying') : t('youAreSelling')}
            </Typography>
            <Typography variant="body1" fontWeight={600}>{order.offer.title}</Typography>
            {order.offer.offerType === 'ADENA' ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('qty')}: {formatAdena(Number(order.quantity ?? 0))} · {t('priceFor100kk')}: {Number(order.offer?.price ?? 0) * 100} {order.sellerCurrency}
                </Typography>
                {isBuyer && order.buyerAmount != null && (
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.5 }}>
                    {t('yourTotal')}: {Number(order.buyerAmount).toFixed(2)} {order.buyerCurrency}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('qty')}: {order.quantity} · {Number(order.sellerAmount ?? 0).toFixed(2)} {order.sellerCurrency} {t('total')}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {t('amountsFixedAtPurchase')}
            </Typography>
            {isSeller && order.sellerAmount != null && (
              <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 1 }}>
                {t('youReceive')}: {Number(order.sellerAmount).toFixed(2)} {order.sellerCurrency}
                {' — '}
                {order.transaction?.externalId ? t('toCard') : t('toBalance')}
              </Typography>
            )}
            {order.buyerCharacterNick && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {t('buyerInGameNick')}: {order.buyerCharacterNick}
              </Typography>
            )}
          </Box>
        )}

        {actionInfo && <Alert severity="info" sx={{ mb: 1 }} onClose={() => setActionInfo(null)}>{actionInfo}</Alert>}
        {actionError && <Alert severity="error" sx={{ mb: 1 }}>{actionError}</Alert>}

        {canSellerDeliver && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>{t('iTransferred')}</Typography>
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
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>{t('confirmReceiptOrDispute')}</Typography>
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

        {order.status === 'COMPLETED' && (
          <Alert severity="success" sx={{ mb: 1 }}>Order completed. Seller has been paid.</Alert>
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
          <Alert severity="warning" sx={{ mb: 1 }}>{t('orderDisputed')}</Alert>
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
          <Alert severity="info" sx={{ mb: 1 }}>{t('viewingAsModerator')}</Alert>
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

        <Box
          sx={{
            flex: 1,
            minHeight: 300,
            maxHeight: '50vh',
            overflow: 'auto',
            border: '2px solid',
            borderColor: 'primary.light',
            borderRadius: 1.5,
            p: 2,
            mb: 2,
            bgcolor: 'background.paper',
            boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}08`,
          }}
        >
          {messages.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              {t('noMessages')}
            </Typography>
          )}
          {messages.map((msg) => {
            const myMessage = isMe(msg.senderId ?? msg.sender?.id);
            const otherUserId = order?.buyerId === currentUserId ? order?.sellerId : order?.buyerId;
            const otherRead = order?.orderReads?.find((r) => r.userId === otherUserId);
            const seen = myMessage && otherRead && msg.createdAt && new Date(otherRead.lastReadAt) >= new Date(msg.createdAt);
            return (
              <Box
                key={msg.id}
                sx={{
                  textAlign: myMessage ? 'right' : 'left',
                  mb: 1.5,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  {msg.sender?.nickname ?? msg.sender?.email ?? tCommon('user')}
                  {(msg.sender?.role === 'ADMIN' || msg.sender?.role === 'MODERATOR') && (
                    <Typography component="span" variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                      ({msg.sender?.role === 'ADMIN' ? t('adminBadge') : t('moderatorBadge')})
                    </Typography>
                  )}
                  {msg.createdAt && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, opacity: 0.9 }}>
                      · {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                  )}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    bgcolor: myMessage ? 'primary.main' : 'action.hover',
                    color: myMessage ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body2">{msg.text}</Typography>
                  {msg.attachments?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {msg.attachments.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                          <img src={att.url} alt="" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 4 }} />
                        </a>
                      ))}
                    </Box>
                  )}
                  {seen && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
                      {t('seen')}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        {sendError && <Alert severity="error" sx={{ mb: 1 }}>{sendError}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <IconButton color="secondary" onClick={() => fileInputRef.current?.click()} title={t('attachImage')}>
            <AttachFileIcon />
          </IconButton>
          <TextField
            placeholder={t('messagePlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            multiline
            maxRows={3}
            size="small"
            fullWidth
            variant="outlined"
          />
          <Button variant="contained" color="secondary" onClick={handleSend} disabled={sending}>
            {tCommon('send')}
          </Button>
        </Box>
        {files.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
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
      </Container>
    </Box>
  );
}
