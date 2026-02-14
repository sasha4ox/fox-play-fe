'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useTranslations } from 'next-intl';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

export default function OrdersPlaceholderPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('Orders');
  const [paymentFeedback, setPaymentFeedback] = useState(null);
  const [paymentDeclinedReasonCode, setPaymentDeclinedReasonCode] = useState(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const reasonCode = searchParams.get('reasonCode');
    if (payment === 'success' || payment === 'declined' || payment === 'processing') {
      setPaymentFeedback(payment);
    }
    if (reasonCode) setPaymentDeclinedReasonCode(reasonCode);
  }, [searchParams]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 4,
      }}
    >
      {paymentFeedback === 'success' && (
        <Alert severity="success" onClose={() => setPaymentFeedback(null)} sx={{ mb: 2, maxWidth: 400 }}>
          {t('paymentSuccessMessage')}
        </Alert>
      )}
      {paymentFeedback === 'processing' && (
        <Alert severity="info" onClose={() => setPaymentFeedback(null)} sx={{ mb: 2, maxWidth: 400 }}>
          {t('paymentProcessingMessage')}
        </Alert>
      )}
      {paymentFeedback === 'declined' && (
        <Alert
          severity="warning"
          onClose={() => {
            setPaymentFeedback(null);
            setPaymentDeclinedReasonCode(null);
          }}
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {t('paymentDeclinedMessage')}
          {paymentDeclinedReasonCode && (
            <Typography component="span" display="block" variant="body2" sx={{ mt: 1 }}>
              {t('paymentDeclinedCode')}: {paymentDeclinedReasonCode}
              {paymentDeclinedReasonCode === '1113' && ` (${t('paymentDeclinedCode1113')})`}
              {paymentDeclinedReasonCode === '1109' && ` (${t('paymentDeclinedCode1109')})`}
              {paymentDeclinedReasonCode === '1115' && ` (${t('paymentDeclinedCode1115')})`}
            </Typography>
          )}
        </Alert>
      )}
      <ChatBubbleOutlineIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" fontWeight={500}>
        {t('selectConversation') || 'Select a conversation'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('orderChatsHint')}
      </Typography>
    </Box>
  );
}
