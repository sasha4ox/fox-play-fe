'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { getAdminDisputes, resolveDispute } from '@/lib/api';

export default function AdminDisputesPage() {
  const locale = useLocale();
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState({ disputes: [], total: 0 });
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [verdictDialog, setVerdictDialog] = useState({ open: false, disputeId: null, action: null });
  const [verdict, setVerdict] = useState('');
  const [verdictError, setVerdictError] = useState(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminDisputes(token, { status: statusFilter || undefined, take: 100 })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load disputes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, statusFilter]);

  const openVerdictDialog = (disputeId, action) => {
    setVerdictDialog({ open: true, disputeId, action });
    setVerdict('');
    setVerdictError(null);
  };

  const closeVerdictDialog = () => {
    setVerdictDialog({ open: false, disputeId: null, action: null });
    setVerdict('');
    setVerdictError(null);
  };

  const handleResolveSubmit = () => {
    const trimmed = (verdict || '').trim();
    if (!trimmed) {
      setVerdictError(t('verdictRequired'));
      return;
    }
    if (!token || !verdictDialog.disputeId || !verdictDialog.action) return;
    setResolvingId(verdictDialog.disputeId);
    setVerdictError(null);
    resolveDispute(verdictDialog.disputeId, { action: verdictDialog.action, verdict: trimmed }, token)
      .then(() => {
        closeVerdictDialog();
        load();
      })
      .catch((e) => {
        setVerdictError(e.message || 'Failed to resolve');
      })
      .finally(() => setResolvingId(null));
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('disputes')}
      </Typography>
      <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
        <InputLabel>{t('status')}</InputLabel>
        <Select
          value={statusFilter}
          label={t('status')}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="">{t('all')}</MenuItem>
          <MenuItem value="OPEN">OPEN</MenuItem>
          <MenuItem value="RESOLVED">RESOLVED</MenuItem>
          <MenuItem value="REJECTED">REJECTED</MenuItem>
        </Select>
      </FormControl>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('disputeOrder')}</TableCell>
              <TableCell>{t('disputeReason')}</TableCell>
              <TableCell>{t('disputeOpenedBy')}</TableCell>
              <TableCell>{t('disputeBuyer')}</TableCell>
              <TableCell>{t('disputeSeller')}</TableCell>
              <TableCell>{t('status')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.disputes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>{t('noDisputes')}</TableCell>
              </TableRow>
            ) : (
              data.disputes?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/${locale}/dashboard/orders/${d.orderId}`} style={{ color: 'inherit' }}>
                      {d.orderId.slice(0, 8)}…
                    </Link>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{d.reason}</TableCell>
                  <TableCell>{d.openedByEmail ?? d.openedBy}</TableCell>
                  <TableCell>{d.order?.buyerEmail ?? '-'}</TableCell>
                  <TableCell>{d.order?.sellerEmail ?? '-'}</TableCell>
                  <TableCell>
                    <Chip label={d.status} size="small" color={d.status === 'OPEN' ? 'warning' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    {d.status === 'OPEN' && (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          color="primary"
                          disabled={resolvingId === d.id}
                          onClick={() => openVerdictDialog(d.id, 'RELEASE')}
                        >
                          {t('release')}
                        </Button>
                        <Button
                          size="small"
                          color="secondary"
                          disabled={resolvingId === d.id}
                          onClick={() => openVerdictDialog(d.id, 'REFUND')}
                        >
                          {t('refund')}
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      {!loading && data.total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('total')}: {data.total}
        </Typography>
      )}

      <Dialog open={verdictDialog.open} onClose={closeVerdictDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {verdictDialog.action === 'RELEASE' ? t('release') : t('refund')} — {t('verdictRequired')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('verdictHint')}
          </Typography>
          <TextField
            label={t('verdict')}
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            fullWidth
            multiline
            rows={3}
            required
            error={!!verdictError}
            helperText={verdictError}
            placeholder={t('verdictPlaceholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVerdictDialog}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleResolveSubmit} disabled={resolvingId || !verdict.trim()}>
            {resolvingId ? t('submitting') : (verdictDialog.action === 'RELEASE' ? t('release') : t('refund'))}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
