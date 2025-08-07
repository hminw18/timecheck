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
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SuggestionDialog = ({ open, onClose }) => {
  const [suggestion, setSuggestion] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSubmit = async () => {
    if (!suggestion.trim()) {
      setSnackbar({ 
        open: true, 
        message: '제안 내용을 입력해주세요.', 
        severity: 'error' 
      });
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

      setSnackbar({ 
        open: true, 
        message: '소중한 제안 감사합니다! 검토 후 반영하도록 하겠습니다.', 
        severity: 'success' 
      });
      
      // Reset form
      setSuggestion('');
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      console.error('Error details:', error.code, error.message);
      setSnackbar({ 
        open: true, 
        message: `제안 전송에 실패했습니다: ${error.message}`, 
        severity: 'error' 
      });
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
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="피드백은 정말 큰 도움이 됩니다"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                disabled={loading}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
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
                placeholder="이메일을 남겨주시면 꼭 답장을 드리겠습니다"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                variant="outlined"
                type="email"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#64b5f6',
                    }
                  }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button 
            onClick={handleClose}
            disabled={loading}
            size="small"
            sx={{ 
              px: 2,
              py: 0.25,
              minHeight: 28,
              textTransform: 'none',
              color: 'text.secondary'
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            size="small"
            disabled={loading || !suggestion.trim()}
            sx={{ 
              px: 2,
              py: 0.25,
              minHeight: 28,
              textTransform: 'none'
            }}
          >
            {loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              '제출'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
    </>
  );
};

export default SuggestionDialog;