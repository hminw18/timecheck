import React from 'react';
import { Box } from '@mui/material';

// Common schedule table wrapper with consistent scrolling and styling
const ScheduleTable = ({ children, isMobile = false }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center' }}>
      <Box sx={{ 
        overflowX: 'auto', 
        overflowY: 'hidden',
        pb: 2, // Space between scrollbar and table
        position: 'relative', 
        width: isMobile ? '100%' : 'auto',
        WebkitOverflowScrolling: 'touch', // iOS Safari smooth scrolling
        // Mobile scroll behavior
        ...(isMobile && {
          transform: 'translateZ(0)',
          '-webkit-transform': 'translateZ(0)',
          overscrollBehavior: 'none',
          overscrollBehaviorX: 'none',
          '-webkit-overflow-scrolling': 'auto',
          scrollSnapType: 'x proximity',
        }),
        scrollbarWidth: 'thin', // Firefox
        scrollbarColor: 'rgba(0,0,0,0.15) transparent', // Firefox
        '&::-webkit-scrollbar': {
          height: '4px',
          WebkitAppearance: 'none', // Safari
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.15)',
          borderRadius: '2px',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.25)',
          },
        },
        '&::-webkit-scrollbar-button': {
          display: 'none', // Remove arrow buttons
        },
      }}>
        <Box sx={{ 
          display: 'flex', 
          position: 'relative',
          // Mobile sticky container optimization
          ...(isMobile && {
            minWidth: 'min-content',
            width: 'max-content',
          }),
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default ScheduleTable;
