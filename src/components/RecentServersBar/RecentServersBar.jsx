'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAuthStore } from '@/store/authStore';
import { getRecentServers } from '@/lib/api';
import { componentClass } from '@/lib/componentPath';

const MAX_DISPLAY = 3;

/**
 * Displays the last 3 recently visited servers on every page (when logged in).
 * On mobile the list is collapsible via a chevron toggle.
 */
export default function RecentServersBar() {
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  // null = not yet fetched (loading), [] = fetched but empty, [...] = has data
  const [recentServers, setRecentServers] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('Dashboard');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!token) return;
    getRecentServers(token)
      .then((list) => setRecentServers(Array.isArray(list) ? list.slice(0, MAX_DISPLAY) : []))
      .catch(() => setRecentServers([]));
  }, [token]);

  if (!token) return null;

  if (recentServers === null) {
    return (
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: '2px solid', borderColor: 'divider' }}>
        <Skeleton variant="rounded" height={24} width="60%" />
      </Box>
    );
  }

  if (recentServers.length === 0) return null;

  const pathColors = ['primary.main', 'success.main', 'info.main'];

  const serverLinks = recentServers.map((s, i) => (
    <Box key={s.serverId} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {i > 0 && (
        <Typography
          component="span"
          sx={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'text.secondary',
            opacity: 0.8,
          }}
        >
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
            color: pathColors[i % pathColors.length],
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {s.gameName} → {s.variantName} → {s.serverName}
        </Typography>
      </Link>
    </Box>
  ));

  if (isMobile) {
    return (
      <Box
        className={componentClass('RecentServersBar')}
        sx={{
          px: 2,
          bgcolor: 'action.hover',
          borderBottom: '2px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-controls="recent-servers-list"
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('recentServers')}
          </Typography>
          <IconButton size="small" tabIndex={-1} sx={{ color: 'text.secondary', p: 0 }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        {expanded && (
          <Box
            id="recent-servers-list"
            sx={{ pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}
          >
            {serverLinks}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      className={componentClass('RecentServersBar')}
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: 'action.hover',
        borderBottom: '2px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {t('recentServers')}:
      </Typography>
      {serverLinks}
    </Box>
  );
}
