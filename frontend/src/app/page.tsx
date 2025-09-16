'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, ArrowRight, Sparkles, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
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

  if (!isApiConnected) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connection Error</CardTitle>
            <CardDescription className="text-center">
              Unable to connect to the backend API
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the backend server is running on port 3003
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-5xl font-bold text-foreground">
              Welcome to Motion Clone
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6">
            Your personal task management solution
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>API Connected: {apiMessage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
