import React from 'react';
import { Dialog, DialogContent, Button, Box, Typography, Divider, IconButton, TextField } from '@mui/material';
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
          {/* Social Login Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Apple Sign In Button - Following HIG */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<AppleIcon sx={{ fontSize: 20 }} />}
              onClick={handleAppleSignIn}
              sx={{
                minHeight: 44, // Apple HIG: minimum 44px (converted from 30pt)
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                fontSize: '17px', // Apple HIG: 43% of height
                fontWeight: 500,
                borderRadius: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                '&:hover': {
                  backgroundColor: '#000',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                },
                '& .MuiButton-startIcon': {
                  marginRight: 1
                }
              }}
            >
              Apple로 로그인
            </Button>

            {/* Google Sign In Button - Matching style consistency */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<GoogleIcon sx={{ fontSize: 20 }} />}
              onClick={handleGoogleSignIn}
              sx={{
                minHeight: 44,
                backgroundColor: '#fff',
                color: '#3c4043',
                textTransform: 'none',
                fontSize: '17px',
                fontWeight: 500,
                borderRadius: 1,
                border: '1px solid #dadce0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                },
                '& .MuiButton-startIcon': {
                  marginRight: 1
                }
              }}
            >
              Google로 로그인
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
            로그인하면 더 많은 기능을 사용할 수 있습니다
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;