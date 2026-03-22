'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
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
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { useGames } from '@/hooks/useGames';
import { useAgentNewSafeTransfer } from '@/hooks/useAgentNewSafeTransfer';
import {
  getAgentOrders,
  setAgentOnline,
  getAgentProfile,
  addAgentServer,
  removeAgentServer,
  claimSafeTransfer,
  confirmItemReceived,
  confirmItemDelivered,
  flagSafeTransfer,
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

function OrderCard({ st, t, locale, onAction }) {
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

        {st.status === 'FLAGGED' && st.flagReason && (
          <Alert severity="error" sx={{ mt: 1 }}><strong>{t('flagReason')}:</strong> {st.flagReason}</Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" href={`/${locale}/dashboard/orders/${order?.id}`}>{t('viewOrder')}</Button>

          {!st.agentProfileId && st.status === 'PENDING_ITEM' && (
            <Button size="small" variant="contained" color="primary" onClick={() => onAction('claim', st.id)}>{t('claim')}</Button>
          )}
          {st.agentProfileId && st.status === 'PENDING_ITEM' && (
            <Button size="small" variant="contained" color="info" onClick={() => onAction('item-received', st.id)}>{t('confirmReceived')}</Button>
          )}
          {st.status === 'ITEM_RECEIVED' && (
            <Button size="small" variant="contained" color="success" onClick={() => onAction('item-delivered', st.id)}>{t('confirmDelivered')}</Button>
          )}
          {st.agentProfileId && st.status !== 'COMPLETED' && st.status !== 'CANCELLED' && (
            <Button size="small" variant="outlined" color="error" onClick={() => onAction('flag', st.id)}>{t('flagIssue')}</Button>
          )}

        </Box>
      </CardContent>
    </Card>
  );
}

export default function AgentPanelPage() {
  const t = useTranslations('AgentPanel');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { profile } = useProfile();
  const role = profile?.role || user?.role;
  const isAgent = role === 'AGENT';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [tab, setTab] = useState(0);
  const [incoming, setIncoming] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [stToastOpen, setStToastOpen] = useState(false);
  const [flagDialog, setFlagDialog] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [claimDialog, setClaimDialog] = useState(null);
  const [claimNick, setClaimNick] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add-server dialog
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [addServerError, setAddServerError] = useState('');
  const [addServerLoading, setAddServerLoading] = useState(false);
  const { games, loading: gamesLoading } = useGames();

  const assignedServerIds = useMemo(
    () => new Set((agentProfile?.servers ?? []).map((s) => s.server?.id).filter(Boolean)),
    [agentProfile?.servers],
  );

  const selectedGame = useMemo(() => games.find((g) => g.id === selectedGameId) ?? null, [games, selectedGameId]);
  const variants = selectedGame?.variants ?? [];
  const selectedVariant = useMemo(() => variants.find((v) => v.id === selectedVariantId) ?? null, [variants, selectedVariantId]);
  const servers = useMemo(
    () => (selectedVariant?.servers ?? []).filter((s) => !assignedServerIds.has(s.id)),
    [selectedVariant, assignedServerIds],
  );

  const handleOpenAddServer = () => {
    setSelectedGameId('');
    setSelectedVariantId('');
    setSelectedServerId('');
    setAddServerError('');
    setAddServerOpen(true);
  };

  const handleAddServer = async () => {
    if (!selectedServerId) return;
    setAddServerLoading(true);
    setAddServerError('');
    try {
      await addAgentServer(selectedServerId, token);
      setAddServerOpen(false);
      const prof = await getAgentProfile(token);
      setAgentProfile(prof);
    } catch (err) {
      if (err.message?.toLowerCase().includes('already')) {
        setAddServerError(t('serverAlreadyAdded'));
      } else {
        setAddServerError(err.message);
      }
    } finally {
      setAddServerLoading(false);
    }
  };

  const handleRemoveServer = async (serverId) => {
    try {
      await removeAgentServer(serverId, token);
      setAgentProfile((prev) => ({
        ...prev,
        servers: (prev?.servers ?? []).filter((s) => s.server?.id !== serverId && s.serverId !== serverId),
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const loadData = useCallback(async () => {
    if (!token || !isAgent) return;
    try {
      setLoading(true);
      setError(null);
      const [prof, orders] = await Promise.all([
        getAgentProfile(token),
        getAgentOrders(token),
      ]);
      setAgentProfile(prof);
      setIncoming(orders.incoming || []);
      setMyOrders(orders.myOrders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, isAgent]);

  useEffect(() => { loadData(); }, [loadData]);

  useAgentNewSafeTransfer(token, {
    enabled: isAgent,
    onNew: () => {
      loadData();
      setStToastOpen(true);
    },
  });

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

  if (!isAgent) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>{t('accessAgentOnly')}</Alert>
        {role === 'ADMIN' && (
          <Button component={Link} href={`/${locale}/dashboard/admin/safe-transfers`} variant="contained">
            {t('goToAdminSafeTransfers')}
          </Button>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('title')}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isAgent && agentProfile && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Online toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Switch checked={agentProfile.isOnline} onChange={handleToggleOnline} color="success" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {agentProfile.isOnline ? t('onlineToggle') : t('offlineToggle')}
                </Typography>
                <Typography variant="caption" color="text.secondary">{t('onlineHint')}</Typography>
              </Box>
            </Box>

            {/* My servers */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('myServers')}</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleOpenAddServer}>{t('addServer')}</Button>
              </Box>
              {(agentProfile.servers?.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{t('noServers')}</Typography>
              ) : (
                <List dense disablePadding>
                  {agentProfile.servers.map((as) => {
                    const srv = as.server;
                    const variant = srv?.gameVariant;
                    const game = variant?.game;
                    const label = [game?.name, variant?.name, srv?.name].filter(Boolean).join(' — ');
                    return (
                      <ListItem
                        key={as.id}
                        secondaryAction={
                          <IconButton edge="end" size="small" color="error" onClick={() => handleRemoveServer(srv?.id ?? as.serverId)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                        sx={{ pl: 0 }}
                      >
                        <ListItemText primary={label} />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={`${t('incoming')} (${incoming.length})`} />
            <Tab label={`${t('myOrders')} (${myOrders.length})`} />
          </Tabs>

          {tab === 0 && (
            incoming.length === 0
              ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t('noIncoming')}</Typography>
              : incoming.map((st) => <OrderCard key={st.id} st={st} t={t} locale={locale} onAction={handleAction} />)
          )}
          {tab === 1 && (
            myOrders.length === 0
              ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{t('noMyOrders')}</Typography>
              : myOrders.map((st) => <OrderCard key={st.id} st={st} t={t} locale={locale} onAction={handleAction} />)
          )}
        </>
      )}

      <Snackbar
        open={stToastOpen}
        autoHideDuration={4000}
        onClose={() => setStToastOpen(false)}
        message={t('newSafeTransferToast')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

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

      {/* Add server dialog */}
      <Dialog open={addServerOpen} onClose={() => setAddServerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addServerDialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {addServerError && <Alert severity="error" sx={{ mb: 1 }}>{addServerError}</Alert>}
          <TextField
            select
            fullWidth
            label={t('selectGame')}
            value={selectedGameId}
            onChange={(e) => { setSelectedGameId(e.target.value); setSelectedVariantId(''); setSelectedServerId(''); }}
            disabled={gamesLoading}
          >
            {games.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            fullWidth
            label={t('selectVariant')}
            value={selectedVariantId}
            onChange={(e) => { setSelectedVariantId(e.target.value); setSelectedServerId(''); }}
            disabled={!selectedGameId || variants.length === 0}
          >
            {variants.map((v) => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            fullWidth
            label={t('selectServer')}
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            disabled={!selectedVariantId || servers.length === 0}
          >
            {servers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddServerOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!selectedServerId || addServerLoading} onClick={handleAddServer}>
            {addServerLoading ? <CircularProgress size={20} /> : t('addServer')}
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
            inputProps={{ maxLength: 64 }}
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
