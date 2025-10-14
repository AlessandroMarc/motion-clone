'use client';

import { useState, useEffect } from 'react';

export function useApiConnection() {
  const [apiMessage, setApiMessage] = useState<string>('');
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);

  useEffect(() => {
    // Test API connection with retry logic
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setApiMessage(data.message);
        setIsApiConnected(true);
      } catch (error) {
        console.error('API connection failed:', error);
        setApiMessage(
          `API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        setIsApiConnected(false);

        // Retry after 2 seconds
        setTimeout(() => {
          testConnection();
        }, 2000);
      }
    };

    testConnection();
  }, []);

  return { apiMessage, isApiConnected };
}
