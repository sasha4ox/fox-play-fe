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
import { getGameFromTree, getDirectOfferTarget, getGameImageCandidateUrls } from '@/lib/games';
import SelectCard from '@/components/SelectCard/SelectCard';

export default function GameVariantsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const gameId = params?.gameId;
  const { tree, loading, error } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const t = useTranslations('Game');
  const tCommon = useTranslations('Common');

  // SIMPLE games: redirect directly to offers (no variant/server picker)
  useEffect(() => {
    if (loading || error || !game) return;
    const target = getDirectOfferTarget(game);
    if (target) {
      router.replace(`/${locale}/game/${gameId}/${target.variantId}/${target.serverId}/offers`);
    }
  }, [loading, error, game, gameId, locale, router]);

  const handleVariantClick = (variantId) => {
    router.push(`/${locale}/game/${gameId}/${variantId}`);
  };

  const [search, setSearch] = useState('');
  const searchQuery = search.trim().toLowerCase();
  const filteredVariants = useMemo(() => {
    const list = game?.variants ?? [];
    if (!searchQuery) return list;
    return list.filter((v) => String(v?.name ?? '').toLowerCase().includes(searchQuery));
  }, [game?.variants, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error || !game) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="error">{error || t('gameNotFound')}</Alert>
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
        <MuiLink component={Link} href={`/${locale}/dashboard`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← {game.name}
        </MuiLink>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('chooseVariant')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('variantsHint', { game: game.name })}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <InputBase
            placeholder={t('searchVariants')}
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
        {filteredVariants.length === 0 ? (
          <Typography color="text.secondary">{t('noSearchResults')}</Typography>
        ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {filteredVariants.map((variant) => (
            <SelectCard
              key={variant.id}
              name={variant.name}
              imageUrl={getGameImageCandidateUrls(game)}
              onClick={() => handleVariantClick(variant.id)}
            />
          ))}
        </Box>
        )}
      </Container>
    </Box>
  );
}
