'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { alpha } from '@mui/material/styles';
import { getOrderStatusTextColor } from '@/lib/orderStatusColors';

const HEADER_BG = '#1a2332';
const LABEL_MUTED = '#8a99ad';
const NICK_HIGHLIGHT = '#4a90e2';
const AVATAR_BG = '#1B4332';

/**
 * @param {object} props
 * @param {string} props.locale
 * @param {boolean} props.isMobile
 * @param {string} props.backHref
 * @param {string} props.backAriaLabel
 * @param {boolean} props.isModerator
 * @param {boolean} props.isBuyer
 * @param {boolean} props.isSeller
 * @param {boolean} props.isAssignedAgent
 * @param {boolean} props.hasSafeTransfer
 * @param {object} props.order
 * @param {boolean} props.connected
 * @param {boolean} props.showReportButton
 * @param {() => void} props.onOpenReport
 * @param {boolean} props.sellerSafeTransferWaitingAgentNick
 * @param {import('next-intl').Translator} props.t
 * @param {import('next-intl').Translator} props.tOrders
 * @param {import('next-intl').Translator} props.tSales
 */
export default function OrderChatHeader({
  locale,
  isMobile,
  backHref,
  backAriaLabel,
  isModerator,
  isBuyer,
  isSeller,
  isAssignedAgent,
  hasSafeTransfer,
  order,
  connected,
  showReportButton,
  onOpenReport,
  sellerSafeTransferWaitingAgentNick,
  t,
  tOrders,
  tSales,
  otherParty,
  otherName,
}) {
  const showBuyerNickInMetadata =
    Boolean(order?.buyerCharacterNick) &&
    (!hasSafeTransfer || !isSeller || isModerator || isAssignedAgent);

  const paymentMeta = (() => {
    if (order?.paymentMethod === 'CRYPTO_MANUAL' && order?.orderCryptoPayment?.adminConfirmedReceivedAt) {
      return {
        label:
          order.orderCryptoPayment.paymentConfirmedBy === 'AUTO'
            ? t('paymentConfirmedAutomatically')
            : t('paymentConfirmedByAdmin'),
        hash: order.orderCryptoPayment.cryptoTransactionHash ?? null,
      };
    }
    if (order?.paymentMethod === 'IBAN_MANUAL' && order?.orderIbanPayment?.adminConfirmedReceivedAt) {
      return { label: t('paymentConfirmedByAdmin'), hash: null };
    }
    if (order?.paymentMethod === 'CARD_MANUAL' && order?.orderCardPayment?.adminConfirmedReceivedAt) {
      return { label: t('paymentConfirmedByAdmin'), hash: null };
    }
    return null;
  })();

  const showMetadataRow = showBuyerNickInMetadata || paymentMeta;

  const statusColor = getOrderStatusTextColor(order?.status, order?.paymentMethod);
  const statusLabel = order?.status ? tSales(`status_${order.status}`) : '—';
  const isCompactStaffHeader = isModerator;

  const offerLine = order?.offer?.title || tOrders('offer');

  const identityColumn = (() => {
    if (isModerator) {
      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, flexShrink: 0, flexWrap: 'wrap' }}>
            <Typography
              variant="caption"
              sx={{
                color: LABEL_MUTED,
                border: '1px solid rgba(138,153,173,0.3)',
                borderRadius: 1,
                px: 0.75,
                py: 0.1,
                fontWeight: 600,
              }}
            >
              {t('headerRoleStaff')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Link
                href={order?.buyer?.id ? `/${locale}/user/${order.buyer.id}` : '#'}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Avatar
                  src={order?.buyer?.avatarUrl}
                  alt={order?.buyer?.nickname || ''}
                  sx={{ width: { xs: 34, md: 36 }, height: { xs: 34, md: 36 }, bgcolor: AVATAR_BG }}
                >
                  {(order?.buyer?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: LABEL_MUTED }} display="block">
                  {t('buyer')}
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                  {order?.buyer?.nickname ?? '—'}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: LABEL_MUTED, flexShrink: 0 }}>
              ·
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Link
                href={order?.seller?.id ? `/${locale}/user/${order.seller.id}` : '#'}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Avatar
                  src={order?.seller?.avatarUrl}
                  alt={order?.seller?.nickname || ''}
                  sx={{ width: { xs: 34, md: 36 }, height: { xs: 34, md: 36 }, bgcolor: AVATAR_BG }}
                >
                  {(order?.seller?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: LABEL_MUTED }} display="block">
                  {t('seller')}
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                  {order?.seller?.nickname ?? '—'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </>
      );
    }

    if (isAssignedAgent) {
      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Link
                href={order?.buyer?.id ? `/${locale}/user/${order.buyer.id}` : '#'}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Avatar
                  src={order?.buyer?.avatarUrl}
                  alt={order?.buyer?.nickname || ''}
                  sx={{ width: 40, height: 40, bgcolor: AVATAR_BG }}
                >
                  {(order?.buyer?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#fff', maxWidth: { xs: 120, sm: 200 } }}>
                {order?.buyer?.nickname ?? '—'}
              </Typography>
            </Box>
            <Typography sx={{ color: LABEL_MUTED }}>·</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Link
                href={order?.seller?.id ? `/${locale}/user/${order.seller.id}` : '#'}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Avatar
                  src={order?.seller?.avatarUrl}
                  alt={order?.seller?.nickname || ''}
                  sx={{ width: 40, height: 40, bgcolor: AVATAR_BG }}
                >
                  {(order?.seller?.nickname || '?').charAt(0).toUpperCase()}
                </Avatar>
              </Link>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#fff', maxWidth: { xs: 120, sm: 200 } }}>
                {order?.seller?.nickname ?? '—'}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: LABEL_MUTED, display: 'block', mt: 0.5 }}>
            {`${t('headerRoleAgent')} · ${offerLine}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            {connected ? t('online') : t('live')}
          </Typography>
        </>
      );
    }

    return (
      <>
        <Link href={otherParty?.id ? `/${locale}/user/${otherParty.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
          <Avatar
            src={otherParty?.avatarUrl}
            alt={otherParty?.nickname || otherParty?.email || ''}
            sx={{ width: { xs: 40, md: 44 }, height: { xs: 40, md: 44 }, bgcolor: AVATAR_BG }}
          >
            {(otherName || '?').charAt(0).toUpperCase()}
          </Avatar>
        </Link>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {otherParty?.id ? (
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
              component={Link}
              href={`/${locale}/user/${otherParty.id}`}
              sx={{ color: '#fff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {otherName}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: '#fff' }}>
              {otherName}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: LABEL_MUTED, display: 'block' }}>
            {isBuyer && `${t('seller')} · ${offerLine}`}
            {isSeller && `${t('buyer')} · ${offerLine}`}
          </Typography>
          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            {connected ? t('online') : t('live')}
          </Typography>
          {hasSafeTransfer && isSeller && order.safeTransfer.agentCharacterNick && (
            <Box
              sx={{
                mt: 0.75,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                border: '2px solid',
                borderColor: 'info.main',
                bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
                maxWidth: '100%',
              }}
            >
              <Typography variant="caption" sx={{ color: LABEL_MUTED, display: 'block', fontWeight: 600 }}>
                {t('agentInGameNick')}
              </Typography>
              <Typography variant="body2" color="info.light" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                {order.safeTransfer.agentCharacterNick}
              </Typography>
            </Box>
          )}
          {hasSafeTransfer && isSeller && sellerSafeTransferWaitingAgentNick && (
            <Typography variant="caption" color="warning.light" fontWeight={700} sx={{ mt: 0.5 }} display="block">
              {t('safeTransferWaitingAgentNick')}
            </Typography>
          )}
        </Box>
      </>
    );
  })();

  return (
    <Box
      sx={{
        flexShrink: 0,
        bgcolor: HEADER_BG,
        color: '#fff',
        borderBottom: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          justifyContent: 'space-between',
          gap: { xs: 1.1, md: isCompactStaffHeader ? 1.5 : 2 },
          py: { xs: isCompactStaffHeader ? 0.9 : 1.25, md: isCompactStaffHeader ? 1.15 : 1.5 },
          px: { xs: 1.5, md: 2 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, md: 1.5 }, flex: 1, minWidth: 0 }}>
          {isMobile && (
            <IconButton component={Link} href={backHref} size="small" sx={{ flexShrink: 0, color: '#fff', mt: 0.25 }} aria-label={backAriaLabel}>
              <ArrowBackIcon />
            </IconButton>
          )}
          {!isModerator && !isAssignedAgent && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>{identityColumn}</Box>
          )}
          {(isModerator || isAssignedAgent) && <Box sx={{ flex: 1, minWidth: 0 }}>{identityColumn}</Box>}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'stretch', md: 'flex-end' },
            justifyContent: 'flex-start',
            gap: isCompactStaffHeader ? 0.65 : 1,
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            minWidth: { md: 200 },
          }}
        >
          {showReportButton && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReportProblemOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={onOpenReport}
              sx={{
                alignSelf: { xs: 'stretch', md: 'flex-end' },
                color: 'error.light',
                borderColor: alpha('#f44336', 0.45),
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'error.light',
                  bgcolor: alpha('#f44336', 0.08),
                },
              }}
            >
              {t('report.button')}
            </Button>
          )}
          <Chip
            size="small"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor }} />
                {statusLabel}
              </Box>
            }
            sx={{
              alignSelf: { xs: 'flex-start', md: 'flex-end' },
              height: isCompactStaffHeader ? 30 : 28,
              fontWeight: isCompactStaffHeader ? 800 : 700,
              fontSize: isCompactStaffHeader ? '0.84rem' : '0.8125rem',
              bgcolor: alpha(statusColor, isCompactStaffHeader ? 0.28 : 0.2),
              color: statusColor,
              border: `1px solid ${alpha(statusColor, 0.45)}`,
              maxWidth: '100%',
              '& .MuiChip-label': { px: 1, overflow: 'visible' },
            }}
          />
          <Typography variant="caption" sx={{ color: LABEL_MUTED, fontWeight: 600, textAlign: { xs: 'left', md: 'right' }, width: '100%' }} noWrap>
            {offerLine}
          </Typography>
        </Box>
      </Box>

      {showMetadataRow && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: isCompactStaffHeader ? 1 : 1.5, md: isCompactStaffHeader ? 1.4 : 2 },
            rowGap: isCompactStaffHeader ? 0.6 : 1,
            px: { xs: 1.5, md: 2 },
            py: isCompactStaffHeader ? 0.85 : 1.25,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {showBuyerNickInMetadata && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <ScheduleOutlinedIcon sx={{ fontSize: isCompactStaffHeader ? 16 : 18, color: LABEL_MUTED, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: LABEL_MUTED, fontSize: '0.8125rem' }}>
                {t('buyerNickShort')}
                {': '}
                <Box component="span" sx={{ color: NICK_HIGHLIGHT, fontWeight: 700 }}>
                  {order.buyerCharacterNick}
                </Box>
              </Typography>
            </Box>
          )}
          {showBuyerNickInMetadata && paymentMeta && (
            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: 1,
                height: 16,
                borderLeft: '1px solid rgba(255,255,255,0.2)',
                alignSelf: 'center',
              }}
            />
          )}
          {paymentMeta && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
              <DescriptionOutlinedIcon sx={{ fontSize: isCompactStaffHeader ? 16 : 18, color: LABEL_MUTED, flexShrink: 0, mt: 0.15 }} />
              <Typography variant="body2" sx={{ color: LABEL_MUTED, fontSize: '0.8125rem' }}>
                {paymentMeta.label}
                {paymentMeta.hash && (
                  <>
                    {' · '}
                    <MuiLink
                      href={`https://tronscan.org/#/transaction/${paymentMeta.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      sx={{ fontSize: 'inherit', color: NICK_HIGHLIGHT }}
                    >
                      {t('viewOnTronscan')}
                    </MuiLink>
                  </>
                )}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
