'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { get2FASetup, verify2FASetup } from '@/lib/api';

export default function Enable2FAModal({ open, onClose, onSuccess, token }) {
  const t = useTranslations('Balance');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [step, setStep] = useState(1);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [otpauthUri, setOtpauthUri] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && token && step === 1) {
      setError(null);
      setSetupLoading(true);
      get2FASetup(token)
        .then((data) => {
          setQrCodeDataUrl(data?.qrCodeDataUrl ?? null);
          setOtpauthUri(data?.otpauthUri ?? null);
        })
        .catch((e) => setError(e?.message ?? t('enable2FALoading')))
        .finally(() => setSetupLoading(false));
    }
  }, [open, token, step]);

  const handleClose = () => {
    setStep(1);
    setCode('');
    setError(null);
    setQrCodeDataUrl(null);
    setOtpauthUri(null);
    onClose?.();
  };

  const handleVerify = () => {
    const trimmed = (code || '').replace(/\D/g, '').slice(0, 6);
    if (trimmed.length !== 6) {
      setError(t('enable2FAInvalidCode'));
      return;
    }
    setError(null);
    setVerifyLoading(true);
    verify2FASetup(trimmed, token)
      .then(() => {
        handleClose();
        onSuccess?.();
      })
      .catch((e) => {
        setError(e?.message ?? t('enable2FAInvalidCode'));
      })
      .finally(() => setVerifyLoading(false));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      disableScrollLock
      PaperProps={{
        sx: {
          ...(isMobile ? { borderRadius: 0, maxHeight: '100dvh' } : { borderRadius: 3, boxShadow: 2, border: 1, borderColor: 'divider' }),
          overflow: 'hidden',
          bgcolor: 'background.paper',
        },
      }}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.4)' } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {t('enable2FATitle')}
        </Typography>
        <IconButton aria-label="close" onClick={handleClose} size={isMobile ? 'medium' : 'small'} sx={{ ...(isMobile && { minWidth: 44, minHeight: 44 }) }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('enable2FADescription')}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {step === 1 && (
          <>
            {setupLoading ? (
              <Typography color="text.secondary">{t('enable2FALoading')}</Typography>
            ) : (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  {t('enable2FAScanQR')}
                </Typography>
                {qrCodeDataUrl && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <img src={qrCodeDataUrl} alt="QR code" width={200} height={200} style={{ display: 'block' }} />
                  </Box>
                )}
                {otpauthUri && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('enable2FAManualEntry')}
                    </Typography>
                    <Typography
                      component="code"
                      sx={{
                        display: 'block',
                        wordBreak: 'break-all',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        bgcolor: 'action.hover',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {otpauthUri}
                    </Typography>
                  </Box>
                )}
                <Button variant="contained" color="primary" fullWidth onClick={() => setStep(2)} sx={{ mt: 3, textTransform: 'none', minHeight: 44 }}>
                  {t('enable2FAEnterCode')}
                </Button>
              </>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              {t('enable2FAEnterCode')}
            </Typography>
            <TextField
              fullWidth
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*', style: { fontSize: '1.25rem', letterSpacing: 8, textAlign: 'center' } }}
              sx={{ mt: 1, mb: 2 }}
              size="medium"
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setStep(1)} sx={{ textTransform: 'none', minHeight: 44 }}>
                {t('enable2FABack')}
              </Button>
              <Button variant="contained" color="primary" onClick={handleVerify} disabled={verifyLoading} sx={{ flex: 1, textTransform: 'none', minHeight: 44 }}>
                {verifyLoading ? t('enable2FALoading') : t('enable2FAVerify')}
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
