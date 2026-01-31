'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LocaleSwitcher from '@/components/LocaleSwitcher/LocaleSwitcher';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { updatePreferredCurrency } from '@/lib/api';

const CURRENCIES = ['USD', 'EUR', 'UAH', 'RUB'];

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('Header');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const { user, logout } = useAuthStore();
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { profile, primaryBalance, preferredCurrency, loading: profileLoading, refetch } = useProfile();
  const tCommon = useTranslations('Common');
  const displayName = profile?.nickname ?? user?.nickname ?? user?.email ?? tCommon('user');
  const [currencyChanging, setCurrencyChanging] = useState(false);

  const handleLogout = () => {
    logout();
    router.push(base);
  };

  const handleCurrencyChange = async (e) => {
    const newCurrency = e.target.value;
    if (!token || newCurrency === preferredCurrency) return;
    setCurrencyChanging(true);
    try {
      await updatePreferredCurrency(newCurrency, token);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setCurrencyChanging(false);
    }
  };

  const isHome = !pathname || pathname === '/' || pathname === `/${locale}` || pathname?.includes('/dashboard');

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: '#EAe5de',
        color: '#352228',
        borderBottom: '1px solid rgba(114, 94, 101, 0.15)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
        <Link href={base} style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Home">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: 'secondary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              F
            </Box>
            <Typography variant="h6" component="span" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {t('foxPlay')}
            </Typography>
          </Box>
        </Link>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, justifyContent: 'center' }}>
          <Link href={base} style={{ textDecoration: 'none' }}>
            <Button
              sx={{
                color: 'text.primary',
                fontWeight: isHome ? 600 : 500,
                '&:hover': { bgcolor: 'rgba(77, 61, 66, 0.08)' },
              }}
            >
              {t('home')}
            </Button>
          </Link>
          {isAuth && (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Link href={`${base}/dashboard/orders`} style={{ textDecoration: 'none' }}>
                <Button
                  sx={{
                    color: 'text.primary',
                    fontWeight: pathname?.includes('/dashboard/orders') ? 600 : 500,
                    '&:hover': { bgcolor: 'rgba(77, 61, 66, 0.08)' },
                  }}
                >
                  {t('chats')}
                </Button>
              </Link>
              <Link href={`${base}/dashboard/offers`} style={{ textDecoration: 'none' }}>
                <Button
                  sx={{
                    color: 'text.primary',
                    fontWeight: pathname?.includes('/dashboard/offers') ? 600 : 500,
                    '&:hover': { bgcolor: 'rgba(77, 61, 66, 0.08)' },
                  }}
                >
                  {t('myOffers')}
                </Button>
              </Link>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.5,
              py: 0.5,
              bgcolor: 'rgba(255,255,255,0.5)',
              borderRadius: 1.25,
            }}
          >
            <LocaleSwitcher />
          </Box>

          {isAuth ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!profileLoading && preferredCurrency && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Select
                    size="small"
                    value={preferredCurrency}
                    onChange={handleCurrencyChange}
                    disabled={currencyChanging}
                    variant="standard"
                    disableUnderline
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: 52,
                      '& .MuiSelect-select': { py: 0.25 },
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                  <Link href={`${base}/dashboard/balance`} style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {(primaryBalance?.available ?? 0).toFixed(2)}
                    </Typography>
                  </Link>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                {displayName}
              </Typography>
              <Link href={`${base}/dashboard/balance`} style={{ textDecoration: 'none' }}>
                <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }}>
                  {t('balance')}
                </Button>
              </Link>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                {t('logout')}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }} onClick={() => openLoginModal()}>
                {t('login')}
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
