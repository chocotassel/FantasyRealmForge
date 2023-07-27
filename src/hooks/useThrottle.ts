import { useRef, useEffect, useCallback } from 'react';

function useThrottle(fn: (...args: any[]) => any, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  const lastExecRef = useRef(0);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => {
    return clearTimer;
  }, []);

  const throttledFn = useCallback((...args: any[]) => {
    const now = Date.now();

    if (lastExecRef.current && now - lastExecRef.current < delay) {
      clearTimer();

      timeoutRef.current = setTimeout(() => {
        lastExecRef.current = now;
        fn(...args);
      }, delay - (now - lastExecRef.current));
    } else {
      lastExecRef.current = now;
      fn(...args);
    }
  }, [fn, delay]);

  return throttledFn;
}

export default useThrottle;