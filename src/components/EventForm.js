import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
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
import Toast from './Toast';

export default function EventForm({ setEventDetails, isMobile }) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState(t('event.defaultTitle'));
  const [eventType, setEventType] = useState("date"); // "date" or "day"
  const [dates, setDates] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]); // For day-based events
  const [startTime, setStartTime] = useState(dayjs().set("hour", 9).set("minute", 0));
  const [endTime, setEndTime] = useState(dayjs().set("hour", 17).set("minute", 0));
  const [endTimeValue, setEndTimeValue] = useState(17); // Track the actual selected value separately
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' });

  const showToast = (message, severity = 'error') => {
    setToast({ open: true, message, severity });
  };

  // Drag state management
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState(null); // 'selecting' or 'deselecting'
  const processedDays = useRef(new Set()); // Track which days we've processed in current drag
  const hasDragged = useRef(false); // Track if we actually dragged

  const daysOfWeek = [
    { value: 'Mon', label: t('days.mon') },
    { value: 'Tue', label: t('days.tue') },
    { value: 'Wed', label: t('days.wed') },
    { value: 'Thu', label: t('days.thu') },
    { value: 'Fri', label: t('days.fri') },
    { value: 'Sat', label: t('days.sat') },
    { value: 'Sun', label: t('days.sun') }
  ];

  const [startDate, endDate] = useMemo(() => {
    if (dates.length === 0) return [null, null];
    const sorted = [...dates].sort();
    return [sorted[0], sorted[sorted.length - 1]];
  }, [dates]);

  const isDateSelected = eventType === "date" ? (startDate && endDate) : selectedDays.length > 0;
  const isTitleValid = title.trim().length > 0;
  const isFormValid = isDateSelected && isTitleValid;

  // Handle day click (simple toggle)
  const handleDayClick = (day) => {
    if (!hasDragged.current) {
      if (selectedDays.includes(day)) {
        setSelectedDays(prev => prev.filter(d => d !== day));
      } else {
        setSelectedDays(prev => [...prev, day]);
      }
    }
  };

  // Handle day selection logic for drag
  const handleDayInteraction = (day, isInitial = false) => {
    if (isInitial) {
      // Starting a new drag
      processedDays.current = new Set([day]);
      setIsDragging(true);
      hasDragged.current = false;
      
      // Determine action based on current state
      if (selectedDays.includes(day)) {
        setDragAction('deselecting');
      } else {
        setDragAction('selecting');
      }
    } else if (isDragging && !processedDays.current.has(day)) {
      // Continuing drag to a new day
      hasDragged.current = true; // Mark that we've actually dragged
      processedDays.current.add(day);
      
      // Apply the action to the first day if this is the first drag move
      if (processedDays.current.size === 2) {
        const firstDay = Array.from(processedDays.current)[0];
        if (dragAction === 'selecting' && !selectedDays.includes(firstDay)) {
          setSelectedDays(prev => [...prev, firstDay]);
        } else if (dragAction === 'deselecting' && selectedDays.includes(firstDay)) {
          setSelectedDays(prev => prev.filter(d => d !== firstDay));
        }
      }
      
      // Apply action to current day
      if (dragAction === 'selecting' && !selectedDays.includes(day)) {
        setSelectedDays(prev => [...prev, day]);
      } else if (dragAction === 'deselecting' && selectedDays.includes(day)) {
        setSelectedDays(prev => prev.filter(d => d !== day));
      }
    }
  };

  // Mouse/touch handlers
  const handleDayMouseDown = (day, e) => {
    e.preventDefault();
    handleDayInteraction(day, true);
  };

  const handleDayMouseEnter = (day) => {
    if (isDragging) {
      handleDayInteraction(day, false);
    }
  };

  const handleDayTouchStart = (day, e) => {
    e.preventDefault();
    handleDayInteraction(day, true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.closest('[data-day]')) {
      const dayElement = element.closest('[data-day]');
      const day = dayElement.getAttribute('data-day');
      if (day) {
        handleDayInteraction(day, false);
      }
    }
  };

  // End drag
  useEffect(() => {
    const handleEnd = () => {
      setIsDragging(false);
      setDragAction(null);
      processedDays.current.clear();
      hasDragged.current = false;
    };

    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging, dragAction, selectedDays]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    // Validate event title
    const titleValidation = validateEventTitle(title);
    if (!titleValidation.isValid) {
      showToast(titleValidation.error, 'error');
      return;
    }
    
    // Validate time range
    // Allow 0:00 to 24:00 (full day), but prevent other invalid ranges
    if (startTime.hour() >= endTimeValue && !(startTime.hour() === 0 && endTimeValue === 24)) {
      showToast(t('event.endTimeAfterStart'), 'error');
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
      endTime: endTimeValue === 24 ? "24:00" : endTime.format("HH:mm"),
    });
  };


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0}}>
        
        {/* Event Title */}
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          placeholder={t('event.titlePlaceholder')}
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
                  {t('event.specificDates')}
                </ToggleButton>
                <ToggleButton value="day">
                  <EventRepeatIcon sx={{ mr: 1, fontSize: 18 }} />
                  {t('event.weeklyRepeat')}
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
                  {t('event.selectDays')}
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
                      onClick={() => handleDayClick(day.value)}
                      onMouseDown={(e) => handleDayMouseDown(day.value, e)}
                      onMouseEnter={() => handleDayMouseEnter(day.value)}
                      onTouchStart={(e) => handleDayTouchStart(day.value, e)}
                      color={selectedDays.includes(day.value) ? "primary" : "default"}
                      variant={selectedDays.includes(day.value) ? "filled" : "outlined"}
                      sx={{ 
                        width: 60,
                        height: 40,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        touchAction: 'none',
                        userSelect: 'none',
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
                    if (endTimeValue <= newStartHour) {
                      const newEndValue = Math.min(newStartHour + 1, 24);
                      setEndTimeValue(newEndValue);
                      if (newEndValue === 24) {
                        setEndTime(dayjs().set('hour', 0).set('minute', 0).add(1, 'day'));
                      } else {
                        setEndTime(dayjs().set('hour', newEndValue).set('minute', 0));
                      }
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
                    const period = i < 12 ? t('event.am') : t('event.pm');
                    const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                    const isKorean = i18n.language === 'ko';
                    return (
                      <MenuItem key={i} value={i}>
                        {i18n.language.startsWith('ko') 
                          ? `${period} ${displayHour}시 (${i}:00)`
                          : `${displayHour} ${period} (${i}:00)`
                        }
                      </MenuItem>
                    );
                  })}
                </Select>
                <Typography sx={{ flexShrink: 0 }}>{t('event.from')}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                <Select
                  value={endTimeValue}
                  onChange={(e) => {
                    const newEndHour = e.target.value;
                    setEndTimeValue(newEndHour);
                    if (newEndHour === 24) {
                      setEndTime(dayjs().set('hour', 0).set('minute', 0).add(1, 'day'));
                    } else {
                      setEndTime(dayjs().set('hour', newEndHour).set('minute', 0));
                    }
                    // If start time is greater than or equal to new end time, adjust it
                    if (startTime.hour() >= newEndHour && newEndHour !== 24) {
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
                  {Array.from({ length: 25 }, (_, i) => {
                    if (i === 24) {
                      return (
                        <MenuItem 
                          key={i} 
                          value={i}
                          disabled={i <= startTime.hour()}
                        >
                          {i18n.language.startsWith('ko') 
                            ? `오전 12시 (24:00)`
                            : `12 AM (24:00)`
                          }
                        </MenuItem>
                      );
                    }
                    const period = i < 12 ? t('event.am') : t('event.pm');
                    const displayHour = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                    const isKorean = i18n.language === 'ko';
                    return (
                      <MenuItem 
                        key={i} 
                        value={i}
                        disabled={i <= startTime.hour()}
                      >
                        {i18n.language.startsWith('ko') 
                          ? `${period} ${displayHour}시 (${i}:00)`
                          : `${displayHour} ${period} (${i}:00)`
                        }
                      </MenuItem>
                    );
                  })}
                </Select>
                <Typography sx={{ flexShrink: 0 }}>{t('event.to')}</Typography>
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
                ? t('event.enterTitle')
                : !isDateSelected 
                  ? (eventType === "date" 
                    ? t('event.selectDate') 
                    : t('event.selectDay'))
                  : t('event.createEvent')}
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
              ? t('event.enterTitle')
              : !isDateSelected 
                ? (eventType === "date" 
                  ? t('event.selectDate') 
                  : t('event.selectDay'))
                : t('event.createEvent')}
          </Button>
        )}
        
        <Toast
          open={toast.open}
          message={toast.message}
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
        />
      </Box>
    </LocalizationProvider>
  );
}
