'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { uploadAvatar, disable2FA, requestPasswordReset, getSavedCards, getSavedWallets, addSavedCard, addSavedWallet, deleteSavedCard, deleteSavedWallet } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import Enable2FAModal from '@/components/Enable2FAModal/Enable2FAModal';

export default function ProfilePage() {
  const locale = useLocale();
  const t = useTranslations('Profile');
  const tCommon = useTranslations('Common');
  const base = `/${locale}`;
  const isAuth = useIsAuthenticated();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const { profile, loading, error, refetch } = useProfile();
  const [saveError, setSaveError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const [enable2FAModalOpen, setEnable2FAModalOpen] = useState(false);
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState(null);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [savedWallets, setSavedWallets] = useState([]);
  const [savedMethodsLoading, setSavedMethodsLoading] = useState(false);
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [addWalletModalOpen, setAddWalletModalOpen] = useState(false);
  const [addCardLast4, setAddCardLast4] = useState('');
  const [addCardHolder, setAddCardHolder] = useState('');
  const [addCardLabel, setAddCardLabel] = useState('');
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [addCardError, setAddCardError] = useState(null);
  const [addWalletAddress, setAddWalletAddress] = useState('');
  const [addWalletLabel, setAddWalletLabel] = useState('');
  const [addWalletLoading, setAddWalletLoading] = useState(false);
  const [addWalletError, setAddWalletError] = useState(null);

  const loadSavedMethods = () => {
    if (!token) return;
    setSavedMethodsLoading(true);
    Promise.all([getSavedCards(token), getSavedWallets(token)])
      .then(([cardsRes, walletsRes]) => {
        setSavedCards(cardsRes?.items ?? []);
        setSavedWallets(walletsRes?.items ?? []);
      })
      .catch(() => { setSavedCards([]); setSavedWallets([]); })
      .finally(() => setSavedMethodsLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    setSavedMethodsLoading(true);
    Promise.all([getSavedCards(token), getSavedWallets(token)])
      .then(([cardsRes, walletsRes]) => {
        setSavedCards(cardsRes?.items ?? []);
        setSavedWallets(walletsRes?.items ?? []);
      })
      .catch(() => { setSavedCards([]); setSavedWallets([]); })
      .finally(() => setSavedMethodsLoading(false));
  }, [token]);

  const displayNickname = profile?.nickname ?? '';
  const avatarUrl = profile?.avatarUrl;
  const initial = (profile?.nickname || profile?.email || '?').charAt(0).toUpperCase();

  const handleResetPasswordSubmit = () => {
    const email = (resetPasswordEmail || '').trim();
    if (!email) return;
    setResetPasswordError(null);
    setResetPasswordLoading(true);
    requestPasswordReset(email)
      .then(() => {
        setResetPasswordSent(true);
      })
      .catch((e) => setResetPasswordError(e?.message || 'Failed to send reset link'))
      .finally(() => setResetPasswordLoading(false));
  };

  const handleDisable2FASubmit = () => {
    const code = (disable2FACode || '').replace(/\D/g, '').trim().slice(0, 6);
    if (code.length !== 6 || !token) return;
    setDisable2FAError(null);
    setDisable2FALoading(true);
    disable2FA(code, token)
      .then(() => {
        setDisable2FAModalOpen(false);
        setDisable2FACode('');
        refetch();
      })
      .catch((e) => setDisable2FAError(e?.message || t('disable2FAError')))
      .finally(() => setDisable2FALoading(false));
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
              alt={profile?.nickname || profile?.email || tCommon('user')}
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

          <Box sx={{ width: '100%', maxWidth: 360 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              {t('nickname')}
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {displayNickname || '—'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {profile?.email}
          </Typography>
        </Box>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 1 }}>
          {t('security')}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('twoFactorAuth')}
        </Typography>
        {profile?.twoFactorEnabled ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('twoFactorEnabled')}
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setDisable2FACode('');
                setDisable2FAError(null);
                setDisable2FAModalOpen(true);
              }}
              sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
            >
              {t('disable2FA')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setEnable2FAModalOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              {t('enable2FA')}
            </Button>
          </Box>
        )}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          {t('resetPassword')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('resetPasswordHint')}
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setResetPasswordEmail(profile?.email ?? '');
            setResetPasswordSent(false);
            setResetPasswordError(null);
            setResetPasswordModalOpen(true);
          }}
          sx={{ textTransform: 'none', mb: 2 }}
        >
          {t('sendResetLink')}
        </Button>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
          {t('savedPaymentMethods')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('savedCardsWalletsHint')}
        </Typography>
        {savedMethodsLoading ? (
          <Skeleton height={80} sx={{ mb: 2 }} />
        ) : (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Button variant="outlined" size="small" onClick={() => { setAddCardLast4(''); setAddCardHolder(''); setAddCardLabel(''); setAddCardError(null); setAddCardModalOpen(true); }} sx={{ textTransform: 'none' }}>
                {t('addCard')}
              </Button>
              <Button variant="outlined" size="small" onClick={() => { setAddWalletAddress(''); setAddWalletLabel(''); setAddWalletError(null); setAddWalletModalOpen(true); }} sx={{ textTransform: 'none' }}>
                {t('addWallet')}
              </Button>
            </Box>
            {savedCards.length === 0 && savedWallets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No saved cards or wallets yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {savedCards.map((c) => (
                  <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2">•••• {c.last4} – {c.cardHolderName}{c.label ? ` (${c.label})` : ''}</Typography>
                    <IconButton size="small" aria-label="Delete card" onClick={() => deleteSavedCard(c.id, token).then(loadSavedMethods).catch(() => {})}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                {savedWallets.map((w) => (
                  <Box key={w.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {w.walletAddress.length > 16 ? `${w.walletAddress.slice(0, 8)}…${w.walletAddress.slice(-6)}` : w.walletAddress}
                      {w.label ? ` (${w.label})` : ''}
                    </Typography>
                    <IconButton size="small" aria-label="Delete wallet" onClick={() => deleteSavedWallet(w.id, token).then(loadSavedMethods).catch(() => {})}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          {t('moreLater')}
        </Typography>
      </Container>

      <Enable2FAModal
        open={enable2FAModalOpen}
        onClose={() => setEnable2FAModalOpen(false)}
        onSuccess={() => { setEnable2FAModalOpen(false); refetch(); }}
        token={token}
      />
      <Dialog open={resetPasswordModalOpen} onClose={() => !resetPasswordLoading && setResetPasswordModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('resetPassword')}
          <IconButton aria-label="close" onClick={() => !resetPasswordLoading && setResetPasswordModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {resetPasswordSent ? (
            <Alert severity="success">{t('resetLinkSent')}</Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('resetPasswordHint')}
              </Typography>
              {resetPasswordError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResetPasswordError(null)}>
                  {resetPasswordError}
                </Alert>
              )}
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={resetPasswordEmail}
                onChange={(e) => setResetPasswordEmail(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
                autoComplete="email"
              />
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleResetPasswordSubmit}
                disabled={resetPasswordLoading || !(resetPasswordEmail || '').trim()}
                sx={{ textTransform: 'none' }}
              >
                {resetPasswordLoading ? '…' : t('sendResetLink')}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={disable2FAModalOpen} onClose={() => !disable2FALoading && setDisable2FAModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('disable2FATitle')}
          <IconButton aria-label="close" onClick={() => !disable2FALoading && setDisable2FAModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('disable2FADescription')}
          </Typography>
          {disable2FAError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDisable2FAError(null)}>
              {disable2FAError}
            </Alert>
          )}
          <TextField
            fullWidth
            placeholder="000000"
            value={disable2FACode}
            onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            size="small"
            sx={{ mb: 2 }}
          />
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={handleDisable2FASubmit}
            disabled={disable2FALoading || (disable2FACode || '').replace(/\D/g, '').length !== 6}
            sx={{ textTransform: 'none' }}
          >
            {disable2FALoading ? '…' : t('disable2FASubmit')}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addCardModalOpen} onClose={() => !addCardLoading && setAddCardModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('addCard')}
          <IconButton aria-label="close" onClick={() => !addCardLoading && setAddCardModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {addCardError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddCardError(null)}>{addCardError}</Alert>
          )}
          <TextField fullWidth label="Last 4 digits" value={addCardLast4} onChange={(e) => setAddCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} inputProps={{ maxLength: 4, inputMode: 'numeric' }} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label={t('cardHolderName')} value={addCardHolder} onChange={(e) => setAddCardHolder(e.target.value)} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="Label (optional)" value={addCardLabel} onChange={(e) => setAddCardLabel(e.target.value)} size="small" sx={{ mb: 2 }} placeholder="e.g. Main card" />
          <Button fullWidth variant="contained" color="primary" disabled={addCardLoading || addCardLast4.length !== 4 || !addCardHolder.trim()} sx={{ textTransform: 'none' }}
            onClick={() => {
              setAddCardError(null);
              setAddCardLoading(true);
              addSavedCard({ last4: addCardLast4, cardHolderName: addCardHolder.trim(), label: addCardLabel.trim() || undefined }, token)
                .then(() => { setAddCardModalOpen(false); loadSavedMethods(); })
                .catch((e) => setAddCardError(e?.message || 'Failed to add card'))
                .finally(() => setAddCardLoading(false));
            }}
          >
            {addCardLoading ? '…' : t('addCard')}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addWalletModalOpen} onClose={() => !addWalletLoading && setAddWalletModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('addWallet')}
          <IconButton aria-label="close" onClick={() => !addWalletLoading && setAddWalletModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {addWalletError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddWalletError(null)}>{addWalletError}</Alert>
          )}
          <TextField fullWidth label="USDT TRC20 address" value={addWalletAddress} onChange={(e) => setAddWalletAddress(e.target.value)} size="small" sx={{ mb: 2 }} placeholder="T..." inputProps={{ maxLength: 64 }} />
          <TextField fullWidth label="Label (optional)" value={addWalletLabel} onChange={(e) => setAddWalletLabel(e.target.value)} size="small" sx={{ mb: 2 }} placeholder="e.g. Main wallet" />
          <Button fullWidth variant="contained" color="primary" disabled={addWalletLoading || addWalletAddress.trim().length < 20} sx={{ textTransform: 'none' }}
            onClick={() => {
              setAddWalletError(null);
              setAddWalletLoading(true);
              addSavedWallet({ walletAddress: addWalletAddress.trim(), label: addWalletLabel.trim() || undefined }, token)
                .then(() => { setAddWalletModalOpen(false); loadSavedMethods(); })
                .catch((e) => setAddWalletError(e?.message || 'Failed to add wallet'))
                .finally(() => setAddWalletLoading(false));
            }}
          >
            {addWalletLoading ? '…' : t('addWallet')}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
