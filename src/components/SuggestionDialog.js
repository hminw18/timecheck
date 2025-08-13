import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { db } from '../config/firebase';
import Toast from './Toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SuggestionDialog = ({ open, onClose }) => {
  const [suggestion, setSuggestion] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleSubmit = async () => {
    if (!suggestion.trim()) {
      showToast('제안 내용을 입력해주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting to database:', db._databaseId);
      await addDoc(collection(db, 'suggestions'), {
        suggestion: suggestion.trim(),
        email: email.trim() || null,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      showToast('소중한 제안 감사합니다! 검토 후 반영하도록 하겠습니다.', 'success');
      
      // Reset form
      setSuggestion('');
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      console.error('Error details:', error.code, error.message);
      showToast(`제안 전송에 실패했습니다: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuggestion('');
      setEmail('');
      onClose();
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose}
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
            TimeCheck에 피드백하기
          </Typography>
          <IconButton
            onClick={handleClose}
            disabled={loading}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                피드백
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="피드백은 정말 큰 도움이 됩니다."
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                disabled={loading}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: {xs: '0.8rem', sm: '1rem'}
                  }
                }}
              />
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                이메일 (선택사항)
              </Typography>
              <TextField
                fullWidth
                placeholder="꼭 답장을 드리겠습니다."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                variant="outlined"
                type="email"
                autoComplete="email"
                inputProps={{
                  autoComplete: "email"
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.8rem', sm: '1rem' }
                  }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !suggestion.trim()}
            sx={{ 
              width: '100%',
              height: 48,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(100, 181, 246, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(100, 181, 246, 0.4)',
              },
              '&:disabled': {
                boxShadow: 'none',
              }
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                제출 중...
              </>
            ) : (
              '피드백 제출하기'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </>
  );
};

export default SuggestionDialog;