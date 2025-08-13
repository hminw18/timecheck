import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import './i18n';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import { useEventData } from './hooks/useEventData';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { GoogleOAuthProvider } from './contexts/GoogleOAuthContext';
import MyEventsPage from './pages/MyEventsPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AboutUsPage from './pages/AboutUsPage';
import Layout from './components/Layout';
import Toast from './components/Toast';

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

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleSaveWrapper = async (guestUserData) => {
    // If guestUserData is provided, pass it to handleSave
    const success = guestUserData ? 
      await handleSave(guestUserData) : 
      await handleSave();
    if (success) {
      showToast('일정이 저장되었습니다!');
    }
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
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />
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
  const { i18n } = useTranslation();
  
  useEffect(() => {
    // Update document title based on language
    if (i18n.language.startsWith('ko')) {
      document.title = 'TimeCheck - 모임 일정 정하기';
    } else {
      document.title = 'TimeCheck - Group Scheduling';
    }
  }, [i18n.language]);
  
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
            <Route path="/about-us" element={<Layout><AboutUsPage /></Layout>} />
          </Routes>
        </Router>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
