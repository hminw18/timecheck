import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from '../config/dayjsConfig';

const MostAvailableTimes = ({ groupSchedule, totalMembers, excludeIfNeeded = false, eventDetails }) => {
  // Calculate the most available time slots
  const getMostAvailableTimes = () => {
    if (!groupSchedule || groupSchedule.size === 0 || totalMembers === 0) {
      return [];
    }

    // Convert Map to array and calculate availability
    const timeSlots = Array.from(groupSchedule.entries()).map(([slotId, data]) => {
      const availableCount = data.available.count;
      const ifNeededCount = excludeIfNeeded ? 0 : data.ifNeeded.count;
      const totalCount = availableCount + ifNeededCount;
      
      return {
        slotId,
        count: totalCount,
        percentage: (totalCount / totalMembers) * 100,
        availableUsers: data.available.users,
        ifNeededUsers: data.ifNeeded.users
      };
    }).filter(slot => {
      // Filter to only include slots within the event's time range
      if (!eventDetails || !eventDetails.startTime || !eventDetails.endTime) {
        return true;
      }
      
      const parts = slot.slotId.split('-');
      let time, date;
      
      if (eventDetails && eventDetails.eventType === 'day') {
        time = parts[1]; // HH:mm for day-based events
      } else {
        // For date-based events, check if the date is within selected dates
        date = parts.slice(0, 3).join('-'); // YYYY-MM-DD
        time = parts[3]; // HH:mm
        
        // Check if date is in the selected dates
        if (eventDetails.selectedDates && eventDetails.selectedDates.length > 0) {
          const isDateIncluded = eventDetails.selectedDates.some(selectedDate => {
            // selectedDate could be already in YYYY-MM-DD format or a date object
            const formattedSelectedDate = typeof selectedDate === 'string' 
              ? selectedDate 
              : dayjs(selectedDate).format('YYYY-MM-DD');
            return formattedSelectedDate === date;
          });
          if (!isDateIncluded) {
            return false; // Exclude this slot if date is not in selected dates
          }
        }
      }
      
      const slotHour = parseInt(time.split(':')[0]);
      const slotMinute = parseInt(time.split(':')[1]);
      
      const startHour = parseInt(eventDetails.startTime.split(':')[0]);
      const startMinute = parseInt(eventDetails.startTime.split(':')[1]);
      const endHour = parseInt(eventDetails.endTime.split(':')[0]);
      const endMinute = parseInt(eventDetails.endTime.split(':')[1]);
      
      // Check if slot is within event time range
      const slotTotalMinutes = slotHour * 60 + slotMinute;
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      return slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes;
    });

    // Sort by count (descending) and get top slots
    const sortedSlots = timeSlots
      .filter(slot => slot.count > 0)
      .sort((a, b) => b.count - a.count);

    // Get the maximum count
    const maxCount = sortedSlots.length > 0 ? sortedSlots[0].count : 0;
    
    // Get all slots with the maximum count
    const topSlots = sortedSlots
      .filter(slot => slot.count === maxCount);

    // Group time slots by date (all slots for same date in one group)
    const dateGroups = new Map();
    
    topSlots.forEach(slot => {
      const parts = slot.slotId.split('-');
      let date, time;
      
      if (eventDetails && eventDetails.eventType === 'day') {
        // Day-based event: parts[0] is day name (Mon, Tue, etc.), parts[1] is time
        date = parts[0]; // Day name
        time = parts[1]; // HH:mm
      } else {
        // Date-based event: parts[0-2] are YYYY-MM-DD, parts[3] is time
        date = parts.slice(0, 3).join('-'); // YYYY-MM-DD
        time = parts[3]; // HH:mm
      }
      
      if (!dateGroups.has(date)) {
        dateGroups.set(date, {
          date,
          timeRanges: [],
          count: slot.count,
          percentage: slot.percentage,
          isDayBased: eventDetails && eventDetails.eventType === 'day',
          allSlots: []
        });
      }
      
      dateGroups.get(date).allSlots.push(slot);
    });
    
    // Process each date group to find consecutive time ranges
    const groupedSlots = [];
    dateGroups.forEach(dateGroup => {
      const sortedSlots = dateGroup.allSlots.sort((a, b) => {
        const timeA = a.slotId.split('-').pop();
        const timeB = b.slotId.split('-').pop();
        return timeA.localeCompare(timeB);
      });
      
      const timeRanges = [];
      let currentRange = null;
      
      sortedSlots.forEach(slot => {
        const time = slot.slotId.split('-').pop();
        const hour = parseInt(time.split(':')[0]);
        const minute = parseInt(time.split(':')[1]);
        
        if (!currentRange) {
          currentRange = {
            startTime: time,
            endTime: time,
            startHour: hour,
            startMinute: minute,
            endHour: hour,
            endMinute: minute,
            slots: [slot]
          };
        } else {
          // Check if consecutive
          let isConsecutive = false;
          if (currentRange.endMinute === 0 && minute === 30 && hour === currentRange.endHour) {
            isConsecutive = true;
          } else if (currentRange.endMinute === 30 && minute === 0 && hour === currentRange.endHour + 1) {
            isConsecutive = true;
          }
          
          if (isConsecutive) {
            // Extend current range
            currentRange.endTime = time;
            currentRange.endHour = hour;
            currentRange.endMinute = minute;
            currentRange.slots.push(slot);
          } else {
            // Start new range
            timeRanges.push(currentRange);
            currentRange = {
              startTime: time,
              endTime: time,
              startHour: hour,
              startMinute: minute,
              endHour: hour,
              endMinute: minute,
              slots: [slot]
            };
          }
        }
      });
      
      if (currentRange) {
        timeRanges.push(currentRange);
      }
      
      dateGroup.timeRanges = timeRanges;
      groupedSlots.push(dateGroup);
    });

    // Format the grouped slots
    return groupedSlots.map(group => {
      const dayLabels = {
        'Mon': '월요일',
        'Tue': '화요일',
        'Wed': '수요일',
        'Thu': '목요일',
        'Fri': '금요일',
        'Sat': '토요일',
        'Sun': '일요일'
      };
      
      // Format time ranges for this date
      const formattedTimeRanges = group.timeRanges.map(range => {
        let endHour = range.endHour;
        let endMinute = range.endMinute + 30; // Add 30 minutes to the last slot
        
        if (endMinute >= 60) {
          endHour += 1;
          endMinute = 0;
        }
        
        let endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Ensure end time doesn't exceed event end time
        if (eventDetails && eventDetails.endTime) {
          const eventEndHour = parseInt(eventDetails.endTime.split(':')[0]);
          const eventEndMinute = parseInt(eventDetails.endTime.split(':')[1]);
          if (endHour > eventEndHour || (endHour === eventEndHour && endMinute > eventEndMinute)) {
            endTime = eventDetails.endTime;
          }
        }
        
        return {
          timeRange: `${range.startTime} ~ ${endTime}`,
          slots: range.slots
        };
      });
      
      // Find users who are available for ALL slots across ALL time ranges for this date
      const allAvailableUsers = new Map();
      const allIfNeededUsers = new Map();
      const totalSlotCount = group.allSlots.length;
      const userAvailabilityCounts = new Map();
      const userIfNeededCounts = new Map();
      
      // Count how many slots each user is available for
      group.allSlots.forEach(slot => {
        slot.availableUsers?.forEach(user => {
          const key = user.id || user.userId || user.name;
          if (!userAvailabilityCounts.has(key)) {
            userAvailabilityCounts.set(key, { user, count: 0 });
          }
          userAvailabilityCounts.get(key).count++;
        });
        slot.ifNeededUsers?.forEach(user => {
          const key = user.id || user.userId || user.name;
          if (!userIfNeededCounts.has(key)) {
            userIfNeededCounts.set(key, { user, count: 0 });
          }
          userIfNeededCounts.get(key).count++;
        });
      });
      
      // Only include users who are available for ALL slots
      userAvailabilityCounts.forEach((data, key) => {
        if (data.count === totalSlotCount) {
          allAvailableUsers.set(key, data.user);
        }
      });
      userIfNeededCounts.forEach((data, key) => {
        if (data.count === totalSlotCount) {
          allIfNeededUsers.set(key, data.user);
        }
      });

      return {
        date: group.isDayBased ? dayLabels[group.date] || group.date : dayjs(group.date).format('M/D'),
        dayOfWeek: group.isDayBased ? '' : dayjs(group.date).format('ddd'),
        timeRanges: formattedTimeRanges,
        count: group.count,
        percentage: group.percentage,
        key: `${group.date}`,
        availableUsers: Array.from(allAvailableUsers.values()),
        ifNeededUsers: Array.from(allIfNeededUsers.values()),
        isDayBased: group.isDayBased
      };
    });
  };

  const mostAvailable = getMostAvailableTimes();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = mostAvailable.map(slot => {
      const timeRangesText = slot.timeRanges.map(tr => tr.timeRange).join(', ');
      return slot.isDayBased 
        ? `${slot.date} ${timeRangesText} (${slot.count}/${totalMembers}명)`
        : `${slot.date} ${timeRangesText} (${slot.count}/${totalMembers}명)`;
    }).join('\n');
    
    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch((err) => {
        // Console statement removed for productionfallbackCopy(textToCopy);
      });
    } else {
      // Fallback for iOS Safari and older browsers
      fallbackCopy(textToCopy);
    }
  };
  
  const fallbackCopy = (text) => {
    // Create a temporary textarea element
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // Console statement removed for production
      }
    
    document.body.removeChild(textarea);
  };

  if (mostAvailable.length === 0) {
    return null;
  }

  const displayLimit = 3;
  const hasMore = mostAvailable.length > displayLimit;
  const displayedSlots = expanded ? mostAvailable : mostAvailable.slice(0, displayLimit);

  return (
    <Box sx={{ mb: 2, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          가장 많은 사람이 되는 시간
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Tooltip title={copied ? "복사됨!" : "시간 목록 복사"}>
            <IconButton 
              size="small" 
              onClick={handleCopy}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {hasMore && (
            <Tooltip title={expanded ? "접기" : "펼치기"}>
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflow: 'hidden' }}>
        {displayedSlots.map((slot) => {
          const allUsers = [...(slot.availableUsers || []), ...(excludeIfNeeded ? [] : slot.ifNeededUsers || [])];
          const userNames = allUsers.map(user => user.name || user.displayName || 'Guest').join(', ');
          
          return (
            <Box 
              key={slot.key} 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                py: 0.75,
                px: 1,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {slot.date}{slot.dayOfWeek && ` (${slot.dayOfWeek})`}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: slot.percentage === 100 ? 'success.main' : 'text.primary',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}>
                    {slot.count}/{totalMembers}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {slot.timeRanges.map((tr, index) => (
                    <Typography key={index} variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {tr.timeRange}
                    </Typography>
                  ))}
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userNames}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {hasMore && !expanded && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary', 
            mt: 0.5, 
            display: 'block',
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setExpanded(true)}
        >
          +{mostAvailable.length - displayLimit}
        </Typography>
      )}
    </Box>
  );
};

export default MostAvailableTimes;