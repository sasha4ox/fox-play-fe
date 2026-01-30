'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Form from '@/components/Form/Form';
import { useLoginModalStore } from '@/store/loginModalStore';

export default function LoginModal() {
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
          boxShadow: '0 8px 32px rgba(53, 34, 40, 0.12)',
          border: '1px solid rgba(114, 94, 101, 0.2)',
          overflow: 'hidden',
        },
      }}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(53, 34, 40, 0.2)' } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 3,
          borderBottom: '1px solid rgba(114, 94, 101, 0.15)',
          bgcolor: '#f9f6f1',
        }}
      >
        <Typography variant="h6" component="span" fontWeight={600} color="text.primary">
          Log in or sign up
        </Typography>
        <IconButton aria-label="close" onClick={closeModal} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#f9f6f1', px: 3, py: 3 }}>
        <Form popupMode onLoginSuccess={triggerLoginSuccess} />
      </DialogContent>
    </Dialog>
  );
}
