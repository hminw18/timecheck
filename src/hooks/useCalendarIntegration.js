import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../contexts/GoogleOAuthContext';
import appleCalendarService from '../services/appleCalendarService';
import googleCalendarService from '../services/googleCalendarService';

export const useCalendarIntegration = (eventDetails = null) => {
  const { 
    appleCalendarConnected, 
    connectAppleCalendar, 
    disconnectAppleCalendar, 
    appleCalendarUser
  } = useAuth();
  
  // Google OAuth state
  const {
    isConnected: googleConnected,
    isConnecting: googleConnecting,
    connect: connectGoogle,
    disconnect: disconnectGoogle
  } = useGoogleOAuth();

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingApple, setIsLoadingApple] = useState(false);
  const [calendarImportError, setCalendarImportError] = useState('');
  const [appleDialogOpen, setAppleDialogOpen] = useState(false);
  const [calendarSelectionDialog, setCalendarSelectionDialog] = useState(false);
  const [waitingForGoogleToken, setWaitingForGoogleToken] = useState(false);

  // Import Google Calendar events
  const importGoogleCalendarEvents = useCallback(async () => {
    
    if (!eventDetails || !googleConnected) return null;
    
    setIsLoadingGoogle(true);
    try {
      // Use backend function to get events (no access token needed)
      const events = await googleCalendarService.getEvents(
        eventDetails.startDate,
        eventDetails.endDate,
        eventDetails.eventType,
        eventDetails.startTime,
        eventDetails.endTime,
        eventDetails.selectedDays
      );
      
      // Events are already processed by backend
      return events.map(event => ({
        ...event,
        source: 'google'
      }));
    } catch (error) {
      
      // Check for specific error types
      if (error.message?.includes('invalid_grant') || error.message?.includes('만료되었습니다')) {
        setCalendarImportError('Google Calendar 연동이 만료되었습니다. 다시 연동해주세요.');
        // Disconnect Google Calendar to force re-authentication
        await disconnectGoogle();
      } else if (error.message?.includes('No refresh token') || error.message?.includes('OAuth setup')) {
        setCalendarImportError('Google Calendar 연동이 필요합니다. 설정 페이지에서 연동해주세요.');
      } else {
        setCalendarImportError('일정을 가져오는 중 오류가 발생했습니다.');
      }
      
      return null;
    } finally {
      setIsLoadingGoogle(false);
    }
  }, [googleConnected, eventDetails, disconnectGoogle]);

  // Import Apple Calendar events
  const importAppleCalendarEvents = useCallback(async () => {
    if (!eventDetails || !appleCalendarConnected) return null;
    
    setIsLoadingApple(true);
    try {
      const events = await appleCalendarService.getEvents(
        new Date(eventDetails.startDate), 
        new Date(eventDetails.endDate)
      );
      
      // Console statement removed for production
      const processedEvents = events
        .filter(event => {
          // Console statement removed for production
          // For day-based events, only include recurring events
          if (eventDetails && eventDetails.eventType === 'day' && !event.isRecurring) {
            // Console statement removed for production
            return false;
          }
          return true;
        })
        .map(event => ({
          start: event.start,
          end: event.end,
          title: event.title || event.summary || '일정',
          source: 'apple',
          isRecurring: event.isRecurring || false,
          recurrenceRule: event.recurrenceRule || null
        }));
      
      // Console statement removed for production
      return processedEvents;
    } catch (error) {
      // Console statement removed for production
      setCalendarImportError('Apple Calendar 일정을 가져오는 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoadingApple(false);
    }
  }, [appleCalendarConnected, eventDetails]);

  // Handle Google Calendar connection/import
  const handleGoogleCalendarImport = useCallback(async () => {
    setIsLoadingGoogle(true);
    setCalendarImportError('');
    
    try {
      if (!googleConnected) {
        // Connect Google Calendar first
        setWaitingForGoogleToken(true);
        await connectGoogle();
        // Return null - the actual import will happen via useEffect when connection is established
        return null;
      } else {
        // Already connected, import events
        return await importGoogleCalendarEvents();
      }
    } catch (error) {
      setCalendarImportError('Google Calendar 연동 중 오류가 발생했습니다.');
      setIsLoadingGoogle(false);
      return null;
    }
  }, [googleConnected, connectGoogle, importGoogleCalendarEvents]);

  // Handle Apple Calendar connection
  const handleAppleCalendarConnect = useCallback(async () => {
    // This is now handled by the form submission
    // Just close the dialog and check for connection status
    setAppleDialogOpen(false);
    
    // The actual connection is handled by the form POST
    // We'll detect success by checking URL parameters or polling
    return { success: true };
  }, []);

  // Watch for Google connection and import events when it becomes available
  useEffect(() => {
    
    if (waitingForGoogleToken && googleConnected && eventDetails) {
      setWaitingForGoogleToken(false);
      importGoogleCalendarEvents();
    }
  }, [googleConnected, waitingForGoogleToken, importGoogleCalendarEvents, eventDetails]);

  // Toggle functions for calendar checkboxes
  const handleGoogleCalendarToggle = useCallback(async (checked) => {
    if (checked) {
      return await handleGoogleCalendarImport();
    }
    return null;
  }, [handleGoogleCalendarImport]);

  const handleAppleCalendarToggle = useCallback(async (checked) => {
    if (checked && appleCalendarConnected) {
      return await importAppleCalendarEvents();
    }
    return null;
  }, [appleCalendarConnected, importAppleCalendarEvents]);

  return {
    // Google Calendar
    googleConnected,
    googleConnecting,
    isLoadingGoogle,
    connectGoogleCalendar: connectGoogle,
    disconnectGoogleCalendar: disconnectGoogle,
    handleGoogleCalendarImport,
    handleGoogleCalendarToggle,
    
    // Apple Calendar
    appleCalendarConnected,
    appleCalendarUser,
    isLoadingApple,
    connectAppleCalendar,
    disconnectAppleCalendar,
    handleAppleCalendarConnect,
    handleAppleCalendarToggle,
    
    // Apple dialog state
    appleDialogOpen,
    setAppleDialogOpen,
    
    // Calendar selection dialog
    calendarSelectionDialog,
    setCalendarSelectionDialog,
    
    // Shared state
    calendarImportError,
    setCalendarImportError,
    
    // Import functions (for direct use)
    importGoogleCalendarEvents,
    importAppleCalendarEvents,
  };
};