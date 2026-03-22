'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/authStore';

const adminNav = [
  { href: 'overview', labelKey: 'overview' },
  { href: 'orders', labelKey: 'orders' },
  { href: 'disputes', labelKey: 'disputes' },
  { href: 'money-flow', labelKey: 'moneyFlow' },
  { href: 'currency-rates', labelKey: 'currencyRates' },
  { href: 'users', labelKey: 'users' },
  { href: 'agents', labelKey: 'agents' },
  { href: 'transaction-log', labelKey: 'transactionLog' },
  { href: 'games', labelKey: 'games' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { profile, loading } = useProfile();

  const role = profile?.role ?? user?.role;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  useEffect(() => {
    if (!token) {
      router.replace(`/${locale}/dashboard`);
      return;
    }
    if (!loading && role != null && !isAdmin) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [token, loading, role, isAdmin, locale, router]);

  const base = `/${locale}/dashboard/admin`;
  const currentTab = pathname?.replace(base, '').split('/').filter(Boolean)[0] || 'overview';

  if (!token) return null;
  if (!loading && role != null && !isAdmin) return null;
  if (loading && role == null) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton width={200} height={32} />
        <Skeleton width="100%" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 } }}>
        <Tabs
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ minHeight: 48 }}
        >
          {adminNav.map(({ href, labelKey }) => (
            <Tab
              key={href}
              value={href}
              label={t(labelKey)}
              component={Link}
              href={`${base}/${href}`}
              sx={{ textTransform: 'none' }}
            />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: 2 }}>{children}</Box>
    </Box>
  );
}
