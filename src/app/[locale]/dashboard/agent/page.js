'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import {
  getAgentOrders,
  setAgentOnline,
  getAgentProfile,
  claimSafeTransfer,
  confirmItemReceived,
  confirmItemDelivered,
  flagSafeTransfer,
  adminListSafeTransfers,
  adminReassignSafeTransfer,
} from '@/lib/api';

const STATUS_COLORS = {
  PENDING_ITEM: 'warning',
  ITEM_RECEIVED: 'info',
  ITEM_DELIVERED: 'success',
  COMPLETED: 'default',
  FLAGGED: 'error',
  CANCELLED: 'default',
};

function elapsed(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function OrderCard({ st, t, locale, isAdmin, onAction }) {
  const order = st.order;
  const offer = order?.offer;
  const server = offer?.server;
  const variant = server?.gameVariant;
  const game = variant?.game;
  const serverLabel = game ? `${game.name} — ${variant?.name} — ${server?.name}` : server?.name || '';

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">{serverLabel}</Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>{offer?.title || 'Order'} — {offer?.offerType}</Typography>
          </Box>
          <Chip label={st.status} color={STATUS_COLORS[st.status] || 'default'} size="small" />
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2"><strong>{t('dealValue')}:</strong> ${order?.sellerAmount ?? '—'}</Typography>
          <Typography variant="body2" color="success.main"><strong>{t('youEarn')}:</strong> ${st.agentEarning?.toFixed(2)}</Typography>
          <Typography variant="body2"><strong>{t('buyer')}:</strong> {order?.buyer?.nickname || '—'} ({order?.buyerCharacterNick || '—'})</Typography>
          <Typography variant="body2"><strong>{t('elapsed')}:</strong> {elapsed(st.createdAt)}</Typography>
        </Box>

        {isAdmin && st.agentProfile && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>{t('agent')}:</strong> {st.agentProfile?.user?.nickname || st.agentProfile?.user?.email || t('unassigned')}
          </Typography>
        )}

        {st.status === 'FLAGGED' && st.flagReason && (
          <Alert severity="error" sx={{ mt: 1 }}><strong>{t('flagReason')}:</strong> {st.flagReason}</Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" href={`/${locale}/dashboard/orders/${order?.id}`}>{t('viewOrder')}</Button>

          {!isAdmin && !st.agentProfileId && st.status === 'PENDING_ITEM' && (
            <Button size="small" variant="contained" color="primary" onClick={() => onAction('claim', st.id)}>{t('claim')}</Button>
          )}
          {!isAdmin && st.agentProfileId && st.status === 'PENDING_ITEM' && (
            <Button size="small" variant="contained" color="info" onClick={() => onAction('item-received', st.id)}>{t('confirmReceived')}</Button>
          )}
          {!isAdmin && st.status === 'ITEM_RECEIVED' && (
            <Button size="small" variant="contained" color="success" onClick={() => onAction('item-delivered', st.id)}>{t('confirmDelivered')}</Button>
          )}
          {!isAdmin && st.agentProfileId && st.status !== 'COMPLETED' && st.status !== 'CANCELLED' && (
            <Button size="small" variant="outlined" color="error" onClick={() => onAction('flag', st.id)}>{t('flagIssue')}</Button>
          )}

          {isAdmin && (
            <>
              <Button size="small" variant="outlined" color="warning" onClick={() => onAction('unassign', st.id)}>{t('unassign')}</Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AgentPanelPage() {
  const t = useTranslations('AgentPanel');
  const locale = useLocale();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { profile } = useProfile();
  const role = profile?.role || user?.role;
  const isAdmin = role === 'ADMIN';
  const isAgent = role === 'AGENT';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [tab, setTab] = useState(0);
  const [incoming, setIncoming] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [adminTransfers, setAdminTransfers] = useState([]);
  const [flagDialog, setFlagDialog] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [claimDialog, setClaimDialog] = useState(null);
  const [claimNick, setClaimNick] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      if (isAgent) {
        const [prof, orders] = await Promise.all([
          getAgentProfile(token),
          getAgentOrders(token),
        ]);
        setAgentProfile(prof);
        setIncoming(orders.incoming || []);
        setMyOrders(orders.myOrders || []);
      } else if (isAdmin) {
        const data = await adminListSafeTransfers({}, token);
        setAdminTransfers(data.items || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, isAgent, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleOnline = async () => {
    if (!token || !agentProfile) return;
    try {
      const res = await setAgentOnline(!agentProfile.isOnline, token);
      setAgentProfile((p) => ({ ...p, isOnline: res.isOnline }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAction = async (action, safeTransferId) => {
    if (action === 'flag') {
      setFlagDialog(safeTransferId);
      setFlagReason('');
      return;
    }
    if (action === 'claim') {
      setClaimDialog(safeTransferId);
      setClaimNick('');
      return;
    }
    setActionLoading(true);
    try {
      if (action === 'item-received') await confirmItemReceived(safeTransferId, token);
      else if (action === 'item-delivered') await confirmItemDelivered(safeTransferId, token);
      else if (action === 'unassign') await adminReassignSafeTransfer(safeTransferId, null, token);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimSubmit = async () => {
    if (!claimDialog || !claimNick.trim()) return;
    setActionLoading(true);
    try {
      await claimSafeTransfer(claimDialog, claimNick.trim(), token);
      setClaimDialog(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagDialog || !flagReason.trim()) return;
    setActionLoading(true);
    try {
      await flagSafeTransfer(flagDialog, flagReason.trim(), token);
      setFlagDialog(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAgent && !isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Access denied. Agent or Admin role required.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('title')}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isAgent && agentProfile && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {agentProfile.isOnline ? t('onlineToggle') : t('offlineToggle')}
          </Typography>
          <Switch checked={agentProfile.isOnline} onChange={handleToggleOnline} color="success" />
          {agentProfile.servers?.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('servers')}: {agentProfile.servers.map((s) => s.server?.name).filter(Boolean).join(', ')}
            </Typography>
          )}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {isAgent && (
            <>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label={`${t('incoming')} (${incoming.length})`} />
                <Tab label={`${t('myOrders')} (${myOrders.length})`} />
              </Tabs>

              {tab === 0 && (
                incoming.length === 0
                  ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t('noIncoming')}</Typography>
                  : incoming.map((st) => <OrderCard key={st.id} st={st} t={t} locale={locale} isAdmin={false} onAction={handleAction} />)
              )}
              {tab === 1 && (
                myOrders.length === 0
                  ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t('noMyOrders')}</Typography>
                  : myOrders.map((st) => <OrderCard key={st.id} st={st} t={t} locale={locale} isAdmin={false} onAction={handleAction} />)
              )}
            </>
          )}

          {isAdmin && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>All Safe Transfers</Typography>
              {adminTransfers.filter((st) => st.status === 'FLAGGED').length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>{t('flagged')}</Typography>
                  {adminTransfers.filter((st) => st.status === 'FLAGGED').map((st) => (
                    <OrderCard key={st.id} st={st} t={t} locale={locale} isAdmin onAction={handleAction} />
                  ))}
                </Box>
              )}
              {adminTransfers.filter((st) => st.status !== 'FLAGGED').map((st) => (
                <OrderCard key={st.id} st={st} t={t} locale={locale} isAdmin onAction={handleAction} />
              ))}
              {adminTransfers.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t('noIncoming')}</Typography>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={!!flagDialog} onClose={() => setFlagDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('flagIssue')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder={t('flagReasonPlaceholder')}
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!flagReason.trim() || actionLoading} onClick={handleFlagSubmit}>
            {actionLoading ? <CircularProgress size={20} /> : t('flagIssue')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!claimDialog} onClose={() => setClaimDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('claimDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('enterYourNickHint')}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label={t('enterYourNick')}
            value={claimNick}
            onChange={(e) => setClaimNick(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialog(null)}>Cancel</Button>
          <Button variant="contained" color="primary" disabled={!claimNick.trim() || actionLoading} onClick={handleClaimSubmit}>
            {actionLoading ? <CircularProgress size={20} /> : t('claimDialogSubmit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
