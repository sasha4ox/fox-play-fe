'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuthStore } from '@/store/authStore';
import { trackRegistrationConversion } from '@/lib/googleAdsConversion';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.user) {
            setAuth(data.user, data.token ?? null);
          }
          trackRegistrationConversion(token);
          setStatus('success');
          setMessage('Your account is activated. Redirecting…');
          const locale = typeof window !== 'undefined' && window.navigator?.language?.startsWith('uk') ? 'ua' : 'en';
          setTimeout(() => router.replace(`/${locale}/dashboard`), 1500);
        } else {
          setStatus('error');
          setMessage(data?.error || data?.message || 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [searchParams, router, setAuth]);

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2, textAlign: 'center' }}>
      {status === 'loading' && (
        <>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Verifying your email…</Typography>
        </>
      )}
      {status === 'success' && (
        <Alert severity="success" sx={{ textAlign: 'left' }}>
          {message}
        </Alert>
      )}
      {status === 'error' && (
        <>
          <Alert severity="error" sx={{ textAlign: 'left', mb: 2 }}>
            {message}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You can request a new activation link from the login page.
          </Typography>
        </>
      )}
    </Box>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2, textAlign: 'center' }}>
          <CircularProgress size={48} />
        </Box>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
