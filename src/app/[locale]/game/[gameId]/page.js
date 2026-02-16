'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getDirectOfferTarget, getGameImageUrl } from '@/lib/games';
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

  const variants = game.variants || [];

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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {variants.map((variant) => (
            <SelectCard
              key={variant.id}
              name={variant.name}
              imageUrl={getGameImageUrl(game)}
              onClick={() => handleVariantClick(variant.id)}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
