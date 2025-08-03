import React from 'react';
import { TableCell } from '@mui/material';
import { getCellStyle } from '../utils/constants';

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  // First check simple props
  if (
    prevProps.slotId !== nextProps.slotId ||
    prevProps.borderLeft !== nextProps.borderLeft ||
    prevProps.eventName !== nextProps.eventName ||
    prevProps.isFirstOccurrence !== nextProps.isFirstOccurrence ||
    prevProps.isMobile !== nextProps.isMobile
  ) {
    return false;
  }

  // For cellSx, check if they're the same reference (optimization)
  if (prevProps.cellSx === nextProps.cellSx) {
    return true;
  }

  // If references differ, compare only the properties that matter visually
  const prevSx = prevProps.cellSx || {};
  const nextSx = nextProps.cellSx || {};
  
  return (
    prevSx.backgroundColor === nextSx.backgroundColor &&
    prevSx.cursor === nextSx.cursor &&
    prevSx.userSelect === nextSx.userSelect
    // Note: We're not comparing &:hover because it doesn't affect initial render
  );
};

// Shared cell component for all schedule types
const ScheduleCell = React.memo(({
  slotId,
  cellSx,
  borderLeft,
  eventName,
  isFirstOccurrence,
  children,
  isMobile  // Pass as prop instead of calculating
}) => {
  const cellStyle = getCellStyle(isMobile);
  
  return (
    <TableCell
      data-slot-id={slotId}
      sx={{
        ...cellSx,
        borderLeft,
        ...cellStyle
      }}
    >
      {eventName && isFirstOccurrence && (
        <div style={{
          fontSize: '0.6rem',
          color: 'white',
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          padding: '2px'
        }}>
          {eventName}
        </div>
      )}
      {children}
    </TableCell>
  );
}, areEqual);

ScheduleCell.displayName = 'ScheduleCell';

export default ScheduleCell;