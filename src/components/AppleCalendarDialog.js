import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Alert, Typography, Button, CircularProgress } from '@mui/material';
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
  
  // Generate CSRF token when dialog opens
  useEffect(() => {
    if (open) {
      generateToken();
      setIsSubmitting(false); // Reset submission state when dialog opens
      setError(''); // Clear any previous errors
    }
  }, [open]);
  
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
    } catch (err) {
      setError('Failed to initialize secure connection');
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Apple Calendar 연동</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
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
            <form 
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="csrfToken" value={csrfToken} />
              
              <TextField
                fullWidth
                placeholder="Apple ID"
                type="email"
                name="appleId"
                required
                disabled={externalLoading || !csrfToken || isSubmitting}
                autoComplete="email"
                inputProps={{
                  autoComplete: "email"
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                placeholder="앱 암호"
                type="password"
                name="appSpecificPassword"
                required
                disabled={externalLoading || !csrfToken || isSubmitting}
                autoComplete="off"
                inputProps={{
                  autoComplete: "off"
                }}
                sx={{ mb: 3 }}
              />
              
              <Typography variant="body2" color="text.secondary">
                <strong>앱 암호 생성 방법:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2, mt: 1 }}>
                <li><a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer">appleid.apple.com</a> 접속</li>
                <li>로그인 후 "로그인 및 보안" 메뉴로 이동</li>
                <li>"앱 암호" 선택</li>
                <li>"+" 버튼을 눌러 새 암호 생성</li>
                <li>생성된 암호를 여기에 입력</li>
              </Typography>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button 
                  type="button"
                  onClick={onClose} 
                  disabled={externalLoading || isSubmitting} 
                  size="small" 
                  sx={{ textTransform: 'none' }}
                >
                  취소
                </Button>
                <Button 
                  type="submit"
                  variant="contained" 
                  disabled={externalLoading || !csrfToken || isSubmitting} 
                  size="small" 
                  sx={{ textTransform: 'none' }}
                >
                  {externalLoading || isSubmitting ? '연결 중...' : '연결'}
                </Button>
              </Box>
            </form>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AppleCalendarDialog;