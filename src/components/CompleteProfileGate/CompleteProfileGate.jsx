'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { updateProfile } from '@/lib/api';

/**
 * When user is logged in via Google OAuth but has no nickname (new registration),
 * this gate blocks the app and forces them to set a nickname before continuing.
 */
export default function CompleteProfileGate() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations('Form');
  const tProfile = useTranslations('Profile');
  const tComplete = useTranslations('CompleteProfile');

  const needsNickname = !!token && !!user && (user.nickname == null || user.nickname === '');

  if (!needsNickname) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError(t('nicknameRequired'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { nickname: updated } = await updateProfile({ nickname: trimmed }, token);
      setAuth({ ...user, nickname: updated }, token);
    } catch (err) {
      const msg = err?.message ?? '';
      setError(/already taken|зайнятий/i.test(msg) ? tProfile('nicknameTaken') : msg || t('errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open disableEscapeKeyDown PaperProps={{ sx: { minWidth: 320 } }}>
      <DialogTitle>{tComplete('title')}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tComplete('description')}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label={t('nickname')}
            placeholder={t('nicknamePlaceholder')}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="secondary" fullWidth disabled={submitting}>
            {submitting ? t('sending') : tComplete('submit')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
