import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getCellCoordinatesFromCache, calculateDragSelection, isCellInSelection } from '../utils/coordinateUtils';
import { throttleRAF } from '../utils/throttle';
import { SelectionCache, batchCheckCellsInSelection } from '../utils/selectionCache';

const useDragSelection = ({ coordinatesCache, onSelectionComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const [dragStartCell, setDragStartCell] = useState(null);
  const [dragCurrentCell, setDragCurrentCell] = useState(null);
  
  const throttledUpdateRef = useRef(null);
  const elementCacheRef = useRef(new Map());
  const selectionCacheRef = useRef(new SelectionCache());

  const getCellCoordinates = useCallback((slotId) => {
    return coordinatesCache.get(slotId) || { dateIndex: -1, hourIndex: -1 };
  }, [coordinatesCache]);

  const startDrag = useCallback((slotId, mode) => {
    setIsDragging(true);
    setDragMode(mode);
    setDragStartCell(slotId);
    setDragCurrentCell(slotId);
  }, []);

  const updateDragImmediate = useCallback((slotId) => {
    if (isDragging && slotId) {
      setDragCurrentCell(slotId);
    }
  }, [isDragging]);

  // Create throttled version on mount
  useEffect(() => {
    throttledUpdateRef.current = throttleRAF(updateDragImmediate);
    return () => {
      if (throttledUpdateRef.current?.cancel) {
        throttledUpdateRef.current.cancel();
      }
    };
  }, [updateDragImmediate]);

  const updateDrag = useCallback((slotId) => {
    if (throttledUpdateRef.current) {
      throttledUpdateRef.current(slotId);
    }
  }, []);

  const endDrag = useCallback((finalCell = null, isClick = false) => {
    if (!isDragging || !dragStartCell) return;

    // Use finalCell if provided, otherwise use dragCurrentCell
    const endCell = finalCell || dragCurrentCell;
    
    // Check if it's actually a click
    const actuallyIsClick = isClick || (endCell === dragStartCell);

    // If it's a click (start and end are the same), we don't need to process selection
    // The cell was already updated when drag started
    if (!actuallyIsClick && endCell) {
      const start = getCellCoordinates(dragStartCell);
      const current = getCellCoordinates(endCell);
      const selection = calculateDragSelection(start, current);

      if (selection && onSelectionComplete) {
        onSelectionComplete(selection, dragMode);
      }
    }

    setIsDragging(false);
    setDragMode(null);
    setDragStartCell(null);
    setDragCurrentCell(null);
    
    // Clear selection cache periodically to prevent memory buildup
    if (selectionCacheRef.current.cache.size > 50) {
      selectionCacheRef.current.clear();
    }
  }, [isDragging, dragStartCell, dragCurrentCell, dragMode, getCellCoordinates, onSelectionComplete]);

  // Handle table mouse events with event delegation
  const handleTableMouseDown = useCallback((e) => {
    // Prevent default touch behavior
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    const target = e.target;
    const cell = target?.closest('[data-slot-id]');
    if (!cell) return;

    const slotId = cell.getAttribute('data-slot-id');
    if (!slotId) return;

    // Store the starting cell for click detection
    cell.dataset.mouseDownCell = slotId;

    // Let the parent component decide the drag mode
    const event = new CustomEvent('dragstart', { detail: { slotId }, bubbles: true });
    cell.dispatchEvent(event);
  }, []);

  const handleTableMouseOver = useCallback((e) => {
    if (!isDragging) return;

    const target = e.target;
    const cell = target?.closest('[data-slot-id]');
    if (!cell) return;

    const slotId = cell.getAttribute('data-slot-id');
    updateDrag(slotId);
  }, [isDragging, updateDrag]);

  // Global mouse and touch event handlers
  useEffect(() => {
    if (!isDragging) return;

    // Throttled global move handler - optimized to reduce elementFromPoint calls
    const handleGlobalMoveImmediate = (e) => {
      // For touch events, skip global handling if we're already handling in table
      if (e.type.includes('touch')) {
        return;
      }
      
      // Skip if target is already a cell
      const target = e.target;
      const cell = target?.closest('[data-slot-id]');
      
      if (cell) {
        const slotId = cell.getAttribute('data-slot-id');
        if (slotId) {
          updateDrag(slotId);
          return;
        }
      }
    };

    const handleGlobalMove = throttleRAF(handleGlobalMoveImmediate);

    const handleGlobalEnd = (e) => {
      let finalCellId = null;
      let isClick = false;
      
      // For touch events, capture final position before ending
      if (e.type === 'touchend' && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element) {
          const cell = element.closest('[data-slot-id]');
          if (cell) {
            finalCellId = cell.getAttribute('data-slot-id');
            // Check if it's a click (same cell as start)
            isClick = finalCellId === dragStartCell && dragCurrentCell === dragStartCell;
          }
        }
      } else if (e.type === 'mouseup') {
        // For mouse events
        const target = e.target;
        const cell = target?.closest('[data-slot-id]');
        if (cell) {
          finalCellId = cell.getAttribute('data-slot-id');
          // Check if it's a click (same cell as start)
          isClick = finalCellId === dragStartCell && dragCurrentCell === dragStartCell;
        }
      }
      
      // End drag with the final cell if found
      endDrag(finalCellId, isClick);
    };

    // Mouse events
    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    
    // Touch events
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      // Cancel any pending RAF
      if (handleGlobalMove.cancel) {
        handleGlobalMove.cancel();
      }
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [isDragging, updateDrag, endDrag]);

  // Calculate current drag selection and cells in selection
  const { dragSelection, cellsInSelection } = useMemo(() => {
    if (!isDragging || !dragStartCell || !dragCurrentCell) {
      return { dragSelection: null, cellsInSelection: new Set() };
    }

    const start = getCellCoordinates(dragStartCell);
    const current = getCellCoordinates(dragCurrentCell);
    const selection = calculateDragSelection(start, current);
    
    if (!selection) {
      return { dragSelection: null, cellsInSelection: new Set() };
    }

    // Check cache first
    let cells = selectionCacheRef.current.getCachedCells(selection);
    if (!cells) {
      // Calculate and cache
      cells = batchCheckCellsInSelection(coordinatesCache, selection);
      selectionCacheRef.current.setCachedCells(selection, cells);
    }

    return { dragSelection: selection, cellsInSelection: cells };
  }, [isDragging, dragStartCell, dragCurrentCell, getCellCoordinates, coordinatesCache]);

  // Helper to check if a cell is in the current selection (optimized)
  const isCellInDragSelection = useCallback((slotId) => {
    return cellsInSelection.has(slotId);
  }, [cellsInSelection]);

  // Touch event handlers
  const handleTableTouchStart = handleTableMouseDown;
  
  const handleTableTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = element?.closest('[data-slot-id]');
      if (cell) {
        const slotId = cell.getAttribute('data-slot-id');
        // Use immediate update for touch to reduce lag
        updateDragImmediate(slotId);
      }
    }
  }, [isDragging, updateDragImmediate]);

  // Add table touch end handler
  const handleTableTouchEnd = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent any default behavior
    
    let finalCellId = null;
    let isClick = false;
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const cell = element.closest('[data-slot-id]');
        if (cell) {
          finalCellId = cell.getAttribute('data-slot-id');
          // Update to final cell immediately before ending
          if (finalCellId && finalCellId !== dragCurrentCell) {
            updateDragImmediate(finalCellId);
          }
          // Check if it's a click
          isClick = finalCellId === dragStartCell && dragCurrentCell === dragStartCell;
        }
      }
    }
    
    // Small delay to ensure state updates are processed
    setTimeout(() => {
      endDrag(finalCellId, isClick);
    }, 0);
  }, [isDragging, endDrag, dragStartCell, dragCurrentCell, updateDragImmediate]);

  return {
    isDragging,
    dragMode,
    dragSelection,
    startDrag,
    updateDrag,
    endDrag,
    handleTableMouseDown,
    handleTableMouseOver,
    handleTableTouchStart,
    handleTableTouchMove,
    handleTableTouchEnd,
    isCellInDragSelection,
    // Expose these for parent components that need custom handling
    dragStartCell,
    dragCurrentCell
  };
};

export default useDragSelection;