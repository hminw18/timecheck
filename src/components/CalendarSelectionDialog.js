import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';

const CalendarSelectionDialog = ({ 
  open, 
  onClose, 
  onGoogleSelect, 
  onAppleSelect,
  isGoogleUser,
  showAlert
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>캘린더 추가</DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 0 }}>
        <List sx={{ pt: 0, pb: 0 }}>
          <ListItemButton 
            onClick={() => {
              onClose();
              if (isGoogleUser) {
                onGoogleSelect();
              } else {
                showAlert('Google 계정으로 로그인 후 이용해주세요.');
              }
            }}
            sx={{ py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <GoogleIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText 
              primary="Google Calendar" 
              secondary={isGoogleUser ? "Google 계정 캘린더 연동" : "Google 계정으로 로그인 필요"}
              primaryTypographyProps={{ fontSize: '0.95rem' }}
              secondaryTypographyProps={{ fontSize: '0.85rem' }}
            />
          </ListItemButton>
          
          <ListItemButton 
            onClick={() => {
              onClose();
              onAppleSelect();
            }}
            sx={{ py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <AppleIcon sx={{ fontSize: 22, color: '#000' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Apple Calendar" 
              secondary="앱 암호로 연동"
              primaryTypographyProps={{ fontSize: '0.95rem' }}
              secondaryTypographyProps={{ fontSize: '0.85rem' }}
            />
          </ListItemButton>
        </List>
      </DialogContent>
      <DialogActions sx={{ pt: 0.5, pb: 1.5 }}>
        <Button onClick={onClose} size="small" sx={{ textTransform: 'none' }}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CalendarSelectionDialog;