import { useCallback, useRef } from 'react';

/**
 * Ignores a call while a previous one is still running. A disabled/"loading" button only takes effect after React re-renders,
 * so a fast double click (or Enter pressed twice) can fire two requests; a ref closes that gap immediately.
 */
export function useSingleFlight() {
  const busy = useRef(false);
  return useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined;
    busy.current = true;
    try { return await fn(); } finally { busy.current = false; }
  }, []);
}
