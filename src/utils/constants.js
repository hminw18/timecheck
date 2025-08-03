import { red, yellow, blue, green, grey } from '@mui/material/colors';

// Cell dimensions
// Desktop cell sizes
export const CELL_WIDTH = 40;
export const CELL_HEIGHT = 32;

// Mobile cell sizes (minimum 44px for touch targets)
export const MOBILE_CELL_WIDTH = 48;
export const MOBILE_CELL_HEIGHT = 44;

// Breakpoint for mobile
export const MOBILE_BREAKPOINT = 768;

// Fixed schedule cell dimensions (larger for better visibility)
export const FIXED_CELL_WIDTH = 50;
export const FIXED_CELL_HEIGHT = 36;

// Cell dimensions as strings for styles
export const CELL_STYLE = {
  padding: 0,
  minWidth: `${CELL_WIDTH}px`,
  width: `${CELL_WIDTH}px`,
  maxWidth: `${CELL_WIDTH}px`,
  height: `${CELL_HEIGHT}px`,
  minHeight: `${CELL_HEIGHT}px`,
  maxHeight: `${CELL_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden'
};

// Mobile cell style
export const MOBILE_CELL_STYLE = {
  padding: 0,
  minWidth: `${MOBILE_CELL_WIDTH}px`,
  width: `${MOBILE_CELL_WIDTH}px`,
  maxWidth: `${MOBILE_CELL_WIDTH}px`,
  height: `${MOBILE_CELL_HEIGHT}px`,
  minHeight: `${MOBILE_CELL_HEIGHT}px`,
  maxHeight: `${MOBILE_CELL_HEIGHT}px`,
  position: 'relative',
  overflow: 'hidden'
};

// Get cell style based on viewport
export const getCellStyle = (isMobile) => isMobile ? MOBILE_CELL_STYLE : CELL_STYLE;

// Colors for different states
export const COLORS = {
  available: blue[100],
  unavailable: red[300],  // Changed from red[400] to less intense red
  ifNeeded: yellow[500],
  unavailableHover: red[400],  // Changed from red[600] to less intense red
  ifNeededHover: yellow[600],
  availableHover: blue[200],
  // Make preview colors same as final colors to avoid re-render
  unavailablePreview: red[300],  // Same as unavailable
  ifNeededPreview: yellow[500],  // Same as ifNeeded  
  availablePreview: blue[100],  // Same as available
  fixedSelected: grey[500],
  fixedSelectedHover: grey[700],
  fixedDeselectedHover: '#f0f0f0',
  fixedSelectPreview: grey[400],
  fixedDeselectPreview: grey[200]
};

// Fixed schedule days
export const FIXED_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Generate hours array
export const generateHoursArray = (count = 24) => {
  return Array.from({ length: count }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
};

// Feature flags
export const FEATURES = {
  ENABLE_IF_NEEDED: false, // Set to true to enable "if needed" functionality
};