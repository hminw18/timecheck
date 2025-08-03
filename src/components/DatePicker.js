"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse"; // Import Collapse
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

// utility: build full grid of days for month view, but filter out past weeks
const getCalendarDays = (month, startMonday) => {
  const today = new Date();
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weekStartsOn = startMonday ? 1 : 0;
  const start = startOfWeek(first, { weekStartsOn });
  const end = endOfWeek(last, { weekStartsOn });
  
  // Get all days in the month view
  const allDays = eachDayOfInterval({ start, end });
  
  // Get the start of current week
  const currentWeekStart = startOfWeek(today, { weekStartsOn });
  
  // Filter out days that are in weeks completely before current week
  return allDays.filter(day => {
    const dayWeekStart = startOfWeek(day, { weekStartsOn });
    return dayWeekStart >= currentWeekStart;
  });
};

export default function DatePicker({ value = [], startCalendarOnMonday = false, onChange }) {
  // Initialize months with current month, and next month if less than 2 weeks remaining in current month
  const getInitialMonths = () => {
    const today = new Date();
    const currentMonthEnd = endOfMonth(today);
    const remainingDaysInMonth = Math.ceil((currentMonthEnd - today) / (1000 * 60 * 60 * 24));
    
    const months = [today];
    if (remainingDaysInMonth <= 14) {
      months.push(addMonths(today, 1));
    }
    return months;
  };
  
  const [months, setMonths] = useState(getInitialMonths());
  const [selected, setSelected] = useState(new Set());

  // drag helpers -----------------------------------------------------------
  const isDragging = useRef(false);
  const dragMode = useRef("add");

  // keep external value in sync -------------------------------------------
  useEffect(() => setSelected(new Set(value)), [value]);

  // jump to first selected date's month on mount --------------------------
  useEffect(() => {
    if (value.length) setMonths([startOfMonth(parseISO(value[0]))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- pointer handlers ---------------- */
  const toggleDay = (day) => {
    const iso = format(day, "yyyy-MM-dd");
    const next = new Set(selected);
    dragMode.current === "add" ? next.add(iso) : next.delete(iso);
    onChange(Array.from(next).sort());
  };

  const handlePointerDown = (day) => {
    // Don't allow selection of past dates
    if (isBefore(day, startOfDay(new Date()))) return;
    
    isDragging.current = true;
    const iso = format(day, "yyyy-MM-dd");
    dragMode.current = selected.has(iso) ? "remove" : "add";
    toggleDay(day);
  };
  
  const handlePointerEnter = (day) => {
    // Don't allow selection of past dates
    if (isBefore(day, startOfDay(new Date()))) return;
    
    isDragging.current && toggleDay(day);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (day, e) => {
    // Don't allow selection of past dates
    if (isBefore(day, startOfDay(new Date()))) return;
    
    e.preventDefault(); // Prevent default touch behavior
    isDragging.current = true;
    const iso = format(day, "yyyy-MM-dd");
    dragMode.current = selected.has(iso) ? "remove" : "add";
    toggleDay(day);
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Check if the element is a day button
    if (element && element.getAttribute('data-date')) {
      const dateStr = element.getAttribute('data-date');
      const day = parseISO(dateStr);
      
      // Don't allow selection of past dates
      if (!isBefore(day, startOfDay(new Date()))) {
        const iso = format(day, "yyyy-MM-dd");
        const isSelected = selected.has(iso);
        
        // Only toggle if the state differs from drag mode
        if ((dragMode.current === "add" && !isSelected) || 
            (dragMode.current === "remove" && isSelected)) {
          toggleDay(day);
        }
      }
    }
  };

  useEffect(() => {
    const handleEnd = () => (isDragging.current = false);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("touchend", handleEnd);
    
    // Add touchmove listener for mobile drag
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    
    return () => {
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [selected, dragMode]);

  /* -------------- navigation ---------------- */
  const addNextMonth = () => {
    setMonths(prevMonths => [...prevMonths, addMonths(prevMonths[prevMonths.length - 1], 1)]);
  };

  /* -------------- derived data ---------------- */
  const dayNames = useMemo(() => {
    const weekStartsOn = startCalendarOnMonday ? 1 : 0;
    const start = startOfWeek(new Date(), { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "EEE", { locale: ko })); // 월, 화...
  }, [startCalendarOnMonday]);

  /* -------------- render helpers ---------------- */
  const renderDay = (day, currentMonth) => {
    const iso = format(day, "yyyy-MM-dd");
    const inMonth = isSameMonth(day, currentMonth);
    const today = isSameDay(day, new Date());
    const isSel = selected.has(iso);
    const isPast = isBefore(day, startOfDay(new Date()));

    return (
      <ButtonBase
        key={iso}
        disableRipple
        disabled={isPast}
        data-date={iso}
        onPointerDown={() => handlePointerDown(day)}
        onPointerEnter={() => handlePointerEnter(day)}
        onTouchStart={(e) => handleTouchStart(day, e)}
        sx={{
          width: 40, // Increased size
          height: 40, // Increased size
          borderRadius: "50%",
          fontSize: 14,
          display: "flex", // Center content
          alignItems: "center",
          justifyContent: "center",
          fontWeight: today ? 700 : 400,
          color: isPast
            ? "text.disabled"
            : isSel
            ? "#fff"
            : inMonth
            ? "text.primary"
            : "text.disabled",
          backgroundColor: isPast
            ? "transparent"
            : isSel
            ? "primary.main"
            : today && !isSel
            ? "action.selected"
            : "transparent",
          "&:hover": {
            backgroundColor: isPast ? "transparent" : isSel ? "primary.dark" : "action.hover",
          },
          cursor: isPast ? "not-allowed" : "pointer",
          touchAction: "none",
        }}
      >
        {format(day, "d")}
      </ButtonBase>
    );
  };

  /* ---------------- component ----------------- */
  return (
    <Paper elevation={2} sx={{ p: 2, maxWidth: 320, userSelect: "none" }}>
      {months.map((currentMonth, index) => (
        <Collapse in={true} timeout="auto" unmountOnExit key={index}>
          <div>
            {/* 구분선 (첫 번째 달 제외) */}
            {index > 0 && (
              <Box 
                sx={{ 
                  height: '1px',
                  bgcolor: 'grey.300',
                  mx: -1,
                  mb: 3,
                  mt: 2
                }} 
              />
            )}
            
            {/* header */}
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                {format(currentMonth, "yyyy년 M월", { locale: ko })}
              </Typography>
            </Box>

            {/* weekday row */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                mb: 0.5,
              }}
            >
              {dayNames.map((d) => (
                <Typography key={d} variant="caption" color="text.secondary">
                  {d}
                </Typography>
              ))}
            </Box>

            {/* days grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0.5,
                textAlign: "center",
              }}
            >
              {getCalendarDays(currentMonth, startCalendarOnMonday).map((day) => renderDay(day, currentMonth))}
            </Box>
          </div>
        </Collapse>
      ))}
      <Box display="flex" justifyContent="center" mt={2}>
        <IconButton onClick={addNextMonth} aria-label="add month">
          <ArrowDownwardIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
