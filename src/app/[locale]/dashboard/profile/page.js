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
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useAuthStore, useIsAuthenticated } from '@/store/authStore';
import { useProfile } from '@/hooks/useProfile';
import { uploadAvatar, disable2FA, requestPasswordReset, getSavedCards, getSavedWallets, addSavedCard, addSavedWallet, updateSavedCard, updateSavedWallet, deleteSavedCard, deleteSavedWallet, updateProfile, disconnectTelegram } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import Enable2FAModal from '@/components/Enable2FAModal/Enable2FAModal';
import CountrySelect from '@/components/CountrySelect/CountrySelect';

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
  const [editCardId, setEditCardId] = useState(null);
  const [editWalletId, setEditWalletId] = useState(null);
  const [addCardNumber, setAddCardNumber] = useState('');
  const [addCardHolder, setAddCardHolder] = useState('');
  const [addCardLabel, setAddCardLabel] = useState('');
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [addCardError, setAddCardError] = useState(null);
  const [addWalletAddress, setAddWalletAddress] = useState('');
  const [addWalletLabel, setAddWalletLabel] = useState('');
  const [addWalletLoading, setAddWalletLoading] = useState(false);
  const [addWalletError, setAddWalletError] = useState(null);
  const [telegramDisconnectLoading, setTelegramDisconnectLoading] = useState(false);

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
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setSavedMethodsLoading(true);
    });
    Promise.all([getSavedCards(token), getSavedWallets(token)])
      .then(([cardsRes, walletsRes]) => {
        if (cancelled) return;
        setSavedCards(cardsRes?.items ?? []);
        setSavedWallets(walletsRes?.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setSavedCards([]);
        setSavedWallets([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSavedMethodsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

  const sectionSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: { xs: 2, sm: 2.5 },
    mb: 2,
    bgcolor: 'background.paper',
  };

  const rowSx = {
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    gap: 1.5,
    py: 1.5,
    flexDirection: { xs: 'column', sm: 'row' },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 }, px: 2 }}>
      <Container maxWidth="md">
        <Link href={`${base}/dashboard`} style={{ textDecoration: 'none' }}>
          <MuiLink component="span" color="secondary" sx={{ display: 'inline-block', mb: 2 }}>
            ← {t('dashboard')}
          </MuiLink>
        </Link>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>
          {t('title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

        <Box sx={sectionSx}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{t('account')}</Typography>
          <Box sx={{ ...rowSx, pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <input type="file" ref={avatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <Box sx={{ position: 'relative' }}>
                <Avatar src={avatarUrl} alt={profile?.nickname || profile?.email || tCommon('user')} sx={{ width: 52, height: 52, bgcolor: 'secondary.main', fontSize: '1.25rem' }}>
                  {!avatarUrl ? initial : null}
                </Avatar>
                <Button size="small" variant="outlined" sx={{ position: 'absolute', bottom: -4, right: -4, minWidth: 24, width: 24, height: 24, borderRadius: '50%', p: 0, fontSize: 12 }} disabled={avatarUploading} onClick={() => avatarInputRef.current?.click()}>
                  {avatarUploading ? '…' : '✎'}
                </Button>
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={600}>{displayNickname || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">{profile?.email}</Typography>
              </Box>
            </Box>
          </Box>
          <Divider />
          <Box sx={rowSx}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('nickname')}</Typography>
              <Typography variant="body2" fontWeight={600}>{displayNickname || '—'}</Typography>
            </Box>
            <Button variant="outlined" color="secondary" size="small" sx={{ textTransform: 'none' }}>{t('edit')}</Button>
          </Box>
          <Divider />
          <Box sx={rowSx}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('country')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('selectCountry')}</Typography>
            </Box>
            <Box sx={{ minWidth: { xs: '100%', sm: 220 }, width: { xs: '100%', sm: 'auto' } }}>
              <CountrySelect
                selected={profile?.countryCode ?? ''}
                onSelect={(code) => {
                  if (!token) return;
                  updateProfile({ countryCode: code }, token).then(() => refetch()).catch(() => {});
                }}
                placeholder={t('selectCountry')}
                fullWidth
              />
            </Box>
          </Box>
        </Box>

        <Box sx={sectionSx}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{t('security')}</Typography>
          <Box sx={{ ...rowSx, pt: 1 }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>{t('twoFactorAuth')}</Typography>
              <Typography variant="caption" color={profile?.twoFactorEnabled ? 'success.main' : 'text.secondary'}>{profile?.twoFactorEnabled ? t('enabled') : t('disabled')}</Typography>
            </Box>
            {profile?.twoFactorEnabled ? (
              <Button variant="outlined" color="secondary" onClick={() => { setDisable2FACode(''); setDisable2FAError(null); setDisable2FAModalOpen(true); }} sx={{ textTransform: 'none' }}>
                {t('disable2FA')}
              </Button>
            ) : (
              <Button variant="outlined" color="secondary" onClick={() => setEnable2FAModalOpen(true)} sx={{ textTransform: 'none' }}>
                {t('enable2FA')}
              </Button>
            )}
          </Box>
          <Divider />
          <Box sx={rowSx}>
            <Box>
              <Typography variant="body2" fontWeight={600}>{t('resetPassword')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('resetPasswordHint')}</Typography>
            </Box>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setResetPasswordEmail(profile?.email ?? '');
                setResetPasswordSent(false);
                setResetPasswordError(null);
                setResetPasswordModalOpen(true);
              }}
              sx={{ textTransform: 'none' }}
            >
              {t('reset')}
            </Button>
          </Box>
        </Box>

        <Box sx={sectionSx}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{t('notifications')}</Typography>
          <Box sx={{ ...rowSx, pt: 1, alignItems: 'center', flexDirection: 'row' }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>{t('email')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('notifyByEmail')}</Typography>
            </Box>
            <Switch checked={!!profile?.notifyByEmail} onChange={(_, checked) => { if (!token) return; updateProfile({ notifyByEmail: checked }, token).then(() => refetch()).catch(() => {}); }} color="primary" />
          </Box>
          <Divider />
          <Box sx={{ ...rowSx, alignItems: 'center', flexDirection: 'row' }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>Telegram</Typography>
              <Typography variant="caption" color="text.secondary">{profile?.telegramConnected ? t('telegramConnected') : t('connectTelegramHint')}</Typography>
            </Box>
            <Switch checked={!!profile?.notifyByTelegram} onChange={(_, checked) => { if (!token) return; updateProfile({ notifyByTelegram: checked }, token).then(() => refetch()).catch(() => {}); }} color="primary" />
          </Box>
          <Divider />
          <Box sx={rowSx}>
            <Typography variant="body2" color="text.secondary">{t('telegramAccount')}</Typography>
            {profile?.telegramConnected ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>{t('connected')}</Typography>
                <Button variant="outlined" color="secondary" size="small" disabled={telegramDisconnectLoading} onClick={() => { if (!token) return; setTelegramDisconnectLoading(true); disconnectTelegram(token).then(() => refetch()).catch(() => {}).finally(() => setTelegramDisconnectLoading(false)); }} sx={{ textTransform: 'none' }}>
                  {telegramDisconnectLoading ? '…' : t('disconnectTelegram')}
                </Button>
              </Box>
            ) : profile?.telegramBotUsername ? (
              <Button variant="outlined" color="secondary" component="a" href={`https://t.me/${profile.telegramBotUsername}?start=${profile?.id ?? ''}`} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none' }}>
                {t('connectTelegram')}
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary">{t('notConnected')}</Typography>
            )}
          </Box>
        </Box>

        <Box sx={sectionSx}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{t('savedPaymentMethods')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>{t('savedCardsWalletsHint')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Button variant="outlined" size="small" onClick={() => { setEditCardId(null); setAddCardNumber(''); setAddCardHolder(''); setAddCardLabel(''); setAddCardError(null); setAddCardModalOpen(true); }} sx={{ textTransform: 'none' }}>+ {t('addCard')}</Button>
            <Button variant="outlined" size="small" onClick={() => { setEditWalletId(null); setAddWalletAddress(''); setAddWalletLabel(''); setAddWalletError(null); setAddWalletModalOpen(true); }} sx={{ textTransform: 'none' }}>+ {t('addCryptoWallet')}</Button>
          </Box>
          {savedMethodsLoading ? (
            <Skeleton height={80} />
          ) : savedCards.length === 0 && savedWallets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{t('noSavedMethods')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {savedCards.map((c, idx) => (
                <Box key={c.id}>
                  {idx > 0 && <Divider />}
                  <Box sx={{ ...rowSx, py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar variant="rounded" sx={{ width: 26, height: 26, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 14 }}>💳</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>•••• {c.last4}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.cardHolderName}{c.label ? ` - ${c.label}` : ''}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" aria-label="Edit card" onClick={() => { setEditCardId(c.id); const digits = (c.cardNumber || '').toString().replace(/\D/g, ''); const grouped = digits.match(/.{1,4}/g) || []; setAddCardNumber(grouped.join(' ')); setAddCardHolder(c.cardHolderName || ''); setAddCardLabel(c.label || ''); setAddCardError(null); setAddCardModalOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Delete card" onClick={() => deleteSavedCard(c.id, token).then(loadSavedMethods).catch(() => {})}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}
              {savedWallets.map((w) => (
                <Box key={w.id}>
                  <Divider />
                  <Box sx={{ ...rowSx, py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar variant="rounded" sx={{ width: 26, height: 26, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 14 }}>◉</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>TRC20 wallet</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{w.walletAddress.length > 20 ? `${w.walletAddress.slice(0, 10)}…${w.walletAddress.slice(-8)}` : w.walletAddress}{w.label ? ` - ${w.label}` : ''}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" aria-label="Edit wallet" onClick={() => { setEditWalletId(w.id); setAddWalletAddress(w.walletAddress || ''); setAddWalletLabel(w.label || ''); setAddWalletError(null); setAddWalletModalOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Delete wallet" onClick={() => deleteSavedWallet(w.id, token).then(loadSavedMethods).catch(() => {})}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
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
          {editCardId ? t('editSavedCard') : t('addCard')}
          <IconButton aria-label="close" onClick={() => !addCardLoading && setAddCardModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {addCardError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddCardError(null)}>{addCardError}</Alert>
          )}
          <TextField
            fullWidth
            label="Card number"
            value={addCardNumber}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
              const grouped = digits.match(/.{1,4}/g) || [];
              setAddCardNumber(grouped.join(' '));
            }}
            inputProps={{ maxLength: 23, inputMode: 'numeric' }}
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField fullWidth label={t('cardHolderName')} value={addCardHolder} onChange={(e) => setAddCardHolder(e.target.value)} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="Label (optional)" value={addCardLabel} onChange={(e) => setAddCardLabel(e.target.value)} size="small" sx={{ mb: 2 }} placeholder="e.g. Main card" />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            disabled={addCardLoading || addCardNumber.replace(/\D/g, '').length < 12 || !addCardHolder.trim()}
            sx={{ textTransform: 'none' }}
            onClick={() => {
              setAddCardError(null);
              setAddCardLoading(true);
              const payload = {
                cardNumber: addCardNumber.replace(/\D/g, ''),
                cardHolderName: addCardHolder.trim(),
                label: addCardLabel.trim() || undefined,
              };
              const req = editCardId ? updateSavedCard(editCardId, payload, token) : addSavedCard(payload, token);
              req
                .then(() => { setAddCardModalOpen(false); setEditCardId(null); loadSavedMethods(); })
                .catch((e) => setAddCardError(e?.message || (editCardId ? 'Failed to update card' : 'Failed to add card')))
                .finally(() => setAddCardLoading(false));
            }}
          >
            {addCardLoading ? '…' : (editCardId ? t('saveMethodChanges') : t('addCard'))}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addWalletModalOpen} onClose={() => !addWalletLoading && setAddWalletModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {editWalletId ? t('editSavedCryptoWallet') : t('addCryptoWallet')}
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
              const payload = { walletAddress: addWalletAddress.trim(), label: addWalletLabel.trim() || undefined };
              const req = editWalletId ? updateSavedWallet(editWalletId, payload, token) : addSavedWallet(payload, token);
              req
                .then(() => { setAddWalletModalOpen(false); setEditWalletId(null); loadSavedMethods(); })
                .catch((e) => setAddWalletError(e?.message || (editWalletId ? 'Failed to update wallet' : 'Failed to add wallet')))
                .finally(() => setAddWalletLoading(false));
            }}
          >
            {addWalletLoading ? '…' : (editWalletId ? t('saveMethodChanges') : t('addCryptoWallet'))}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
