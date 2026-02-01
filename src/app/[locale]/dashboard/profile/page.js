'use client';

import { useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { updateProfile, uploadAvatar } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';

export default function ProfilePage() {
  const locale = useLocale();
  const t = useTranslations('Profile');
  const tCommon = useTranslations('Common');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { profile, loading, error, refetch } = useProfile();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const displayNickname = profile?.nickname ?? '';
  const effectiveNickname = nickname !== '' ? nickname : displayNickname;
  const avatarUrl = profile?.avatarUrl;
  const initial = (profile?.nickname || profile?.email || '?').charAt(0).toUpperCase();

  const handleSaveNickname = async () => {
    if (!token || effectiveNickname === displayNickname) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({ nickname: effectiveNickname.trim() || null }, token);
      await refetch();
    } catch (e) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (!file.type.startsWith('image/')) {
      setSaveError(t('avatarImageOnly'));
      return;
    }
    setAvatarUploading(true);
    setSaveError(null);
    const formData = new FormData();
    formData.append('avatar', file);
    uploadAvatar(formData, token)
      .then(() => refetch())
      .catch((err) => setSaveError(err.message || 'Upload failed'))
      .finally(() => {
        setAvatarUploading(false);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      });
  };

  if (!isAuth) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container>
          <Alert severity="info" sx={{ mb: 2 }}>{t('loginToView')}</Alert>
          <Button variant="contained" color="secondary" onClick={() => openLoginModal()}>
            {t('login')}
          </Button>
        </Container>
      </Box>
    );
  }

  if (loading && !profile) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
        <Container maxWidth="sm">
          <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
          <Skeleton width="60%" height={40} />
          <Skeleton width="80%" height={32} sx={{ mt: 1 }} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Container maxWidth="sm">
        <Link href={`${base}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            ← {t('dashboard')}
          </MuiLink>
        </Link>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          {t('title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarUrl}
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'secondary.main',
                fontSize: '3rem',
              }}
            >
              {!avatarUrl ? initial : null}
            </Avatar>
            <Button
              size="small"
              variant="outlined"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
              }}
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarUploading ? '…' : '📷'}
            </Button>
          </Box>

          <TextField
            label={t('nickname')}
            value={effectiveNickname}
            onChange={(e) => setNickname(e.target.value)}
            fullWidth
            sx={{ maxWidth: 360 }}
          />
          <Typography variant="body2" color="text.secondary">
            {profile?.email}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSaveNickname}
            disabled={saving || effectiveNickname === displayNickname}
          >
            {saving ? tCommon('loading') : tCommon('save')}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          {t('moreLater')}
        </Typography>
      </Container>
    </Box>
  );
}
