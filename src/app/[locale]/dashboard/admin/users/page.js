'use client';

import { useState, useEffect } from 'react';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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
import { getAdminUsers, adminBanUser, adminUnbanUser } from '@/lib/api';

export default function AdminUsersPage() {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ users: [], total: 0 });
  const [bannedFilter, setBannedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionUserId, setActionUserId] = useState(null);
  const [banDialog, setBanDialog] = useState({ open: false, userId: null, email: null });
  const [banReason, setBanReason] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const banned =
      bannedFilter === 'banned' ? true : bannedFilter === 'notBanned' ? false : undefined;
    getAdminUsers(token, { take: 100, banned })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, bannedFilter]);

  const openBanDialog = (user) => {
    setBanDialog({ open: true, userId: user.id, email: user.email });
    setBanReason('');
  };

  const closeBanDialog = () => {
    setBanDialog({ open: false, userId: null, email: null });
    setBanReason('');
  };

  const handleBan = () => {
    if (!token || !banDialog.userId) return;
    setActionUserId(banDialog.userId);
    adminBanUser(banDialog.userId, { reason: banReason.trim() || undefined }, token)
      .then(() => {
        closeBanDialog();
        load();
      })
      .catch((e) => setError(e.message || 'Failed to ban'))
      .finally(() => setActionUserId(null));
  };

  const handleUnban = (userId) => {
    if (!token) return;
    setActionUserId(userId);
    adminUnbanUser(userId, token)
      .then(() => load())
      .catch((e) => setError(e.message || 'Failed to unban'))
      .finally(() => setActionUserId(null));
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('users')}
      </Typography>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, mb: 2 }} fullWidth>
        <InputLabel>{t('usersBanned')}</InputLabel>
        <Select
          value={bannedFilter}
          label={t('usersBanned')}
          onChange={(e) => setBannedFilter(e.target.value)}
        >
          <MenuItem value="">{t('filterAll')}</MenuItem>
          <MenuItem value="banned">{t('filterBanned')}</MenuItem>
          <MenuItem value="notBanned">{t('filterNotBanned')}</MenuItem>
        </Select>
      </FormControl>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ py: 2 }}>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
        </Box>
      ) : data.users.length === 0 ? (
        <Typography color="text.secondary">{t('noUsers')}</Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>{t('usersEmail')}</TableCell>
              <TableCell>{t('usersNickname')}</TableCell>
              <TableCell>{t('usersRole')}</TableCell>
              <TableCell>{t('usersBanned')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.nickname ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={user.role} variant="outlined" />
                </TableCell>
                <TableCell>
                  {user.bannedAt ? (
                    <Box>
                      <Chip size="small" color="error" label={t('usersBanned')} sx={{ mr: 0.5 }} />
                      {user.banReason && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                          {user.banReason}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  {user.bannedAt ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleUnban(user.id)}
                      disabled={actionUserId === user.id}
                    >
                      {actionUserId === user.id ? '…' : t('unban')}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => openBanDialog(user)}
                      disabled={actionUserId === user.id}
                    >
                      {t('ban')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TableContainer>
      )}
      {data.total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('total')}: {data.total}
        </Typography>
      )}

      <Dialog open={banDialog.open} onClose={closeBanDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('ban')}</DialogTitle>
        <DialogContent>
          {banDialog.email && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('usersEmail')}: {banDialog.email}
            </Typography>
          )}
          <TextField
            label={t('banReason')}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder={t('banReasonPlaceholder')}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBanDialog}>{tCommon('cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleBan} disabled={actionUserId === banDialog.userId}>
            {actionUserId === banDialog.userId ? '…' : t('ban')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
