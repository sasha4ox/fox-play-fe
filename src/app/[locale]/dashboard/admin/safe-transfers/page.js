'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import {
  adminListSafeTransfers,
  adminListAgents,
  adminReassignSafeTransfer,
} from '@/lib/api';

const PAGE_SIZE = 20;

/** Mirrors Prisma `SafeTransferStatus` (keep in sync with backend). */
const SAFE_TRANSFER_STATUSES = [
  'PENDING_ITEM',
  'ITEM_RECEIVED',
  'ITEM_DELIVERED',
  'COMPLETED',
  'FLAGGED',
  'CANCELLED',
];

const STATUS_COLORS = {
  PENDING_ITEM: 'warning',
  ITEM_RECEIVED: 'info',
  ITEM_DELIVERED: 'success',
  COMPLETED: 'default',
  FLAGGED: 'error',
  CANCELLED: 'default',
};

function serverLabel(st) {
  const order = st.order;
  const offer = order?.offer;
  const server = offer?.server;
  const variant = server?.gameVariant;
  const game = variant?.game;
  return game ? `${game.name} — ${variant?.name} — ${server?.name}` : server?.name || '—';
}

export default function AdminSafeTransfersPage() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const { profile } = useProfile();
  const isStrictAdmin = profile?.role === 'ADMIN';

  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentOptions, setAgentOptions] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [agentProfileFilter, setAgentProfileFilter] = useState('');
  const [serverIdFilter, setServerIdFilter] = useState('');

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignStId, setReassignStId] = useState(null);
  const [reassignAgentProfileId, setReassignAgentProfileId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [actionStId, setActionStId] = useState(null);

  useEffect(() => {
    if (!token || !isStrictAdmin) return;
    adminListAgents(token, { take: 100 })
      .then((res) => setAgentOptions(res.items || []))
      .catch(() => {});
  }, [token, isStrictAdmin]);

  const load = useCallback(() => {
    if (!token || !isStrictAdmin) return;
    setLoading(true);
    setError(null);
    const params = {
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    };
    if (statusFilter) params.status = statusFilter;
    if (agentProfileFilter) params.agentProfileId = agentProfileFilter;
    const sid = serverIdFilter.trim();
    if (sid) params.serverId = sid;

    adminListSafeTransfers(params, token)
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token, isStrictAdmin, page, statusFilter, agentProfileFilter, serverIdFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, agentProfileFilter]);

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));

  const openReassign = (st) => {
    setReassignStId(st.id);
    setReassignAgentProfileId(st.agentProfileId || '');
    setReassignOpen(true);
  };

  const handleReassignSubmit = () => {
    if (!reassignStId || !reassignAgentProfileId || !token) return;
    setReassignLoading(true);
    adminReassignSafeTransfer(reassignStId, reassignAgentProfileId, token)
      .then(() => {
        setReassignOpen(false);
        load();
      })
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setReassignLoading(false));
  };

  const handleUnassign = (safeTransferId) => {
    if (!token) return;
    setActionStId(safeTransferId);
    adminReassignSafeTransfer(safeTransferId, null, token)
      .then(() => load())
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setActionStId(null));
  };

  if (!isStrictAdmin) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mb: 2 }}>{t('safeTransfersAdminOnly')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" sx={{ mb: 2 }}>{t('adminSafeTransfers')}</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('safeTransferStatusFilter')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('safeTransferStatusFilter')}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">{t('filterAll')}</MenuItem>
            {SAFE_TRANSFER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t('safeTransferAgentFilter')}</InputLabel>
          <Select
            value={agentProfileFilter}
            label={t('safeTransferAgentFilter')}
            onChange={(e) => setAgentProfileFilter(e.target.value)}
          >
            <MenuItem value="">{t('filterAll')}</MenuItem>
            {agentOptions.map((u) => {
              const apId = u.agentProfile?.id;
              if (!apId) return null;
              return (
                <MenuItem key={apId} value={apId}>
                  {u.nickname || u.email}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label={t('safeTransferServerFilter')}
          value={serverIdFilter}
          onChange={(e) => setServerIdFilter(e.target.value)}
          onBlur={() => setPage(0)}
          sx={{ minWidth: 260 }}
          placeholder="UUID"
        />
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
      ) : data.items.length === 0 ? (
        <Typography color="text.secondary">{t('safeTransferNoItems')}</Typography>
      ) : (
        <>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>{t('status')}</TableCell>
                  <TableCell>{t('orderId')}</TableCell>
                  <TableCell>{t('offerTitle')}</TableCell>
                  <TableCell>{t('safeTransferLocation')}</TableCell>
                  <TableCell>{t('safeTransferColumnAgent')}</TableCell>
                  <TableCell align="right">{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((st) => {
                  const order = st.order;
                  const agentUser = st.agentProfile?.user;
                  return (
                    <TableRow key={st.id}>
                      <TableCell>
                        <Chip size="small" label={st.status} color={STATUS_COLORS[st.status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          component={Link}
                          href={`/${locale}/dashboard/orders/${order?.id}`}
                        >
                          {order?.id?.slice(0, 8)}…
                        </Button>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>{order?.offer?.title ?? '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>{serverLabel(st)}</TableCell>
                      <TableCell>
                        {agentUser
                          ? (agentUser.nickname || agentUser.email || '—')
                          : t('safeTransferUnassigned')}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openReassign(st)}
                            disabled={actionStId === st.id}
                          >
                            {t('safeTransferReassign')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleUnassign(st.id)}
                            disabled={actionStId === st.id}
                          >
                            {actionStId === st.id ? '…' : t('unassign')}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">{t('total')}: {data.total}</Typography>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t('previousPage')}</Button>
                <Typography variant="body2">{t('page')} {page + 1} {t('of')} {totalPages}</Typography>
                <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>{t('nextPage')}</Button>
              </Box>
            )}
          </Box>
        </>
      )}

      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('safeTransferReassignDialogTitle')}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t('safeTransferSelectAgent')}</InputLabel>
            <Select
              value={reassignAgentProfileId}
              label={t('safeTransferSelectAgent')}
              onChange={(e) => setReassignAgentProfileId(e.target.value)}
            >
              {agentOptions.map((u) => {
                const apId = u.agentProfile?.id;
                if (!apId) return null;
                return (
                  <MenuItem key={apId} value={apId}>
                    {u.nickname || u.email}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            disabled={!reassignAgentProfileId || reassignLoading}
            onClick={handleReassignSubmit}
          >
            {reassignLoading ? '…' : t('safeTransferReassign')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
