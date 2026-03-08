'use client';

import { useState } from 'react';
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

export default function VerifyTOTPModal({ open, onClose, onSubmit, error, submitting }) {
  const t = useTranslations('Balance');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [code, setCode] = useState('');

  const handleClose = () => {
    setCode('');
    onClose?.();
  };

  const handleSubmit = () => {
    const trimmed = (code || '').replace(/\D/g, '').slice(0, 6);
    if (trimmed.length !== 6) return;
    onSubmit?.(trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="xs"
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
          {t('verifyTOTPTitle')}
        </Typography>
        <IconButton aria-label="close" onClick={handleClose} size={isMobile ? 'medium' : 'small'} sx={{ ...(isMobile && { minWidth: 44, minHeight: 44 }) }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('verifyTOTPDescription')}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          placeholder={t('verifyTOTPPlaceholder')}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*', style: { fontSize: '1.25rem', letterSpacing: 8, textAlign: 'center' } }}
          sx={{ mb: 2 }}
          size="medium"
        />
        <Button variant="contained" color="primary" fullWidth onClick={handleSubmit} disabled={submitting || (code || '').replace(/\D/g, '').length !== 6} sx={{ textTransform: 'none', minHeight: 44 }}>
          {submitting ? t('verifyTOTPSubmitting') : t('verifyTOTPSubmit')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
