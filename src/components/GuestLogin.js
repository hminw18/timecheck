import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Divider, IconButton } from '@mui/material';
import { validateGuestName } from '../utils/validation';

const GuestLogin = ({ onGuestLogin, onGoogleLogin, onAppleLogin }) => {
  const [guestName, setGuestName] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [nameError, setNameError] = useState(false);

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    
    // Validate guest name
    const nameValidation = validateGuestName(guestName);
    if (!nameValidation.isValid) {
      setNameError(true);
      return;
    }
    
    setNameError(false);
    onGuestLogin(nameValidation.value, guestPassword);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 300 }, px: { xs: 0, sm: 2 } }}>
      <form onSubmit={handleGuestSubmit}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <TextField
              fullWidth
              placeholder="이름"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setNameError(false);
              }}
              error={nameError}
              helperText={nameError ? "이름을 확인해주세요" : ""}
              autoFocus
              autoComplete="name"
              inputProps={{
                style: { fontSize: 16 }, // Prevents zoom on iOS
                autoComplete: "name"
              }}
              sx={{
                '& .MuiInputBase-root': {
                  height: '36px',
                  fontSize: '0.95rem'
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px !important' // Prevents zoom on iOS
                }
              }}
            />
            <TextField
              fullWidth
              type="password"
              placeholder="비밀번호 (선택사항)"
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              autoComplete="off"
              inputProps={{
                style: { fontSize: 16 }, // Prevents zoom on iOS
                autoComplete: "off"
              }}
              sx={{
                '& .MuiInputBase-root': {
                  height: '36px',
                  fontSize: '0.95rem'
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px !important' // Prevents zoom on iOS
                }
              }}
            />
          </Box>
          <Button
            variant="contained"
            type="submit"
            disableElevation
            sx={{ 
              minWidth: '60px',
              px: 2,
              fontSize: '0.9rem',
              lineHeight: 1.2,
              textAlign: 'center'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <span>게스트</span>
              <span>로그인</span>
            </Box>
          </Button>
        </Box>
      </form>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            또는 로그인해서 애플, 구글 캘린더 연동하기
          </Typography>
        </Divider>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {/* Apple Login Button */}
          <IconButton 
            onClick={onAppleLogin}
            sx={{ 
              border: '1px solid #000',
              borderRadius: '50%',
              p: 1,
              backgroundColor: '#000',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#000',
                borderColor: '#000',
                opacity: 0.8
              }
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </IconButton>
          
          {/* Google Login Button */}
          <IconButton 
            onClick={onGoogleLogin}
            sx={{ 
              border: '1px solid #e0e0e0',
              borderRadius: '50%',
              p: 1,
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderColor: '#d0d0d0'
              }
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default GuestLogin;