'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { resetPasswordWithToken } from '@/lib/api';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    resetPasswordWithToken(token, password)
      .then(() => {
        setSuccess(true);
        const locale = typeof window !== 'undefined' && window.navigator?.language?.startsWith('uk') ? 'ua' : 'en';
        setTimeout(() => router.replace(`/${locale}/dashboard`), 2000);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to reset password. The link may have expired.');
      })
      .finally(() => setLoading(false));
  };

  if (!token) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
        <Alert severity="error">
          Missing reset token. Please use the link from your email, or request a new one from your profile.
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.replace('/')}>
          Go home
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Set new password
      </Typography>
      {success ? (
        <Alert severity="success">Password has been reset. Redirecting…</Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            autoComplete="new-password"
            inputProps={{ minLength: 8 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading || password.length < 8 || password !== confirm}
            sx={{ textTransform: 'none' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Reset password'}
          </Button>
        </form>
      )}
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2, textAlign: 'center' }}>
          <CircularProgress size={48} />
        </Box>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
