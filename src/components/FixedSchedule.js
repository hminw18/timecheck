import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Box, Alert, Snackbar } from '@mui/material';
import ScheduleTable from './common/ScheduleTable';
import TimeColumn from './common/TimeColumn';
import useSnackbar from '../hooks/useSnackbar';
import { COLORS } from '../utils/constants';
import ScheduleCell from './ScheduleCell';
import { buildCoordinatesCache } from '../utils/coordinateUtils';
import useDragSelection from '../hooks/useDragSelection';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const FixedSchedule = React.memo(({ fixedSchedule = [], onSave, isMobile = false }) => {
  const [selectedCells, setSelectedCells] = useState(new Set(fixedSchedule));
  const { snackbarOpen, snackbarMessage, showSnackbar, hideSnackbar } = useSnackbar();
  
  // Update selectedCells when fixedSchedule prop changes
  useEffect(() => {
    setSelectedCells(new Set(fixedSchedule));
  }, [fixedSchedule]);

  const hours = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`), 
  []);
  
  const allTimeSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const coordinatesCache = useMemo(() => {
    return buildCoordinatesCache(WEEKDAYS, allTimeSlots);
  }, [allTimeSlots]);

  const handleSelectionComplete = useCallback((selection, dragMode) => {
    const { minDate, maxDate, minHour, maxHour } = selection;
    
    const slotsToUpdate = [];
    for (let d = minDate; d <= maxDate; d++) {
      for (let h = minHour; h <= maxHour; h++) {
        if (WEEKDAYS[d] && allTimeSlots[h]) {
          slotsToUpdate.push(`${WEEKDAYS[d]}-${allTimeSlots[h]}`);
        }
      }
    }

    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (dragMode === 'unavailable') {
        slotsToUpdate.forEach(slot => newSet.add(slot));
      } else { // 'available' mode
        slotsToUpdate.forEach(slot => newSet.delete(slot));
      }
      return newSet;
    });
  }, [hours]);

  const {
    isDragging,
    dragMode,
    dragSelection,
    startDrag,
    handleTableMouseDown,
    handleTableMouseOver,
    handleTableTouchStart,
    handleTableTouchMove
  } = useDragSelection({
    coordinatesCache,
    onSelectionComplete: handleSelectionComplete
  });

  useEffect(() => {
    const handleDragStart = (e) => {
      const { slotId } = e.detail;
      if (coordinatesCache.has(slotId)) {
        const mode = selectedCells.has(slotId) ? 'available' : 'unavailable';
        startDrag(slotId, mode);
      }
    };

    document.addEventListener('dragstart', handleDragStart);
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [selectedCells, startDrag, coordinatesCache]);

  const getCellSx = useCallback((day, hour) => {
    const slotId = `${day}-${hour}`;
    const isSelected = selectedCells.has(slotId);
    
    let backgroundColor = isSelected ? COLORS.unavailable : COLORS.available;
    
    const coords = coordinatesCache.get(slotId);
    if (isDragging && dragSelection && coords) {
      const inSelection = coords.dateIndex >= dragSelection.minDate && 
                         coords.dateIndex <= dragSelection.maxDate &&
                         coords.hourIndex >= dragSelection.minHour && 
                         coords.hourIndex <= dragSelection.maxHour;
      
      if (inSelection) {
        backgroundColor = dragMode === 'unavailable' ? COLORS.unavailablePreview : COLORS.availablePreview;
      }
    }

    const hoverColor = isSelected ? COLORS.unavailableHover : COLORS.availableHover;
    
    return {
      backgroundColor,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: hoverColor,
      },
    };
  }, [selectedCells, isDragging, dragSelection, dragMode, coordinatesCache]);

  const handleSave = async () => {
    const result = await onSave(Array.from(selectedCells));
    if (result.success) {
      showSnackbar('고정 일정이 저장되었습니다!');
    } else {
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    }
  };


  return (
    <Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'flex' }}>
        <Button variant="outlined" size="small" onClick={() => setSelectedCells(new Set())} sx={{ borderRadius: 2 }}>
          초기화
        </Button>
        <Button variant="contained" size="small" onClick={handleSave} disableElevation sx={{ borderRadius: 2 }}>
          저장
        </Button>
      </Box>

      <ScheduleTable isMobile={isMobile}>
        <TimeColumn hours={hours} isMobile={isMobile} singleLine />
        
        <Box sx={{ mr: 2, flexShrink: 0, position: 'relative' }}>
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
              <TableHead>
                <TableRow>
                  {WEEKDAYS.map((day, index) => (
                    <TableCell 
                      key={day} 
                      align="center"
                      sx={{ 
                        backgroundColor: 'transparent',
                        padding: '6px 2px',
                        fontSize: '0.7rem',
                        lineHeight: 1.2
                      }}
                    >
                      {WEEKDAY_LABELS[index]}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody
                onMouseDown={handleTableMouseDown}
                onMouseOver={handleTableMouseOver}
                onTouchStart={handleTableTouchStart}
                onTouchMove={handleTableTouchMove}
                sx={{ touchAction: 'none' }}
              >
                {hours.map(hour => {
                  const hourNum = parseInt(hour.split(':')[0]);
                  return (
                    <TableRow key={hour}>
                      {WEEKDAYS.map((day, dayIndex) => {
                        const slot00 = `${day}-${hour}`;
                        const slot30 = `${day}-${hourNum.toString().padStart(2, '0')}:30`;
                        
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
                                ...getCellSx(day, hour),
                                border: 'none'
                              }}
                            />
                            {/* Lower half - :30 */}
                            <Box
                              data-slot-id={slot30}
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '50%',
                                ...getCellSx(day, `${hourNum.toString().padStart(2, '0')}:30`),
                                border: 'none'
                              }}
                            />
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
      </ScheduleTable>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 } }}
      >
        <Alert onClose={hideSnackbar} severity="success" sx={{ width: '100%', maxWidth: 400 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
});

FixedSchedule.displayName = 'FixedSchedule';

export default FixedSchedule;
