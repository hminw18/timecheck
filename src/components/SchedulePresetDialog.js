import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SchedulePresetDialog = ({ open, onClose, onConfirm, presetType }) => {
  const isSleep = presetType === 'sleep';
  const title = isSleep ? '수면 시간 설정' : '근무 시간 설정';

  
  const [startTime, setStartTime] = useState(isSleep ? '00:00' : '09:00');
  const [endTime, setEndTime] = useState(isSleep ? '08:00' : '18:00');

  useEffect(() => {
    if (open) {
      setStartTime(isSleep ? '00:00' : '09:00');
      setEndTime(isSleep ? '08:00' : '18:00');
    }
  }, [open, isSleep]);

  const handleConfirm = () => {
    const days = isSleep ? WEEKDAYS : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    onConfirm(days, startTime, endTime);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <TextField
            label="시작 시간"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="종료 시간"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleConfirm} variant="contained">저장</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SchedulePresetDialog;
