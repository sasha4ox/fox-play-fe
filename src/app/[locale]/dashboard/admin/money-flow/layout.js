'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

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

  return (
    <Box>
      <Tabs
        value={tabValue}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 48 }}
      >
        {subRoutes.map((r) => (
          <Tab
            key={r.path || 'settings'}
            component={Link}
            href={r.path ? `${base}/${r.path}` : base}
            label={t(r.labelKey)}
            sx={{ textTransform: 'none' }}
          />
        ))}
      </Tabs>
      {children}
    </Box>
  );
}
