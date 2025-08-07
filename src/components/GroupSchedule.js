import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableRow, Typography, Tooltip, Box, ToggleButton, ToggleButtonGroup, useMediaQuery } from '@mui/material';
import { blue } from '@mui/material/colors';
import MostAvailableTimes from './MostAvailableTimes';
import ScheduleTable from './common/ScheduleTable';
import TimeColumn from './common/TimeColumn';
import ScheduleHeader from './common/ScheduleHeader';
import { getCellStyle, MOBILE_BREAKPOINT, FEATURES } from '../utils/constants';
import { generateHours, generateAllTimeSlots, getDaysForWeek as getDaysForWeekUtil } from '../utils/timeUtils';

const GroupSchedule = React.memo(({ eventDetails, availableWeeks, groupSchedule, totalMembers, respondedUsers, isStackMode = false }) => {
  const [excludeIfNeeded, setExcludeIfNeeded] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [highlightBestTimes, setHighlightBestTimes] = useState(false);
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);
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

  const getCellInfo = (slotId) => getCellData.get(slotId) || { displayCount: 0, sx: { backgroundColor: 'transparent', textAlign: 'center', color: 'inherit', fontWeight: 'bold' }, tooltipTitle: '' };

  const allDates = useMemo(() => {
    if (eventDetails.eventType === 'day') {
      return getDaysForDayBasedEvent();
    }
    return availableWeeks.flatMap(week => getDaysForWeek(week));
  }, [availableWeeks, eventDetails.eventType]);

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
      <>
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
                                    fontSize: '0.75rem'
                                  }}
                                >
                                </Box>
                              </Tooltip>
                              {/* Lower half - :30 */}
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle}>
                                <Box
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
                                    fontSize: '0.75rem'
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
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                        </Box>
                                  </Tooltip>
                                  {/* Lower half - :30 */}
                                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{cellInfo30.tooltipTitle}</span>} disableHoverListener={!cellInfo30.tooltipTitle}>
                                    <Box
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
                                        fontSize: '0.75rem'
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
      </>
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
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Schedule />
          </Box>
          {/* Sidebar (fixed) */}
          <Box sx={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Participants />
            <MostAvailable />
          </Box>
        </Box>
      )}
    </Box>
  );
});

GroupSchedule.displayName = 'GroupSchedule';

export default GroupSchedule;