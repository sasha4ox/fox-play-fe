'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useAuthStore } from '@/store/authStore';
import { getRecentServers } from '@/lib/api';

const MAX_DISPLAY = 3;

/**
 * Displays the last 3 recently visited servers on every page (when logged in).
 */
export default function RecentServersBar() {
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const [recentServers, setRecentServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Dashboard');

  useEffect(() => {
    if (!token) {
      setRecentServers([]);
      return;
    }
    setLoading(true);
    getRecentServers(token)
      .then((list) => setRecentServers(Array.isArray(list) ? list.slice(0, MAX_DISPLAY) : []))
      .catch(() => setRecentServers([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return null;

  if (loading) {
    return (
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
        <Skeleton variant="rounded" height={24} width="60%" />
      </Box>
    );
  }

  if (recentServers.length === 0) return null;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: 'action.hover',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {t('recentServers')}:
      </Typography>
      {recentServers.map((s, i) => (
        <Box key={s.serverId} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          {i > 0 && (
            <Typography component="span" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              ·
            </Typography>
          )}
          <Link
            href={`/${locale}/game/${s.gameId}/${s.variantId}/${s.serverId}/offers`}
            style={{ textDecoration: 'none' }}
          >
            <Typography
              component="span"
              variant="body2"
              fontWeight={500}
              sx={{
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {s.gameName} → {s.variantName} → {s.serverName}
            </Typography>
          </Link>
        </Box>
      ))}
    </Box>
  );
}
