// Selection cache for drag performance optimization
export class SelectionCache {
  constructor() {
    this.cache = new Map();
  }

  getCachedCells(selection) {
    const key = `${selection.minDate}-${selection.maxDate}-${selection.minHour}-${selection.maxHour}`;
    return this.cache.get(key);
  }

  setCachedCells(selection, cells) {
    const key = `${selection.minDate}-${selection.maxDate}-${selection.minHour}-${selection.maxHour}`;
    this.cache.set(key, cells);
  }

  clear() {
    this.cache.clear();
  }
}

// Batch check cells in selection for performance
export function batchCheckCellsInSelection(coordinatesCache, selection) {
  const { minDate, maxDate, minHour, maxHour } = selection;
  const cellsInSelection = new Set();

  // coordinatesCache is a Map, not an object
  for (const [slotId, coords] of coordinatesCache) {
    if (coords.dateIndex >= minDate && 
        coords.dateIndex <= maxDate && 
        coords.hourIndex >= minHour && 
        coords.hourIndex <= maxHour) {
      cellsInSelection.add(slotId);
    }
  }

  return cellsInSelection;
}