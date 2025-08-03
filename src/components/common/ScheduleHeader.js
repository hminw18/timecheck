import React from 'react';
import { TableHead, TableRow, TableCell } from '@mui/material';
import dayjs from '../../config/dayjsConfig';

// Common schedule header component
const ScheduleHeader = ({ weekDays, isDayBased = false }) => {
  const dayLabels = {
    'Mon': '월',
    'Tue': '화',
    'Wed': '수',
    'Thu': '목',
    'Fri': '금',
    'Sat': '토',
    'Sun': '일'
  };

  return (
    <TableHead>
      <TableRow>
        {weekDays.map((day, index) => (
          <TableCell 
            key={day} 
            align="center" 
            sx={{ 
              border: 'none',
              backgroundColor: 'transparent',
              padding: '6px 2px', 
              fontSize: '0.7rem', 
              lineHeight: 1.2 
            }}
          >
            {isDayBased ? (
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{dayLabels[day] || day}</div>
            ) : (
              <>
                <div>{dayjs(day).format('ddd')}</div>
                <div>{dayjs(day).format('M/D')}</div>
              </>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default ScheduleHeader;