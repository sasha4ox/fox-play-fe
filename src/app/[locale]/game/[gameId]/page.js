'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
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
import { getGameFromTree } from '@/lib/games';

export default function GameVariantsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const gameId = params?.gameId;
  const { tree, loading, error } = useGames();
  const game = tree ? getGameFromTree(tree, gameId) : null;

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
        <Container maxWidth="sm">
          <Alert severity="error">{error || 'Game not found.'}</Alert>
          <MuiLink component={Link} href={`/${locale}/dashboard`} sx={{ display: 'inline-block', mt: 2 }}>
            ← Back to games
          </MuiLink>
        </Container>
      </Box>
    );
  }

  const variants = game.variants || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <MuiLink component={Link} href={`/${locale}/dashboard`} color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
          ← {game.name}
        </MuiLink>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          Choose variant
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {game.name} → variants
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {variants.map((variant) => (
            <Card key={variant.id} variant="outlined">
              <CardActionArea onClick={() => handleVariantClick(variant.id)}>
                <CardContent sx={{ py: 3, px: 3 }}>
                  <Typography variant="h6" fontWeight={500}>
                    {variant.name}
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
