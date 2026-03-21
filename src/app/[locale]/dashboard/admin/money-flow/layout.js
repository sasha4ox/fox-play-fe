'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import { useAuthStore } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { getAdminMoneyFlowAlertBadges } from '@/lib/api';

const subRoutes = [
  { path: '', labelKey: 'moneyFlowSettings' },
  { path: 'withdraw-from-users', labelKey: 'withdrawFromUsers' },
  { path: 'pending-receipts', labelKey: 'pendingReceiptConfirmation' },
];

export default function MoneyFlowLayout({ children }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Admin');
  const base = `/${locale}/dashboard/admin/money-flow`;
  const currentPath = pathname?.replace(base, '').split('/').filter(Boolean)[0] ?? '';
  const value = subRoutes.findIndex((r) => (r.path === '' ? currentPath === '' : r.path === currentPath));
  const tabValue = value >= 0 ? value : 0;

  const token = useAuthStore((s) => s.token);
  const { profile } = useProfile();
  const isAdminOrMod = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';
  const [badgePending, setBadgePending] = useState(0);
  const [badgeWithdraw, setBadgeWithdraw] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!isAdminOrMod || !token) {
      setBadgePending(0);
      setBadgeWithdraw(0);
      return undefined;
    }
    const load = () => {
      getAdminMoneyFlowAlertBadges(token)
        .then((d) => {
          setBadgePending(Number(d?.pendingReceiptsUnseen) || 0);
          setBadgeWithdraw(Number(d?.withdrawUnseen) || 0);
        })
        .catch(() => {
          setBadgePending(0);
          setBadgeWithdraw(0);
        });
    };
    load();
    const onRefetch = () => load();
    window.addEventListener('refetchAdminMoneyFlowBadges', onRefetch);
    return () => window.removeEventListener('refetchAdminMoneyFlowBadges', onRefetch);
  }, [isAdminOrMod, token, pathname]);

  return (
    <Box>
      <Tabs
        value={tabValue}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 48 }}
      >
        {subRoutes.map((r) => {
          const tabBadge =
            r.path === 'pending-receipts' ? badgePending : r.path === 'withdraw-from-users' ? badgeWithdraw : 0;
          return (
            <Tab
              key={r.path || 'settings'}
              component={Link}
              href={r.path ? `${base}/${r.path}` : base}
              label={
                <Badge color="error" badgeContent={tabBadge} invisible={tabBadge === 0}>
                  <span>{t(r.labelKey)}</span>
                </Badge>
              }
              sx={{ textTransform: 'none' }}
            />
          );
        })}
      </Tabs>
      {children}
    </Box>
  );
}
