'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useGames } from '@/hooks/useGames';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const { games, loading, error } = useGames();

  const handleGameClick = (gameId) => {
    router.push(`/${locale}/game/${gameId}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Link href={`/${locale}/dashboard/balance`} style={{ textDecoration: 'none' }}>
            <Typography component="span" color="secondary" fontWeight={500}>Balance</Typography>
          </Link>
          <Typography component="span" color="text.secondary">·</Typography>
          <Link href={`/${locale}/dashboard/orders`} style={{ textDecoration: 'none' }}>
            <Typography component="span" color="secondary" fontWeight={500}>My orders & chat</Typography>
          </Link>
        </Box>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          Choose a game
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && games.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {games.map((game) => (
              <Card key={game.id} variant="outlined">
                <CardActionArea onClick={() => handleGameClick(game.id)}>
                  <CardContent sx={{ py: 3, px: 3 }}>
                    <Typography variant="h6" fontWeight={500} color="text.primary">
                      {game.name}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}

        {!loading && !error && games.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No games available.
          </Typography>
        )}
      </Container>
    </Box>
  );
}
