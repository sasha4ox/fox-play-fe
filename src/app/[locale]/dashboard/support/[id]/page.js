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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { getSupportConversation, sendSupportConversationMessage } from '@/lib/api';

export default function SupportConversationPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Support');
  const conversationId = params?.id;
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?.userId);
  const [convo, setConvo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !token) return;
    setLoading(true);
    setError(null);
    getSupportConversation(conversationId, token)
      .then(setConvo)
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [conversationId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]);

  const handleSend = async () => {
    const trimmed = (text || '').trim();
    if (!trimmed || !conversationId || !token) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendSupportConversationMessage(conversationId, { text: trimmed }, token);
      setConvo((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), { ...msg, senderId: userId, sender: { role: 'USER' } }],
            }
          : prev
      );
      setText('');
    } catch (err) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">{t('loginRequired')}</Alert>
      </Container>
    );
  }

  if (loading && !convo) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!convo) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{t('notFound')}</Alert>
        <Button component={Link} href={`/${locale}/dashboard/support`} sx={{ mt: 2 }}>
          {t('backToList')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button component={Link} href={`/${locale}/dashboard/support`} size="small">
          ← {t('backToList')}
        </Button>
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {t('conversationTitle')} — Order {convo.orderNumber ?? (convo.orderId ? `${convo.orderId.slice(0, 8)}…` : '—')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Link href={convo.orderLink} target="_blank" rel="noopener">
          {convo.orderLink}
        </Link>
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          maxHeight: 400,
          overflow: 'auto',
          mb: 2,
          bgcolor: 'action.hover',
        }}
      >
        {(convo.messages || []).map((m) => (
          <Box
            key={m.id}
            sx={{
              mb: 1.5,
              alignSelf: m.senderId === userId ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              ml: m.sender?.role === 'ADMIN' || m.sender?.role === 'MODERATOR' ? 0 : 'auto',
              mr: m.senderId === userId ? 0 : 'auto',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {m.sender?.role === 'ADMIN' || m.sender?.role === 'MODERATOR'
                ? t('support')
                : t('you')}{' '}
              · {new Date(m.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
              {m.text}
            </Typography>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <TextField
        fullWidth
        multiline
        minRows={2}
        placeholder={t('replyPlaceholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <Button
        variant="contained"
        onClick={handleSend}
        disabled={sending || !(text || '').trim()}
        sx={{ mt: 1.5 }}
      >
        {sending ? '…' : t('send')}
      </Button>
    </Container>
  );
}
