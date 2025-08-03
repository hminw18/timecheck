import React, { useState } from 'react';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import { useEventData } from './hooks/useEventData';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { GoogleOAuthProvider } from './contexts/GoogleOAuthContext';
import MyEventsPage from './pages/MyEventsPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Layout from './components/Layout';

import { ThemeProvider } from '@mui/material/styles';
import theme from './config/theme';

function EventPageWrapper() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const {
    isEventLoading,
    eventDetails,
    myUnavailableSchedule,
    setMyUnavailableSchedule,
    myIfNeededSchedule,
    setMyIfNeededSchedule,
    groupSchedule,
    totalMembers,
    respondedUsers,
    availableWeeks,
    handleSave,
    fixedSchedule,
  } = useEventData(eventId, user);

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSaveWrapper = async (guestUserData) => {
    // If guestUserData is provided, pass it to handleSave
    const success = guestUserData ? 
      await handleSave(guestUserData) : 
      await handleSave();
    if (success) {
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  if (isEventLoading || !eventDetails) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
      </Layout>
    );
  }

  return (
    <Layout eventDetails={eventDetails}>
      <EventPage
        eventId={eventId}
        eventDetails={eventDetails}
        myUnavailableSchedule={myUnavailableSchedule}
        setMyUnavailableSchedule={setMyUnavailableSchedule}
        myIfNeededSchedule={myIfNeededSchedule}
        setMyIfNeededSchedule={setMyIfNeededSchedule}
        onSave={handleSaveWrapper}
        groupSchedule={groupSchedule}
        totalMembers={totalMembers}
        availableWeeks={availableWeeks}
        respondedUsers={respondedUsers}
        fixedSchedule={fixedSchedule}
      />
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          일정이 저장되었습니다!
        </Alert>
      </Snackbar>
    </Layout>
  );
}

function HomePageWrapper() {
  const { user } = useAuth();
  const { handleCreateEvent } = useEventData(null, user);
  
  return (
    <Layout>
      <HomePage handleCreateEvent={handleCreateEvent} />
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <GoogleOAuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePageWrapper />} />
            <Route path="/event/:eventId" element={<EventPageWrapper />} />
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          </Routes>
        </Router>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
