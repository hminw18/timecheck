import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, IconButton, Snackbar, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Chip, Divider, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import FixedSchedule from '../components/FixedSchedule';
import CalendarSelectionDialog from '../components/CalendarSelectionDialog';
import AppleCalendarDialog from '../components/AppleCalendarDialog';
import { useEventData } from '../hooks/useEventData';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';
import { useGoogleOAuth } from '../contexts/GoogleOAuthContext';
import { Navigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, isLoading } = useAuth();
  const { fixedSchedule, handleSaveFixedSchedule } = useEventData(null, user);
  
  // Google OAuth state
  const { 
    isConnected: googleConnected, 
    isConnecting: googleConnecting, 
    connect: connectGoogle, 
    disconnect: disconnectGoogle,
    checkConnectionStatus,
    error: googleOAuthError
  } = useGoogleOAuth();
  
  const {
    // Apple Calendar
    appleCalendarConnected,
    appleCalendarUser,
    isLoadingApple: isConnectingApple,
    disconnectAppleCalendar,
    handleAppleCalendarConnect,
    
    // Apple dialog state
    appleDialogOpen,
    setAppleDialogOpen,
    
    // Calendar selection dialog
    calendarSelectionDialog,
    setCalendarSelectionDialog,
    
    // Error state
    calendarImportError: error,
  } = useCalendarIntegration();
  
  // Name editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editedName, setEditedName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.email || 'User');
      setEditedName(user.displayName || user.email || 'User');
      
      // Check Google Calendar connection status
      checkConnectionStatus();
      
      // Check for calendar connection results from URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('apple_connected') === 'true') {
        setSnackbar({ 
          open: true, 
          message: 'Apple Calendar가 성공적으로 연동되었습니다.', 
          severity: 'success' 
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('apple_error')) {
        setSnackbar({ 
          open: true, 
          message: urlParams.get('apple_error'), 
          severity: 'error' 
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('google_connected') === 'true') {
        setSnackbar({ 
          open: true, 
          message: 'Google Calendar가 연동되었습니다.', 
          severity: 'success' 
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user, checkConnectionStatus]);
  
  // Remove this entire useEffect - it's causing the problem

  // Show Google OAuth errors in Snackbar
  useEffect(() => {
    if (googleOAuthError) {
      setSnackbar({ 
        open: true, 
        message: googleOAuthError, 
        severity: 'error' 
      });
    }
  }, [googleOAuthError]);

  const handleGoogleConnect = () => {
    connectGoogle();
    // Success message will be shown via URL parameter redirect
  };
  
  const handleGoogleDisconnect = async () => {
    try {
      await disconnectGoogle();
      setSnackbar({ 
        open: true, 
        message: 'Google Calendar 연동이 해제되었습니다.', 
        severity: 'success' 
      });
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Google Calendar 연동 해제에 실패했습니다.', 
        severity: 'error' 
      });
    }
  };
  
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      setSnackbar({ open: true, message: '이름을 입력해주세요.', severity: 'error' });
      return;
    }
    
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: editedName.trim()
      });
      
      // Update Firestore user document (use setDoc with merge to create if doesn't exist)
      await setDoc(doc(db, 'users', user.uid), {
        displayName: editedName.trim()
      }, { merge: true });
      
      setDisplayName(editedName.trim());
      setIsEditingName(false);
      setSnackbar({ open: true, message: '이름이 변경되었습니다.', severity: 'success' });
    } catch (error) {
      // Console statement removed for productionsetSnackbar({ open: true, message: '이름 변경 중 오류가 발생했습니다.', severity: 'error' });
    }
  };
  
  const handleCancelEdit = () => {
    setEditedName(displayName);
    setIsEditingName(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const deletePromises = [];
      
      // 1. Delete only user document and fixed schedule (keep event data for other participants)
      deletePromises.push(deleteDoc(doc(db, 'users', user.uid)));
      deletePromises.push(deleteDoc(doc(db, 'fixedSchedules', user.uid)));
      
      // Execute deletions
      await Promise.all(deletePromises);
      
      // 2. Delete Firebase Auth user (this will also sign out)
      await deleteUser(user);
      
      setSnackbar({ open: true, message: '계정이 성공적으로 삭제되었습니다.', severity: 'success' });
      
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      let errorMessage = '계정 삭제 중 오류가 발생했습니다.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = '보안을 위해 다시 로그인한 후 계정을 삭제해주세요.';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteAccountDialog(false);
    }
  };

  const handleAppleConnect = () => {
    handleAppleCalendarConnect();
  };

  // Redirect to home if not logged in (after hooks are called)
  if (!isLoading && !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        p: 3
      }}>
        <Box sx={{ width: '100%', maxWidth: '800px' }}>
          
          {/* User Profile Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">프로필</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" color="text.secondary">Name:</Typography>
              {isEditingName ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <TextField
                    size="small"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    fullWidth
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                    }}
                  />
                  <IconButton 
                    onClick={handleSaveName} 
                    size="small"
                    sx={{ 
                      color: 'success.main',
                      '&:hover': { backgroundColor: 'success.light', opacity: 0.1 }
                    }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    onClick={handleCancelEdit} 
                    size="small"
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Typography variant="body1">{displayName}</Typography>
                  <IconButton onClick={() => setIsEditingName(true)} size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
            
            {user?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Typography variant="body1" color="text.secondary">Email:</Typography>
                <Typography variant="body1">{user.email}</Typography>
              </Box>
            )}
            
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Calendar Integration Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">캘린더 연동</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setCalendarSelectionDialog(true)}
                  sx={{ p: 0.5 }}
                >
                  <AddIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                캘린더를 연동하면 일정 작성 시 기존 일정을 자동으로 불러올 수 있습니다.
              </Typography>
            </Box>
            
            <List sx={{ pt: 0 }}>
              {/* Google Calendar */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <GoogleIcon sx={{ fontSize: 24 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={googleConnected ? (user?.email || 'Google Calendar') : 'Google Calendar'}
                  secondary={
                    googleConnected 
                      ? '연동됨' 
                      : user?.providerData[0]?.providerId === 'google.com' 
                        ? '연동 가능'
                        : 'Google 계정으로 로그인 필요'
                  }
                  primaryTypographyProps={{ fontSize: '0.95rem' }}
                  secondaryTypographyProps={{ fontSize: '0.85rem' }}
                />
                <ListItemSecondaryAction>
                  {googleConnected ? (
                    <IconButton 
                      edge="end" 
                      onClick={handleGoogleDisconnect}
                      disabled={googleConnecting}
                      sx={{ '&:hover': { color: 'error.main' } }}
                    >
                      <ClearIcon />
                    </IconButton>
                  ) : user?.providerData[0]?.providerId === 'google.com' ? (
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={handleGoogleConnect}
                      disabled={googleConnecting}
                      sx={{ textTransform: 'none' }}
                    >
                      {googleConnecting ? '연동 중...' : '연동하기'}
                    </Button>
                  ) : (
                    <Chip label="사용 불가" size="small" variant="outlined" />
                  )}
                </ListItemSecondaryAction>
              </ListItem>

              {/* Apple Calendar */}
              <ListItem 
                sx={{ 
                  px: 2, 
                  py: 1.5,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AppleIcon sx={{ fontSize: 24, color: '#000' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={appleCalendarConnected ? (appleCalendarUser?.appleId || 'Apple Calendar') : 'Apple Calendar'}
                  secondary={appleCalendarConnected ? '연동됨' : '앱 암호로 연동 가능'}
                  primaryTypographyProps={{ fontSize: '0.95rem' }}
                  secondaryTypographyProps={{ fontSize: '0.85rem' }}
                />
                <ListItemSecondaryAction>
                  {appleCalendarConnected ? (
                    <IconButton 
                      edge="end" 
                      onClick={disconnectAppleCalendar}
                      sx={{ '&:hover': { color: 'error.main' } }}
                    >
                      <ClearIcon />
                    </IconButton>
                  ) : (
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={() => setAppleDialogOpen(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      연동하기
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Fixed Schedule Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography variant="h6">고정 일정</Typography>
              <Typography variant="body2" color="text.secondary">
                매주 반복되는 불가능한 시간대를 설정하세요.
              </Typography>
            </Box>
            <FixedSchedule 
              fixedSchedule={fixedSchedule} 
              onSave={handleSaveFixedSchedule}
            />
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Account Deletion Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>계정 삭제</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              계정을 삭제하면 프로필 정보, 캘린더 연동 설정, 고정 일정 설정이 영구적으로 삭제됩니다.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setDeleteAccountDialog(true)}
              sx={{
                borderRadius: 2,
                fontWeight: 500,
                textTransform: 'none'
              }}
            >
              계정 삭제
            </Button>
          </Box>
        </Box>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 } }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%', maxWidth: 400 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Calendar Selection Dialog */}
      <CalendarSelectionDialog
        open={calendarSelectionDialog}
        onClose={() => setCalendarSelectionDialog(false)}
        onGoogleSelect={handleGoogleConnect}
        onAppleSelect={() => setAppleDialogOpen(true)}
        isGoogleUser={user?.providerData[0]?.providerId === 'google.com'}
        showAlert={(message) => setSnackbar({ 
          open: true, 
          message: message, 
          severity: 'info' 
        })}
      />

      {/* Apple Calendar Dialog */}
      <AppleCalendarDialog
        open={appleDialogOpen}
        onClose={() => setAppleDialogOpen(false)}
        onConnect={handleAppleConnect}
        error={error}
        isLoading={isConnectingApple}
      />

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteAccountDialog}
        onClose={() => setDeleteAccountDialog(false)}
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1
        }}>
          <Typography variant="h6" fontWeight={600}>
            계정 삭제
          </Typography>
          <IconButton
            onClick={() => setDeleteAccountDialog(false)}
            disabled={isDeleting}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            정말로 계정을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            프로필 정보, 캘린더 연동 설정, 고정 일정 설정이 영구적으로 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button 
            onClick={() => setDeleteAccountDialog(false)}
            disabled={isDeleting}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              minWidth: 80,
              fontWeight: 500
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            variant="contained"
            color="error"
            autoFocus
            sx={{ 
              borderRadius: 2,
              minWidth: 80,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none'
              }
            }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default SettingsPage;
