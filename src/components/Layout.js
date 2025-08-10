import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Avatar, Menu, MenuItem, IconButton, Divider, ListItemIcon, ListItemText, Snackbar, Alert } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from './LoginDialog';
import SuggestionDialog from './SuggestionDialog';
import CalendarSelectionDialog from './CalendarSelectionDialog';
import AppleCalendarDialog from './AppleCalendarDialog';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';

const Layout = ({ children, eventDetails }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, signIn, authError, setAuthError, isFirstLogin, clearFirstLogin } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  
  // Calendar integration
  const {
    calendarSelectionDialog,
    setCalendarSelectionDialog,
    appleDialogOpen,
    setAppleDialogOpen,
    handleAppleCalendarConnect,
    calendarImportError
  } = useCalendarIntegration();

  useEffect(() => {
    if (authError) {
      setSnackbarMessage(authError);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setAuthError(null); // Clear error after showing
    }
  }, [authError, setAuthError]);

  // Show calendar dialog for first-time login users
  useEffect(() => {
    if (user && isFirstLogin) {
      setCalendarSelectionDialog(true);
      clearFirstLogin(); // Clear the first login flag
    }
  }, [user, isFirstLogin, setCalendarSelectionDialog, clearFirstLogin]);

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
          <Toolbar sx={{ minHeight: { xs: 80, sm: 56 }, pl: { xs: 1, sm: 0 }, pr: { xs: 2, sm: 0 }, pt: { xs: 1.5, sm: 1 } }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              flexGrow: 1, 
              gap: { xs: 0.5, sm: 1 } 
            }}>
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
              {location.pathname === '/' && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    ml: { xs: 0.5, sm: 0.5},
                    mt: { xs: 0, sm: 1 }
                  }}
                >
                  쉽고 빠른 모임 일정 정하기
                </Typography>
              )}
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
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.08))',
                      mt: 1,
                      minWidth: { xs: 180, sm: 200 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
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
                        borderLeft: '1px solid',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ 
                    px: 2, 
                    py: { xs: 1.25, sm: 1.5 }, 
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        src={user.photoURL} 
                        alt={user.displayName}
                        sx={{ width: 36, height: 36 }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {user.displayName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.7rem'
                          }}
                        >
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ py: 0.25 }}>
                    <MenuItem 
                      onClick={handleShowMyEvents} 
                      sx={{ 
                        py: { xs: 0.5, sm: 0.75 },
                        px: 2,
                        fontSize: '0.875rem',
                        borderRadius: 0,
                        minHeight: { xs: 36, sm: 'auto' },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <EventIcon sx={{ fontSize: 18 }} color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primaryTypographyProps={{ 
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                          fontWeight: 500
                        }}
                      >
                        내 이벤트
                      </ListItemText>
                    </MenuItem>
                    <MenuItem 
                      onClick={handleShowSettings} 
                      sx={{ 
                        py: { xs: 0.5, sm: 0.75 },
                        px: 2,
                        fontSize: '0.875rem',
                        borderRadius: 0,
                        minHeight: { xs: 36, sm: 'auto' },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <SettingsIcon sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText 
                        primaryTypographyProps={{ 
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                          fontWeight: 500
                        }}
                      >
                        설정
                      </ListItemText>
                    </MenuItem>
                  </Box>
                  <Divider sx={{ my: 0.25 }} />
                  <Box sx={{ py: 0.25 }}>
                    <MenuItem 
                      onClick={handleSignOut} 
                      sx={{ 
                        py: { xs: 0.5, sm: 0.75 },
                        px: 2,
                        fontSize: '0.875rem',
                        borderRadius: 0,
                        minHeight: { xs: 36, sm: 'auto' },
                        '&:hover': {
                          backgroundColor: 'rgba(211, 47, 47, 0.04)',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <LogoutIcon sx={{ fontSize: 18, color: 'error.main' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primaryTypographyProps={{ 
                          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                          fontWeight: 500,
                          color: 'error.main'
                        }}
                      >
                        로그아웃
                      </ListItemText>
                    </MenuItem>
                  </Box>
                </Menu>
              </Box>
            ) : (
              <Typography
                variant="body2"
                onClick={() => setLoginDialogOpen(true)}
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
          alignItems: 'baseline',
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
          <Link 
            to="/privacy-policy" 
            style={{ 
              textDecoration: 'none'
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
          </Link>
          <Typography 
            variant="caption" 
            onClick={() => setSuggestionDialogOpen(true)}
            sx={{
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              cursor: 'pointer',
              color: '#64b5f6',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
                color: '#5ba3e0'
              }
            }}
          >
            피드백
          </Typography>
        </Box>
      </Box>
      
      <LoginDialog 
        open={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)} 
      />
      
      <SuggestionDialog
        open={suggestionDialogOpen}
        onClose={() => setSuggestionDialogOpen(false)}
      />

      {/* Calendar Selection Dialog */}
      <CalendarSelectionDialog
        open={calendarSelectionDialog}
        onClose={() => setCalendarSelectionDialog(false)}
        onGoogleSelect={() => {
          // Handle Google calendar selection
          setCalendarSelectionDialog(false);
        }}
        onAppleSelect={() => {
          setCalendarSelectionDialog(false);
          setAppleDialogOpen(true);
        }}
        isGoogleUser={user?.providerData[0]?.providerId === 'google.com'}
        showAlert={(message) => {
          setSnackbarMessage(message);
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }}
      />

      {/* Apple Calendar Dialog */}
      <AppleCalendarDialog
        open={appleDialogOpen}
        onClose={() => setAppleDialogOpen(false)}
        onConnect={handleAppleCalendarConnect}
        error={calendarImportError}
        isLoading={false}
      />
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 } }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%', maxWidth: 400 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;