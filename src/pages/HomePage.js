import React, { useState, useEffect } from 'react';
import { Box, Fab, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLocation } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Toast from '../components/Toast';
import { MOBILE_BREAKPOINT } from '../utils/constants';

const HomePage = ({ handleCreateEvent }) => {
  const location = useLocation();
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' });

  // Show toast helper
  const showToast = (message, severity = 'error') => {
    setToast({ open: true, message, severity });
  };
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);

  useEffect(() => {
    if (location.state?.error) {
      showToast(location.state.error, 'error');
      // Clear the error from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);


  return (
    <Box sx={{ p: 2, maxWidth: '800px', mx: 'auto', mt: 0, pb: isMobile ? 10 : 2 }}>
      <EventForm setEventDetails={handleCreateEvent} isMobile={isMobile} />
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </Box>
  );
};

export default HomePage;