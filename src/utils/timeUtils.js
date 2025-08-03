import dayjs from '../config/dayjsConfig';

/**
 * Generate time slots array based on start and end time (still returns hourly for display)
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {string[]} Array of time slots in HH:mm format
 */
export const generateHours = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  }
  
  const start = dayjs(`2000-01-01T${startTime}`);
  const end = dayjs(`2000-01-01T${endTime}`);
  const timeArray = [];
  let current = start;
  
  while (current.isBefore(end)) {
    timeArray.push(current.format('HH:mm'));
    current = current.add(1, 'hour');
  }
  
  return timeArray;
};

/**
 * Generate all time slots including 30-minute intervals
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {string[]} Array of all time slots in HH:mm format
 */
export const generateAllTimeSlots = (startTime, endTime) => {
  if (!startTime || !endTime) {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }
  
  const start = dayjs(`2000-01-01T${startTime}`);
  const end = dayjs(`2000-01-01T${endTime}`);
  const timeArray = [];
  let current = start;
  
  while (current.isBefore(end)) {
    timeArray.push(current.format('HH:mm'));
    current = current.add(30, 'minute');
  }
  
  return timeArray;
};

/**
 * Get days for a specific week based on event details
 * @param {string} weekStart - Week start date
 * @param {Object} eventDetails - Event details object
 * @returns {string[]} Array of date strings in YYYY-MM-DD format
 */
export const getDaysForWeek = (weekStart, eventDetails) => {
  const startOfWeek = dayjs(weekStart);
  const days = [];
  
  // Day of week mapping
  const dayOfWeekMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // If this is a day-based event, show selected days of week
  if (eventDetails && eventDetails.eventType === 'day' && eventDetails.selectedDays && eventDetails.selectedDays.length > 0) {
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day');
      const dayOfWeek = dayOfWeekMap[date.day()];
      if (eventDetails.selectedDays.includes(dayOfWeek)) {
        days.push(date.format('YYYY-MM-DD'));
      }
    }
  }
  // If we have selectedDates, only show those days
  else if (eventDetails && eventDetails.selectedDates && eventDetails.selectedDates.length > 0) {
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      if (eventDetails.selectedDates.includes(dateStr)) {
        days.push(dateStr);
      }
    }
  } else {
    // Fallback to date range
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day');
      if (eventDetails && 
          date.isSameOrAfter(dayjs(eventDetails.startDate), 'day') && 
          date.isSameOrBefore(dayjs(eventDetails.endDate), 'day')) {
        days.push(date.format('YYYY-MM-DD'));
      }
    }
  }
  
  return days;
};

/**
 * Format slot ID
 * @param {string} date - Date or day
 * @param {string} hour - Hour
 * @returns {string} Formatted slot ID
 */
export const formatSlotId = (date, hour) => {
  return `${date}-${hour}`;
};