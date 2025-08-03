import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getCellStyle } from '../../utils/constants';

// Reusable time column component
const TimeColumn = ({ hours, isMobile = false, singleLine = false }) => {
  const cellStyle = getCellStyle(isMobile);
  
  return (
    <Box sx={{ 
      flexShrink: 0,
      position: 'sticky',
      left: 0,
      zIndex: 10,
      backgroundColor: '#f5f5f5',
      minWidth: 'max-content',
      // Mobile sticky issue fix
      ...(isMobile && {
        position: '-webkit-sticky',
        isolation: 'isolate', // New stacking context
      }),
    }}>
      <TableContainer sx={{ userSelect: 'none' }}>
        <Table stickyHeader size="small" sx={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          '& thead .MuiTableCell-root': {
            borderTop: 'none',
            borderLeft: '1px solid transparent',
            borderRight: '1px solid transparent',
            borderBottom: '1px solid transparent',
          },
          '& tbody': {
            borderTop: '1px solid transparent',
            borderBottom: '1px solid transparent',
          },
          '& tbody .MuiTableCell-root': {
            borderLeft: '1px solid transparent',
            borderRight: '1px solid transparent',
            borderBottom: '1px solid transparent',
            borderTop: 'none',
          },
          '& tbody tr:last-child .MuiTableCell-root': {
            borderBottom: '1px solid transparent',
          }
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                backgroundColor: 'transparent',
                padding: '6px 2px',
                fontSize: '0.7rem',
                lineHeight: 1.2
              }}>
                {singleLine ? (
                  <div style={{ visibility: 'hidden' }}>시간</div>
                ) : (
                  <>
                    <div style={{ visibility: 'hidden' }}>시간</div>
                    <div style={{ visibility: 'hidden' }}>time</div>
                  </>
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hours.map((hour, index) => {
              return (
                <TableRow key={`time-${hour}`}>
                  <TableCell sx={{ 
                    backgroundColor: 'transparent',
                    fontSize: '0.65rem',
                    padding: 0,
                    paddingX: 0.5,
                    color: '#000',
                    textAlign: 'center',
                    verticalAlign: 'top',
                    height: 32,
                    minHeight: 32,
                    maxHeight: 32,
                    minWidth: 30,
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#f5f5f5',
                      padding: '0 4px',
                      fontSize: '0.65rem',
                      lineHeight: '16px',
                      zIndex: 1
                    }}>
                      {hour}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TimeColumn;