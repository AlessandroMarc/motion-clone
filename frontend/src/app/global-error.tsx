'use client';

import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-bold tracking-tight">
              Critical System Error
            </h1>
            <p className="text-muted-foreground text-lg">
              A critical error occurred that prevented the application from
              starting. Our engineers have been notified.
            </p>
            {error.digest && (
              <p className="font-mono text-sm bg-muted p-2 rounded">
                Ref: {error.digest}
              </p>
            )}
            <div className="pt-4">
              <Button
                onClick={() => reset()}
                size="lg"
                className="w-full sm:w-auto"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
