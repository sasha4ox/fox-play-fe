'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { useAuthStore } from '@/store/authStore';
import { getAdminCurrencyRates, setAdminCurrencyRates } from '@/lib/api';

const CURRENCIES = ['EUR', 'UAH', 'RUB'];

export default function AdminCurrencyRatesPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eur, setEur] = useState('');
  const [uah, setUah] = useState('');
  const [rub, setRub] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canEdit = data?.source === 'fallback' || data?.source === 'manual';

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminCurrencyRates(token)
      .then((res) => {
        setData(res);
        if (res?.ratesPerUsd) {
          setEur(String(res.ratesPerUsd.EUR ?? ''));
          setUah(String(res.ratesPerUsd.UAH ?? ''));
          setRub(String(res.ratesPerUsd.RUB ?? ''));
        }
      })
      .catch((e) => setError(e?.message || 'Failed to load currency rates'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token || !canEdit) return;
    const eurNum = Number(eur);
    const uahNum = Number(uah);
    const rubNum = Number(rub);
    if (!Number.isFinite(eurNum) || eurNum <= 0 || !Number.isFinite(uahNum) || uahNum <= 0 || !Number.isFinite(rubNum) || rubNum <= 0) {
      setSaveError('EUR, UAH and RUB must be positive numbers.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await setAdminCurrencyRates({ EUR: eurNum, UAH: uahNum, RUB: rubNum }, token);
      setData(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e?.message || 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('currencyRates')}
      </Typography>

      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      ) : data ? (
        <>
          <TableContainer component={Card} sx={{ mb: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('currencyRatesSource')}</TableCell>
                  <TableCell align="right">{t('perOneUsd')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Chip label={data.source} size="small" color={data.source === 'fallback' || data.source === 'manual' ? 'warning' : 'default'} />
                  </TableCell>
                  <TableCell align="right">—</TableCell>
                </TableRow>
                {CURRENCIES.map((ccy) => (
                  <TableRow key={ccy}>
                    <TableCell>{ccy}</TableCell>
                    <TableCell align="right">{data.ratesPerUsd?.[ccy] != null ? Number(data.ratesPerUsd[ccy]).toFixed(4) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {canEdit ? (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('manualRatesHint')}
                </Typography>
                {saveError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                    {saveError}
                  </Alert>
                )}
                {saveSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {t('ratesUpdated')}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
                  <TextField
                    label="EUR"
                    type="number"
                    inputProps={{ min: 0.01, step: 0.01 }}
                    value={eur}
                    onChange={(e) => setEur(e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                  />
                  <TextField
                    label="UAH"
                    type="number"
                    inputProps={{ min: 0.01, step: 0.01 }}
                    value={uah}
                    onChange={(e) => setUah(e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                  />
                  <TextField
                    label="RUB"
                    type="number"
                    inputProps={{ min: 0.01, step: 0.01 }}
                    value={rub}
                    onChange={(e) => setRub(e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                  />
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? '…' : t('setManualRates')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">{t('manualRatesOnlyWhenFallback')}</Alert>
          )}
        </>
      ) : null}
    </Container>
  );
}
