'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Form from '@/components/Form/Form';
import { useLoginModalStore } from '@/store/loginModalStore';
import { componentClass } from '@/lib/componentPath';

export default function LoginModal() {
  const t = useTranslations('LoginModal');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const open = useLoginModalStore((s) => s.open);
  const closeModal = useLoginModalStore((s) => s.closeModal);
  const triggerLoginSuccess = useLoginModalStore((s) => s.triggerLoginSuccess);

  return (
    <Dialog
      className={componentClass('LoginModal')}
      open={open}
      onClose={closeModal}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      disableScrollLock
      PaperProps={{
        sx: {
          ...(isMobile
            ? {
                borderRadius: 0,
                maxHeight: '100dvh',
              }
            : {
                borderRadius: 3,
                boxShadow: 2,
                border: 1,
                borderColor: 'divider',
              }),
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
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" component="span" fontWeight={600} color="text.primary">
          {t('title')}
        </Typography>
        <IconButton
          className={componentClass('LoginModal', 'CloseBtn')}
          aria-label="close"
          onClick={closeModal}
          size={isMobile ? 'medium' : 'small'}
          sx={{
            color: 'text.secondary',
            ...(isMobile && { minWidth: 44, minHeight: 44 }),
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          overflow: 'auto',
          minHeight: 0,
          pb: { xs: 'max(24px, env(safe-area-inset-bottom))', sm: 3 },
        }}
      >
        <Form popupMode onLoginSuccess={triggerLoginSuccess} />
      </DialogContent>
    </Dialog>
  );
}
