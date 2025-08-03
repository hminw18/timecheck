/**
 * Throttle function using requestAnimationFrame for smooth 60fps updates
 * @param {Function} func - Function to throttle
 * @returns {Function} Throttled function
 */
export function throttleRAF(func) {
  let rafId = null;
  let lastArgs = null;

  const throttled = (...args) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(null, lastArgs);
        rafId = null;
      });
    }
  };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

/**
 * Standard throttle function with time-based throttling
 * @param {Function} func - Function to throttle
 * @param {number} delay - Throttle delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let timeoutId = null;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      lastExecTime = currentTime;
      func.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now();
        func.apply(this, args);
      }, delay - (currentTime - lastExecTime));
    }
  };
}