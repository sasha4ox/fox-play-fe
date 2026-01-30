'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Form from '@/components/Form/Form';

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Typography variant="h5" fontWeight={600} color="text.primary" align="center" gutterBottom>
          Fox Play
        </Typography>
        <Form />
      </Container>
    </Box>
  );
}
