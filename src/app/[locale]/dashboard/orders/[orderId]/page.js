'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
import {
  getOrderById,
  getOrderMessages,
  sendOrderMessage,
  markOrderDelivered,
  completeOrder as apiCompleteOrder,
  openDispute,
} from '@/lib/api';
import { useOrderSocket } from '@/hooks/useOrderSocket';

export default function OrderChatPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const orderId = params?.orderId;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
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
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);
  const [deliverProofFiles, setDeliverProofFiles] = useState([]);
  const deliverProofInputRef = useRef(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const disputeFileInputRef = useRef(null);

  const { connected, lastMessage, onlineUserIds } = useOrderSocket(orderId, token);

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
    if (!lastMessage) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === lastMessage.id)) return prev;
      return [...prev, lastMessage];
    });
  }, [lastMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      // Message is added via socket (single source of truth) to avoid duplicate display
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const currentUserId = user?.id ?? user?.userId;
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
      setActionError('Please attach at least one image as proof of transfer.');
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

  const handleOpenDispute = async () => {
    if (!orderId || !token) return;
    const reason = (disputeReason || '').trim();
    if (!reason) {
      setActionError('Please enter a reason for the dispute.');
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
      setActionError(err.message || 'Failed to open dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
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
        <Container maxWidth="sm">
          <Alert severity="error">{error || 'Order not found.'}</Alert>
          <Button component={Link} href={`/${locale}/dashboard/orders`} sx={{ mt: 2 }}>
            ← My orders
          </Button>
        </Container>
      </Box>
    );
  }

  const isMe = (senderId) => currentUserId && senderId === currentUserId;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 2, px: 2, display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link href={`/${locale}/dashboard/orders`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 1 }}>
            ← Chats
          </MuiLink>
        </Link>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          Order chat
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            Status: <strong>{order.status}</strong>
          </Typography>
          {connected && (
            <Typography variant="caption" color="success.main">● Live</Typography>
          )}
          {Array.isArray(onlineUserIds) && onlineUserIds.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              · Online: {[order.buyerId, order.sellerId]
                .filter((id) => onlineUserIds.includes(id))
                .map((id) => (id === order.buyerId ? 'Buyer' : 'Seller'))
                .join(', ')}
            </Typography>
          )}
        </Box>

        {order.offer && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {isBuyer ? 'You are buying' : 'You are selling'}
            </Typography>
            <Typography variant="body1" fontWeight={600}>{order.offer.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Qty: {order.quantity}
              {order.offer.offerType === 'ADENA' ? ` · ${Number(order.offer?.price ?? 0)} ${order.sellerCurrency} per unit` : ` · ${Number(order.sellerAmount ?? 0).toFixed(2)} ${order.sellerCurrency} total`}
              {' '}(amounts fixed at purchase)
            </Typography>
            {isBuyer && order.buyerAmount != null && (
              <Typography variant="caption" color="text.secondary" display="block">
                Your total: {Number(order.buyerAmount).toFixed(2)} {order.buyerCurrency} (fixed at purchase)
              </Typography>
            )}
            {order.buyerCharacterNick && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Buyer in-game nick: {order.buyerCharacterNick}
              </Typography>
            )}
          </Box>
        )}

        {actionError && <Alert severity="error" sx={{ mb: 1 }}>{actionError}</Alert>}

        {canSellerDeliver && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>I transferred items / adena</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Upload proof (screenshot of transaction). At least one image is required.
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
                {deliverSubmitting ? 'Sending…' : 'Confirm delivered'}
              </Button>
            </Box>
          </Box>
        )}

        {canBuyerCompleteOrDispute && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" gutterBottom>Confirm receipt or open dispute</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={handleComplete}
                disabled={completeSubmitting}
              >
                {completeSubmitting ? 'Completing…' : 'I received it — Complete'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setDisputeDialogOpen(true)}
              >
                I didn&apos;t receive it — Open dispute
              </Button>
            </Box>
          </Box>
        )}

        {order.status === 'COMPLETED' && (
          <Alert severity="success" sx={{ mb: 1 }}>Order completed. Seller has been paid.</Alert>
        )}
        {order.status === 'DISPUTED' && (
          <Alert severity="warning" sx={{ mb: 1 }}>This order is in dispute.</Alert>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 300,
            maxHeight: '50vh',
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            mb: 2,
            bgcolor: 'background.paper',
          }}
        >
          {messages.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              No messages yet. Say hello!
            </Typography>
          )}
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                textAlign: isMe(msg.senderId ?? msg.sender?.id) ? 'right' : 'left',
                mb: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                {msg.sender?.nickname ?? msg.sender?.email ?? 'User'}
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
                  bgcolor: isMe(msg.senderId ?? msg.sender?.id) ? 'primary.main' : 'action.hover',
                  color: isMe(msg.senderId ?? msg.sender?.id) ? 'primary.contrastText' : 'text.primary',
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
              </Box>
            </Box>
          ))}
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
          <IconButton color="secondary" onClick={() => fileInputRef.current?.click()} title="Attach image">
            <AttachFileIcon />
          </IconButton>
          <TextField
            placeholder="Message..."
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
            Send
          </Button>
        </Box>
        {files.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {files.length} image(s) attached
          </Typography>
        )}

        <Dialog open={disputeDialogOpen} onClose={() => setDisputeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Open dispute</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If you did not receive the items/adena, describe the issue and attach evidence (screenshots). At least one image is required.
            </Typography>
            <TextField
              label="Reason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe what went wrong"
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
              {disputeFiles.length ? `${disputeFiles.length} image(s)` : 'Attach evidence image(s)'}
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisputeDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleOpenDispute} disabled={disputeSubmitting || !disputeReason.trim() || disputeFiles.length === 0}>
              {disputeSubmitting ? 'Submitting…' : 'Open dispute'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
