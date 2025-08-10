import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, Alert, Typography, Button, CircularProgress, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AppleCalendarDialog = ({ 
  open, 
  onClose, 
  onConnect,
  error: externalError,
  isLoading: externalLoading
}) => {
  const [csrfToken, setCsrfToken] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');
  
  // Generate CSRF token when dialog opens
  useEffect(() => {
    if (open && !tokenGenerated) {
      generateToken();
      setIsSubmitting(false); // Reset submission state when dialog opens
      setError(''); // Clear any previous errors
    } else if (!open) {
      // Reset token state when dialog closes
      setTokenGenerated(false);
      setCsrfToken('');
      setEndpoint('');
    }
  }, [open, tokenGenerated]);
  
  const generateToken = async () => {
    setIsGeneratingToken(true);
    setError('');
    try {
      // Enforce HTTPS for production
      if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
        setError('보안을 위해 HTTPS 연결이 필요합니다. HTTPS로 접속해주세요.');
        return;
      }
      
      const functions = getFunctions(undefined, 'asia-northeast3');
      const generateToken = httpsCallable(functions, 'generateAppleCalendarToken');
      const result = await generateToken();
      
      // Set CSRF cookie for double submit cookie pattern
      // Using SameSite=Strict for maximum protection
      const cookieOptions = [
        `csrf-token=${result.data.cookieToken}`,
        'Path=/',
        'SameSite=None', // Must be None for cross-site form submission
        'Secure', // Required with SameSite=None
        `Max-Age=${30 * 60}` // 30 minutes
      ];
      
      // Note: HttpOnly cannot be set from JavaScript
      // For production, consider setting cookie from server response
      document.cookie = cookieOptions.join('; ');
      
      
      setCsrfToken(result.data.token);
      setEndpoint(result.data.endpoint);
      setTokenGenerated(true);
    } catch (err) {
      console.error('Token generation error:', err);
      setError('보안 연결 초기화에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGeneratingToken(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const formData = new FormData(e.target);
    const appleId = formData.get('appleId');
    const appPassword = formData.get('appSpecificPassword');
    
    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const appPasswordRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    
    if (!emailRegex.test(appleId)) {
      setError('잘못된 Apple ID 형식입니다. 올바른 이메일 주소를 입력해주세요.');
      return;
    }
    
    if (!appPasswordRegex.test(appPassword)) {
      setError('잘못된 앱 암호 형식입니다. (형식: xxxx-xxxx-xxxx-xxxx)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData).toString(),
      });
      
      if (!response.ok) {
        // Error - get JSON response
        const data = await response.json();
        setError(data.error || '연결에 실패했습니다.');
        setIsSubmitting(false);
      } else {
        // Success - check for JSON response
        const data = await response.json();
        if (data.success) {
          // Redirect to settings page with success message
          window.location.href = '/settings?apple_connected=true';
        } else {
          setError(data.error || '연결에 실패했습니다.');
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      setError('연결 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
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
          Apple Calendar 연동
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ 
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        {(error || externalError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || externalError}
          </Alert>
        )}
        
        {isGeneratingToken ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            
            {/* Help Section */}
            <Box sx={{ mb: 3 }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    '& .help-text': {
                      textDecoration: 'underline'
                    }
                  }
                }}
                onClick={() => setShowHelp(!showHelp)}
              >
                <Typography 
                  variant="body2" 
                  className="help-text"
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 500
                  }}
                >
                  앱 암호
                </Typography>
                <HelpOutlineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </Box>
              
              <Collapse in={showHelp}>
                <Box sx={{ 
                  pl: 2, 
                  py: 1, 
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderLeftColor: 'primary.main'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Apple Calendar 연동을 위해 앱 암호가 필요합니다:
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                      <a 
                        href="https://appleid.apple.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'underline' }}
                      >
                        appleid.apple.com
                      </a> 접속
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      "로그인 및 보안" → "앱 암호" 메뉴
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      "+" 버튼으로 새 앱 암호 생성
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>

            {/* Input Fields */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                placeholder="Apple ID"
                type="email"
                name="appleId"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                required
                disabled={externalLoading || !csrfToken || isSubmitting}
                autoComplete="email"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
                  }
                }}
              />
              
              <TextField
                fullWidth
                placeholder="앱 암호 (xxxx-xxxx-xxxx-xxxx)"
                type="password"
                name="appSpecificPassword"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
                disabled={externalLoading || !csrfToken || isSubmitting}
                autoComplete="off"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
                  }
                }}
              />
              
              <Button 
                type="submit"
                variant="contained" 
                disabled={externalLoading || !csrfToken || isSubmitting || !appleId.trim() || !appPassword.trim()} 
                sx={{ 
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(100, 181, 246, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(100, 181, 246, 0.4)',
                  },
                  '&:disabled': {
                    boxShadow: 'none',
                  }
                }}
              >
                {externalLoading || isSubmitting ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    연결 중...
                  </>
                ) : (
                  'Apple Calendar 연결'
                )}
              </Button>
            </Box>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppleCalendarDialog;