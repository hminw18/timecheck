import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Box, CircularProgress, Alert, Snackbar, Button, IconButton, Tooltip, ListItem, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MySchedule from '../components/MySchedule';
import GroupSchedule from '../components/GroupSchedule';
import CalendarSelectionDialog from '../components/CalendarSelectionDialog';
import AppleCalendarDialog from '../components/AppleCalendarDialog';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../contexts/GoogleOAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import dayjs from '../config/dayjsConfig';
import { getDaysForWeek as getDaysForWeekUtil } from '../utils/timeUtils';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';

const EventPage = ({
  eventId,
  eventDetails,
  myUnavailableSchedule,
  setMyUnavailableSchedule,
  myIfNeededSchedule,
  setMyIfNeededSchedule,
  onSave,
  groupSchedule,
  totalMembers,
  availableWeeks,
  respondedUsers,
  fixedSchedule
}) => {
  const { user, signIn } = useAuth();
  const { isConnected: googleConnected } = useGoogleOAuth();
  const {
    // Google Calendar
    isLoadingGoogle,
    handleGoogleCalendarImport,
    handleGoogleCalendarToggle,
    
    // Apple Calendar
    appleCalendarConnected,
    appleCalendarUser,
    isLoadingApple,
    handleAppleCalendarConnect,
    handleAppleCalendarToggle,
    
    // Apple dialog state
    appleDialogOpen,
    setAppleDialogOpen,
    appleId,
    setAppleId,
    appSpecificPassword,
    setAppSpecificPassword,
    
    // Calendar selection dialog
    calendarSelectionDialog: showCalendarDialog,
    setCalendarSelectionDialog: setShowCalendarDialog,
    
    // Shared state
    calendarImportError,
  } = useCalendarIntegration(eventDetails);

  const [guestUser, setGuestUser] = useState(null);
  const [isCheckingGuest, setIsCheckingGuest] = useState(false);
  const [shouldStack, setShouldStack] = useState(false);
  const [calendarEventNames, setCalendarEventNames] = useState({});
  const [googleCalendarChecked, setGoogleCalendarChecked] = useState(false);
  const [appleCalendarChecked, setAppleCalendarChecked] = useState(false);
  const [fixedScheduleChecked, setFixedScheduleChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [hasLoadedExistingSchedule, setHasLoadedExistingSchedule] = useState(false);
  const [hasAutoLoadedCalendars, setHasAutoLoadedCalendars] = useState(false);
  const [hasLoadedGoogleCalendar, setHasLoadedGoogleCalendar] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  
  // Clipboard copy with fallback for iOS
  const copyToClipboard = (text) => {
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setSnackbarMessage('링크가 복사되었습니다!');
          setSnackbarOpen(true);
        })
        .catch(() => {
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };
  
  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setSnackbarMessage('링크가 복사되었습니다!');
        setSnackbarOpen(true);
      }
    } catch (err) {
      // Console statement removed for production
      }
    
    document.body.removeChild(textarea);
  };

  useEffect(() => {
    // Remove guest user from localStorage when page loads
    // This ensures fresh login every time
    if (!user) {
      localStorage.removeItem('guestUser');
      setGuestUser(null);
    }
  }, [user]);

  useEffect(() => {
    const checkShouldStack = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // For day-based events, calculate width based on selected days
      let estimatedWidth;
      if (eventDetails.eventType === 'day') {
        const daysCount = eventDetails.selectedDays ? eventDetails.selectedDays.length : 0;
        estimatedWidth = (daysCount * 60) + 200; // Each day column is narrower
      } else {
        estimatedWidth = (availableWeeks.length * 300) + 200;
      }
      
      setShouldStack(mobile || estimatedWidth > 1200);
    };
    checkShouldStack();
    window.addEventListener('resize', checkShouldStack);
    return () => window.removeEventListener('resize', checkShouldStack);
  }, [availableWeeks, eventDetails.eventType, eventDetails.selectedDays]);


  const handleGuestLogin = async (name, password) => {
    setIsCheckingGuest(true);
    const guestId = `guest_${name}_${password || 'nopass'}`;
    try {
      const availabilityDoc = await getDoc(doc(db, 'events', eventId, 'availabilities', guestId));
      if (availabilityDoc.exists()) {
        const data = availabilityDoc.data();
        setMyUnavailableSchedule(new Set(data.unavailable || []));
        setMyIfNeededSchedule(new Set(data.ifNeeded || []));
      }
      const guestData = { id: guestId, name, password, isGuest: true };
      setGuestUser(guestData);
      // Don't save to localStorage - fresh login required each time
    } catch (error) {
      // Console statement removed for production
      } finally {
      setIsCheckingGuest(false);
    }
  };


  // Process calendar events and update schedule
  const processCalendarEvents = useCallback((events, source) => {
    // Console statement removed for production
    if (!events || events.length === 0) return;
    
    const unavailableSlots = new Set();
    const eventNames = {};
    
    if (eventDetails.eventType === 'day') {
      // For day-based events, process recurring events
      const dayOfWeekMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
      // Console statement removed for production
      events.forEach(event => {
        // Console statement removed for production
        const start = dayjs(event.start);
        const end = dayjs(event.end);
        const eventTitle = event.title || '일정';
        const dayOfWeek = dayOfWeekMap[start.day()];
        
        // Console statement removed for production
        
        // Only process if this day is selected in the event
        if (!eventDetails.selectedDays || !eventDetails.selectedDays.includes(dayOfWeek)) {
          // Console statement removed for production
          return;
        }
        
        // Round start time down to nearest 30-minute interval
        let roundedStart = start;
        const startMinute = start.minute();
        if (startMinute > 0 && startMinute < 30) {
          roundedStart = start.minute(0);
        } else if (startMinute > 30) {
          roundedStart = start.minute(30);
        }
        
        // Round end time up to nearest 30-minute interval
        let roundedEnd = end;
        const endMinute = end.minute();
        if (endMinute > 0 && endMinute <= 30) {
          roundedEnd = end.minute(30);
        } else if (endMinute > 30) {
          roundedEnd = end.add(1, 'hour').minute(0);
        }
        
        let current = roundedStart;
        while (current.isBefore(roundedEnd)) {
          const slotTime = current.format('HH:mm');
          const slotHour = current.hour();
          const slotMinute = current.minute();
          const startHour = parseInt(eventDetails.startTime.split(':')[0]);
          const endHour = parseInt(eventDetails.endTime.split(':')[0]);
          
          // Check if the slot START time is within event hours
          // For a slot 14:30-15:00, we check if 14:30 < 15:00
          const slotStartsBeforeEnd = slotHour < endHour || (slotHour === endHour && slotMinute < parseInt(eventDetails.endTime.split(':')[1]));
          const slotStartsAfterStart = slotHour >= startHour;
          
          if (slotStartsAfterStart && slotStartsBeforeEnd) {
            const slotId = `${dayOfWeek}-${slotTime}`;
            // Console statement removed for production
            unavailableSlots.add(slotId);
            eventNames[slotId] = { title: eventTitle, source };
          }
          current = current.add(30, 'minute');
        }
      });
    } else {
      // For date-based events, process normally
      events.forEach(event => {
        const start = dayjs(event.start);
        const end = dayjs(event.end);
        const eventTitle = event.title || '일정';
        
        // Round start time down to nearest 30-minute interval
        let roundedStart = start;
        const startMinute = start.minute();
        if (startMinute > 0 && startMinute < 30) {
          roundedStart = start.minute(0);
        } else if (startMinute > 30) {
          roundedStart = start.minute(30);
        }
        
        // Round end time up to nearest 30-minute interval
        let roundedEnd = end;
        const endMinute = end.minute();
        if (endMinute > 0 && endMinute <= 30) {
          roundedEnd = end.minute(30);
        } else if (endMinute > 30) {
          roundedEnd = end.add(1, 'hour').minute(0);
        }
        
        let current = roundedStart;
        while (current.isBefore(roundedEnd)) {
          const slotId = `${current.format('YYYY-MM-DD')}-${current.format('HH:mm')}`;
          const slotHour = current.hour();
          const slotMinute = current.minute();
          const startHour = parseInt(eventDetails.startTime.split(':')[0]);
          const endHour = parseInt(eventDetails.endTime.split(':')[0]);
          
          // Check if the slot START time is within event hours
          // For a slot 14:30-15:00, we check if 14:30 < 15:00
          const slotStartsBeforeEnd = slotHour < endHour || (slotHour === endHour && slotMinute < parseInt(eventDetails.endTime.split(':')[1]));
          const slotStartsAfterStart = slotHour >= startHour;
          
          if (slotStartsAfterStart && slotStartsBeforeEnd) {
            unavailableSlots.add(slotId);
            eventNames[slotId] = { title: eventTitle, source };
          }
          current = current.add(30, 'minute');
        }
      });
    }
    
    // Console statement removed for production
    // Console statement removed for production
    setMyUnavailableSchedule(prev => {
      const newSet = new Set([...prev, ...unavailableSlots]);
      // Console statement removed for production
      return newSet;
    });
    setCalendarEventNames(prev => ({ ...prev, ...eventNames }));
  }, [eventDetails, setMyUnavailableSchedule]);

  // Wrapper for Google Calendar import
  const handleGoogleImport = useCallback(async () => {
    const events = await handleGoogleCalendarImport();
    if (events) {
      processCalendarEvents(events, 'google');
    }
  }, [handleGoogleCalendarImport, processCalendarEvents]);

  // Wrapper for Apple Calendar import  
  const handleAppleImport = useCallback(async () => {
    const result = await handleAppleCalendarConnect();
    if (result.success && result.events) {
      processCalendarEvents(result.events, 'apple');
    }
  }, [handleAppleCalendarConnect, processCalendarEvents]);

  const applyFixedSchedule = useCallback((shouldApply) => {
    if (!shouldApply || !fixedSchedule || fixedSchedule.length === 0) {
      // Remove fixed schedule slots - use functional update
      setMyUnavailableSchedule(prev => {
        const newUnavailable = new Set();
        
        if (eventDetails.eventType === 'day') {
          // For day-based events, remove fixed schedule from day slots
          prev.forEach(slot => {
            const isFixedSlot = fixedSchedule.some(fixedSlot => {
              const [day, time] = fixedSlot.split('-');
              return slot === `${day}-${time}`;
            });
            if (!isFixedSlot) {
              newUnavailable.add(slot);
            }
          });
        } else {
          // For date-based events
          const dayOfWeekMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
          prev.forEach(slot => {
            const isFixedSlot = fixedSchedule.some(fixedSlot => {
              const [day, time] = fixedSlot.split('-');
              const slotDate = dayjs(slot.split('-').slice(0, 3).join('-'));
              const slotDayOfWeek = dayOfWeekMap[slotDate.day()];
              return slot.includes(time) && slotDayOfWeek === day;
            });
            if (!isFixedSlot) {
              newUnavailable.add(slot);
            }
          });
        }
        return newUnavailable;
      });
      return;
    }

    // Apply fixed schedule - use functional update to ensure we have the latest state
    setMyUnavailableSchedule(prev => {
      const newUnavailable = new Set(prev);
      
      if (eventDetails.eventType === 'day') {
        // For day-based events, apply fixed schedule directly to selected days
        fixedSchedule.forEach(slot => {
          const [fixedDay, time] = slot.split('-');
          if (eventDetails.selectedDays && eventDetails.selectedDays.includes(fixedDay)) {
            newUnavailable.add(`${fixedDay}-${time}`);
          }
        });
      } else {
        // For date-based events
        const dayOfWeekMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
        availableWeeks.forEach(weekStart => {
          const weekDays = getDaysForWeekUtil(weekStart, eventDetails);
          weekDays.forEach(dateStr => {
            const date = dayjs(dateStr);
            const dayOfWeek = dayOfWeekMap[date.day()];
            
            fixedSchedule.forEach(slot => {
              const [fixedDay, time] = slot.split('-');
              if (fixedDay === dayOfWeek) {
                newUnavailable.add(`${dateStr}-${time}`);
              }
            });
          });
        });
      }
      
      return newUnavailable;
    });
  }, [fixedSchedule, availableWeeks, eventDetails, setMyUnavailableSchedule]);

  const currentUser = user || guestUser;
  
  // Create a unified save function
  const saveFunction = async () => {
    if (!currentUser) return false;
    
    // For guest users, call onSave with guest user data
    if (guestUser && !user) {
      // Create a user-like object for guest
      const guestUserData = {
        uid: guestUser.id,
        id: guestUser.id,
        displayName: guestUser.name,
        name: guestUser.name,
        photoURL: null,
        isGuest: true
      };
      
      // Temporarily set the guest user in the parent component
      return onSave(guestUserData);
    }
    
    // For regular users, just call onSave normally
    return onSave();
  };

  const handleGoogleToggle = useCallback(async (checked) => {
    setGoogleCalendarChecked(checked);
    if (checked) {
      setHasLoadedGoogleCalendar(false); // Reset flag when manually toggling
      const events = await handleGoogleCalendarToggle(checked);
      if (events) {
        processCalendarEvents(events, 'google');
        setHasLoadedGoogleCalendar(true); // Mark as loaded
      }
    } else {
      // Remove ONLY Google Calendar events
      const newUnavailable = new Set();
      const newEventNames = {};
      
      myUnavailableSchedule.forEach(slot => {
        // Keep the slot if it's not from a calendar event OR if it's from a different source
        if (!calendarEventNames[slot] || calendarEventNames[slot].source !== 'google') {
          newUnavailable.add(slot);
        }
      });
      
      Object.entries(calendarEventNames).forEach(([slotId, event]) => {
        // Keep events from other sources (apple, fixed)
        if (event.source !== 'google') {
          newEventNames[slotId] = event;
        }
      });
      
      setMyUnavailableSchedule(newUnavailable);
      setCalendarEventNames(newEventNames);
    }
  }, [handleGoogleCalendarToggle, processCalendarEvents, myUnavailableSchedule, calendarEventNames, setMyUnavailableSchedule]);

  const handleAppleToggle = useCallback(async (checked) => {
    setAppleCalendarChecked(checked);
    if (checked) {
      const events = await handleAppleCalendarToggle(checked);
      if (events) {
        processCalendarEvents(events, 'apple');
      }
    } else {
      // Remove ONLY Apple Calendar events
      const newUnavailable = new Set();
      const newEventNames = {};
      
      myUnavailableSchedule.forEach(slot => {
        // Keep the slot if it's not from a calendar event OR if it's from a different source
        if (!calendarEventNames[slot] || calendarEventNames[slot].source !== 'apple') {
          newUnavailable.add(slot);
        }
      });
      
      Object.entries(calendarEventNames).forEach(([slotId, event]) => {
        // Keep events from other sources (google, fixed)
        if (event.source !== 'apple') {
          newEventNames[slotId] = event;
        }
      });
      
      setMyUnavailableSchedule(newUnavailable);
      setCalendarEventNames(newEventNames);
    }
  }, [handleAppleCalendarToggle, processCalendarEvents, myUnavailableSchedule, calendarEventNames, setMyUnavailableSchedule]);

  const handleAddCalendar = () => setShowCalendarDialog(true);

  const handleFixedScheduleToggle = useCallback((checked) => {
    setFixedScheduleChecked(checked);
    applyFixedSchedule(checked);
  }, [applyFixedSchedule]);

  // Auto-load calendar and fixed schedule when entering an event for the first time
  const autoLoadCalendarAndFixedSchedule = useCallback(async () => {
    if (!user || !eventDetails || !eventId) return;
    
    
    // Collect all promises for calendar loading
    const calendarPromises = [];
    
    // Auto-load Google Calendar if connected
    if (googleConnected) {
      setGoogleCalendarChecked(true);
      calendarPromises.push(
        handleGoogleCalendarToggle(true).then(events => {
          if (events) {
            processCalendarEvents(events, 'google');
            setHasLoadedGoogleCalendar(true); // Mark as loaded
          }
          // Don't set the flag here if events is null, let the retry logic handle it
        })
      );
    }
    
    // Auto-load Apple Calendar if connected
    if (appleCalendarConnected) {
      setAppleCalendarChecked(true);
      calendarPromises.push(
        handleAppleCalendarToggle(true).then(events => {
          if (events) {
            processCalendarEvents(events, 'apple');
          }
        })
      );
    }
    
    // Wait for all calendar events to be loaded and processed
    await Promise.all(calendarPromises);
    
    // Auto-load fixed schedule AFTER calendar events are loaded
    if (fixedSchedule && fixedSchedule.length > 0) {
      setFixedScheduleChecked(true);
      applyFixedSchedule(true);
    }
  }, [user, eventDetails, eventId, googleConnected, appleCalendarConnected, fixedSchedule,
      handleGoogleCalendarToggle, handleAppleCalendarToggle, processCalendarEvents, applyFixedSchedule]);


  // Clear calendar event names when user changes (logout/guest login)
  useEffect(() => {
    if (!user || (user && user.isGuest)) {
      // Clear calendar-related states when logging out or switching to guest
      setCalendarEventNames({});
      setGoogleCalendarChecked(false);
      setAppleCalendarChecked(false);
      setFixedScheduleChecked(false);
    }
  }, [user]);

  // Show calendar import errors in Snackbar
  useEffect(() => {
    if (calendarImportError) {
      setSnackbarMessage(calendarImportError);
      setSnackbarOpen(true);
    }
  }, [calendarImportError]);

  // Check if user has existing schedule when data loads
  useEffect(() => {
    
    if (user && eventId && !hasLoadedExistingSchedule) {
      // Check if user has existing schedule
      const checkExistingSchedule = async () => {
        const userAvailabilityDocRef = doc(db, `events/${eventId}/availabilities`, user.uid);
        const userAvailabilitySnap = await getDoc(userAvailabilityDocRef);
        const hasExistingSchedule = userAvailabilitySnap.exists();
        setHasLoadedExistingSchedule(true);
        
        // Load existing schedule data if available
        if (hasExistingSchedule) {
          const data = userAvailabilitySnap.data();
          if (data.unavailable) {
            setMyUnavailableSchedule(new Set(data.unavailable));
          }
          if (data.ifNeeded) {
            setMyIfNeededSchedule(new Set(data.ifNeeded));
          }
        }
        
        // Only auto-load calendars if user has NO existing schedule
        if (!hasExistingSchedule && (googleConnected || appleCalendarConnected) && !hasAutoLoadedCalendars) {
          setShouldAutoLoadCalendars(true);
        }
      };
      checkExistingSchedule();
    }
  }, [user, eventId, hasLoadedExistingSchedule, setMyUnavailableSchedule, setMyIfNeededSchedule, googleConnected, appleCalendarConnected, hasAutoLoadedCalendars]);
  
  // Flag to track if we should auto-load calendars (only when no existing schedule was found)
  const [shouldAutoLoadCalendars, setShouldAutoLoadCalendars] = useState(false);

  // Auto-load calendars only once when appropriate
  useEffect(() => {
    
    if (shouldAutoLoadCalendars && !hasAutoLoadedCalendars && 
        (googleConnected || appleCalendarConnected)) {
      setHasAutoLoadedCalendars(true);
      setHasLoadedGoogleCalendar(false); // Reset Google calendar load flag
      autoLoadCalendarAndFixedSchedule();
    }
  }, [shouldAutoLoadCalendars, hasAutoLoadedCalendars, googleConnected, appleCalendarConnected, autoLoadCalendarAndFixedSchedule]);

  // Load Google Calendar when connected (for auto-load on refresh)
  useEffect(() => {
    if (googleConnected && !googleCalendarChecked && !isLoadingGoogle && shouldAutoLoadCalendars && !hasLoadedGoogleCalendar) {
      setGoogleCalendarChecked(true);
      handleGoogleCalendarToggle(true).then(events => {
        if (events) {
          processCalendarEvents(events, 'google');
          setHasLoadedGoogleCalendar(true);
        }
      });
    }
  }, [googleConnected, googleCalendarChecked, isLoadingGoogle, shouldAutoLoadCalendars, hasLoadedGoogleCalendar, handleGoogleCalendarToggle, processCalendarEvents]);

  if (isCheckingGuest) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pt: { xs: 2, sm: 4 }, pb: 4, px: { xs: 0, sm: 2 } }}>
      {/* Page Header */}
      {eventDetails && (
        <Box sx={{ 
          mb: 4, 
          textAlign: { xs: 'left', sm: 'center' },
          px: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {eventDetails.title}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            justifyContent: { xs: 'flex-end', sm: 'center' }
          }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(window.location.href)}
              sx={{ fontSize: '0.75rem' }}
            >
              링크 복사
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => {
                const shareData = {
                  title: eventDetails.title,
                  text: `${eventDetails.title} 일정 조정`,
                  url: window.location.href
                };
                
                if (navigator.share) {
                  navigator.share(shareData).catch(err => {
                    // Console statement removed for production// iOS Safari might fail with certain share data
                    // Try simpler share data
                    navigator.share({
                      url: window.location.href
                    }).catch(err2 => {
                      // Console statement removed for productionsetSnackbarMessage('공유 기능을 사용할 수 없습니다.');
                      setSnackbarOpen(true);
                    });
                  });
                } else {
                  // If no share API, show message to copy link manually
                  setSnackbarMessage('공유 기능을 지원하지 않는 브라우저입니다. 링크 복사를 사용해주세요.');
                  setSnackbarOpen(true);
                }
              }}
              sx={{ fontSize: '0.75rem' }}
            >
              공유
            </Button>
          </Box>
        </Box>
      )}

      {/* Main Content */}
      <Box ref={containerRef} sx={{ 
        display: 'flex', 
        flexDirection: shouldStack ? 'column' : 'row',
        gap: shouldStack ? 3 : 0,
        width: '100%',
      }}>
        {/* My Availability */}
        <Box sx={{ 
          width: shouldStack ? '100%' : '50%',
          borderRight: shouldStack ? 'none' : { sm: '1px solid #e0e0e0' },
          borderBottom: shouldStack ? '1px solid #e0e0e0' : 'none',
          p: { xs: 0, sm: 2 },
          px: { xs: 0, sm: shouldStack ? 2 : undefined },
          pr: { sm: shouldStack ? 2 : 2 },
          pt: { xs: 1, sm: 2 },
          pb: { xs: 1, sm: 2 },
          position: 'relative',
          minWidth: 0, // Prevent content from overflowing flex container
          overflow: 'visible',
        }}>
          {!myUnavailableSchedule ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
          ) : (
            <MySchedule 
              eventDetails={eventDetails}
              availableWeeks={availableWeeks}
              myUnavailableSchedule={myUnavailableSchedule} 
              setMyUnavailableSchedule={setMyUnavailableSchedule}
              myIfNeededSchedule={myIfNeededSchedule}
              setMyIfNeededSchedule={setMyIfNeededSchedule}
              onSave={saveFunction}
              guestUser={guestUser}
              onGuestLogin={handleGuestLogin}
              onGoogleLogin={signIn}
              eventNames={calendarEventNames}
              setEventNames={setCalendarEventNames}
              isLoadingCalendar={isLoadingGoogle || isLoadingApple}
              isMobile={isMobile}
            >
              {user && (
                <Box sx={{ height: '100%', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary'}}>
                      캘린더
                    </Typography>
                    <Tooltip title="캘린더 추가">
                      <IconButton 
                        onClick={handleAddCalendar} 
                        sx={{ 
                          p: 0.5,
                          ml: 0.5
                        }}
                      >
                        <AddIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {!googleConnected && !appleCalendarConnected && (!fixedSchedule || fixedSchedule.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      연동된 캘린더가 없습니다
                    </Typography>
                  ) : (
                    <List sx={{ pt: 0, pl: 0 }}>
                      {googleConnected && (
                        <ListItem sx={{ p: 0 }}>
                          <ListItemButton 
                            onClick={() => googleConnected && !isLoadingGoogle && handleGoogleToggle(!googleCalendarChecked)}
                            disabled={isLoadingGoogle}
                            selected={googleCalendarChecked}
                            sx={{
                              px: 0.25,
                              py: 0.5, 
                              borderRadius: 1,
                              '&.Mui-selected': {
                                backgroundColor: 'action.selected',
                                '&:hover': {
                                  backgroundColor: 'action.selected',
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <GoogleIcon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={user?.email || 'Google'}
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                sx: { fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }
                              }}
                            />
                            {isLoadingGoogle && <CircularProgress size={14} />}
                          </ListItemButton>
                        </ListItem>
                      )}
                      
                      {appleCalendarConnected && (
                        <ListItem sx={{ p: 0 }}>
                          <ListItemButton 
                            onClick={() => appleCalendarConnected && !isLoadingApple && handleAppleToggle(!appleCalendarChecked)}
                            disabled={isLoadingApple}
                            selected={appleCalendarChecked}
                            sx={{
                              px: 0.25,
                              py: 0.5, 
                              borderRadius: 1,
                              '&.Mui-selected': {
                                backgroundColor: 'action.selected',
                                '&:hover': {
                                  backgroundColor: 'action.selected',
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <AppleIcon sx={{ fontSize: 18, color: '#000' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={appleCalendarUser?.appleId || appleId || 'Apple'}
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                sx: { fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }
                              }}
                            />
                            {isLoadingApple && <CircularProgress size={14} />}
                          </ListItemButton>
                        </ListItem>
                      )}
                    </List>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'text.secondary'}}>
                        일정
                      </Typography>
                      <Tooltip title="고정 일정 설정">
                        <IconButton 
                          onClick={() => navigate('/settings')} 
                          sx={{ 
                            p: 0.5,
                            ml: 0.5
                          }}
                        >
                          <AddIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    {fixedSchedule && fixedSchedule.length > 0 ? (
                      <List sx={{ pt: 0, pl: 0 }}>
                        <ListItem sx={{ p: 0 }}>
                          <ListItemButton 
                            onClick={() => handleFixedScheduleToggle && handleFixedScheduleToggle(!fixedScheduleChecked)}
                            selected={fixedScheduleChecked}
                            sx={{
                              px: 0.25,
                              py: 0.5, 
                              borderRadius: 1,
                              '&.Mui-selected': {
                                backgroundColor: 'action.selected',
                                '&:hover': {
                                  backgroundColor: 'action.selected',
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <ScheduleIcon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="고정 일정"
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { fontSize: '0.875rem' }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        설정된 고정 일정이 없습니다
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </MySchedule>
          )}
        </Box>
        
        {/* Group Availability */}
        <Box sx={{ 
          width: shouldStack ? '100%' : '50%',
          p: { xs: 0, sm: 2 },
          px: { xs: 0, sm: shouldStack ? 2 : undefined },
          pl: { sm: shouldStack ? 2 : 3 },
          pt: { xs: 1, sm: 2 },
          pb: { xs: 1, sm: 2 },
          minWidth: 0, // Prevent content from overflowing flex container
        }}>
          <GroupSchedule 
            eventDetails={eventDetails}
            availableWeeks={availableWeeks}
            groupSchedule={groupSchedule} 
            totalMembers={totalMembers} 
            respondedUsers={respondedUsers}
            isStackMode={shouldStack}
          />
        </Box>
      </Box>

      {/* Dialogs and Snackbar */}
      <AppleCalendarDialog
        open={appleDialogOpen}
        onClose={() => setAppleDialogOpen(false)}
        onConnect={handleAppleImport}
        appleId={appleId}
        setAppleId={setAppleId}
        appSpecificPassword={appSpecificPassword}
        setAppSpecificPassword={setAppSpecificPassword}
        error={calendarImportError}
        isLoading={isLoadingApple}
      />

      <CalendarSelectionDialog
        open={showCalendarDialog}
        onClose={() => setShowCalendarDialog(false)}
        onGoogleSelect={async () => {
          setShowCalendarDialog(false);
          await handleGoogleImport();
        }}
        onAppleSelect={() => {
          setShowCalendarDialog(false);
          setAppleDialogOpen(true);
        }}
        isGoogleUser={user?.providerData?.[0]?.providerId === 'google.com'}
        showAlert={(message) => {
          setSnackbarMessage(message);
          setSnackbarOpen(true);
        }}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventPage;
