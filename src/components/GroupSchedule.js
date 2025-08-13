import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableRow, Typography, Tooltip, Box, ToggleButton, ToggleButtonGroup, useMediaQuery, Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox, CircularProgress, IconButton, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { blue, green } from '@mui/material/colors';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon, Google as GoogleIcon, Apple as AppleIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import MostAvailableTimes from './MostAvailableTimes';
import ScheduleTable from './common/ScheduleTable';
import TimeColumn from './common/TimeColumn';
import ScheduleHeader from './common/ScheduleHeader';
import { getCellStyle, MOBILE_BREAKPOINT, FEATURES } from '../utils/constants';
import { generateHours, generateAllTimeSlots, getDaysForWeek as getDaysForWeekUtil } from '../utils/timeUtils';
import { buildCoordinatesCache } from '../utils/coordinateUtils';
import googleCalendarService from '../services/googleCalendarService';
import appleCalendarService from '../services/appleCalendarService';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleOAuth } from '../contexts/GoogleOAuthContext';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';
import LoginDialog from './LoginDialog';
import CalendarSelectionDialog from './CalendarSelectionDialog';
import AppleCalendarDialog from './AppleCalendarDialog';
import Toast from './Toast';

const GroupSchedule = React.memo(({ eventDetails, availableWeeks, groupSchedule, totalMembers, respondedUsers, isStackMode = false }) => {
  const { t } = useTranslation();
  const [excludeIfNeeded, setExcludeIfNeeded] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [highlightBestTimes, setHighlightBestTimes] = useState(false);
  
  // Calendar write states
  const [writeMode, setWriteMode] = useState(false);
  
  // Calendar dropdown menu
  const [calendarMenuAnchor, setCalendarMenuAnchor] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Event creation dialog
  const [eventDialog, setEventDialog] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedCalendarType, setSelectedCalendarType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
  const [recurrenceCount, setRecurrenceCount] = useState('');
  
  // Toast for notifications
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };
  
  // Dialog states for login and calendar connection
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [calendarSelectionDialogOpen, setCalendarSelectionDialogOpen] = useState(false);
  const [appleDialogOpen, setAppleDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const { isConnected: googleConnected, googleUser, connect: connectGoogle } = useGoogleOAuth();
  const { appleCalendarConnected, appleCalendarUser, handleAppleCalendarConnect } = useCalendarIntegration();
  
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);
  const saveButtonRef = useRef(null);
  const cellStyle = getCellStyle(isMobile);

  const hours = useMemo(() => generateHours(eventDetails.startTime, eventDetails.endTime), 
    [eventDetails.startTime, eventDetails.endTime]);
  
  const allTimeSlots = useMemo(() => generateAllTimeSlots(eventDetails.startTime, eventDetails.endTime), 
    [eventDetails.startTime, eventDetails.endTime]);

  const getDaysForWeek = (weekStart) => getDaysForWeekUtil(weekStart, eventDetails);
  
  // For day-based events, just return the selected days in correct order
  const getDaysForDayBasedEvent = () => {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const selectedDays = eventDetails.selectedDays || [];
    return selectedDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  };

  // Find the maximum count across all slots
  const maxCount = useMemo(() => {
    let max = 0;
    groupSchedule.forEach((slotData) => {
      const count = slotData.available.count + (excludeIfNeeded ? 0 : slotData.ifNeeded.count);
      if (count > max) max = count;
    });
    return max;
  }, [groupSchedule, excludeIfNeeded]);

  const getCellData = useMemo(() => {
    const cache = new Map();
    groupSchedule.forEach((slotData, slotId) => {
      let availableCount = 0;
      let ifNeededCount = 0;
      let filteredAvailableUsers = [];
      let filteredIfNeededUsers = [];
      
      // If participants are selected, only count those
      if (selectedParticipants.size > 0) {
        slotData.available.users.forEach(user => {
          if (selectedParticipants.has(user.id)) {
            availableCount++;
            filteredAvailableUsers.push(user.name);
          }
        });
        if (FEATURES.ENABLE_IF_NEEDED) {
          slotData.ifNeeded.users.forEach(user => {
            if (selectedParticipants.has(user.id)) {
              ifNeededCount++;
              filteredIfNeededUsers.push(user.name);
            }
          });
        }
      } else {
        // No filter - show all
        availableCount = slotData.available.count;
        ifNeededCount = FEATURES.ENABLE_IF_NEEDED ? slotData.ifNeeded.count : 0;
        filteredAvailableUsers = slotData.available.users.map(u => u.name);
        filteredIfNeededUsers = FEATURES.ENABLE_IF_NEEDED ? slotData.ifNeeded.users.map(u => u.name) : [];
      }
      
      const displayCount = availableCount + (excludeIfNeeded ? 0 : ifNeededCount);
      
      let backgroundColor = 'transparent';
      let textColor = 'inherit';
      
      // If "show only best times" mode is on, only show cells with max count
      if (highlightBestTimes) {
        if (displayCount === maxCount && maxCount > 0) {
          // Show best times with blue background
          const totalForIntensity = selectedParticipants.size > 0 ? selectedParticipants.size : totalMembers;
          const intensity = Math.min(displayCount / totalForIntensity, 1);
          const blueValue = Math.round(intensity * 6) * 100 + 100;
          backgroundColor = blue[Math.min(blueValue, 700)];
          textColor = 'white';
        }
        // Otherwise leave as transparent (empty)
      } else {
        // Normal mode - show all times with counts
        if (displayCount > 0) {
          const totalForIntensity = selectedParticipants.size > 0 ? selectedParticipants.size : totalMembers;
          const intensity = Math.min(displayCount / totalForIntensity, 1);
          const blueValue = Math.round(intensity * 6) * 100 + 100;
          backgroundColor = blue[Math.min(blueValue, 700)];
          textColor = 'white';
        }
      }

      const sx = { 
        backgroundColor, 
        textAlign: 'center', 
        color: textColor, 
        fontWeight: 'bold'
      };
      
      let tooltipTitle = "";
      if (filteredAvailableUsers.length > 0) tooltipTitle += `Available: ${filteredAvailableUsers.join(', ')}`;
      if (filteredIfNeededUsers.length > 0 && FEATURES.ENABLE_IF_NEEDED) {
        if (tooltipTitle) tooltipTitle += '\n';
        tooltipTitle += `If Needed: ${filteredIfNeededUsers.join(', ')}`;
      }
      cache.set(slotId, { displayCount, sx, tooltipTitle });
    });
    return cache;
  }, [groupSchedule, excludeIfNeeded, totalMembers, selectedParticipants, highlightBestTimes, maxCount]);

  const getCellInfo = (slotId) => {
    const cellData = getCellData.get(slotId) || { displayCount: 0, sx: { backgroundColor: 'transparent', textAlign: 'center', color: 'inherit', fontWeight: 'bold' }, tooltipTitle: '' };
    
    // In write mode, check if this cell is selected
    if (writeMode && selectedCells.has(slotId)) {
      return {
        ...cellData,
        sx: {
          ...cellData.sx,
          backgroundColor: green[300],
          color: 'white'
        }
      };
    }
    
    return cellData;
  };

  const allDates = useMemo(() => {
    if (eventDetails.eventType === 'day') {
      return getDaysForDayBasedEvent();
    }
    return availableWeeks.flatMap(week => getDaysForWeek(week));
  }, [availableWeeks, eventDetails.eventType]);

  // Build coordinates cache for drag selection
  const coordinatesCache = useMemo(() => {
    return buildCoordinatesCache(allDates, allTimeSlots);
  }, [allDates, allTimeSlots]);

  // Calendar write selection state
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const dragStateRef = useRef({ 
    isDragging: false, 
    start: null, 
    initialSelection: new Set(), // Store selection before drag
    mode: null // 'add' or 'remove'
  });

  // Handle initial mouse/touch down
  const handlePointerDown = useCallback((e) => {
    if (!writeMode) return;
    
    const cell = e.target.closest('[data-slot-id]');
    if (!cell) return;
    
    const slotId = cell.getAttribute('data-slot-id');
    if (!slotId) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent event from reaching MySchedule
    
    // Determine if we're adding or removing based on whether the start cell is already selected
    const isStartSelected = selectedCells.has(slotId);
    const mode = isStartSelected ? 'remove' : 'add';
    
    // Store the current selection state before starting drag
    dragStateRef.current = { 
      isDragging: true, 
      start: slotId,
      initialSelection: new Set(selectedCells), // Backup current selection
      mode: mode,
      currentSelection: new Set() // Track current drag selection separately
    };
    
    setIsDragging(true);
    setDragStart(slotId);
    
    // Don't modify selection yet, just mark the start
  }, [writeMode, selectedCells]);

  // Remove old mouse over handler since we'll use global listeners
  const handlePointerMove = useCallback((e) => {
    // This will be handled by global listener
  }, []);

  const handlePointerUp = useCallback((e) => {
    // This will be handled by global listener
  }, []);

  const handlePointerCancel = handlePointerUp;

  // Add global event listeners when dragging
  useEffect(() => {
    if (!isDragging || !dragStateRef.current.isDragging) return;

    const updateSelection = (currentSlotId) => {
      const startSlotId = dragStateRef.current.start;
      if (!startSlotId || !currentSlotId) return;
      
      // Get rectangular selection area
      const startCoords = coordinatesCache.get(startSlotId);
      const currentCoords = coordinatesCache.get(currentSlotId);
      
      if (!startCoords || !currentCoords) return;
      
      const minDate = Math.min(startCoords.dateIndex, currentCoords.dateIndex);
      const maxDate = Math.max(startCoords.dateIndex, currentCoords.dateIndex);
      const minHour = Math.min(startCoords.hourIndex, currentCoords.hourIndex);
      const maxHour = Math.max(startCoords.hourIndex, currentCoords.hourIndex);
      
      // Build the cells in the current drag rectangle
      const dragRectCells = new Set();
      for (let dateIndex = minDate; dateIndex <= maxDate; dateIndex++) {
        for (let hourIndex = minHour; hourIndex <= maxHour; hourIndex++) {
          if (allDates[dateIndex] && allTimeSlots[hourIndex]) {
            dragRectCells.add(`${allDates[dateIndex]}-${allTimeSlots[hourIndex]}`);
          }
        }
      }
      
      // Store current drag selection for comparison
      dragStateRef.current.currentSelection = dragRectCells;
      
      // Start with the initial selection (before drag started)
      const newSelection = new Set(dragStateRef.current.initialSelection);
      
      // Apply the drag operation (add or remove) to cells in the rectangle
      if (dragStateRef.current.mode === 'add') {
        dragRectCells.forEach(cellId => newSelection.add(cellId));
      } else {
        dragRectCells.forEach(cellId => newSelection.delete(cellId));
      }
      
      setSelectedCells(newSelection);
    };

    const handleGlobalPointerMove = (e) => {
      if (!dragStateRef.current.isDragging) return;
      
      let targetElement;
      
      // For touch events, use the touch point
      if (e.pointerType === 'touch') {
        targetElement = document.elementFromPoint(e.clientX, e.clientY);
      } else {
        // For mouse events, use the target
        targetElement = e.target;
      }
      
      const cell = targetElement?.closest('[data-slot-id]');
      if (!cell) return;
      
      const currentSlotId = cell.getAttribute('data-slot-id');
      if (currentSlotId) {
        updateSelection(currentSlotId);
      }
    };

    const handleGlobalPointerUp = () => {
      dragStateRef.current = { 
        isDragging: false, 
        start: null, 
        initialSelection: new Set(),
        mode: null,
        currentSelection: new Set()
      };
      setIsDragging(false);
      setDragStart(null);
    };

    // Use pointer events for unified handling
    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isDragging, coordinatesCache, allDates, allTimeSlots]);





  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };


  // Calendar write mode handlers
  const handleWriteMode = () => {
    // Check if user is logged in
    if (!user) {
      setLoginDialogOpen(true);
      return;
    }

    // Check if any calendar is connected
    if (!googleConnected && !appleCalendarConnected) {
      setCalendarSelectionDialogOpen(true);
      return;
    }

    setWriteMode(true);
    setSelectedCells(new Set());
  };

  const handleSaveSelection = () => {
    if (selectedCells.size === 0) {
      setWriteMode(false);
      return;
    }
    
    // Get button position and show calendar selection dropdown
    if (saveButtonRef.current) {
      const rect = saveButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      setCalendarMenuAnchor(true);
    }
  };

  const handleCancelWrite = () => {
    setWriteMode(false);
    setSelectedCells(new Set());
  };

  const handleCalendarSelect = (calendarType) => {
    setSelectedCalendarType(calendarType);
    setCalendarMenuAnchor(false);
    setEventDialog(true);
  };

  // Helper function to format time slots for display
  const formatSelectedTimeSlots = () => {
    const slots = Array.from(selectedCells);
    if (slots.length === 0) return '';
    
    // Group by date/day and format time ranges
    const groupedSlots = {};
    slots.forEach(slot => {
      const parts = slot.split('-');
      const timeStr = parts[parts.length - 1];
      const dayOrDate = parts.slice(0, -1).join('-');
      
      if (!groupedSlots[dayOrDate]) {
        groupedSlots[dayOrDate] = [];
      }
      groupedSlots[dayOrDate].push(timeStr);
    });
    
    const formatTimeRange = (times) => {
      times.sort();
      const ranges = [];
      let start = times[0];
      let end = times[0];
      
      for (let i = 1; i < times.length; i++) {
        const prevTime = times[i - 1];
        const currTime = times[i];
        
        // Check if times are consecutive (30min intervals)
        const prevMinutes = parseInt(prevTime.split(':')[0]) * 60 + parseInt(prevTime.split(':')[1]);
        const currMinutes = parseInt(currTime.split(':')[0]) * 60 + parseInt(currTime.split(':')[1]);
        
        if (currMinutes - prevMinutes === 30) {
          end = currTime;
        } else {
          // Add range and start new one
          const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]) + 30;
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          ranges.push(`${start}-${endTimeStr}`);
          start = currTime;
          end = currTime;
        }
      }
      
      // Add final range
      const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]) + 30;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      ranges.push(`${start}-${endTimeStr}`);
      return ranges.join(', ');
    };
    
    const formattedDays = Object.entries(groupedSlots).map(([day, times]) => {
      const timeRanges = formatTimeRange(times);
      return `${day}: ${timeRanges}`;
    });
    
    return formattedDays.join('\n');
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !user) return;
    
    setIsCreating(true);
    
    try {
      const timeSlots = Array.from(selectedCells);
      
      // For day-based events, extract only the days that were actually selected
      let actualSelectedDays = eventDetails.selectedDays;
      if (eventDetails.eventType === 'day' && timeSlots.length > 0) {
        const selectedDaysSet = new Set();
        timeSlots.forEach(slot => {
          // For day-based events, slot format is like "Mon-09:00", "Tue-14:30", etc.
          const day = slot.split('-')[0];
          selectedDaysSet.add(day);
        });
        actualSelectedDays = Array.from(selectedDaysSet);
      }
      
      if (selectedCalendarType === 'google') {
        const result = await googleCalendarService.createEvent(
          eventTitle,
          timeSlots,
          eventDetails.eventType,
          actualSelectedDays,
          recurrenceEndDate ? recurrenceEndDate.format('YYYY-MM-DD') : null
        );
        
        if (result.success) {
          showToast(`Google Calendar ${result.eventsCreated}${t('event.eventsCreated')}`, 'success');
        }
      } else if (selectedCalendarType === 'apple') {
        const result = await appleCalendarService.createEvent(
          eventTitle,
          timeSlots,
          eventDetails.eventType,
          actualSelectedDays,
          recurrenceEndDate ? recurrenceEndDate.format('YYYY-MM-DD') : null
        );
        
        if (result.success) {
          showToast(`Apple Calendar ${result.eventsCreated}${t('event.eventsCreated')}`, 'success');
        }
      }
      
      // Reset states
      setEventDialog(false);
      setEventTitle('');
      setSelectedCalendarType('');
      setRecurrenceEndDate(null);
      setRecurrenceCount('');
      setWriteMode(false);
      setSelectedCells(new Set());
      
    } catch (error) {
      console.error('Error creating calendar event:', error);
      showToast(t('event.calendarEventError') + ' ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const Participants = () => (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>{t('event.participants')}</Typography>
      {respondedUsers && respondedUsers.size > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from(respondedUsers.values()).map((user) => {
            const isSelected = selectedParticipants.has(user.id);
            return (
              <Typography 
                key={user.id} 
                variant="caption" 
                onClick={() => toggleParticipant(user.id)}
                sx={{ 
                  bgcolor: isSelected ? blue[100] : 'background.paper', 
                  color: isSelected ? blue[700] : 'text.primary',
                  px: 0.75, 
                  py: 0.25, 
                  borderRadius: 0.5, 
                  border: '1px solid', 
                  borderColor: isSelected ? blue[400] : 'divider',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': {
                    bgcolor: isSelected ? blue[200] : 'action.hover',
                  }
                }}
              >
                {user.name}
              </Typography>
            );
          })}
        </Box>
      ) : <Typography variant="body2" color="text.secondary">{t('event.noParticipants')}</Typography>}
    </Box>
  );


  const MostAvailable = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <MostAvailableTimes groupSchedule={groupSchedule} totalMembers={totalMembers} allDates={allDates} hours={hours} excludeIfNeeded={excludeIfNeeded} eventDetails={eventDetails} />
      <ToggleButtonGroup value={highlightBestTimes} exclusive onChange={(e, newValue) => setHighlightBestTimes(newValue)} aria-label="highlight best times" size="small" fullWidth>
        <ToggleButton value={true} aria-label="highlight best" sx={{ fontSize: '0.75rem', py: 0.5 }}>{t('event.bestTimesOnly')}</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const Schedule = () => {
    const content = (
      <Box 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerUp}
        sx={{ 
          display: 'flex',
          touchAction: writeMode ? 'none' : 'auto', // Disable browser touch handling when in write mode
          WebkitTouchCallout: 'none', // Disable iOS callout
          WebkitUserSelect: 'none', // Disable text selection
          userSelect: 'none'
        }}
      >
        <TimeColumn hours={hours} isMobile={isMobile} />
        {eventDetails.eventType === 'day' ? (
          // Day-based event: show only selected days
          <Box sx={{ mr: 2, flexShrink: 0 }}>
            <TableContainer sx={{ userSelect: 'none' }}>
              <Table stickyHeader size="small" sx={{ 
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& thead .MuiTableCell-root': {
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: '1px solid #000',
                },
                '& tbody': {
                  borderTop: '1px solid #000',
                  borderBottom: '1px solid #000',
                },
                '& tbody .MuiTableCell-root': {
                  borderBottom: '1px solid #000',
                  borderRight: '1px solid #000',
                  borderTop: 'none',
                  borderLeft: 'none',
                },
                '& tbody tr:last-child .MuiTableCell-root': {
                  borderBottom: '1px solid #000',
                },
                '& tbody .MuiTableCell-root:first-of-type': {
                  borderLeft: '1px solid #000',
                },
                '& tbody .MuiTableCell-root:last-child': {
                  borderRight: '1px solid #000',
                }
              }}>
                <ScheduleHeader weekDays={getDaysForDayBasedEvent()} isDayBased={true} />
                <TableBody>
                  {hours.map(hour => {
                    const hourNum = parseInt(hour.split(':')[0]);
                    return (
                      <TableRow key={hour}>
                        {getDaysForDayBasedEvent().map((day, dayIndex) => {
                          const slot00 = `${day}-${hour}`;
                          const slot30 = `${day}-${hourNum.toString().padStart(2, '0')}:30`;
                          const cellInfo00 = getCellInfo(slot00);
                          const cellInfo30 = getCellInfo(slot30);
                          
                          return (
                            <TableCell
                              key={`${day}-${hour}-cell`}
                              sx={{
                                padding: 0,
                                borderBottom: '1px solid #000',
                                borderRight: '1px solid #000',
                                borderTop: 'none',
                                borderLeft: dayIndex === 0 ? '1px solid #000' : 'none',
                                position: 'relative',
                                height: 32,
                                width: 40,
                                minWidth: 40,
                                maxWidth: 40,
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: '50%',
                                  borderTop: '1px solid #e0e0e0',
                                  pointerEvents: 'none'
                                }
                              }}
                            >
                              {/* Upper half - :00 */}
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo00.tooltipTitle}</span>} disableHoverListener={!cellInfo00.tooltipTitle || writeMode}>
                                <Box
                                  data-slot-id={slot00}
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    ...cellInfo00.sx,
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    cursor: writeMode ? 'crosshair' : 'default',
                                    userSelect: 'none',
                                    touchAction: writeMode ? 'none' : 'auto',
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'none'
                                  }}
                                >
                                </Box>
                              </Tooltip>
                              {/* Lower half - :30 */}
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle || writeMode}>
                                <Box
                                  data-slot-id={slot30}
                                  sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    ...cellInfo30.sx,
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    cursor: writeMode ? 'crosshair' : 'default',
                                    userSelect: 'none',
                                    touchAction: writeMode ? 'none' : 'auto',
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'none'
                                  }}
                                >
                                </Box>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          // Date-based event: show weeks as before
          availableWeeks.map((week) => {
            const weekDays = getDaysForWeek(week);
            if (weekDays.length === 0) return null;
            return (
              <Box key={`group-${week}`} sx={{ mr: 2, flexShrink: 0 }}>
                <TableContainer sx={{ userSelect: 'none' }}>
                  <Table stickyHeader size="small" sx={{ 
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& thead .MuiTableCell-root': {
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: '1px solid #000',
                },
                '& tbody': {
                  borderTop: '1px solid #000',
                  borderBottom: '1px solid #000',
                },
                '& tbody .MuiTableCell-root': {
                  borderBottom: '1px solid #000',
                  borderRight: '1px solid #000',
                  borderTop: 'none',
                  borderLeft: 'none',
                },
                '& tbody tr:last-child .MuiTableCell-root': {
                  borderBottom: '1px solid #000',
                },
                '& tbody .MuiTableCell-root:first-of-type': {
                  borderLeft: '1px solid #000',
                },
                '& tbody .MuiTableCell-root:last-child': {
                  borderRight: '1px solid #000',
                }
              }}>
                    <ScheduleHeader weekDays={weekDays} />
                    <TableBody>
                      {hours.map(hour => {
                        const hourNum = parseInt(hour.split(':')[0]);
                        return (
                          <TableRow key={hour}>
                            {weekDays.map((dateString, dateIndex) => {
                              const slot00 = `${dateString}-${hour}`;
                              const slot30 = `${dateString}-${hourNum.toString().padStart(2, '0')}:30`;
                              const cellInfo00 = getCellInfo(slot00);
                              const cellInfo30 = getCellInfo(slot30);
                              
                              return (
                                <TableCell
                                  key={`${dateString}-${hour}-cell`}
                                  sx={{
                                    padding: 0,
                                    borderBottom: '1px solid #000',
                                    borderRight: '1px solid #000',
                                    borderTop: 'none',
                                    borderLeft: dateIndex === 0 ? '1px solid #000' : 'none',
                                    position: 'relative',
                                    height: 32,
                                    width: 40,
                                    minWidth: 40,
                                    maxWidth: 40,
                                    '&::after': {
                                      content: '""',
                                      position: 'absolute',
                                      left: 0,
                                      right: 0,
                                      top: '50%',
                                      borderTop: '1px solid #e0e0e0',
                                      pointerEvents: 'none'
                                    }
                                  }}
                                >
                                  {/* Upper half - :00 */}
                                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo00.tooltipTitle}</span>} disableHoverListener={!cellInfo00.tooltipTitle || writeMode}>
                                    <Box
                                      data-slot-id={slot00}
                                          sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        ...cellInfo00.sx,
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        cursor: writeMode ? 'crosshair' : 'default',
                                        userSelect: 'none',
                                        touchAction: writeMode ? 'none' : 'auto',
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'none'
                                      }}
                                    >
                                        </Box>
                                  </Tooltip>
                                  {/* Lower half - :30 */}
                                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle || writeMode}>
                                    <Box
                                      data-slot-id={slot30}
                                          sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        ...cellInfo30.sx,
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        cursor: writeMode ? 'crosshair' : 'default',
                                        userSelect: 'none',
                                        touchAction: writeMode ? 'none' : 'auto',
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'none'
                                      }}
                                    >
                                        </Box>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })
        )}
      </Box>
    );

    // In desktop mode, apply custom scrolling to avoid affecting sidebar
    if (!isMobile) {
      return (
        <ScheduleTable isMobile={false}>
          {content}
        </ScheduleTable>
      );
    }

    // Mobile mode uses ScheduleTable wrapper
    return (
      <ScheduleTable isMobile={isMobile}>
        {content}
      </ScheduleTable>
    );
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', mb: 2, gap: 2, px: isMobile ? 2 : 0 }}>
        <Typography variant="h6">{t('event.groupSchedule')}</Typography>
        
        {/* Calendar Write Button next to title */}
        {!writeMode ? (
          <Button
            variant="outlined"
            size="small"
            onClick={handleWriteMode}
            sx={{
              fontSize: '0.75rem',
              minWidth: 'auto',
              py: 0.25,
              minHeight: 28,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            {t('event.writeToCalendar')}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              ref={saveButtonRef}
              variant="contained"
              size="small"
              onClick={handleSaveSelection}
              disabled={selectedCells.size === 0}
              sx={{ 
                fontSize: '0.75rem',
                py: 0.25,
                minHeight: 28,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              {t('event.writeMode')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelWrite}
              sx={{ 
                fontSize: '0.75rem',
                py: 0.25,
                minHeight: 28,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              {t('event.cancelWrite')}
            </Button>
          </Box>
        )}

        {FEATURES.ENABLE_IF_NEEDED && (
          <ToggleButtonGroup value={excludeIfNeeded} exclusive onChange={(e, newValue) => setExcludeIfNeeded(newValue)} aria-label="if needed filter" size="small">
            <ToggleButton value={true} aria-label="exclude if needed" sx={{ fontSize: '0.75rem', py: 0.5 }}>{t('event.excludeIfNeeded')}</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Main Content Area */}
      {isMobile ? (
        // --- MOBILE LAYOUT ---
        <Box>
          <Box sx={{ px: 2, mb: 3 }}><Participants /></Box>
          <Box><Schedule /></Box>
          <Box sx={{ mt: 3, px: 2 }}><MostAvailable /></Box>
        </Box>
      ) : (
        // --- DESKTOP LAYOUT ---
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', width: '100%' }}>
          {/* Table (scrollable) */}
          <Box sx={{ 
            width: 'calc(100% - 220px)', // Fixed width: total - sidebar - gap
            minWidth: 0,
            overflow: 'hidden', // Hide overflow to contain the scroll
          }}>
            <Schedule />
          </Box>
          {/* Sidebar (fixed) */}
          <Box sx={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, pr: 2 }}>
            <Participants />
            <MostAvailable />
          </Box>
        </Box>
      )}

      {/* Calendar Selection Dropdown */}
      <Menu
        open={Boolean(calendarMenuAnchor)}
        onClose={() => setCalendarMenuAnchor(false)}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition}
        slotProps={{
          paper: {
            sx: {
              minWidth: '220px',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: '1px solid',
              borderColor: 'divider',
              py: 0.5
            }
          }
        }}
      >
        {googleConnected && (
          <MenuItem 
            onClick={() => handleCalendarSelect('google')}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <GoogleIcon sx={{ mr: 2, fontSize: 20 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                {googleUser?.email || t('calendar.googleCalendar')}
              </Typography>
            </Box>
          </MenuItem>
        )}
        {appleCalendarConnected && (
          <MenuItem 
            onClick={() => handleCalendarSelect('apple')}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <AppleIcon sx={{ mr: 2, fontSize: 20, color: '#000' }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                {appleCalendarUser?.appleId || t('calendar.appleCalendar')}
              </Typography>
            </Box>
          </MenuItem>
        )}
        {!googleConnected && !appleCalendarConnected && (
          <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('event.noConnectedCalendars')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('event.connectCalendarInSettings')}
            </Typography>
          </Box>
        )}
      </Menu>

      {/* Event Creation Dialog */}
      <Dialog 
        open={eventDialog} 
        onClose={() => !isCreating && setEventDialog(false)} 
        maxWidth="xs" 
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
            {selectedCalendarType === 'google' ? t('calendar.googleCalendar') : t('calendar.appleCalendar')} {t('event.createCalendarEvent')}
          </Typography>
          <IconButton
            onClick={() => !isCreating && setEventDialog(false)}
            disabled={isCreating}
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
            <TextField
              autoFocus
              fullWidth
              variant="outlined"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              disabled={isCreating}
              placeholder={t('event.eventTitlePlaceholder')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: selectedCalendarType === 'google' ? '#4285f4' : '#007aff',
                  }
                }
              }}
            />
            
            {/* Event type info and recurrence settings */}
            {eventDetails.eventType === 'day' && (
              <>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                  borderRadius: 1,
                  '& .MuiTypography-root': {
                    color: 'info.contrastText'
                  }
                }}>
                  <CheckCircleIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2">
                    {t('event.recurringEvent')}
                  </Typography>
                </Box>
                
                {/* Recurrence end options */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('event.recurrenceEnd')}
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label={t('event.untilDate')}
                      value={recurrenceEndDate}
                      onChange={(newValue) => setRecurrenceEndDate(newValue)}
                      disabled={isCreating}
                      minDate={dayjs().add(1, 'day')}
                      format="YYYY년 MM월 DD일"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              '&.Mui-focused fieldset': {
                                borderColor: selectedCalendarType === 'google' ? '#4285f4' : '#007aff',
                              }
                            }
                          }
                        },
                        desktopPaper: {
                          sx: {
                            '& .MuiPickersDay-root': {
                              borderRadius: 2,
                              '&:hover': {
                                backgroundColor: selectedCalendarType === 'google' ? 'rgba(66, 133, 244, 0.08)' : 'rgba(0, 122, 255, 0.08)',
                              },
                              '&.Mui-selected': {
                                backgroundColor: selectedCalendarType === 'google' ? '#4285f4' : '#007aff',
                                '&:hover': {
                                  backgroundColor: selectedCalendarType === 'google' ? '#3367d6' : '#0056cc',
                                }
                              }
                            },
                            '& .MuiPickersCalendarHeader-root': {
                              paddingLeft: 2,
                              paddingRight: 2,
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                    {t('event.recurrenceEndHint')}
                  </Typography>
                </Box>
              </>
            )}

            {/* Selection summary */}
            <Box sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('event.selectedTimes')}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-line'
                }}
              >
                {formatSelectedTimeSlots()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'center' }}>
          <Button 
            onClick={handleCreateEvent} 
            variant="contained" 
            disabled={!eventTitle.trim() || isCreating}
            autoFocus
            fullWidth
            sx={{ 
              borderRadius: 2,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              bgcolor: selectedCalendarType === 'google' ? '#4285f4' : '#007aff',
              '&:hover': {
                bgcolor: selectedCalendarType === 'google' ? '#3367d6' : '#0056cc',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              },
              '&:disabled': {
                boxShadow: 'none',
              }
            }}
          >
            {isCreating ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                {t('event.creating')}
              </>
            ) : (
              t('event.createEvent')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast for notifications */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />

      {/* Login Dialog */}
      <LoginDialog 
        open={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)} 
      />
      
      {/* Calendar Selection Dialog */}
      <CalendarSelectionDialog
        open={calendarSelectionDialogOpen}
        onClose={() => setCalendarSelectionDialogOpen(false)}
        onGoogleSelect={() => {
          setCalendarSelectionDialogOpen(false);
          if (user?.providerData[0]?.providerId === 'google.com') {
            connectGoogle();
          } else {
            showToast(t('errors.loginRequired'), 'info');
          }
        }}
        onAppleSelect={() => {
          setCalendarSelectionDialogOpen(false);
          setAppleDialogOpen(true);
        }}
        isGoogleUser={user?.providerData[0]?.providerId === 'google.com'}
        showAlert={(message) => {
          showToast(message, 'info');
        }}
      />

      {/* Apple Calendar Dialog */}
      <AppleCalendarDialog
        open={appleDialogOpen}
        onClose={() => setAppleDialogOpen(false)}
        onConnect={handleAppleCalendarConnect}
        error={null}
        isLoading={false}
      />
    </Box>
  );
});

GroupSchedule.displayName = 'GroupSchedule';

export default GroupSchedule;