'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { getMySupportConversations } from '@/lib/api';

export default function SupportPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Support');
  const token = useAuthStore((s) => s.token);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getMySupportConversations(token)
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">{t('loginRequired')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('intro')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : list.length === 0 ? (
        <Typography color="text.secondary">{t('noConversations')}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {list.map((c) => (
            <Card key={c.id} variant="outlined">
              <CardActionArea component={Link} href={`/${locale}/dashboard/support/${c.id}`}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('orderLabel')} {c.orderNumber ?? `${c.orderId.slice(0, 8)}…`}
                  </Typography>
                  {c.lastMessagePreview && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                      {c.lastMessagePreview.length > 80 ? c.lastMessagePreview.slice(0, 80) + '…' : c.lastMessagePreview}
                    </Typography>
                  )}
                  {c.lastMessageAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
