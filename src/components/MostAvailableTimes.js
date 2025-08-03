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

    // Group consecutive time slots by date
    const groupedSlots = [];
    let currentGroup = null;

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
      
      const hour = parseInt(time.split(':')[0]);
      const minute = parseInt(time.split(':')[1]);

      // Check if this slot is consecutive to the current group
      let isConsecutive = false;
      if (currentGroup && currentGroup.date === date) {
        if (currentGroup.endMinute === 0 && minute === 30 && hour === currentGroup.endHour) {
          // Current group ends at :00, this slot is :30 of the same hour
          isConsecutive = true;
        } else if (currentGroup.endMinute === 30 && minute === 0 && hour === currentGroup.endHour + 1) {
          // Current group ends at :30, this slot is :00 of the next hour
          isConsecutive = true;
        }
      }

      if (!currentGroup || currentGroup.date !== date || !isConsecutive) {
        // Start a new group
        if (currentGroup) {
          groupedSlots.push(currentGroup);
        }
        currentGroup = {
          date,
          startTime: time,
          endTime: time,
          startHour: hour,
          startMinute: minute,
          endHour: hour,
          endMinute: minute,
          count: slot.count,
          percentage: slot.percentage,
          slots: [slot],  // Keep track of all slots in this group
          isDayBased: eventDetails && eventDetails.eventType === 'day'
        };
      } else {
        // Extend current group
        currentGroup.endTime = time;
        currentGroup.endHour = hour;
        currentGroup.endMinute = minute;
        currentGroup.slots.push(slot);  // Add this slot to the group
      }
    });

    if (currentGroup) {
      groupedSlots.push(currentGroup);
    }

    // Format the grouped slots
    return groupedSlots.map(group => {
      // Calculate the actual end time based on the last slot's end
      let endHour = group.endHour;
      let endMinute = group.endMinute + 30; // Add 30 minutes to the last slot
      
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
      
      // Find users who are available for ALL slots in this time range
      const allAvailableUsers = new Map();
      const allIfNeededUsers = new Map();
      const slotCount = group.slots.length;
      const userAvailabilityCounts = new Map();
      const userIfNeededCounts = new Map();
      
      // Count how many slots each user is available for
      group.slots.forEach(slot => {
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
      
      // Only include users who are available for ALL slots in the range
      userAvailabilityCounts.forEach((data, key) => {
        if (data.count === slotCount) {
          allAvailableUsers.set(key, data.user);
        }
      });
      userIfNeededCounts.forEach((data, key) => {
        if (data.count === slotCount) {
          allIfNeededUsers.set(key, data.user);
        }
      });
      
      const dayLabels = {
        'Mon': '월요일',
        'Tue': '화요일',
        'Wed': '수요일',
        'Thu': '목요일',
        'Fri': '금요일',
        'Sat': '토요일',
        'Sun': '일요일'
      };

      return {
        date: group.isDayBased ? dayLabels[group.date] || group.date : dayjs(group.date).format('M/D'),
        dayOfWeek: group.isDayBased ? '' : dayjs(group.date).format('ddd'),
        timeRange: `${group.startTime} ~ ${endTime}`,
        count: group.count,
        percentage: group.percentage,
        key: `${group.date}-${group.startTime}-${group.endTime}`,
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
    const textToCopy = mostAvailable.map(slot => 
      slot.isDayBased 
        ? `${slot.date} ${slot.timeRange} (${slot.count}/${totalMembers}명)`
        : `${slot.date} ${slot.timeRange} (${slot.count}/${totalMembers}명)`
    ).join('\n');
    
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
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {slot.timeRange}
                </Typography>
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