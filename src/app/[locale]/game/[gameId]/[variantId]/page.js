'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';
import { getGameFromTree, getVariantFromTree } from '@/lib/games';

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

  const handleServerClick = (serverId) => {
    router.push(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers`);
  };

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
        <Container maxWidth="sm">
          <Alert severity="error">{error || t('notFound')}</Alert>
          <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>
            {tCommon('backToGames')}
          </MuiLink>
        </Container>
      </Box>
    );
  }

  const servers = variant.servers || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <MuiLink component={Link} href={`/${locale}/game/${gameId}`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← {game.name} → {variant.name}
        </MuiLink>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('chooseServer')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {servers.length !== 1 ? t('serversHintPlural', { game: game.name, variant: variant.name, count: servers.length }) : t('serversHint', { game: game.name, variant: variant.name, count: servers.length })}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {servers.map((server) => (
            <Card key={server.id} variant="outlined">
              <CardActionArea onClick={() => handleServerClick(server.id)}>
                <CardContent sx={{ py: 3, px: 3 }}>
                  <Typography variant="h6" fontWeight={500}>
                    {server.name}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
