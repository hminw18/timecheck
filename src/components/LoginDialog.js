import React from 'react';
import { Dialog, DialogContent, Button, Box, Typography, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import { useAuth } from '../contexts/AuthContext';

const LoginDialog = ({ open, onClose }) => {
  const { signIn, signInWithApple } = useAuth();

  const handleGoogleSignIn = async () => {
    await signIn();
    onClose();
  };

  const handleAppleSignIn = async () => {
    await signInWithApple();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          로그인
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ px: 0, pb: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            sx={{
              py: 1.5,
              borderColor: '#dadce0',
              color: '#3c4043',
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#f8f9fa',
                borderColor: '#dadce0'
              }
            }}
          >
            Google로 로그인
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<AppleIcon />}
            onClick={handleAppleSignIn}
            sx={{
              py: 1.5,
              borderColor: '#000',
              color: '#000',
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#000'
              }
            }}
          >
            Apple로 로그인
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              또는
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Typography variant="body2" color="text.secondary" align="center">
            게스트로도 일정을 공유할 수 있습니다
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;