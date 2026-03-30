'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useGames } from '@/hooks/useGames';
import {
  getGameFromTree,
  getVariantFromTree,
  getServerFromTree,
  pathGameVariantServer,
  getDefaultCategorySlug,
  getAllowedOfferTypesForServer,
} from '@/lib/games';

/** Redirect /offers → /offers/{defaultCategorySlug} */
export default function OffersIndexRedirect() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const { tree, loading, error } = useGames();
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;
  const game = tree ? getGameFromTree(tree, gameId) : null;
  const variant = tree ? getVariantFromTree(tree, gameId, variantId) : null;
  const server = tree ? getServerFromTree(tree, gameId, variantId, serverId) : null;

  useEffect(() => {
    if (loading || error || !game || !variant || !server) return;
    const slug = getDefaultCategorySlug(getAllowedOfferTypesForServer(server), server);
    router.replace(pathGameVariantServer(locale, game, variant, server, slug));
  }, [loading, error, game, variant, server, locale, router]);

  return (
    <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress color="secondary" />
    </Box>
  );
}
