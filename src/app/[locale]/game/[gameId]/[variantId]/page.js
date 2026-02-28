'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree, getGameImageCandidateUrls } from '@/lib/games';
import SelectCard from '@/components/SelectCard/SelectCard';

export default function GameServersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('Game');
  const tCommon = useTranslations('Common');
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const { tree, loading, error } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const servers = variant?.servers ?? [];

  // When there's only one server, go straight to its offers (no point showing "Choose server").
  useEffect(() => {
    if (loading || error || !game || !variant) return;
    if (servers.length === 1) {
      router.replace(`/${locale}/game/${gameId}/${variantId}/${servers[0].id}/offers`);
    }
  }, [loading, error, game, variant, servers, locale, gameId, variantId, router]);

  const handleServerClick = (serverId) => {
    router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`);
  };

  const [search, setSearch] = useState('');
  const searchQuery = search.trim().toLowerCase();
  const filteredServers = useMemo(() => {
    const list = variant?.servers ?? [];
    if (!searchQuery) return list;
    return list.filter((s) => String(s?.name ?? '').toLowerCase().includes(searchQuery));
  }, [variant?.servers, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error || !game || !variant) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{error || t('notFound')}</Alert>
          <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>
            {tCommon('backToGames')}
          </MuiLink>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container>
        <MuiLink component={Link} href={`/${locale}/game/${gameId}`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← {game.name} → {variant.name}
        </MuiLink>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('chooseServer')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {servers.length !== 1 ? t('serversHintPlural', { game: game.name, variant: variant.name, count: servers.length }) : t('serversHint', { game: game.name, variant: variant.name, count: servers.length })}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <InputBase
            placeholder={t('searchServers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 22 }} />}
            sx={{
              width: '100%',
              maxWidth: 400,
              py: 1.25,
              px: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              fontSize: '1rem',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </Box>
        {filteredServers.length === 0 ? (
          <Typography color="text.secondary">{t('noSearchResults')}</Typography>
        ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {filteredServers.map((server) => (
            <SelectCard
              key={server.id}
              name={server.name}
              imageUrl={getGameImageCandidateUrls(game)}
              onClick={() => handleServerClick(server.id)}
            />
          ))}
        </Box>
        )}
      </Container>
    </Box>
  );
}
