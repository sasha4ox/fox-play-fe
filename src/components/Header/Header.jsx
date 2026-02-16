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
import { useSellerNewOrder } from '@/hooks/useSellerNewOrder';
import { updatePreferredCurrency, getUnreadCount } from '@/lib/api';
import {
  playNewOrderSound,
  playNewMessageSound,
  unlockAudio,
  setupUnlockOnFirstClick,
  getMessageSoundEnabled,
  setMessageSoundEnabled,
  getSoldSoundEnabled,
  setSoldSoundEnabled,
} from '@/lib/notificationSound';
import Badge from '@mui/material/Badge';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import Image from 'next/image';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [sellerOrderCount, setSellerOrderCount] = useState(0);
  const [messageSoundOn, setMessageSoundOn] = useState(true);
  const [soldSoundOn, setSoldSoundOn] = useState(true);
  const [logoError, setLogoError] = useState(false);
  useEffect(() => {
    setMessageSoundOn(getMessageSoundEnabled());
    setSoldSoundOn(getSoldSoundEnabled());
  }, []);
  const refetchUnread = () => {
    if (!token) return;
    getUnreadCount(token)
      .then((data) => {
        setUnreadCount(data?.count ?? 0);
        setSellerOrderCount(data?.sellerOrderCount ?? 0);
      })
      .catch(() => {});
  };
  const handleOrderActivity = () => refetchUnread();
  const handleNewMessage = () => {
    refetchUnread();
    playNewMessageSound();
  };
  const { lastNewOrder, clearNewOrder } = useSellerNewOrder(isAuth ? token : null, {
    onOrderActivity: handleOrderActivity,
    onNewMessage: handleNewMessage,
  });
  useEffect(() => {
    if (lastNewOrder) {
      playNewOrderSound();
      refetchUnread();
    }
  }, [lastNewOrder]);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [systemDark, setSystemDark] = useState(false);
  const handleMessageSoundToggle = (e) => {
    const checked = e.target.checked;
    setMessageSoundOn(checked);
    setMessageSoundEnabled(checked);
  };
  const handleSoldSoundToggle = (e) => {
    const checked = e.target.checked;
    setSoldSoundOn(checked);
    setSoldSoundEnabled(checked);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const listener = () => setSystemDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const cleanup = setupUnlockOnFirstClick();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  }, []);
  const effectiveMode = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    setLogoError(false);
  }, [effectiveMode]);

  useEffect(() => {
    if (!isAuth || !token) {
      setUnreadCount(0);
      setSellerOrderCount(0);
      return;
    }
    getUnreadCount(token)
      .then((data) => {
        setUnreadCount(data?.count ?? 0);
        setSellerOrderCount(data?.sellerOrderCount ?? 0);
      })
      .catch(() => {
        setUnreadCount(0);
        setSellerOrderCount(0);
      });
    const interval = setInterval(() => {
      getUnreadCount(token)
        .then((data) => {
          setUnreadCount(data?.count ?? 0);
          setSellerOrderCount(data?.sellerOrderCount ?? 0);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuth, token, pathname]);

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

  const isHome = !pathname || pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`;

  const navLinks = [
    { href: base, label: t('home'), active: isHome },
    ...(isAuth
      ? [
          { href: `${base}/dashboard/orders`, label: t('chats'), active: pathname?.includes('/dashboard/orders'), badge: unreadCount },
          { href: `${base}/dashboard/offers`, label: t('myOffers'), active: pathname?.includes('/dashboard/offers') },
          { href: `${base}/dashboard/balance`, label: t('balance'), active: pathname?.includes('/dashboard/balance') },
          { href: `${base}/dashboard/sales`, label: t('mySales'), active: pathname?.includes('/dashboard/sales'), badge: sellerOrderCount },
          ...(profile?.role === 'ADMIN' || profile?.role === 'MODERATOR' || user?.role === 'ADMIN' || user?.role === 'MODERATOR'
            ? [{ href: `${base}/dashboard/admin/overview`, label: t('admin'), active: pathname?.includes('/dashboard/admin') }]
            : []),
        ]
      : []),
  ];

  const NavBlock = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      {navLinks.map(({ href, label, active, badge }) => (
        <Link key={href + label} href={href} style={{ textDecoration: 'none' }}>
          <Badge
            badgeContent={badge ?? 0}
            color="error"
            invisible={!(badge > 0)}
            sx={{
              '& .MuiBadge-badge': {
                right: 1,
                top: 2,
                fontSize: '0.65rem',
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <Button
              size="small"
              sx={{
                color: active ? 'primary.main' : 'text.secondary',
                fontWeight: active ? 600 : 500,
                fontSize: '0.8125rem',
                px: 1.25,
                py: 0.5,
                minWidth: 0,
                borderRadius: 2,
                bgcolor: active ? 'action.selected' : 'transparent',
                '&:hover': {
                  bgcolor: active ? 'action.selected' : 'action.hover',
                  color: active ? 'primary.main' : 'text.primary',
                },
              }}
            >
              {label}
            </Button>
          </Badge>
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
            unlockAudio();
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
            <Typography variant="caption" color="text.secondary">{t('sounds')}</Typography>
          </Box>
          <MenuItem component="div" sx={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <ListItemText primary={t('soundMessageReceived')} primaryTypographyProps={{ variant: 'body2' }} />
              <Switch size="small" checked={messageSoundOn} onChange={handleMessageSoundToggle} onClick={(e) => e.stopPropagation()} />
            </Box>
          </MenuItem>
          <MenuItem component="div" sx={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <ListItemText primary={t('soundSoldItem')} primaryTypographyProps={{ variant: 'body2' }} />
              <Switch size="small" checked={soldSoundOn} onChange={handleSoldSoundToggle} onClick={(e) => e.stopPropagation()} />
            </Box>
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
    <Box sx={{ width: 280, pt: 2, pb: 3, px: 0, pr: 2, maxHeight: '100vh', overflowY: 'auto', overflowX: 'hidden' }} role="presentation">
      <Box sx={{ px: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">{t('menu')}</Typography>
      </Box>
      {navLinks.map(({ href, label, badge }) => {
        const count = badge ?? 0
        return (
          <Button
            key={href + label}
            component={Link}
            href={href}
            fullWidth
            sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }}
            onClick={() => setMobileOpen(false)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{label}</span>
              {count > 0 && (
                <Box
                  component="span"
                  sx={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {count > 99 ? '99+' : count}
                </Box>
              )}
            </Box>
          </Button>
        )
      })}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">{t('language')}</Typography>
        <Box sx={{ mt: 0.5 }}>
          <LocaleSwitcher />
        </Box>
      </Box>
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
            <Typography variant="caption" color="text.secondary">{t('sounds')}</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">{t('soundMessageReceived')}</Typography>
                <Switch size="small" checked={messageSoundOn} onChange={handleMessageSoundToggle} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">{t('soundSoldItem')}</Typography>
                <Switch size="small" checked={soldSoundOn} onChange={handleSoldSoundToggle} />
              </Box>
            </Box>
          </Box>
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
          <Divider sx={{ my: 1 }} />
          <Button fullWidth sx={{ justifyContent: 'flex-start', px: 2, py: 1.5 }} onClick={handleLogout} startIcon={<LogoutIcon />}>
            {t('logout')}
          </Button>
        </>
      )}
      {!isAuth && (
        <>
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
          <Divider sx={{ my: 1 }} />
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            sx={{ mx: 2, mt: 1 }}
            onClick={() => { setMobileOpen(false); openLoginModal(); }}
          >
            {t('login')}
          </Button>
        </>
      )}
    </Box>
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: '100%',
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
            {logoError ? (
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
                    fontSize: 16,
                  }}
                >
                  FP
                </Box>
                {!isMobile && (
                  <Typography variant="h6" component="span" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                    {t('foxPlay')}
                  </Typography>
                )}
              </Box>
            ) : (
              <Image
                src={effectiveMode === 'dark' ? '/images/logo-purple-horizontal.png' : '/images/logo-orange-horizontal.png'}
                alt="FoxyPlay"
                width={isMobile ? 120 : 140}
                height={isMobile ? 28 : 32}
                style={{ objectFit: 'contain' }}
                unoptimized
                onError={() => setLogoError(true)}
              />
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
            <>
              {!isMobile && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => setThemeMode(effectiveMode === 'dark' ? 'light' : 'dark')}
                    aria-label={effectiveMode === 'dark' ? t('themeLight') : t('themeDark')}
                    sx={{ color: 'text.secondary' }}
                  >
                    {effectiveMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </IconButton>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocaleSwitcher />
                  </Box>
                </>
              )}
              <Button size="small" variant="outlined" color="secondary" sx={{ textTransform: 'none' }} onClick={() => openLoginModal()}>
                {t('login')}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>

      {/* New order notification bar – visible in header */}
      {lastNewOrder && (
        <Alert
          severity="success"
          variant="filled"
          onClose={clearNewOrder}
          sx={{
            mx: 1,
            mb: 1,
            alignItems: 'center',
            '& .MuiAlert-message': { flex: 1 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" component="span" sx={{ color: 'inherit' }}>
              {t('newOrderNotification', { title: lastNewOrder.offerTitle, qty: lastNewOrder.quantity })}
            </Typography>
            <Button
              component={Link}
              href={lastNewOrder?.orderId ? `${base}/dashboard/orders/${lastNewOrder.orderId}` : base}
              size="small"
              variant="outlined"
              color="inherit"
              onClick={clearNewOrder}
              sx={{ textTransform: 'none', borderColor: 'rgba(255,255,255,0.7)', color: 'inherit' }}
            >
              {t('openChat')}
            </Button>
          </Box>
        </Alert>
      )}

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, maxHeight: '100vh' } }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
