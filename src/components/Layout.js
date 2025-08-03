import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Avatar, Menu, MenuItem, IconButton, Divider, ListItemIcon, ListItemText, Snackbar, Alert } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children, eventDetails }) => {
  const navigate = useNavigate();
  const { user, signOut, signIn, authError, setAuthError } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');

  useEffect(() => {
    if (authError) {
      setSnackbarMessage(authError);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setAuthError(null); // Clear error after showing
    }
  }, [authError, setAuthError]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSignOut = () => {
    signOut();
    handleMenuClose();
  };

  const handleShowMyEvents = () => {
    navigate('/my-events');
    handleMenuClose();
  };

  const handleShowSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <AppBar position="static" elevation={0} color="transparent">
        <Container maxWidth="lg">
          <Toolbar sx={{ minHeight: { xs: 64, sm: 56 }, pl: { xs: 1, sm: 0 }, pr: { xs: 2, sm: 0 }, pt: { xs: 1.5, sm: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <img 
                  src="/timechecklogo.svg"
                  alt="TimeCheck" 
                  style={{ 
                    height: '32px',
                    width: 'auto',
                    objectFit: 'contain'
                  }} 
                />
              </Link>
            </Box>
            {user ? (
              <Box>
                <IconButton 
                  onClick={handleMenuOpen}
                  sx={{ 
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)'
                    }
                  }}
                >
                  <Avatar 
                    src={user.photoURL} 
                    alt={user.displayName}
                    sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}
                  />
                </IconButton>
                <Menu 
                  anchorEl={anchorEl} 
                  open={Boolean(anchorEl)} 
                  onClose={handleMenuClose}
                  PaperProps={{
                    elevation: 4,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                      mt: 1.5,
                      minWidth: 220,
                      '& .MuiAvatar-root': {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {user.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <MenuItem onClick={handleShowMyEvents} sx={{ py: 1 }}>
                    <ListItemIcon>
                      <EventIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText>내 이벤트</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleShowSettings} sx={{ py: 1 }}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText>설정</ListItemText>
                  </MenuItem>
                  <Divider sx={{ my: 1 }} />
                  <MenuItem onClick={handleSignOut} sx={{ py: 1, color: 'error.main' }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>로그아웃</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Typography
                variant="body2"
                onClick={signIn}
                sx={{
                  cursor: 'pointer',
                  color: '#1976d2',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                로그인
              </Typography>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Box sx={{ flex: 1, py: 2, width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
        {children}
      </Box>
      
      {/* Footer */}
      <Box sx={{ 
        py: 1, 
        pl: 3, 
        pr: 3
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 2
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.65rem', sm: '0.75rem' }
            }}
          >
            © 2025 TimeCheck
          </Typography>
          <a 
            href="/privacy-policy" 
            style={{ 
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              개인정보처리방침
            </Typography>
          </a>
        </Box>
      </Box>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;