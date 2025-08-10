import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableRow, Typography, Tooltip, Box, ToggleButton, ToggleButtonGroup, useMediaQuery, Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox } from '@mui/material';
import { blue, green } from '@mui/material/colors';
import { EditCalendar as EditCalendarIcon } from '@mui/icons-material';
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

const GroupSchedule = React.memo(({ eventDetails, availableWeeks, groupSchedule, totalMembers, respondedUsers, isStackMode = false }) => {
  const [excludeIfNeeded, setExcludeIfNeeded] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [highlightBestTimes, setHighlightBestTimes] = useState(false);
  
  // Calendar write states
  const [writeMode, setWriteMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  
  // Calendar dropdown menu
  const [calendarMenuAnchor, setCalendarMenuAnchor] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Event creation dialog
  const [eventDialog, setEventDialog] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedCalendarType, setSelectedCalendarType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { user } = useAuth();
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
    
    // In write mode, override style for selected cells
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

  // Simple drag handlers for GroupSchedule
  const handleMouseDown = useCallback((slotId, event) => {
    if (!writeMode) return;
    
    event.preventDefault();
    setIsDragging(true);
    setDragStart(slotId);
    
    // Add to selection immediately
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      newSet.add(slotId);
      return newSet;
    });
  }, [writeMode]);

  const handleMouseEnter = useCallback((slotId) => {
    if (!writeMode || !isDragging || !dragStart) return;
    
    // Calculate rectangular selection
    const selectedArea = getRectangularSelection(dragStart, slotId);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      selectedArea.forEach(slot => newSet.add(slot));
      return newSet;
    });
  }, [writeMode, isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!writeMode || !isDragging) return;
    
    setIsDragging(false);
    setDragStart(null);
  }, [writeMode, isDragging]);

  const getRectangularSelection = useCallback((start, end) => {
    const selection = [];
    
    // Parse slot IDs to get coordinates
    const parseSlotId = (slotId) => {
      const parts = slotId.split('-');
      const timeStr = parts[parts.length - 1];
      const dayOrDate = parts.slice(0, -1).join('-');
      
      const [hour, minute] = timeStr.split(':').map(Number);
      const timeIndex = allTimeSlots.findIndex(slot => slot === timeStr);
      const dayIndex = allDates.findIndex(date => date === dayOrDate);
      
      return { dayIndex, timeIndex, dayOrDate };
    };
    
    const startCoord = parseSlotId(start);
    const endCoord = parseSlotId(end);
    
    const minDay = Math.min(startCoord.dayIndex, endCoord.dayIndex);
    const maxDay = Math.max(startCoord.dayIndex, endCoord.dayIndex);
    const minTime = Math.min(startCoord.timeIndex, endCoord.timeIndex);
    const maxTime = Math.max(startCoord.timeIndex, endCoord.timeIndex);
    
    for (let dayIdx = minDay; dayIdx <= maxDay; dayIdx++) {
      for (let timeIdx = minTime; timeIdx <= maxTime; timeIdx++) {
        if (allDates[dayIdx] && allTimeSlots[timeIdx]) {
          const slotId = `${allDates[dayIdx]}-${allTimeSlots[timeIdx]}`;
          selection.push(slotId);
        }
      }
    }
    
    return selection;
  }, [allDates, allTimeSlots]);

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

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !user) return;
    
    setIsCreating(true);
    
    try {
      const timeSlots = Array.from(selectedCells);
      
      if (selectedCalendarType === 'google') {
        const result = await googleCalendarService.createEvent(
          eventTitle,
          timeSlots,
          eventDetails.eventType,
          eventDetails.selectedDays
        );
        
        if (result.success) {
          alert(`Google Calendar에 ${result.eventsCreated}개의 일정이 생성되었습니다.`);
        }
      } else if (selectedCalendarType === 'apple') {
        // TODO: Implement Apple Calendar event creation
        alert('Apple Calendar 이벤트 생성은 아직 구현되지 않았습니다.');
      }
      
      // Reset states
      setEventDialog(false);
      setEventTitle('');
      setSelectedCalendarType('');
      setWriteMode(false);
      setSelectedCells(new Set());
      
    } catch (error) {
      console.error('Error creating calendar event:', error);
      alert('캘린더 이벤트 생성 중 오류가 발생했습니다: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const Participants = () => (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>참여자</Typography>
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
      ) : <Typography variant="body2" color="text.secondary">아직 참여자가 없습니다.</Typography>}
    </Box>
  );

  const CalendarWriteSection = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>캘린더에 저장</Typography>
      {!writeMode ? (
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditCalendarIcon />}
          onClick={handleWriteMode}
          fullWidth
          sx={{ fontSize: '0.75rem' }}
        >
          캘린더에 쓰기
        </Button>
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            ref={saveButtonRef}
            variant="contained"
            size="small"
            onClick={handleSaveSelection}
            disabled={selectedCells.size === 0}
            sx={{ fontSize: '0.75rem', flex: 1 }}
          >
            저장
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelWrite}
            sx={{ fontSize: '0.75rem', flex: 1 }}
          >
            취소
          </Button>
        </Box>
      )}
    </Box>
  );

  const MostAvailable = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <MostAvailableTimes groupSchedule={groupSchedule} totalMembers={totalMembers} allDates={allDates} hours={hours} excludeIfNeeded={excludeIfNeeded} eventDetails={eventDetails} />
      <ToggleButtonGroup value={highlightBestTimes} exclusive onChange={(e, newValue) => setHighlightBestTimes(newValue)} aria-label="highlight best times" size="small" fullWidth>
        <ToggleButton value={true} aria-label="highlight best" sx={{ fontSize: '0.75rem', py: 0.5 }}>최적 시간만 보기</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const Schedule = () => {
    const content = (
      <Box 
        sx={{ display: 'flex' }}
        onMouseUp={handleMouseUp}
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
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo00.tooltipTitle}</span>} disableHoverListener={!cellInfo00.tooltipTitle}>
                                <Box
                                  onMouseDown={(e) => handleMouseDown(slot00, e)}
                                  onMouseEnter={() => handleMouseEnter(slot00)}
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
                                    userSelect: 'none'
                                  }}
                                >
                                </Box>
                              </Tooltip>
                              {/* Lower half - :30 */}
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle}>
                                <Box
                                  onMouseDown={(e) => handleMouseDown(slot30, e)}
                                  onMouseEnter={() => handleMouseEnter(slot30)}
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
                                    userSelect: 'none'
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
                                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo00.tooltipTitle}</span>} disableHoverListener={!cellInfo00.tooltipTitle}>
                                    <Box
                                      onMouseDown={(e) => handleMouseDown(slot00, e)}
                                      onMouseEnter={() => handleMouseEnter(slot00)}
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
                                        userSelect: 'none'
                                      }}
                                    >
                                        </Box>
                                  </Tooltip>
                                  {/* Lower half - :30 */}
                                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle}>
                                    <Box
                                      onMouseDown={(e) => handleMouseDown(slot30, e)}
                                      onMouseEnter={() => handleMouseEnter(slot30)}
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
                                        userSelect: 'none'
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

        <Typography variant="h6">그룹 일정</Typography>
        {FEATURES.ENABLE_IF_NEEDED && (
          <ToggleButtonGroup value={excludeIfNeeded} exclusive onChange={(e, newValue) => setExcludeIfNeeded(newValue)} aria-label="if needed filter" size="small">
            <ToggleButton value={true} aria-label="exclude if needed" sx={{ fontSize: '0.75rem', py: 0.5 }}>필요한 경우 제외</ToggleButton>
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
            <CalendarWriteSection />
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
            style: {
              minWidth: '200px'
            }
          }
        }}
      >
        <MenuItem onClick={() => handleCalendarSelect('google')}>Google Calendar</MenuItem>
        <MenuItem onClick={() => handleCalendarSelect('apple')}>Apple Calendar</MenuItem>
      </Menu>

      {/* Event Creation Dialog */}
      <Dialog open={eventDialog} onClose={() => setEventDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>캘린더 이벤트 생성</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="이벤트 제목"
            fullWidth
            variant="outlined"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {selectedCalendarType === 'google' ? 'Google Calendar' : 'Apple Calendar'}에 저장됩니다.
          </Typography>
          {eventDetails.eventType === 'day' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              요일 기반 이벤트는 반복 일정으로 생성됩니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialog(false)} disabled={isCreating}>취소</Button>
          <Button 
            onClick={handleCreateEvent} 
            variant="contained" 
            disabled={!eventTitle.trim() || isCreating}
          >
            {isCreating ? '생성 중...' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

GroupSchedule.displayName = 'GroupSchedule';

export default GroupSchedule;