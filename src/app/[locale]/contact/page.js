'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';


export default function ContactPage() {
  const locale = useLocale();
  const t = useTranslations('Contact');
  const basePath = `/${locale}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ mb: 3 }}>
        <Link href={basePath} style={{ textDecoration: 'none' }}>
          <Button size="small" sx={{ mb: 2 }}>
            {t('backToHome')}
          </Button>
        </Link>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EmailIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {t('title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('subtitle')}
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 2 }}
            variant="outlined"
          />
          <TextField
            fullWidth
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
            variant="outlined"
          />
          <TextField
            fullWidth
            label={t('subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
            variant="outlined"
          />
          <TextField
            fullWidth
            label={t('message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            multiline
            rows={5}
            sx={{ mb: 2 }}
            variant="outlined"
          />

          {status === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('successMessage')}
            </Alert>
          )}
          {status === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('errorMessage')}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={submitting}
            endIcon={submitting ? null : <SendIcon />}
            sx={{
              py: 1.5,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            {submitting ? t('submitting') : t('submitTicket')}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
