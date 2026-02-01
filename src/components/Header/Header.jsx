'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Select from '@mui/material/Select';
import LocaleSwitcher from '@/components/LocaleSwitcher/LocaleSwitcher';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLoginModalStore } from '@/store/loginModalStore';
import { useProfile } from '@/hooks/useProfile';
import { updatePreferredCurrency } from '@/lib/api';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const CURRENCIES = ['USD', 'EUR', 'UAH', 'RUB'];

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = useTranslations('Header');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const { user, logout } = useAuthStore();
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { profile, primaryBalance, preferredCurrency, loading: profileLoading, refetch } = useProfile();
  const tCommon = useTranslations('Common');
  const displayName = profile?.nickname ?? user?.nickname ?? user?.email ?? tCommon('user');
  const avatarUrl = profile?.avatarUrl;
  const initial = (profile?.nickname || profile?.email || '?').charAt(0).toUpperCase();

  const [currencyChanging, setCurrencyChanging] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const listener = () => setSystemDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  const effectiveMode = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;

  const handleLogout = () => {
    setAnchorEl(null);
    setMobileOpen(false);
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

  const navLinks = [
    { href: base, label: t('home'), active: isHome },
    ...(isAuth
      ? [
          { href: `${base}/dashboard/orders`, label: t('chats'), active: pathname?.includes('/dashboard/orders') },
          { href: `${base}/dashboard/offers`, label: t('myOffers'), active: pathname?.includes('/dashboard/offers') },
          ...(profile?.role === 'ADMIN' || profile?.role === 'MODERATOR' || user?.role === 'ADMIN' || user?.role === 'MODERATOR'
            ? [{ href: `${base}/dashboard/admin/overview`, label: t('admin'), active: pathname?.includes('/dashboard/admin') }]
            : []),
        ]
      : []),
  ];

  const NavBlock = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {navLinks.map(({ href, label, active }) => (
        <Link key={href + label} href={href} style={{ textDecoration: 'none' }}>
          <Button
            sx={{
              color: 'text.primary',
              fontWeight: active ? 600 : 500,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {label}
          </Button>
        </Link>
      ))}
    </Box>
  );

  const BalanceBlock = () => {
    if (!isAuth) return null;
    if (profileLoading || currencyChanging) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="rounded" width={56} height={32} sx={{ flexShrink: 0 }} />
          <Skeleton variant="rounded" width={72} height={32} sx={{ flexShrink: 0 }} />
        </Box>
      );
    }
    if (!preferredCurrency) return null;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Select
          size="small"
          value={preferredCurrency}
          onChange={handleCurrencyChange}
          variant="outlined"
          MenuProps={{
            disableScrollLock: true,
            anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
          }}
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.875rem',
            minWidth: 56,
            bgcolor: 'action.hover',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiSelect-select': { py: 0.75, px: 1.25 },
          }}
        >
          {CURRENCIES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </Select>
        <Link
          href={`${base}/dashboard/balance`}
          style={{ textDecoration: 'none', color: 'inherit' }}
          title={t('balance')}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1.25,
              py: 0.75,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ whiteSpace: 'nowrap' }}>
              {(primaryBalance?.available ?? 0).toFixed(2)}
            </Typography>
          </Box>
        </Link>
      </Box>
    );
  };

  const UserMenu = () => {
    const open = Boolean(anchorEl);
    return (
      <>
        <IconButton
          onClick={(e) => {
            const el = e.currentTarget;
            setAnchorEl(el);
            const rect = el.getBoundingClientRect();
            const pad = 8;
            const menuWidth = 200;
            setMenuPosition({
              left: Math.max(pad, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - pad)),
              top: Math.max(pad, rect.bottom + pad),
            });
          }}
          sx={{ p: 0.5 }}
          aria-label={t('menu')}
        >
          <Avatar
            src={avatarUrl}
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'secondary.main',
              fontSize: '1rem',
            }}
          >
            {!avatarUrl ? initial : null}
          </Avatar>
        </IconButton>
        <Menu
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorReference="anchorPosition"
          anchorPosition={open ? { top: menuPosition.top, left: menuPosition.left } : undefined}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          PaperProps={{
            sx: { minWidth: 200, maxHeight: 'calc(100vh - 16px)', overflow: 'auto' },
          }}
          disableScrollLock
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {displayName}
            </Typography>
            {profile?.email && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {profile.email}
              </Typography>
            )}
          </Box>
          <Divider />
          <MenuItem component={Link} href={`${base}/dashboard/profile`} onClick={() => setAnchorEl(null)}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('profile')}</ListItemText>
          </MenuItem>
          <MenuItem component={Link} href={`${base}/dashboard/balance`} onClick={() => setAnchorEl(null)}>
            <ListItemIcon sx={{ minWidth: 36 }}>💰</ListItemIcon>
            <ListItemText>{t('balance')}</ListItemText>
          </MenuItem>
          <Divider />
          <Box sx={{ px: 2, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t('theme')}</Typography>
          </Box>
          <MenuItem onClick={() => { setThemeMode('light'); setAnchorEl(null); }}>
            <ListItemIcon><LightModeIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('themeLight')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setThemeMode('dark'); setAnchorEl(null); }}>
            <ListItemIcon><DarkModeIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('themeDark')}</ListItemText>
          </MenuItem>
          <Divider />
          <Box sx={{ px: 2, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t('language')}</Typography>
          </Box>
          <Box sx={{ px: 1, py: 0.5 }}>
            <LocaleSwitcher />
          </Box>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('logout')}</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };

  const drawer = (
    <Box sx={{ width: 280, pt: 2, pb: 2 }} role="presentation">
      <Box sx={{ px: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">{t('menu')}</Typography>
      </Box>
      {navLinks.map(({ href, label }) => (
        <Button
          key={href + label}
          component={Link}
          href={href}
          fullWidth
          sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }}
          onClick={() => setMobileOpen(false)}
        >
          {label}
        </Button>
      ))}
      {isAuth && (
        <>
          <Divider sx={{ my: 1 }} />
          <Button
            component={Link}
            href={`${base}/dashboard/balance`}
            fullWidth
            sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }}
            onClick={() => setMobileOpen(false)}
          >
            {t('balance')} · {(primaryBalance?.available ?? 0).toFixed(2)} {preferredCurrency || ''}
          </Button>
          <Button
            component={Link}
            href={`${base}/dashboard/profile`}
            fullWidth
            sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }}
            onClick={() => setMobileOpen(false)}
          >
            {t('profile')}
          </Button>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">{t('theme')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Button size="small" variant={themeMode === 'light' ? 'contained' : 'outlined'} onClick={() => setThemeMode('light')}>
                {t('themeLight')}
              </Button>
              <Button size="small" variant={themeMode === 'dark' ? 'contained' : 'outlined'} onClick={() => setThemeMode('dark')}>
                {t('themeDark')}
              </Button>
            </Box>
          </Box>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">{t('language')}</Typography>
            <Box sx={{ mt: 0.5 }}>
              <LocaleSwitcher />
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Button fullWidth sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }} onClick={handleLogout} startIcon={<LogoutIcon />}>
            {t('logout')}
          </Button>
        </>
      )}
      {!isAuth && (
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          sx={{ mx: 2, mt: 1 }}
          onClick={() => { setMobileOpen(false); openLoginModal(); }}
        >
          {t('login')}
        </Button>
      )}
    </Box>
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: 1, minHeight: { xs: 56, sm: 64 } }}>
        {isMobile && (
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setMobileOpen(true)} sx={{ mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
        )}
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
            {!isMobile && (
              <Typography variant="h6" component="span" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                {t('foxPlay')}
              </Typography>
            )}
          </Box>
        </Link>

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, justifyContent: 'center' }}>
            <NavBlock />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <BalanceBlock />
          {isAuth ? (
            <UserMenu />
          ) : (
            <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }} onClick={() => openLoginModal()}>
              {t('login')}
            </Button>
          )}
        </Box>
      </Toolbar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 } }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
