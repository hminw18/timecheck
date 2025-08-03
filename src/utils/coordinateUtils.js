/**
 * Build coordinate cache for performance optimization
 * @param {string[]} dates - Array of dates or days
 * @param {string[]} hours - Array of hours
 * @returns {Map} Coordinate cache mapping slotId to {dateIndex, hourIndex}
 */
export const buildCoordinatesCache = (dates, hours) => {
  const cache = new Map();
  
  dates.forEach((date, dateIndex) => {
    hours.forEach((hour, hourIndex) => {
      const slotId = `${date}-${hour}`;
      cache.set(slotId, { dateIndex, hourIndex });
    });
  });
  
  return cache;
};

/**
 * Get cell coordinates from cache
 * @param {string} slotId - Slot ID
 * @param {Map} cache - Coordinates cache
 * @returns {Object} {dateIndex, hourIndex} or {dateIndex: -1, hourIndex: -1} if not found
 */
export const getCellCoordinatesFromCache = (slotId, cache) => {
  return cache.get(slotId) || { dateIndex: -1, hourIndex: -1 };
};

/**
 * Calculate drag selection bounds
 * @param {Object} start - Start cell coordinates
 * @param {Object} current - Current cell coordinates
 * @returns {Object|null} Selection bounds or null if invalid
 */
export const calculateDragSelection = (start, current) => {
  if (!start || !current || start.dateIndex === -1 || current.dateIndex === -1) {
    return null;
  }
  
  return {
    minDate: Math.min(start.dateIndex, current.dateIndex),
    maxDate: Math.max(start.dateIndex, current.dateIndex),
    minHour: Math.min(start.hourIndex, current.hourIndex),
    maxHour: Math.max(start.hourIndex, current.hourIndex)
  };
};

/**
 * Check if a cell is within selection bounds
 * @param {Object} cellCoords - Cell coordinates
 * @param {Object} selection - Selection bounds
 * @returns {boolean} True if cell is in selection
 */
export const isCellInSelection = (cellCoords, selection) => {
  if (!selection || cellCoords.dateIndex === -1) return false;
  
  return cellCoords.dateIndex >= selection.minDate &&
         cellCoords.dateIndex <= selection.maxDate &&
         cellCoords.hourIndex >= selection.minHour &&
         cellCoords.hourIndex <= selection.maxHour;
};