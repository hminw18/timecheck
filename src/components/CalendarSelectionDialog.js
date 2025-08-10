import React from 'react';
import { Dialog, DialogTitle, DialogContent, Button, IconButton, Typography, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import CloseIcon from '@mui/icons-material/Close';

const CalendarSelectionDialog = ({ 
  open, 
  onClose, 
  onGoogleSelect, 
  onAppleSelect,
  isGoogleUser,
  showAlert
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          m: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" fontWeight={600}>
          캘린더 연동
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ 
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            onClick={() => {
              onClose();
              if (isGoogleUser) {
                onGoogleSelect();
              } else {
                showAlert('Google 계정으로 로그인 후 이용해주세요.');
              }
            }}
            variant="outlined"
            startIcon={<GoogleIcon />}
            disabled={!isGoogleUser}
            sx={{
              py: 1.5,
              justifyContent: 'flex-start',
              textTransform: 'none',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              },
              '&:disabled': {
                opacity: 0.6
              }
            }}
          >
            <Box sx={{ ml: 1, textAlign: 'left' }}>
              <Typography variant="body1" fontWeight={500}>
                Google Calendar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isGoogleUser ? "Google 계정 캘린더 연동" : "Google 계정으로 로그인 필요"}
              </Typography>
            </Box>
          </Button>
          
          <Button
            onClick={() => {
              onClose();
              onAppleSelect();
            }}
            variant="outlined"
            startIcon={<AppleIcon sx={{ color: '#000' }} />}
            sx={{
              py: 1.5,
              justifyContent: 'flex-start',
              textTransform: 'none',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
          >
            <Box sx={{ ml: 1, textAlign: 'left' }}>
              <Typography variant="body1" fontWeight={500}>
                Apple Calendar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                앱 암호로 연동
              </Typography>
            </Box>
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarSelectionDialog;