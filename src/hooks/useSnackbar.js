import { useState, useCallback } from 'react';

// Common snackbar state management hook
const useSnackbar = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');

  const showSnackbar = useCallback((msg, sev = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const hideSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  }, []);

  return {
    snackbarOpen: open,
    snackbarMessage: message,
    snackbarSeverity: severity,
    showSnackbar,
    hideSnackbar
  };
};

export default useSnackbar;