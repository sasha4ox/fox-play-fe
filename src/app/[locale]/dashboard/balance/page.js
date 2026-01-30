'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Link from 'next/link';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { updatePreferredCurrency, getDepositInfo } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';

const CURRENCIES = ['UAH', 'RUB', 'USD', 'EUR'];

export default function BalancePage() {
  const router = useRouter();
  const locale = useLocale();
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const {
    profile,
    preferredCurrency,
    primaryBalance,
    balances,
    loading,
    error,
    refetch,
  } = useProfile();

  const [currencyChanging, setCurrencyChanging] = useState(false);
  const [depositInfo, setDepositInfo] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);

  const handleCurrencyChange = async (event) => {
    const newCurrency = event.target.value;
    if (!token || newCurrency === preferredCurrency) return;
    setCurrencyChanging(true);
    try {
      await updatePreferredCurrency(newCurrency, token);
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setCurrencyChanging(false);
    }
  };

  const handleLoadDepositInfo = () => {
    if (!token) return;
    setDepositLoading(true);
    getDepositInfo(token)
      .then((info) => setDepositInfo(info))
      .catch(() => setDepositInfo(null))
      .finally(() => setDepositLoading(false));
  };

  if (!isAuth) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Balance
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Please log in to view and manage your balance.
          </Alert>
          <Button
            variant="contained"
            color="secondary"
            sx={{ mt: 2, textTransform: 'none' }}
            onClick={() => openLoginModal(() => router.push(`${base}/dashboard/balance`))}
          >
            Log in
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <Link href={`${base}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            ← Dashboard
          </MuiLink>
        </Link>

        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          Your balance
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && profile && (
          <>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }} size="small">
              <InputLabel>Display currency</InputLabel>
              <Select
                value={preferredCurrency ?? ''}
                label="Display currency"
                onChange={handleCurrencyChange}
                disabled={currencyChanging}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Available
                </Typography>
                <Typography variant="h4" fontWeight={600} color="text.primary">
                  {primaryBalance ? primaryBalance.available.toFixed(2) : '0.00'} {preferredCurrency ?? ''}
                </Typography>
                {primaryBalance && primaryBalance.frozen > 0 && (
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Frozen: {primaryBalance.frozen.toFixed(2)} {preferredCurrency}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {balances.length > 1 && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Other currencies
              </Typography>
            )}
            {balances
              .filter((b) => b.currency !== preferredCurrency)
              .map((b) => (
                <Box key={b.currency} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {b.currency}
                  </Typography>
                  <Typography variant="body2">
                    {Number(b.available).toFixed(2)} (frozen: {Number(b.frozen).toFixed(2)})
                  </Typography>
                </Box>
              ))}

            <Typography variant="h6" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
              Upload balance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              For MVP we use Binance to add funds. After payment, your balance will be updated manually.
            </Typography>
            {!depositInfo ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleLoadDepositInfo}
                disabled={depositLoading}
                sx={{ textTransform: 'none' }}
              >
                {depositLoading ? 'Loading…' : 'Deposit via Binance'}
              </Button>
            ) : (
              <Card variant="outlined" sx={{ mt: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {depositInfo.instructions}
                  </Typography>
                  <Button
                    component="a"
                    href={depositInfo.payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    color="secondary"
                    sx={{ textTransform: 'none', mt: 1 }}
                  >
                    Open Binance Pay
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
