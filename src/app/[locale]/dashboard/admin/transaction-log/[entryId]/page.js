'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { getAdminTransactionLogEntryDetail } from '@/lib/api';

const TYPE_KEYS = {
  order: 'typeOrder',
  deposit: 'typeDeposit',
  withdrawal_card: 'typeWithdrawalCard',
  withdrawal_crypto: 'typeWithdrawalCrypto',
  withdrawal_iban: 'typeWithdrawalIban',
  withdrawal_legacy: 'typeWithdrawalLegacy',
};

function formatUser(user) {
  if (!user) return '—';
  return user.nickname ? `${user.nickname} (${user.email})` : user.email;
}

export default function AdminTransactionLogDetailPage() {
  const locale = useLocale();
  const { entryId } = useParams();
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !entryId) return;
    setLoading(true);
    setError(null);
    getAdminTransactionLogEntryDetail(token, entryId)
      .then(setDetail)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token, entryId]);

  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');

  if (error) {
    return (
      <Box>
        <Button component={Link} href={`/${locale}/dashboard/admin/transaction-log`} size="small" sx={{ mb: 2 }}>
          ← {t('backToTransactionLog')}
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (loading || !detail) {
    return (
      <Box>
        <Skeleton width={120} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Button component={Link} href={`/${locale}/dashboard/admin/transaction-log`} size="small" sx={{ mb: 2 }}>
        ← {t('backToTransactionLog')}
      </Button>

      <Typography variant="h5" sx={{ mb: 1 }}>
        {t('transactionDetails')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('transactionDetailsConfidential')}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('type')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t(TYPE_KEYS[detail.type] ?? 'typeOrder')}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('date')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {formatDate(detail.date)}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('description')}
        </Typography>
        {detail.type === 'order' && detail.sellerAmount != null && detail.sellerCurrency && detail.exchangeRate ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('paymentSummary')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              <Typography variant="body1">
                <Box component="span" sx={{ color: 'text.secondary' }}>{t('paid')} </Box>
                <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>{detail.amount} {detail.currency}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('offerWasIn')} <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{detail.sellerCurrency}</Box>
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                <Box component="span" color="text.secondary">1 {detail.sellerCurrency} = </Box>
                <Box component="span" sx={{ color: 'text.primary' }}>{detail.exchangeRate}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('amountInCurrency', { currency: detail.sellerCurrency })} <Box component="span" sx={{ color: 'text.primary', fontFamily: 'monospace' }}>{detail.sellerAmount}</Box>
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                <Box component="span" color="text.secondary">{detail.sellerAmount} × {detail.exchangeRate} = </Box>
                <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>{detail.amount}</Box>
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {detail.method}{detail.orderNumber ? ` · ${t('orderRef')} #${detail.orderNumber}` : ''}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {detail.description}
          </Typography>
        )}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {detail.type === 'order' ? t('buyerNickname') + ' / ' + t('sellerNickname') : t('user')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {detail.type === 'order'
            ? `${formatUser(detail.buyer)} → ${formatUser(detail.seller)}`
            : formatUser(detail.user)}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('amount')} / {t('currency')} / {t('method')} / {t('status')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {detail.amount} {detail.currency} · {detail.method} · {detail.status}
        </Typography>
        {detail.processedBy && (
          <>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('processedBy')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {detail.processedBy}
            </Typography>
          </>
        )}
        {detail.referenceType === 'order' && (
          <>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('reference')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <Link href={`/${locale}/dashboard/orders/${detail.referenceId}`} target="_blank" rel="noopener">
                {detail.orderNumber || detail.referenceId}
              </Link>
            </Typography>
          </>
        )}
      </Paper>

      {detail.cardDetails && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('paymentDetailsCard')}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('cardNumber')}
          </Typography>
          <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace' }}>
            {detail.cardDetails.cardNumber}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
            {t('cardholder')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {detail.cardDetails.cardHolderName}
          </Typography>
          {detail.cardDetails.buyerCardLast4 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('buyerCardLast4')}
              </Typography>
              <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace' }}>
                ****{detail.cardDetails.buyerCardLast4}
              </Typography>
            </>
          )}
        </Paper>
      )}

      {detail.cryptoDetails && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('paymentDetailsCrypto')}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('cryptoWallet')}
          </Typography>
          <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {detail.cryptoDetails.walletAddress}
          </Typography>
        </Paper>
      )}

      {detail.ibanDetails && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('paymentDetailsIban')}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('iban')}
          </Typography>
          <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {detail.ibanDetails.iban}
          </Typography>
          {detail.ibanDetails.bicSwift && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('bicSwift')}
              </Typography>
              <Typography variant="body1">{detail.ibanDetails.bicSwift}</Typography>
            </>
          )}
          {(detail.ibanDetails.beneficiaryName || detail.ibanDetails.accountName) && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('beneficiary')}
              </Typography>
              <Typography variant="body1">
                {detail.ibanDetails.beneficiaryName ?? detail.ibanDetails.accountName}
                {detail.ibanDetails.beneficiaryFirstName != null || detail.ibanDetails.beneficiaryLastName != null
                  ? ` ${detail.ibanDetails.beneficiaryFirstName ?? ''} ${detail.ibanDetails.beneficiaryLastName ?? ''}`.trim()
                  : ''}
              </Typography>
            </>
          )}
          {detail.ibanDetails.beneficiaryTin && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('beneficiaryTin')}
              </Typography>
              <Typography variant="body1">{detail.ibanDetails.beneficiaryTin}</Typography>
            </>
          )}
          {detail.ibanDetails.okpo && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('okpo')}
              </Typography>
              <Typography variant="body1">{detail.ibanDetails.okpo}</Typography>
            </>
          )}
          {detail.ibanDetails.description && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('description')}
              </Typography>
              <Typography variant="body1">{detail.ibanDetails.description}</Typography>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
