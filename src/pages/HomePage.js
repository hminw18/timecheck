import React, { useState, useEffect } from 'react';
import { Box, Snackbar, Alert, Fab, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLocation } from 'react-router-dom';
import EventForm from '../components/EventForm';
import { MOBILE_BREAKPOINT } from '../utils/constants';

const HomePage = ({ handleCreateEvent }) => {
  const location = useLocation();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);

  useEffect(() => {
    if (location.state?.error) {
      setSnackbar({ open: true, message: location.state.error, severity: 'error' });
      // Clear the error from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 2, maxWidth: '800px', mx: 'auto', mt: 0, pb: isMobile ? 10 : 2 }}>
      <EventForm setEventDetails={handleCreateEvent} isMobile={isMobile} />
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 } }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%', maxWidth: 400 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HomePage;