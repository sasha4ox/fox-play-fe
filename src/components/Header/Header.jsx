'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LocaleSwitcher from '@/components/LocaleSwitcher/LocaleSwitcher';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const { user, logout } = useAuthStore();
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { primaryBalance, preferredCurrency, loading: profileLoading } = useProfile();

  const handleLogout = () => {
    logout();
    router.push(base);
  };

  const isHome = !pathname || pathname === '/' || pathname === `/${locale}`;
  const isDashboard = pathname?.includes('/dashboard');

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
              Fox Play
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
              Home
            </Button>
          </Link>
          <Link href={`${base}/dashboard`} style={{ textDecoration: 'none' }}>
            <Button
              sx={{
                color: 'text.primary',
                fontWeight: isDashboard ? 600 : 500,
                '&:hover': { bgcolor: 'rgba(77, 61, 66, 0.08)' },
              }}
            >
              Dashboard
            </Button>
          </Link>
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
              {!profileLoading && primaryBalance != null && (
                <Link href={`${base}/dashboard/balance`} style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {primaryBalance.available.toFixed(2)} {preferredCurrency}
                  </Typography>
                </Link>
              )}
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                {user?.email ?? 'User'}
              </Typography>
              <Link href={`${base}/dashboard/balance`} style={{ textDecoration: 'none' }}>
                <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }}>
                  Balance
                </Button>
              </Link>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }} onClick={() => openLoginModal()}>
                Login
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
