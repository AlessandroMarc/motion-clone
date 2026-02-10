'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Handled Error:', error);

    // Show a snack notification
    toast.error('An unexpected error occurred', {
      description:
        error.message ||
        'Please try again or contact support if the issue persists.',
      duration: 5000,
    });
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <h1 className="font-display mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Something went wrong
        </h1>

        <p className="font-body mb-8 mx-auto max-w-md text-lg text-muted-foreground">
          We encountered an unexpected error. Don't worry, our team has been
          notified.
          {error.digest && (
            <span className="mt-2 block font-mono text-sm opacity-50">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            onClick={() => reset()}
            variant="default"
            size="lg"
            className="group min-w-[140px]"
          >
            <RefreshCcw className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
            Try again
          </Button>

          <Button variant="outline" size="lg" asChild className="min-w-[140px]">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
