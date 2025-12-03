'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLoadingStateOptions {
  timeout?: number;
  onTimeout?: () => void;
  debugName?: string;
}

/**
 * Production-ready loading state hook with automatic timeout and cleanup
 */
export function useLoadingState(
  initialState: boolean = true,
  options: UseLoadingStateOptions = {}
) {
  const { timeout = 5000, onTimeout, debugName = 'Component' } = options;
  const [loading, setLoadingState] = useState(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Safe setter that only updates if component is mounted
  const setLoading = useCallback((value: boolean) => {
    if (!mountedRef.current) {
      console.warn(`[${debugName}] Attempted to set loading state after unmount`);
      return;
    }

    // Clear any existing timeout when setting loading to false
    if (!value && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set new timeout when setting loading to true
    if (value) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        console.error(`[${debugName}] Loading timeout after ${timeout}ms - forcing loading=false`);

        if (mountedRef.current) {
          setLoadingState(false);
          onTimeout?.();
        }
      }, timeout);
    }

    setLoadingState(value);
  }, [timeout, onTimeout, debugName]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { loading, setLoading, isMounted: () => mountedRef.current };
}