import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Table, TableBody, TableRow, TableCell, Typography, Button, ToggleButtonGroup, ToggleButton, Box, CircularProgress, TableContainer, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ScheduleTable from './common/ScheduleTable';
import TimeColumn from './common/TimeColumn';
import ScheduleHeader from './common/ScheduleHeader';
import { COLORS, FEATURES } from '../utils/constants';
import { generateHours, generateAllTimeSlots, getDaysForWeek as getDaysForWeekUtil } from '../utils/timeUtils';
import { buildCoordinatesCache } from '../utils/coordinateUtils';
import useDragSelection from '../hooks/useDragSelection';
import useScheduleDialog from '../hooks/useScheduleDialog';
import { useAuth } from '../contexts/AuthContext';
import GuestLogin from './GuestLogin';

const MySchedule = ({ 
  eventDetails, 
  availableWeeks, 
  myUnavailableSchedule = new Set(), 
  setMyUnavailableSchedule, 
  myIfNeededSchedule = new Set(), 
  setMyIfNeededSchedule, 
  onSave, 
  eventNames: propEventNames = {}, 
  setEventNames: setPropEventNames, 
  children, 
  isLoadingCalendar, 
  isMobile, 
  guestUser, 
  onGuestLogin, 
  onGoogleLogin,
  onAppleLogin,
  isStackMode = false
}) => {
  const { user } = useAuth();
  const [currentSelectionType, setCurrentSelectionType] = useState('unavailable');
  const { dialogOpen: calendarDialogOpen, openDialog: openCalendarDialog, closeDialog } = useScheduleDialog();

  const hours = useMemo(() => generateHours(eventDetails.startTime, eventDetails.endTime), 
    [eventDetails.startTime, eventDetails.endTime]);
  
  const allTimeSlots = useMemo(() => generateAllTimeSlots(eventDetails.startTime, eventDetails.endTime), 
    [eventDetails.startTime, eventDetails.endTime]);

  const getDaysForWeek = useCallback((weekStart) => getDaysForWeekUtil(weekStart, eventDetails), [eventDetails]);
  
  // For day-based events, just return the selected days in correct order
  const getDaysForDayBasedEvent = useCallback(() => {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const selectedDays = eventDetails.selectedDays || [];
    return selectedDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  }, [eventDetails]);

  // Coordinates cache for all 30-minute slots (for drag selection)
  const coordinatesCache = useMemo(() => {
    if (eventDetails.eventType === 'day') {
      // For day-based events, use day names directly
      const days = getDaysForDayBasedEvent();
      return buildCoordinatesCache(days, allTimeSlots);
    } else {
      // For date-based events, use dates
      let allDates = [];
      availableWeeks.forEach(week => {
        const weekDays = getDaysForWeek(week);
        allDates = allDates.concat(weekDays);
      });
      return buildCoordinatesCache(allDates, allTimeSlots);
    }
  }, [availableWeeks, allTimeSlots, getDaysForWeek, getDaysForDayBasedEvent, eventDetails.eventType]);

  const handleSelectionComplete = useCallback((selection, dragMode) => {
    const { minDate, maxDate, minHour, maxHour } = selection;
    
    let allDates = [];
    if (eventDetails.eventType === 'day') {
      // For day-based events, use day names
      allDates = getDaysForDayBasedEvent();
    } else {
      // For date-based events, collect all dates from weeks
      availableWeeks.forEach(week => {
        allDates.push(...getDaysForWeek(week));
      });
    }

    const slotsToUpdate = [];
    for (let d = minDate; d <= maxDate; d++) {
      for (let h = minHour; h <= maxHour; h++) {
        if (allDates[d] && allTimeSlots[h]) {
          slotsToUpdate.push(`${allDates[d]}-${allTimeSlots[h]}`);
        }
      }
    }

    if (dragMode === 'unavailable') {
      setMyUnavailableSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.add(slot));
        return newSet;
      });
      setMyIfNeededSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.delete(slot));
        return newSet;
      });
    } else if (dragMode === 'ifNeeded') {
      setMyIfNeededSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.add(slot));
        return newSet;
      });
      setMyUnavailableSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.delete(slot));
        return newSet;
      });
    } else {
      setMyUnavailableSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.delete(slot));
        return newSet;
      });
      setMyIfNeededSchedule(prev => {
        const newSet = new Set(prev);
        slotsToUpdate.forEach(slot => newSet.delete(slot));
        return newSet;
      });
      
      if (setPropEventNames) {
        setPropEventNames(prev => {
          const newNames = { ...prev };
          slotsToUpdate.forEach(slot => delete newNames[slot]);
          return newNames;
        });
      }
    }
  }, [availableWeeks, getDaysForWeek, getDaysForDayBasedEvent, eventDetails.eventType, setPropEventNames, setMyUnavailableSchedule, setMyIfNeededSchedule, allTimeSlots]);

  const {
    isDragging,
    dragMode,
    dragSelection,
    startDrag,
    handleTableMouseDown,
    handleTableMouseOver,
    handleTableTouchStart,
    handleTableTouchMove,
    handleTableTouchEnd
  } = useDragSelection({
    coordinatesCache,
    onSelectionComplete: handleSelectionComplete
  });

  useEffect(() => {
    const handleDragStart = (e) => {
      const slotId = e.detail.slotId;
      const mode = currentSelectionType === 'unavailable' 
        ? (myUnavailableSchedule.has(slotId) ? 'available' : 'unavailable')
        : (myIfNeededSchedule.has(slotId) ? 'available' : 'ifNeeded');
      
      // Immediately update the starting cell
      if (mode === 'unavailable') {
        setMyUnavailableSchedule(prev => {
          const newSet = new Set(prev);
          newSet.add(slotId);
          return newSet;
        });
        setMyIfNeededSchedule(prev => {
          const newSet = new Set(prev);
          newSet.delete(slotId);
          return newSet;
        });
      } else if (mode === 'ifNeeded') {
        setMyIfNeededSchedule(prev => {
          const newSet = new Set(prev);
          newSet.add(slotId);
          return newSet;
        });
        setMyUnavailableSchedule(prev => {
          const newSet = new Set(prev);
          newSet.delete(slotId);
          return newSet;
        });
      } else {
        // mode === 'available'
        setMyUnavailableSchedule(prev => {
          const newSet = new Set(prev);
          newSet.delete(slotId);
          return newSet;
        });
        setMyIfNeededSchedule(prev => {
          const newSet = new Set(prev);
          newSet.delete(slotId);
          return newSet;
        });
      }
      
      startDrag(slotId, mode);
    };

    document.addEventListener('dragstart', handleDragStart);
    return () => document.removeEventListener('dragstart', handleDragStart);
  }, [currentSelectionType, myUnavailableSchedule, myIfNeededSchedule, startDrag, setMyUnavailableSchedule, setMyIfNeededSchedule]);

  const getCellStyle = useCallback((slotId, coords) => {
    const isUnavailable = myUnavailableSchedule.has(slotId);
    const isIfNeeded = FEATURES.ENABLE_IF_NEEDED && myIfNeededSchedule.has(slotId);
    
    let backgroundColor = COLORS.available;
    if (isUnavailable) {
      backgroundColor = COLORS.unavailable;
    } else if (isIfNeeded) {
      backgroundColor = COLORS.ifNeeded;
    }
    
    if (isDragging && dragSelection && coords) {
      const inSelection = coords.dateIndex >= dragSelection.minDate && 
                         coords.dateIndex <= dragSelection.maxDate &&
                         coords.hourIndex >= dragSelection.minHour && 
                         coords.hourIndex <= dragSelection.maxHour;
      
      if (inSelection) {
        backgroundColor = dragMode === 'unavailable' ? COLORS.unavailablePreview :
                         dragMode === 'ifNeeded' ? COLORS.ifNeededPreview :
                         COLORS.availablePreview;
      }
    }
    
    const baseState = isUnavailable ? 'unavailable' : (isIfNeeded ? 'ifNeeded' : 'available');
    const hoverColor = baseState === 'unavailable' ? COLORS.unavailableHover : 
                      (baseState === 'ifNeeded' ? COLORS.ifNeededHover : COLORS.availableHover);
    
    return {
      backgroundColor,
      cursor: 'pointer',
      '&:hover': { backgroundColor: hoverColor },
      userSelect: 'none',
    };
  }, [myUnavailableSchedule, myIfNeededSchedule, isDragging, dragSelection, dragMode]);
  
  // Get event name for a slot (only show at the first slot of each event)
  const getEventName = useCallback((slotId) => {
    if (!propEventNames || !propEventNames[slotId]) return null;
    
    const event = propEventNames[slotId];
    const parts = slotId.split('-');
    const time = parts[parts.length - 1]; // Get time part (HH:mm)
    const hour = parseInt(time.split(':')[0]);
    const minute = parseInt(time.split(':')[1]);
    
    // Check if previous slot has the same event
    let prevSlotId;
    if (minute === 30) {
      // Current slot is :30, check :00 of same hour
      prevSlotId = slotId.replace(':30', ':00');
    } else if (minute === 0 && hour > 0) {
      // Current slot is :00, check :30 of previous hour
      const prevHour = (hour - 1).toString().padStart(2, '0');
      prevSlotId = slotId.replace(`${hour.toString().padStart(2, '0')}:00`, `${prevHour}:30`);
    } else {
      // This is the first possible slot (00:00), show the event name
      return event.title;
    }
    
    // Only show event name if previous slot doesn't have the same event
    if (propEventNames[prevSlotId] && propEventNames[prevSlotId].title === event.title) {
      return null; // Don't show event name if it continues from previous slot
    }
    
    return event.title;
  }, [propEventNames]);

  const handleSaveClick = async () => {
    await onSave();
  };

  if (!user && !guestUser) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2, gap: 2 }}>
        <GuestLogin onGuestLogin={onGuestLogin} onGoogleLogin={onGoogleLogin} onAppleLogin={onAppleLogin} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', mb: 2, gap: 2, px: isMobile ? 2 : 0 }}>
        <Typography variant="h6">내 일정</Typography>
        {FEATURES.ENABLE_IF_NEEDED && (
          <ToggleButtonGroup
            value={currentSelectionType}
            exclusive
            size="small"
            onChange={(e, newType) => newType && setCurrentSelectionType(newType)}
            aria-label="selection type"
          >
            <ToggleButton value="unavailable" aria-label="unavailable" sx={{ fontSize: '0.75rem', py: 0.5 }}>
              불가능
            </ToggleButton>
            <ToggleButton value="ifNeeded" aria-label="if needed" sx={{ fontSize: '0.75rem', py: 0.5 }}>
              필요한 경우
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        {children && (
          <Button 
            variant="outlined" 
            size="small" 
            onClick={openCalendarDialog} 
            sx={{ 
              fontSize: '0.75rem',
              py: 0.25,
              minHeight: 28,
              textTransform: 'none'
            }}
          >
            일정 연동
          </Button>
        )}
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleSaveClick}
          disableElevation
          sx={{ 
            fontSize: '0.75rem',
            py: 0.25,
            minHeight: 28,
            textTransform: 'none'
          }}
        >
          저장
        </Button>
      </Box>

      {/* Main Content Area */}
      {isMobile ? (
        // --- MOBILE LAYOUT ---
        <Box>
          <Box sx={{ position: 'relative', minWidth: 0, overflow: 'hidden' }}>
            {/* Loading overlay - only on table */}
            {isLoadingCalendar && (
              <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(1px)'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                캘린더 일정을 불러오는 중...
              </Typography>
            </Box>
          </Box>
        )}
        
        <ScheduleTable isMobile={isMobile}>
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
                <TableBody
                  onMouseDown={handleTableMouseDown}
                  onMouseOver={handleTableMouseOver}
                  onTouchStart={handleTableTouchStart}
                  onTouchMove={handleTableTouchMove}
                  onTouchEnd={handleTableTouchEnd}
                  sx={{ touchAction: 'none' }}
                >
                  {hours.map(hour => {
                    const hourNum = parseInt(hour.split(':')[0]);
                    return (
                      <TableRow key={hour}>
                        {getDaysForDayBasedEvent().map((day, dayIndex) => {
                          const slot00 = `${day}-${hour}`;
                          const slot30 = `${day}-${hourNum.toString().padStart(2, '0')}:30`;
                          const coords00 = coordinatesCache.get(slot00);
                          const coords30 = coordinatesCache.get(slot30);
                          
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
                              <Box
                                data-slot-id={slot00}
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: '50%',
                                  ...getCellStyle(slot00, coords00),
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.6rem',
                                  color: '#fff',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  px: 0.25
                                }}
                              >
                                {getEventName(slot00)}
                              </Box>
                              {/* Lower half - :30 */}
                              <Box
                                data-slot-id={slot30}
                                sx={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: '50%',
                                  ...getCellStyle(slot30, coords30),
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.6rem',
                                  color: '#fff',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  px: 0.25
                                }}
                              >
                                {getEventName(slot30)}
                              </Box>
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
              <Box key={`my-${week}`} sx={{ mr: 2, flexShrink: 0 }}>
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
                    <TableBody
                    onMouseDown={handleTableMouseDown}
                    onMouseOver={handleTableMouseOver}
                    onTouchStart={handleTableTouchStart}
                    onTouchMove={handleTableTouchMove}
                    onTouchEnd={handleTableTouchEnd}
                    sx={{ touchAction: 'none' }}
                  >
                    {hours.map(hour => {
                      const hourNum = parseInt(hour.split(':')[0]);
                      return (
                        <TableRow key={hour}>
                          {weekDays.map((dateString, dateIndex) => {
                            const slot00 = `${dateString}-${hour}`;
                            const slot30 = `${dateString}-${hourNum.toString().padStart(2, '0')}:30`;
                            const coords00 = coordinatesCache.get(slot00);
                            const coords30 = coordinatesCache.get(slot30);
                            
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
                                <Box
                                  data-slot-id={slot00}
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    ...getCellStyle(slot00, coords00),
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    color: '#fff',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    px: 0.25
                                  }}
                                >
                                  {getEventName(slot00)}
                                </Box>
                                {/* Lower half - :30 */}
                                <Box
                                  data-slot-id={slot30}
                                  sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    ...getCellStyle(slot30, coords30),
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    color: '#fff',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    px: 0.25
                                  }}
                                >
                                  {getEventName(slot30)}
                                </Box>
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
        }))
        }
      </ScheduleTable>
          </Box>
        </Box>
      ) : (
        // --- DESKTOP LAYOUT ---
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', width: '100%' }}>
          {/* Table (scrollable) */}
          <Box sx={{ 
            width: isStackMode ? 'calc(100% - 220px)' : '100%', // Only subtract sidebar in stack mode
            minWidth: 0,
            overflow: 'hidden', // Hide overflow to contain the scroll
            position: 'relative'
          }}>
            {/* Loading overlay - only on table */}
            {isLoadingCalendar && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(1px)'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    캘린더 일정을 불러오는 중...
                  </Typography>
                </Box>
              </Box>
            )}
            
            <ScheduleTable isMobile={isMobile}>
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
                      <TableBody
                        onMouseDown={handleTableMouseDown}
                        onMouseOver={handleTableMouseOver}
                        onTouchStart={handleTableTouchStart}
                        onTouchMove={handleTableTouchMove}
                        onTouchEnd={handleTableTouchEnd}
                        sx={{ touchAction: 'none' }}
                      >
                        {hours.map(hour => {
                          const hourNum = parseInt(hour.split(':')[0]);
                          return (
                            <TableRow key={hour}>
                              {getDaysForDayBasedEvent().map((day, dayIndex) => {
                                const slot00 = `${day}-${hour}`;
                                const slot30 = `${day}-${hourNum.toString().padStart(2, '0')}:30`;
                                const coords00 = coordinatesCache.get(slot00);
                                const coords30 = coordinatesCache.get(slot30);
                                
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
                                    <Box
                                      data-slot-id={slot00}
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        ...getCellStyle(slot00, coords00),
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        color: '#fff',
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        px: 0.25
                                      }}
                                    >
                                      {getEventName(slot00)}
                                    </Box>
                                    {/* Lower half - :30 */}
                                    <Box
                                      data-slot-id={slot30}
                                      sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        ...getCellStyle(slot30, coords30),
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        color: '#fff',
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        px: 0.25
                                      }}
                                    >
                                      {getEventName(slot30)}
                                    </Box>
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
                    <Box key={`my-${week}`} sx={{ mr: 2, flexShrink: 0 }}>
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
                          <TableBody
                            onMouseDown={handleTableMouseDown}
                            onMouseOver={handleTableMouseOver}
                            onTouchStart={handleTableTouchStart}
                            onTouchMove={handleTableTouchMove}
                            onTouchEnd={handleTableTouchEnd}
                            sx={{ touchAction: 'none' }}
                          >
                            {hours.map(hour => {
                              const hourNum = parseInt(hour.split(':')[0]);
                              return (
                                <TableRow key={hour}>
                                  {weekDays.map((dateString, dateIndex) => {
                                    const slot00 = `${dateString}-${hour}`;
                                    const slot30 = `${dateString}-${hourNum.toString().padStart(2, '0')}:30`;
                                    const coords00 = coordinatesCache.get(slot00);
                                    const coords30 = coordinatesCache.get(slot30);
                                    
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
                                        <Box
                                          data-slot-id={slot00}
                                          sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '50%',
                                            ...getCellStyle(slot00, coords00),
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.6rem',
                                            color: '#fff',
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            px: 0.25
                                          }}
                                        >
                                          {getEventName(slot00)}
                                        </Box>
                                        {/* Lower half - :30 */}
                                        <Box
                                          data-slot-id={slot30}
                                          sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '50%',
                                            ...getCellStyle(slot30, coords30),
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.6rem',
                                            color: '#fff',
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            px: 0.25
                                          }}
                                        >
                                          {getEventName(slot30)}
                                        </Box>
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
            </ScheduleTable>
          </Box>
          {/* Sidebar (fixed) - only in stack mode */}
          {isStackMode && (
            <Box sx={{ width: '200px', flexShrink: 0, pr: 2 }}>
              {children}
            </Box>
          )}
        </Box>
      )}
      
      <Dialog open={calendarDialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1.5 }}>일정 연동</DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 0.5 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 1 }}>
          <Button onClick={closeDialog} size="small">닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(MySchedule);