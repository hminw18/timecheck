import React from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const SlideTransition = (props) => {
  return <Slide {...props} direction="up" />;
};

const Toast = ({ 
  open, 
  message, 
  severity = 'success', 
  onClose,
  autoHideDuration = 4000,
  position = { vertical: 'bottom', horizontal: 'center' }
}) => {
  const getIcon = () => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon fontSize="inherit" />;
      case 'error':
        return <ErrorIcon fontSize="inherit" />;
      default:
        return undefined;
    }
  };

  const getColor = () => {
    switch (severity) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={position}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiSnackbar-root': {
          bottom: '24px !important',
        }
      }}
    >
      <Alert
        severity={getColor()}
        icon={getIcon()}
        variant="filled"
        sx={{
          minWidth: 'fit-content',
          maxWidth: 'calc(100vw - 32px)',
          width: 'auto',
          mx: 2,
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          '& .MuiAlert-icon': {
            fontSize: '20px',
            marginRight: '8px'
          },
          '& .MuiAlert-message': {
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;