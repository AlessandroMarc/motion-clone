'use client';

import { useState, useEffect, useRef } from 'react';

export function useApiConnection() {
  const [apiMessage, setApiMessage] = useState<string>('');
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 10; // Maximum number of retry attempts
  const initialDelay = 500; // Initial delay before first attempt (for cold start)
  const baseDelay = 2000; // Base delay between retries

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Test API connection with exponential backoff retry logic
    const testConnection = async (attempt: number = 0) => {
      if (!isMounted) return;

      try {
        // Add timeout to fetch request (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/health', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          // For 500 errors during initial attempts, treat as cold start
          if (response.status === 500 && attempt < 3) {
            throw new Error('COLD_START');
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setApiMessage(data.message || 'Backend is running!');
          setIsApiConnected(true);
          setIsLoading(false);
          retryCountRef.current = 0;
        }
      } catch (error) {
        if (!isMounted) return;

        // Don't log errors for cold start scenarios during initial attempts
        const isColdStart =
          error instanceof Error &&
          (error.message === 'COLD_START' ||
            (error.name === 'AbortError' && attempt < 3));

        if (!isColdStart && attempt >= 3) {
          // Only log errors after a few attempts (likely not cold start)
          console.warn(
            `API connection attempt ${attempt + 1} failed:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }

        retryCountRef.current = attempt + 1;

        // Stop retrying after max attempts
        if (attempt >= maxRetries - 1) {
          if (isMounted) {
            setApiMessage(
              `API connection failed after ${maxRetries} attempts. Please refresh the page.`
            );
            setIsApiConnected(false);
            setIsLoading(false);
          }
          return;
        }

        // Exponential backoff: delay increases with each attempt
        // But cap it at 5 seconds max
        const delay = Math.min(
          baseDelay * Math.pow(1.5, attempt),
          5000
        );

        if (isMounted) {
          setIsApiConnected(false);
          // Show loading state during retries (not error state)
          setIsLoading(true);
        }

        // Schedule next retry
        timeoutId = setTimeout(() => {
          if (isMounted) {
            testConnection(attempt + 1);
          }
        }, delay);
      }
    };

    // Start with initial delay to give backend time to wake up (cold start)
    timeoutId = setTimeout(() => {
      testConnection(0);
    }, initialDelay);

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return { apiMessage, isApiConnected, isLoading };
}
