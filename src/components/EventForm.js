import React, { useState, useMemo, useCallback } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
} from "@mui/material";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import ClearIcon from '@mui/icons-material/Clear';

import dayjs from "../config/dayjsConfig";
import CustomDatePicker from "./DatePicker";
import { validateEventTitle } from "../utils/validation";

export default function EventForm({ setEventDetails, isMobile }) {
  const [title, setTitle] = useState("우리의 이벤트");
  const [eventType, setEventType] = useState("date"); // "date" or "day"
  const [dates, setDates] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]); // For day-based events
  const [startTime, setStartTime] = useState(dayjs().set("hour", 9).set("minute", 0));
  const [endTime, setEndTime] = useState(dayjs().set("hour", 17).set("minute", 0));
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Drag state for day selection
  const isDraggingDays = React.useRef(false);
  const dragModeDayRef = React.useRef('add');

  const daysOfWeek = [
    { value: 'Mon', label: '월' },
    { value: 'Tue', label: '화' },
    { value: 'Wed', label: '수' },
    { value: 'Thu', label: '목' },
    { value: 'Fri', label: '금' },
    { value: 'Sat', label: '토' },
    { value: 'Sun', label: '일' }
  ];

  const [startDate, endDate] = useMemo(() => {
    if (dates.length === 0) return [null, null];
    const sorted = [...dates].sort();
    return [sorted[0], sorted[sorted.length - 1]];
  }, [dates]);

  const isDateSelected = eventType === "date" ? (startDate && endDate) : selectedDays.length > 0;
  const isTitleValid = title.trim().length > 0;
  const isFormValid = isDateSelected && isTitleValid;

  const toggleDay = (day) => {
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      dragModeDayRef.current === 'add' ? newSet.add(day) : newSet.delete(day);
      return Array.from(newSet);
    });
  };

  const handleDayPointerDown = (day) => {
    isDraggingDays.current = true;
    const isSelected = selectedDays.includes(day);
    dragModeDayRef.current = isSelected ? 'remove' : 'add';
    toggleDay(day);
  };

  const handleDayPointerEnter = (day) => {
    isDraggingDays.current && toggleDay(day);
  };

  const handleDayTouchStart = (day, e) => {
    e.preventDefault();
    isDraggingDays.current = true;
    const isSelected = selectedDays.includes(day);
    dragModeDayRef.current = isSelected ? 'remove' : 'add';
    toggleDay(day);
  };

  const handleDayTouchMove = useCallback((e) => {
    if (!isDraggingDays.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.getAttribute('data-day')) {
      const day = element.getAttribute('data-day');
      const isSelected = selectedDays.includes(day);
      
      // Only toggle if the state differs from drag mode
      if ((dragModeDayRef.current === 'add' && !isSelected) || 
          (dragModeDayRef.current === 'remove' && isSelected)) {
        toggleDay(day);
      }
    }
  }, [selectedDays]);

  // Add event listeners for drag end
  React.useEffect(() => {
    const handleEnd = () => (isDraggingDays.current = false);
    
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('touchmove', handleDayTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('touchmove', handleDayTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [handleDayTouchMove]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    // Validate event title
    const titleValidation = validateEventTitle(title);
    if (!titleValidation.isValid) {
      setSnackbar({ open: true, message: titleValidation.error, severity: 'error' });
      return;
    }
    
    // Validate time range
    if (startTime.hour() >= endTime.hour()) {
      setSnackbar({ open: true, message: '종료 시간은 시작 시간보다 늦어야 합니다.', severity: 'error' });
      return;
    }
    
    setEventDetails({
      title,
      eventType,
      // Date-based event fields
      startDate: eventType === "date" ? startDate : null,
      endDate: eventType === "date" ? endDate : null,
      selectedDates: eventType === "date" ? dates : [], // Add selected dates array
      // Day-based event fields
      selectedDays: eventType === "day" ? selectedDays : [],
      // Common fields
      startTime: startTime.format("HH:mm"),
      endTime: endTime.format("HH:mm"),
    });
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0}}>
        
        {/* Event Title */}
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          placeholder="이벤트 제목을 입력해 주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          slotProps={{ 
            htmlInput: { 
              style: { textAlign: 'left', padding: '8px 14px' },
              autoComplete: 'off'
            },
            input: {
              endAdornment: title && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setTitle('')}
                    edge="end"
                    sx={{ mr: -1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
          sx={{ mb: 3, maxWidth: 500, mx: 'auto', display: 'block'}}
        />

        <Grid container spacing={{ xs: 4, md: 12 }} justifyContent="center">
          {/* Left Column: Date Range or Day Selection */}
          <Grid item xs={12} md={6}>
            {/* Event Type Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <ToggleButtonGroup
                value={eventType}
                exclusive
                onChange={(e, newType) => newType && setEventType(newType)}
                sx={{ 
                  '& .MuiToggleButton-root': {
                    px: 2,
                    py: 0.5,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                  }
                }}
              >
                <ToggleButton value="date">
                  <CalendarMonthIcon sx={{ mr: 1, fontSize: 18 }} />
                  특정 날짜
                </ToggleButton>
                <ToggleButton value="day">
                  <EventRepeatIcon sx={{ mr: 1, fontSize: 18 }} />
                  매주 반복
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {eventType === "date" ? (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CustomDatePicker
                  value={dates}
                  onChange={setDates}
                  startCalendarOnMonday
                />
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 2 
              }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  반복할 요일 선택
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1,
                  justifyContent: 'center',
                  maxWidth: 300,
                  userSelect: 'none'
                }}>
                  {daysOfWeek.map(day => (
                    <Chip
                      key={day.value}
                      label={day.label}
                      data-day={day.value}
                      onPointerDown={() => handleDayPointerDown(day.value)}
                      onPointerEnter={() => handleDayPointerEnter(day.value)}
                      onTouchStart={(e) => handleDayTouchStart(day.value, e)}
                      color={selectedDays.includes(day.value) ? "primary" : "default"}
                      variant={selectedDays.includes(day.value) ? "filled" : "outlined"}
                      sx={{ 
                        width: 60,
                        height: 40,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        touchAction: 'none',
                        '&:hover': {
                          backgroundColor: selectedDays.includes(day.value) 
                            ? 'primary.dark' 
                            : 'action.hover'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Grid>

          {/* Right Column: Time Range */}
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
              width: '100%',
              px: { xs: 2, sm: 2 },
              mt: { xs: 0, md: 8 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                <Select
                  value={startTime.hour()}
                  onChange={(e) => {
                    const newStartHour = e.target.value;
                    setStartTime(dayjs().set('hour', newStartHour).set('minute', 0));
                    // If end time is less than or equal to new start time, adjust it
                    if (endTime.hour() <= newStartHour) {
                      setEndTime(dayjs().set('hour', Math.min(newStartHour + 1, 23)).set('minute', 0));
                    }
                  }}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 200 }, flexGrow: 1, minWidth: 0 }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const period = i < 12 ? '오전' : '오후';
                    const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                    return (
                      <MenuItem key={i} value={i}>
                        {`${i}시 (${period} ${displayHour}시)`}
                      </MenuItem>
                    );
                  })}
                </Select>
                <Typography sx={{ flexShrink: 0 }}>부터</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                <Select
                  value={endTime.hour()}
                  onChange={(e) => {
                    const newEndHour = e.target.value;
                    setEndTime(dayjs().set('hour', newEndHour).set('minute', 0));
                    // If start time is greater than or equal to new end time, adjust it
                    if (startTime.hour() >= newEndHour) {
                      setStartTime(dayjs().set('hour', Math.max(newEndHour - 1, 0)).set('minute', 0));
                    }
                  }}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 200 }, flexGrow: 1, minWidth: 0 }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const period = i < 12 ? '오전' : '오후';
                    const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                    return (
                      <MenuItem 
                        key={i} 
                        value={i}
                        disabled={i <= startTime.hour()}
                      >
                        {`${i}시 (${period} ${displayHour}시)`}
                      </MenuItem>
                    );
                  })}
                </Select>
                <Typography sx={{ flexShrink: 0 }}>까지</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Submit - Desktop */}
        {!isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!isFormValid}
              sx={{ 
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                px: 3,
                py: 1
              }}
            >
              {!isTitleValid 
                ? "이벤트 제목을 입력해 주세요"
                : !isDateSelected 
                  ? (eventType === "date" 
                    ? "날짜를 선택해 주세요" 
                    : "요일을 선택해 주세요")
                  : "이벤트 만들기"}
            </Button>
          </Box>
        )}
        
        {/* Submit - Mobile Fixed Bottom */}
        {isMobile && (
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!isFormValid}
            sx={{ 
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: 56,
              borderRadius: 0,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              backgroundColor: '#64b5f6',
              color: 'white',
              zIndex: 1100,
              '&:hover': {
                backgroundColor: '#5ba3e0',
              },
              '&:disabled': {
                backgroundColor: '#ccc',
                color: 'rgba(0, 0, 0, 0.38)'
              }
            }}
          >
            {!isTitleValid 
              ? "이벤트 제목을 입력해 주세요"
              : !isDateSelected 
                ? (eventType === "date" 
                  ? "날짜를 선택해 주세요" 
                  : "요일을 선택해 주세요")
                : "이벤트 만들기"}
          </Button>
        )}
        
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
