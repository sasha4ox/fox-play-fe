'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { adminListAgents, adminAssignAgent, adminDemoteAgent } from '@/lib/api';

const PAGE_SIZE = 20;

export default function AdminAgentsPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);

  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionUserId, setActionUserId] = useState(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignId, setAssignId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    adminListAgents(token, { skip: page * PAGE_SIZE, take: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load agents'))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));

  const handleDemote = (userId) => {
    if (!token) return;
    setActionUserId(userId);
    adminDemoteAgent(userId, token)
      .then(() => load())
      .catch((e) => setError(e.message || 'Failed to demote'))
      .finally(() => setActionUserId(null));
  };

  const openAssign = () => {
    setAssignId('');
    setAssignError('');
    setAssignOpen(true);
  };

  const handleAssign = () => {
    const id = assignId.trim();
    if (!id || !token) return;
    setAssignLoading(true);
    setAssignError('');
    adminAssignAgent(id, token)
      .then(() => {
        setAssignOpen(false);
        load();
      })
      .catch((e) => setAssignError(e.message || 'Failed to assign'))
      .finally(() => setAssignLoading(false));
  };

  function serverLabel(agentServer) {
    const srv = agentServer.server;
    const variant = srv?.gameVariant;
    const game = variant?.game;
    return [game?.name, variant?.name, srv?.name].filter(Boolean).join(' — ');
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">{t('agents')}</Typography>
        <Button variant="contained" size="small" onClick={openAssign}>{t('assignAgent')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      ) : data.items.length === 0 ? (
        <Typography color="text.secondary">{t('noAgents')}</Typography>
      ) : (
        <>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>{t('usersEmail')}</TableCell>
                  <TableCell>{t('usersNickname')}</TableCell>
                  <TableCell>{t('status')}</TableCell>
                  <TableCell>{t('agentServers')}</TableCell>
                  <TableCell align="center">{t('agentCompleted')}</TableCell>
                  <TableCell align="right">{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((user) => {
                  const ap = user.agentProfile;
                  const servers = ap?.servers ?? [];
                  const completed = ap?._count?.safeTransfers ?? 0;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.nickname ?? '—'}</TableCell>
                      <TableCell>
                        {ap?.isOnline
                          ? <Chip size="small" color="success" label={t('agentOnline')} />
                          : <Chip size="small" variant="outlined" label={t('agentOffline')} />}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        {servers.length > 0
                          ? servers.map((s) => serverLabel(s)).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell align="center">{completed}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={actionUserId === user.id}
                          onClick={() => handleDemote(user.id)}
                        >
                          {actionUserId === user.id ? '…' : t('demoteAgent')}
                        </Button>
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

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('assignAgentDialogTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('assignAgentHint')}
          </Typography>
          {assignError && <Alert severity="error" sx={{ mb: 1 }}>{assignError}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label={t('userIdLabel')}
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAssign(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!assignId.trim() || assignLoading} onClick={handleAssign}>
            {assignLoading ? '…' : t('assignAgent')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
