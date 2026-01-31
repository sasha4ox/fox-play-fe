'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import Form from '@/components/Form/Form';
import { useLoginModalStore } from '@/store/loginModalStore';

export default function LoginModal() {
  const t = useTranslations('LoginModal');
  const open = useLoginModalStore((s) => s.open);
  const closeModal = useLoginModalStore((s) => s.closeModal);
  const triggerLoginSuccess = useLoginModalStore((s) => s.triggerLoginSuccess);

  return (
    <Dialog
      open={open}
      onClose={closeModal}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 2,
          border: 1,
          borderColor: 'divider',
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
          py: 2,
          px: 3,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" component="span" fontWeight={600} color="text.primary">
          {t('title')}
        </Typography>
        <IconButton aria-label="close" onClick={closeModal} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper' }}>
        <Form popupMode onLoginSuccess={triggerLoginSuccess} />
      </DialogContent>
    </Dialog>
  );
}
